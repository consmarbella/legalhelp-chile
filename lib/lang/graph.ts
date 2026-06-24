/**
 * LANGGRAPH: Flujo del agente conversacional legal
 * 
 * Arquitectura:
 * Usuario -> extraer datos (LLM) -> recopilar/clasificar -> END
 * 
 * REGLAS:
 * - Solo LLM (DeepSeek) clasifica tipos de documento (temperature: 0)
 * - Solo LLM extrae datos (temperature: 0)
 * - NO hay regex para clasificacion ni extraccion
 * - Validacion anti-alucinacion: datos extraidos deben aparecer en el mensaje
 * - Si LLM devuelve tipo generico, se pide clarificacion al usuario
 */

import { StateGraph, END, START } from '@langchain/langgraph';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { llmComplete } from '@/lib/llm';
import { validateReadyState, generateMissingFieldQuestion } from '@/lib/validateReady';

// ─── STATE DEL AGENTE ────────────────────────────────────────────────────────
export interface AgentState {
  messages: Array<HumanMessage | AIMessage | SystemMessage>;
  tipoDocumento: string | null;
  datosRecopilados: Record<string, unknown>;
  datosFaltantes: string[];
  ready: boolean;
  responseMessage: string;
  conversationHistory: Array<{ role: string; content: string }>;
}

// ─── HELPERS DE NORMALIZACION ─────────────────────────────────────────────────

/**
 * Capitaliza un nombre: alejandro matteucci -> Alejandro Matteucci
 * Respeta particulas: de, del, la, las, los, el
 */
function capitalizarNombre(texto: string): string {
  const particulas = ['de', 'del', 'la', 'las', 'los', 'el', 'en', 'y'];
  return texto
    .trim()
    .split(/\s+/)
    .map((palabra, i) => {
      const lower = palabra.toLowerCase();
      if (i > 0 && particulas.includes(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

/**
 * Formatea RUT chileno: 12345678-9 -> 12.345.678-9
 */
function formatearRUT(rut: string): string {
  let limpio = rut.replace(/\s+/g, '').replace(/\./g, '');
  
  if (limpio.includes('-')) {
    const [cuerpo, dv] = limpio.split('-');
    const conPuntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${conPuntos}-${dv}`;
  }
  
  if (/^\d{7,8}[\dkK]$/.test(limpio)) {
    const cuerpo = limpio.slice(0, -1);
    const dv = limpio.slice(-1);
    const conPuntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${conPuntos}-${dv}`;
  }
  
  return rut;
}

// ─── VALIDACION ANTI-ALUCINACION ──────────────────────────────────────────────

/**
 * Verifica que los datos extraidos por el LLM realmente aparezcan
 * (o sean derivables) del mensaje del usuario.
 * 
 * Reglas:
 * - Nombres: al menos una palabra del nombre debe aparecer en el mensaje
 * - RUT: los digitos deben aparecer en el mensaje
 * - Montos: el numero o su representacion textual debe estar en el mensaje
 * - tipo_documento: se acepta siempre (es inferencia semantica legitima)
 * - detalle_caso: se acepta si el mensaje es largo (>50 chars)
 * - Otros strings: al menos parte del valor debe aparecer en el mensaje
 */
function validarDatosContraMensaje(
  datosExtraidos: Record<string, unknown>,
  mensajeOriginal: string
): Record<string, unknown> {
  const mensajeLower = mensajeOriginal.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const mensajeOrigLower = mensajeOriginal.toLowerCase();
  const datosValidados: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(datosExtraidos)) {
    if (!value) continue;

    // tipo_documento siempre se acepta (inferencia semantica)
    if (key === 'tipo_documento') {
      datosValidados[key] = value;
      continue;
    }

    // detalle_caso: se acepta si el mensaje es suficientemente largo
    if (key === 'detalle_caso') {
      if (mensajeOriginal.length > 50) {
        datosValidados[key] = value;
      }
      continue;
    }

    const valorStr = String(value).toLowerCase();

    // Para RUT: verificar que los digitos aparecen
    if (key === 'rut') {
      const digitosRUT = valorStr.replace(/[\.\-\s]/g, '');
      const digitosMensaje = mensajeOriginal.replace(/[\.\-\s]/g, '');
      if (digitosMensaje.includes(digitosRUT) || mensajeOriginal.includes(valorStr)) {
        datosValidados[key] = value;
      } else {
        console.log(`[validar] RECHAZADO rut="${value}" - no aparece en mensaje`);
      }
      continue;
    }

    // Para montos/sueldo: verificar numeros
    if (key === 'sueldo' || key === 'monto') {
      const numStr = String(value).replace(/[^\d]/g, '');
      // Aceptar si el numero aparece o si hay expresiones coloquiales
      const expresionesMonetarias = ['mil', 'palo', 'lucas', 'luca', 'millon'];
      const tieneExpresion = expresionesMonetarias.some(e => mensajeOrigLower.includes(e));
      const tieneNumero = mensajeOriginal.replace(/[^\d]/g, '').includes(numStr.slice(0, 3));
      if (tieneExpresion || tieneNumero || mensajeOriginal.includes(numStr)) {
        datosValidados[key] = value;
      } else {
        console.log(`[validar] RECHAZADO ${key}="${value}" - no aparece en mensaje`);
      }
      continue;
    }

    // Para nombres y otros strings: verificar que al menos una palabra significativa aparece
    const palabrasValor = valorStr.normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/).filter((w: string) => w.length > 2);
    const algunaCoincide = palabrasValor.some((palabra: string) => mensajeLower.includes(palabra));
    
    // Tambien aceptar si el valor completo aparece en el mensaje (case insensitive)
    const valorCompleto = mensajeOrigLower.includes(valorStr);
    
    if (algunaCoincide || valorCompleto) {
      datosValidados[key] = value;
    } else {
      console.log(`[validar] RECHAZADO ${key}="${value}" - no aparece en mensaje`);
    }
  }

  return datosValidados;
}

// ─── NODOS DEL GRAPH ─────────────────────────────────────────────────────────

/**
 * NODO 1: Extraer datos estructurados del mensaje (SOLO LLM, temp=0)
 * 
 * - Usa DeepSeek para extraer datos del mensaje del usuario
 * - Valida que los datos extraidos realmente aparezcan en el mensaje
 * - NUNCA usa regex para clasificar tipo de documento
 * - NUNCA inventa datos
 */
async function extraerDatos(state: AgentState): Promise<Partial<AgentState>> {
  const ultimoMensaje = state.messages[state.messages.length - 1];
  
  if (!(ultimoMensaje instanceof HumanMessage)) {
    return {};
  }

  const contenido = ultimoMensaje.content.toString();
  const datosActuales = { ...state.datosRecopilados };

  console.log('[extraer] Analizando:', contenido.slice(0, 60));
  console.log('[extraer] Datos faltantes esperados:', state.datosFaltantes);

  // ═══════════════════════════════════════════════════════════════
  // MAPEO INTELIGENTE: Si hay UN dato faltante y el mensaje es corto,
  // asumimos que el usuario está respondiendo ESE dato
  // ═══════════════════════════════════════════════════════════════
  const mensajeCorto = contenido.length < 120 && !contenido.includes('necesito') && !contenido.includes('quiero');
  const unDatoFaltante = (state.datosFaltantes || []).length === 1;
  const dosDatosFaltantes = (state.datosFaltantes || []).length === 2;
  
  // CASO ESPECIAL: Usuario responde "nombre rut" juntos (ej: "juan perez 12345678-9")
  if (mensajeCorto && dosDatosFaltantes && state.datosFaltantes) {
    const campos = state.datosFaltantes;
    const tieneNombre = campos.includes('nombre') || campos.includes('nombre completo');
    const tieneRut = campos.includes('rut');
    
    if (tieneNombre && tieneRut) {
      // Intentar separar: nombre (palabras) + rut (números)
      const rutMatch = contenido.match(/(\d[\d.\-kK\s]+)/);
      if (rutMatch) {
        const rut = rutMatch[0].trim();
        const nombre = contenido.replace(rutMatch[0], '').trim();
        
        if (nombre.split(' ').length >= 2 && rut.length >= 8) {
          datosActuales.nombre = capitalizarNombre(nombre);
          datosActuales.rut = formatearRUT(rut);
          console.log(`[extraer] Asignado DOBLE: nombre="${datosActuales.nombre}" + rut="${datosActuales.rut}"`);
          return {
            datosRecopilados: datosActuales,
            datosFaltantes: state.datosFaltantes.filter(d => d !== 'nombre' && d !== 'nombre completo' && d !== 'rut'),
            tipoDocumento: state.tipoDocumento
          };
        }
      }
    }
  }
  
  if (mensajeCorto && unDatoFaltante && state.datosFaltantes) {
    const campoEsperado = state.datosFaltantes[0];
    console.log(`[extraer] MAPEO DIRECTO: mensaje corto + 1 dato faltante = "${campoEsperado}"`);
    
    // Validar que el contenido tiene sentido para ese campo
    const valorLimpio = contenido.trim();
    
    if (campoEsperado === 'nombre' || campoEsperado === 'apoderado' || campoEsperado === 'demandado') {
      // Si es un nombre y tiene al menos 2 palabras
      if (valorLimpio.split(' ').length >= 2 || valorLimpio.split(' ').length === 1 && valorLimpio.length > 3) {
        datosActuales[campoEsperado] = capitalizarNombre(valorLimpio);
        console.log(`[extraer] Asignado directo: ${campoEsperado} = "${datosActuales[campoEsperado]}"`);
        return {
          datosRecopilados: datosActuales,
          datosFaltantes: state.datosFaltantes.slice(1), // Eliminar este campo
          tipoDocumento: state.tipoDocumento
        };
      }
    }
    
    if (campoEsperado === 'rut' && /\d/.test(valorLimpio)) {
      datosActuales.rut = formatearRUT(valorLimpio);
      console.log(`[extraer] Asignado directo: rut = "${datosActuales.rut}"`);
      return {
        datosRecopilados: datosActuales,
        datosFaltantes: state.datosFaltantes.slice(1),
        tipoDocumento: state.tipoDocumento
      };
    }
    
    if ((campoEsperado === 'empleador' || campoEsperado === 'empresa') && valorLimpio.length > 2) {
      datosActuales.empleador = capitalizarNombre(valorLimpio);
      datosActuales.empresa = datosActuales.empleador;
      console.log(`[extraer] Asignado directo: empleador = "${datosActuales.empleador}"`);
      return {
        datosRecopilados: datosActuales,
        datosFaltantes: state.datosFaltantes.slice(1),
        tipoDocumento: state.tipoDocumento
      };
    }
    
    if (campoEsperado === 'cargo' && valorLimpio.length > 2) {
      const cargo = valorLimpio.trim().toLowerCase();
      datosActuales.cargo = cargo.charAt(0).toUpperCase() + cargo.slice(1);
      console.log(`[extraer] Asignado directo: cargo = "${datosActuales.cargo}"`);
      return {
        datosRecopilados: datosActuales,
        datosFaltantes: state.datosFaltantes.slice(1),
        tipoDocumento: state.tipoDocumento
      };
    }
    
    if (campoEsperado === 'direccion' || campoEsperado === 'domicilio') {
      datosActuales.direccion = valorLimpio;
      console.log(`[extraer] Asignado directo: direccion = "${datosActuales.direccion}"`);
      return {
        datosRecopilados: datosActuales,
        datosFaltantes: state.datosFaltantes.slice(1),
        tipoDocumento: state.tipoDocumento
      };
    }
    
    if ((campoEsperado === 'sueldo' || campoEsperado === 'monto') && /\d/.test(valorLimpio)) {
      const numeros = valorLimpio.replace(/[^\d]/g, '');
      if (numeros) {
        datosActuales[campoEsperado] = parseInt(numeros, 10);
        console.log(`[extraer] Asignado directo: ${campoEsperado} = ${datosActuales[campoEsperado]}`);
        return {
          datosRecopilados: datosActuales,
          datosFaltantes: state.datosFaltantes.slice(1),
          tipoDocumento: state.tipoDocumento
        };
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // EXTRACCION CON LLM: DeepSeek con temperature=0 (determinista)
  // ═══════════════════════════════════════════════════════════════
  
  const datosExistentes = JSON.stringify(datosActuales, null, 2);
  const faltantes = (state.datosFaltantes || []).join(', ') || 'todos los datos del caso';
  
  const extractionPrompt = `Eres un extractor de datos de documentos legales chilenos con 20 años de experiencia.

DATOS YA RECOPILADOS:
${datosExistentes}

DATOS QUE FALTAN: ${faltantes}

ULTIMO MENSAJE DEL USUARIO: "${contenido}"

REQUISITOS LEGALES POR TIPO DE DOCUMENTO (para tu referencia interna):

FINIQUITO: nombre, RUT, empleador, RUT empleador, cargo, sueldo, fecha_inicio, fecha_termino, causal_termino
PODER SIMPLE: nombre, RUT, apoderado, RUT apoderado, facultades (qué puede hacer), para_que (trámite específico)
DESPIDO INJUSTIFICADO: nombre, RUT, empleador, cargo, sueldo, fecha_inicio, fecha_despido, detalle_caso (por qué es injustificado)
RECLAMO SERNAC: nombre, RUT, empresa, detalle_caso (qué pasó), que_quiere (solución), telefono/email
DEMANDA ALIMENTOS: nombre, RUT, demandado, hijos (nombre y fecha nacimiento), monto, necesidades
CONTRATO ARRIENDO: nombre, RUT, arrendatario, RUT arrendatario, inmueble (dirección), renta, fecha_inicio
RECURSO PROTECCION: nombre, RUT, recurrido (quién vulneró), detalle_caso (acto arbitrario), derecho_vulnerado

INSTRUCCIONES CRITICAS:
- Si "nombre" ya esta en DATOS YA RECOPILADOS, NO lo extraigas de nuevo
- Si "rut" ya esta en DATOS YA RECOPILADOS, NO lo extraigas de nuevo
- Si "empleador" o "empresa" ya estan en DATOS YA RECOPILADOS, NO los extraigas de nuevo
- Si "cargo" ya esta en DATOS YA RECOPILADOS, NO lo extraigas de nuevo
- NUNCA vuelvas a extraer un dato que ya existe en DATOS YA RECOPILADOS
- Si el usuario dice "MI auto", "MI casa", "MI departamento": el bien está a SU nombre, no preguntes de quién es
- Si el usuario dice "ya estoy saldado" o "no me deben nada": montos = $0, no preguntes montos
- Para poderes con trámite puntual (transferencia, retiro documento): NO necesita vigencia/plazo
- Extrae SOLO datos que el usuario EXPLICITAMENTE menciona en su mensaje
- Si el usuario responde con un dato simple (ej: "gerente operaciones"), ese es el dato que se le pregunto (el primer campo de DATOS QUE FALTAN)
- Responde SOLO en formato JSON con los campos extraidos
- PROHIBIDO inventar datos: NO pongas direcciones, fechas, montos o nombres que el usuario NO dijo
- Si no hay datos claros en el mensaje, responde {}
- Normaliza: nombres capitalizados, RUT con formato XX.XXX.XXX-X, cargo capitalizado
- "850 mil" = 850000, "un palo" = 1000000, "500 lucas" = 500000

CAMPOS POSIBLES (extrae SOLO si NO estan ya recopilados):
- nombre (nombre completo de la persona)
- rut (RUT chileno)
- empleador / empresa (nombre de la empresa)
- cargo (cargo en la empresa)
- sueldo (monto numerico sin simbolos)
- fecha_inicio (cuando empezo a trabajar)
- fecha_termino / fecha_despido (cuando termino)
- detalle_caso (que paso, los hechos - SOLO si el usuario da una narrativa)
- apoderado (nombre del apoderado, para poderes)
- demandado (nombre del demandado)
- monto (monto solicitado)
- patente (patente vehiculo)
- direccion (direccion/domicilio)
- recurrido (quien vulnero derechos)

EJEMPLO:
Si DATOS YA RECOPILADOS ya tiene: {"nombre": "Alejandro Matteucci"}
Y el usuario dice: "alejandro matteucci"
Tu respuesta debe ser: {}

REGLA DE ORO: Si el usuario NO dijo un dato, NO lo pongas. Si ya esta recopilado, NO lo vuelvas a extraer. Prefiero {} a duplicar.

Responde SOLO el JSON, nada mas.`;

  try {
    const llmResponse = await llmComplete({
      system: 'Extrae datos estructurados del mensaje. Responde SOLO JSON valido.',
      messages: [{ role: 'user', content: extractionPrompt }],
      temperature: 0,
      maxTokens: 300
    });

    if (llmResponse) {
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const datosExtraidos = JSON.parse(jsonMatch[0]);
          console.log('[extraer] LLM extrajo:', Object.keys(datosExtraidos));
          
          // ═══════════════════════════════════════════════════════
          // VALIDACION ANTI-ALUCINACION: verificar contra mensaje
          // ═══════════════════════════════════════════════════════
          const datosValidados = validarDatosContraMensaje(datosExtraidos, contenido);
          console.log('[extraer] Datos validados:', Object.keys(datosValidados));
          
          // Mergear datos validados (NUNCA sobreescribir existentes)
          // MERGE DEFENSIVO: Prioridad absoluta a datosActuales sobre lo nuevo
          for (const [key, value] of Object.entries(datosValidados)) {
            // Solo agregar si el valor NO existe y tiene contenido valido
            if (value && !datosActuales[key]) {
              datosActuales[key] = value;
              console.log(`[extraer] AGREGADO: ${key} = "${value}"`);
            } else if (datosActuales[key] && datosValidados[key]) {
              console.log(`[extraer] IGNORADO ${key} - ya existe: "${datosActuales[key]}" (nuevo: "${value}")`);
            }
          }
          
          // NORMALIZACIÓN DE ALIASES (como sistema viejo)
          if (!datosActuales.nombre && datosValidados.nombre_completo) {
            datosActuales.nombre = datosValidados.nombre_completo;
          }
          if (!datosActuales.direccion && datosValidados.domicilio) {
            datosActuales.direccion = datosValidados.domicilio;
          }
          if (!datosActuales.detalle_caso) {
            if (datosValidados.hechos) datosActuales.detalle_caso = datosValidados.hechos;
            else if (datosValidados.contexto) datosActuales.detalle_caso = datosValidados.contexto;
            else if (datosValidados.situacion) datosActuales.detalle_caso = datosValidados.situacion;
          }
          
          // Sincronizar empresa/empleador
          if (datosActuales.empresa && !datosActuales.empleador) datosActuales.empleador = datosActuales.empresa;
          if (datosActuales.empleador && !datosActuales.empresa) datosActuales.empresa = datosActuales.empleador;
          
          // ═══════════════════════════════════════════════════════
          // NORMALIZACION
          // ═══════════════════════════════════════════════════════
          if (datosActuales.nombre && typeof datosActuales.nombre === 'string') {
            datosActuales.nombre = capitalizarNombre(datosActuales.nombre as string);
          }
          if (datosActuales.apoderado && typeof datosActuales.apoderado === 'string') {
            datosActuales.apoderado = capitalizarNombre(datosActuales.apoderado as string);
          }
          if (datosActuales.demandado && typeof datosActuales.demandado === 'string') {
            datosActuales.demandado = capitalizarNombre(datosActuales.demandado as string);
          }
          if (datosActuales.empresa && typeof datosActuales.empresa === 'string') {
            datosActuales.empresa = capitalizarNombre(datosActuales.empresa as string);
          }
          if (datosActuales.empleador && typeof datosActuales.empleador === 'string') {
            datosActuales.empleador = capitalizarNombre(datosActuales.empleador as string);
          }
          if (datosActuales.rut && typeof datosActuales.rut === 'string') {
            datosActuales.rut = formatearRUT(datosActuales.rut as string);
          }
          if (datosActuales.cargo && typeof datosActuales.cargo === 'string') {
            const cargo = (datosActuales.cargo as string).trim().toLowerCase();
            datosActuales.cargo = cargo.charAt(0).toUpperCase() + cargo.slice(1);
          }
          
          console.log('[extraer] Datos despues de LLM:', Object.keys(datosActuales).filter(k => datosActuales[k]));
          
          // NOTE: No se asigna tipo_documento aqui - eso se hace en recopilarDatos
          return {
            datosRecopilados: datosActuales,
            tipoDocumento: state.tipoDocumento // Mantener el tipo existente sin cambios
          };
        } catch (e) {
          console.error('[extraer] Error parseando JSON del LLM:', e);
        }
      }
    }
  } catch (error) {
    console.error('[extraer] Error LLM:', error);
  }

  // Si el LLM falla completamente, devolver estado sin cambios
  console.log('[extraer] LLM no pudo extraer datos, devolviendo estado actual');
  return {
    datosRecopilados: datosActuales,
    tipoDocumento: state.tipoDocumento
  };
}

/**
 * NODO 2: Recopilar datos faltantes / Clasificar tipo de documento
 * 
 * LOGICA:
 * 1. Si NO hay tipo -> clasificar con LLM (temp=0)
 * 2. Si LLM devuelve tipo generico -> pedir clarificacion al usuario
 * 3. Si hay tipo -> validar completitud y preguntar datos faltantes
 * 4. NO usa regex para clasificar
 */
async function recopilarDatos(state: AgentState): Promise<Partial<AgentState>> {
  console.log('[recopilar] Datos actuales:', Object.keys(state.datosRecopilados));
  console.log('[recopilar] Tipo documento:', state.tipoDocumento);
  
  const { obtenerRequisitos, consultarRAG, agregarDocumentoAlRAG } = await import('./vectorstore');
  const { validarCompletitudTool } = await import('./tools');
  const { findTemplate, getTemplateRequirements } = await import('@/lib/templates');

  // ═══════════════════════════════════════════════════════════════
  // CASO 1: NO SABEMOS QUE TIPO DE DOCUMENTO ES
  // ═══════════════════════════════════════════════════════════════
  if (!state.tipoDocumento) {
    const ultimoMsg = state.messages[state.messages.length - 1];
    const texto = ultimoMsg ? ultimoMsg.content.toString() : '';
    
    if (texto.length < 3) {
      return {
        responseMessage: 'Hola, soy tu asistente legal. Cuentame, que documento necesitas? Por ejemplo: un finiquito, un poder, un reclamo, una demanda, etc.',
        datosFaltantes: ['tipo_documento', 'nombre', 'rut']
      };
    }

    // ═══════════════════════════════════════════════════════════════
    // CLASIFICACION CON LLM (temperature=0 para determinismo)
    // ═══════════════════════════════════════════════════════════════
    const clasificacionLLM = await llmComplete({
      system: `Eres un clasificador de documentos legales chilenos. Clasifica EXACTAMENTE lo que el usuario necesita desde SU perspectiva.

REGLAS CRITICAS:
1. Clasifica desde la perspectiva del USUARIO (no de la contraparte)
2. Distingue bien:
   - "no me dejan ver a mi hijo" = regulacion visitas (NO alimentos)
   - "me desalojan / me quieren echar" = defensa arrendatario (NO desahucio)
   - "quiero echar al arrendatario" = desahucio arrendador
   - "pension para mi hijo" = demanda alimentos
   - "vecino construyo algo / me tapa la luz" = denuncia obra nueva
   - "me cortaron la luz/agua" = recurso proteccion
   - "compre algo y no funciona / me bloquearon" = reclamo SERNAC
   - "prescribir multas / multas viejas" = prescripcion multa TAG
   - "me echaron / me despidieron / no me pagaron" = despido injustificado
   - "poder para que alguien haga algo por mi" = poder simple
   - "ex pareja no me deja ver a mi hijo" = regulacion visitas
   - "me desalojan pero tengo contrato" = defensa arrendatario
3. IMPORTANTE: Si realmente no puedes determinar el tipo, responde "necesito_clarificacion"
4. NO respondas con tipos genericos como "judicial", "otro", "general", "documento", "legal"

Tipos validos:
- finiquito laboral
- poder simple
- reclamo SERNAC
- carta renuncia
- demanda alimentos
- regulacion visitas
- custodia
- recurso proteccion
- prescripcion multa TAG
- despido injustificado
- defensa arrendatario
- desahucio arrendador
- contrato arriendo
- querella criminal
- denuncia penal
- denuncia obra nueva
- reclamo vecinal
- prescripcion deuda
- demanda civil
- contrato trabajo
- declaracion jurada
- certificado
- solicitud administrativa
- carta documento
- tutela laboral
- denuncia acoso laboral
- necesito_clarificacion

Responde SOLO el tipo (una linea), nada mas.`,
      messages: [{ role: 'user', content: texto }],
      temperature: 0,
      maxTokens: 50
    });
    
    if (clasificacionLLM) {
      const tipoDetectado = clasificacionLLM.trim().toLowerCase().replace(/['"\.]/g, '').trim();
      console.log(`[recopilar] LLM clasifico como: "${tipoDetectado}"`);
      
      // ═══════════════════════════════════════════════════════════
      // VALIDACION: Rechazar tipos genericos
      // ═══════════════════════════════════════════════════════════
      const tiposGenericos = ['judicial', 'otro', 'general', 'documento', 'legal', 'necesito_clarificacion', 'no se', 'no sé', 'indefinido'];
      const esGenerico = tiposGenericos.some(g => tipoDetectado === g || tipoDetectado.includes(g));
      
      if (esGenerico) {
        console.log(`[recopilar] Tipo generico detectado: "${tipoDetectado}" - pidiendo clarificacion`);
        return {
          responseMessage: 'Necesito entender mejor tu situacion. Puedes describir con mas detalle que documento necesitas? Por ejemplo: un finiquito laboral, un poder para otra persona, un reclamo contra una empresa, una defensa por desalojo, etc.',
          datosFaltantes: ['tipo_documento', 'nombre', 'rut']
        };
      }
      
      // Tipo especifico detectado - guardar en RAG para aprendizaje
      try {
        await agregarDocumentoAlRAG(
          `Documento tipo: ${tipoDetectado}\nConsulta original del usuario: ${texto}\nClasificacion: Este tipo de solicitud corresponde a "${tipoDetectado}"`,
          {
            titulo: `Clasificacion: ${tipoDetectado}`,
            tipo: 'clasificacion_aprendida',
            fuente: 'LLM + interaccion usuario',
            tags: [tipoDetectado, ...texto.split(' ').filter((w: string) => w.length > 4).slice(0, 5)]
          }
        );
      } catch (e) { /* no falla si no puede persistir */ }
      
      // ═══════════════════════════════════════════════════════════════
      // 🔥 SELECCIÓN AUTOMÁTICA DE PLANTILLA (80+ templates chilenos)
      // ═══════════════════════════════════════════════════════════════
      const template = findTemplate(tipoDetectado, texto);
      
      if (template) {
        console.log(`[recopilar] ✅ PLANTILLA SELECCIONADA: ${template.titulo} (${template.id})`);
        
        // Extraer requisitos OBLIGATORIOS de la plantilla
        const requisitosPlantilla = getTemplateRequirements(template);
        console.log(`[recopilar] Requisitos de plantilla: ${requisitosPlantilla.join(', ')}`);
        
        // Mensaje personalizado con hint de la plantilla
        const mensajeConPlantilla = `Perfecto, te ayudare con un "${template.titulo}". 

Esta es una plantilla oficial chilena verificada (${template.articulos.slice(0, 2).join(', ')}).

Para comenzar, necesito tu nombre completo y RUT (puedes darme ambos en el mismo mensaje).`;
        
        return {
          tipoDocumento: tipoDetectado,
          datosRecopilados: { 
            ...state.datosRecopilados, 
            tipo_documento: tipoDetectado,
            template_id: template.id, // ← Guardar qué plantilla se usa
            template_titulo: template.titulo
          },
          responseMessage: mensajeConPlantilla,
          datosFaltantes: ['nombre', 'rut', ...requisitosPlantilla.slice(0, 5)] // Primeros 5 requisitos
        };
      }
      
      // Sin plantilla → flujo genérico
      console.log(`[recopilar] ⚠️  SIN PLANTILLA para tipo: ${tipoDetectado} — usando flujo genérico`);
      
      return {
        tipoDocumento: tipoDetectado,
        datosRecopilados: { ...state.datosRecopilados, tipo_documento: tipoDetectado },
        responseMessage: `Perfecto, te ayudare con un "${tipoDetectado}". Para comenzar, necesito tu nombre completo y RUT (puedes darme ambos en el mismo mensaje).`,
        datosFaltantes: ['nombre', 'rut']
      };
    }
    
    // Si LLM falla completamente, pedir clarificacion
    return {
      responseMessage: 'Puedes describir con mas detalle que documento necesitas? Por ejemplo: un finiquito, un poder, un reclamo, una demanda, etc. Tambien necesitare tu nombre completo y RUT.',
      datosFaltantes: ['tipo_documento', 'nombre', 'rut']
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // CASO 2: YA SABEMOS EL TIPO -> SELECCIONAR PLANTILLA O BUSCAR EN INTERNET
  // ═══════════════════════════════════════════════════════════════
  
  // 🔥 PASO 1: VERIFICAR SI HAY PLANTILLA EN LAS 80 OFICIALES
  const template = findTemplate(state.tipoDocumento, JSON.stringify(state.datosRecopilados));
  let requisitosOficiales = '';
  
  if (template) {
    console.log(`[recopilar] ✅ PLANTILLA ENCONTRADA: ${template.titulo} (ID: ${template.id})`);
    console.log(`[recopilar] Artículos legales: ${template.articulos.join(', ')}`);
    
    // Extraer requisitos de la plantilla
    const requisitosPlantilla = getTemplateRequirements(template);
    requisitosOficiales = `REQUISITOS DE PLANTILLA "${template.titulo}" (verificada BCN):\n${requisitosPlantilla.map((r, i) => `${i + 1}. ${r}`).join('\n')}`;
    console.log(`[recopilar] Requisitos plantilla: ${requisitosPlantilla.length} campos`);
    
    // Guardar en datos que se usó plantilla oficial
    state.datosRecopilados.template_id = template.id;
    state.datosRecopilados.template_titulo = template.titulo;
  } else {
    // 🔥 PASO 2: NO HAY PLANTILLA → BUSCAR EN INTERNET (BCN, DT, SERNAC)
    console.log(`[recopilar] ⚠️  SIN PLANTILLA para "${state.tipoDocumento}" → BUSCANDO EN INTERNET`);
    
    try {
      // Buscar plantilla oficial en BCN
      const busquedaBCN = await llmComplete({
        system: 'Eres un asistente legal chileno. Identifica si existe una plantilla oficial en BCN para este tipo de documento.',
        messages: [{
          role: 'user',
          content: `Tipo de documento: "${state.tipoDocumento}"
          
¿Existe una plantilla oficial en la Biblioteca del Congreso Nacional (BCN), Dirección del Trabajo, SERNAC u otra institución chilena para este tipo de documento?

Responde en JSON:
{
  "existe_plantilla": true/false,
  "fuente_url": "URL de la plantilla oficial si existe",
  "fuente_nombre": "BCN / Dirección del Trabajo / SERNAC / etc.",
  "requisitos_basicos": ["campo1", "campo2", ...] // campos que el documento necesita según la ley chilena
}`
        }],
        temperature: 0,
        maxTokens: 500
      });
      
      if (busquedaBCN) {
        const jsonMatch = busquedaBCN.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const plantillaWeb = JSON.parse(jsonMatch[0]);
          
          if (plantillaWeb.existe_plantilla && plantillaWeb.requisitos_basicos) {
            console.log(`[recopilar] 🌐 PLANTILLA WEB ENCONTRADA: ${plantillaWeb.fuente_nombre}`);
            console.log(`[recopilar] URL: ${plantillaWeb.fuente_url}`);
            
            requisitosOficiales = `PLANTILLA OFICIAL DE ${plantillaWeb.fuente_nombre}:\nFuente: ${plantillaWeb.fuente_url}\n\nREQUISITOS:\n${plantillaWeb.requisitos_basicos.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}`;
            
            // Guardar en datos que se encontró plantilla web
            state.datosRecopilados.template_fuente = plantillaWeb.fuente_nombre;
            state.datosRecopilados.template_url = plantillaWeb.fuente_url;
            state.datosRecopilados.requisitos_web = plantillaWeb.requisitos_basicos;
            
            // Agregar al RAG para futuras consultas
            await agregarDocumentoAlRAG(
              `Plantilla oficial para "${state.tipoDocumento}" encontrada en ${plantillaWeb.fuente_nombre}\nURL: ${plantillaWeb.fuente_url}\nRequisitos: ${plantillaWeb.requisitos_basicos.join(', ')}`,
              {
                titulo: `Plantilla web: ${state.tipoDocumento}`,
                tipo: 'plantilla_web',
                fuente: plantillaWeb.fuente_nombre,
                tags: [state.tipoDocumento, plantillaWeb.fuente_nombre, 'plantilla', 'oficial']
              }
            );
          } else {
            console.log(`[recopilar] ⚠️  No existe plantilla oficial web para "${state.tipoDocumento}"`);
            // Fallback: usar RAG local
            requisitosOficiales = await obtenerRequisitos(state.tipoDocumento);
          }
        }
      }
    } catch (error) {
      console.error('[recopilar] Error buscando plantilla en internet:', error);
      // Fallback: consultar RAG local
      try {
        requisitosOficiales = await obtenerRequisitos(state.tipoDocumento);
        console.log('[recopilar] Requisitos BCN (fallback RAG):', requisitosOficiales.slice(0, 100));
      } catch (e) {
        console.error('[recopilar] Error consultando RAG:', e);
      }
    }
  }
  
  // Consultar requisitos oficiales del RAG (fallback si no hay plantilla ni web)
  if (!requisitosOficiales) {
    try {
      requisitosOficiales = await obtenerRequisitos(state.tipoDocumento);
      console.log('[recopilar] Requisitos BCN (RAG fallback):', requisitosOficiales.slice(0, 100));
    } catch (error) {
      console.error('[recopilar] Error consultando RAG:', error);
    }
  }

  // Validar completitud
  try {
    const validacion = await validarCompletitudTool.invoke({
      tipoDocumento: state.tipoDocumento,
      datosRecopilados: state.datosRecopilados
    });

    console.log('[recopilar] Validacion:', {
      completo: validacion.completo,
      faltantes: validacion.datos_faltantes
    });

    // ═══════════════════════════════════════════════════════════════
    // RED DE SEGURIDAD TYPESCRIPT (como sistema viejo)
    // ═══════════════════════════════════════════════════════════════
    
    // VALIDACIÓN DOBLE con validateReadyState (TypeScript puro)
    const validacionTS = validateReadyState({
      tipo_documento: state.tipoDocumento,
      ...state.datosRecopilados
    });
    
    // CASO 1: LLM dice "completo" pero TypeScript detecta campos faltantes → BLOQUEAR
    if (validacion.completo && !validacionTS.valid) {
      console.log(`[recopilar] 🚨 BLOQUEADO por TypeScript — faltan: ${validacionTS.missing.join(', ')}`);
      const pregunta = generateMissingFieldQuestion(validacionTS.missing);
      return {
        responseMessage: pregunta,
        datosFaltantes: validacionTS.missing,
        ready: false
      };
    }
    
    // CASO 2: TypeScript confirma completitud → FORZAR ready=true
    if (validacionTS.valid) {
      console.log(`[recopilar] ✅ FORZADO ready=true por TypeScript — todos los campos presentes`);
      return {
        ready: true,
        datosFaltantes: [],
        responseMessage: 'Tengo todos los datos necesarios para tu documento. Procedo a redactarlo.'
      };
    }
    
    // CASO 3: Ambos coinciden en que falta algo → seguir preguntando
    if (!validacion.completo) {
      // Generar pregunta inteligente
      let pregunta = validacion.siguiente_pregunta || 'Puedes darme mas informacion?';
      
      // Si hay requisitos BCN relevantes, mencionarlos
      if (requisitosOficiales && validacion.datos_faltantes && validacion.datos_faltantes.length > 0) {
        const campoFaltante = validacion.datos_faltantes[0];
        if (requisitosOficiales.toLowerCase().includes(campoFaltante.toLowerCase())) {
          pregunta += ` (obligatorio segun normativa vigente)`;
        }
      }

      return {
        responseMessage: pregunta,
        datosFaltantes: validacion.datos_faltantes || [],
        ready: false
      };
    }
    
    // Fallback: marcar como completo si llegamos aquí
    return {
      ready: true,
      datosFaltantes: [],
      responseMessage: 'Tengo todos los datos necesarios para tu documento. Procedo a redactarlo.'
    };

  } catch (error) {
    console.error('[graph] Error en recopilarDatos:', error);
    return {
      responseMessage: 'Puedes contarme mas sobre tu situacion?'
    };
  }
}

// ─── CONSTRUCCION DEL GRAPH ──────────────────────────────────────────────────

export function createLegalAgentGraph() {
  const workflow = new StateGraph<AgentState>({
    channels: {
      messages: {
        value: (prev: Array<HumanMessage | AIMessage | SystemMessage>, next: Array<HumanMessage | AIMessage | SystemMessage>) => 
          next ? next : prev,
        default: () => []
      },
      tipoDocumento: {
        value: (prev: string | null, next: string | null) => next !== undefined ? next : prev,
        default: () => null
      },
      datosRecopilados: {
        value: (prev: Record<string, unknown>, next: Record<string, unknown>) => 
          next ? { ...prev, ...next } : prev,
        default: () => ({})
      },
      datosFaltantes: {
        value: (prev: string[], next: string[]) => next !== undefined ? next : prev,
        default: () => []
      },
      ready: {
        value: (prev: boolean, next: boolean) => next !== undefined ? next : prev,
        default: () => false
      },
      responseMessage: {
        value: (prev: string, next: string) => next !== undefined ? next : prev,
        default: () => ''
      },
      conversationHistory: {
        value: (prev: Array<{ role: string; content: string }>, next: Array<{ role: string; content: string }>) => 
          next ? next : prev,
        default: () => []
      }
    }
  });

  // Agregar nodos
  workflow.addNode('extraer', extraerDatos);
  workflow.addNode('recopilar', recopilarDatos);

  // Flujo LINEAL: START -> extraer -> recopilar -> END
  (workflow as any).addEdge(START, 'extraer');
  (workflow as any).addEdge('extraer', 'recopilar');
  (workflow as any).addEdge('recopilar', END);

  return workflow.compile();
}

// ─── HELPER: Ejecutar el graph ───────────────────────────────────────────────

export async function runAgent(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }> = [],
  currentData: Record<string, unknown> = {}
) {
  const graph = createLegalAgentGraph();

  const messages = conversationHistory.map(msg => 
    msg.role === 'user' 
      ? new HumanMessage(msg.content)
      : new AIMessage(msg.content)
  );
  messages.push(new HumanMessage(userMessage));

  // Extraer solo los datos relevantes del documento (excluir metadatos)
  const datosRecopilados = Object.keys(currentData).reduce((acc, key) => {
    if (['response_message', 'tipo_documento', 'datos_faltantes', 'ready', 'datos_recopilados'].includes(key)) {
      return acc;
    }
    acc[key] = currentData[key];
    return acc;
  }, {} as Record<string, unknown>);

  const initialState: AgentState = {
    messages,
    tipoDocumento: currentData.tipo_documento as string || null,
    datosRecopilados: {
      ...(currentData.datos_recopilados as Record<string, unknown> || {}),
      ...datosRecopilados
    },
    datosFaltantes: (currentData.datos_faltantes as string[]) || [],
    ready: currentData.ready === true,
    responseMessage: '',
    conversationHistory
  };

  try {
    const result = await graph.invoke(initialState as any, {
      recursionLimit: 3
    });
    
    const returnValue = {
      response_message: result.responseMessage,
      tipo_documento: result.tipoDocumento,
      datos_recopilados: result.datosRecopilados,
      datos_faltantes: result.datosFaltantes,
      ready: result.ready,
      ...((result.datosRecopilados || {}) as any)
    };
    
    return returnValue;

  } catch (error) {
    console.error('[graph] Error ejecutando agente:', error);
    throw error;
  }
}
