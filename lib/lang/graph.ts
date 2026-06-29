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
import { findGuide, buildGuidePrompt } from '@/lib/hubGuides';
import { buscarMarcoLegal } from '@/lib/bcnScraper';

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
CARTA RECLAMO COBRANZA: nombre, RUT, destinatario (a quién reclama), detalle_caso (qué pasó), monto (cuánto reclama), que_quiere (solución), plazo (días para responder)

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
          
          // Validacion anti-alucinacion
          const datosValidados = validarDatosContraMensaje(datosExtraidos, contenido);
          console.log('[extraer] Datos validados:', Object.keys(datosValidados));
          
          // Merge defensivo - prioridad a datos existentes
          for (const [key, value] of Object.entries(datosValidados)) {
            if (value && !datosActuales[key]) {
              datosActuales[key] = value;
              console.log(`[extraer] AGREGADO: ${key} = "${value}"`);
            }
          }
          
          // Normalización de aliases
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
          if (datosActuales.empresa && !datosActuales.empleador) datosActuales.empleador = datosActuales.empresa;
          if (datosActuales.empleador && !datosActuales.empresa) datosActuales.empresa = datosActuales.empleador;
          
          // Normalización de formato
          if (datosActuales.nombre && typeof datosActuales.nombre === 'string') {
            datosActuales.nombre = capitalizarNombre(datosActuales.nombre as string);
          }
          if (datosActuales.rut && typeof datosActuales.rut === 'string') {
            datosActuales.rut = formatearRUT(datosActuales.rut as string);
          }
          if (datosActuales.cargo && typeof datosActuales.cargo === 'string') {
            const cargo = (datosActuales.cargo as string).trim().toLowerCase();
            datosActuales.cargo = cargo.charAt(0).toUpperCase() + cargo.slice(1);
          }
          
          console.log('[extraer] Datos despues de LLM:', Object.keys(datosActuales).filter(k => datosActuales[k]));
          
          return {
            datosRecopilados: datosActuales,
            tipoDocumento: state.tipoDocumento
          };
        } catch (e) {
          console.error('[extraer] Error parseando JSON del LLM:', e);
        }
      }
    }
  } catch (error) {
    console.error('[extraer] Error LLM:', error);
  }

  // REINTENTO: si el LLM falló, intentar una vez más con prompt simplificado
  console.log('[extraer] Primer intento falló, reintentando con prompt simplificado...');
  try {
    const retryPrompt = `Extrae datos del mensaje del usuario. Responde SOLO JSON valido, nada mas.

MENSAJE: "${contenido}"

CAMPOS POSIBLES (solo si aparecen en el mensaje):
- nombre
- rut
- empleador / empresa
- cargo
- sueldo (numero)
- fecha_inicio
- fecha_termino / fecha_despido
- detalle_caso
- apoderado
- demandado
- monto
- direccion
- destinatario
- que_quiere

Si no hay datos claros, responde {}

Responde SOLO el JSON.`;

    const retryResponse = await llmComplete({
      system: 'Extrae datos estructurados. Responde SOLO JSON.',
      messages: [{ role: 'user', content: retryPrompt }],
      temperature: 0,
      maxTokens: 200
    });

    if (retryResponse) {
      const jsonMatch = retryResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const datosExtraidos = JSON.parse(jsonMatch[0]);
        console.log('[extraer] Reintento extrajo:', Object.keys(datosExtraidos));
        for (const [key, value] of Object.entries(datosExtraidos)) {
          if (value && !datosActuales[key] && typeof value === 'string' && value.length > 0) {
            datosActuales[key] = value;
          }
        }
      }
    }
  } catch (retryError) {
    console.error('[extraer] Reintento también falló:', retryError);
  }

  // Si ambos fallan, devolver estado actual sin cambios
  console.log('[extraer] Devolviendo estado actual sin cambios');
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
  // Si ya está ready, no hacer nada (evitar loop post-ready)
  if (state.ready) {
    console.log('[recopilar] Ya ready - saltando');
    return {
      responseMessage: 'El documento ya está listo. Puedes revisarlo en la vista previa y desbloquearlo cuando quieras.'
    };
  }

  console.log('[recopilar] Datos actuales:', Object.keys(state.datosRecopilados));
  console.log('[recopilar] Tipo documento:', state.tipoDocumento);
  
  // ═══════════════════════════════════════════════════════════════
  // CASO ESPECIAL: Usuario respondiendo a pregunta de aclaración
  // ═══════════════════════════════════════════════════════════════
  const datosFaltantesActuales = state.datosFaltantes || [];
  
  // Si estábamos esperando clarificación de tipo_vendedor
  if (datosFaltantesActuales.includes('tipo_vendedor')) {
    const ultimoMsg = state.messages[state.messages.length - 1];
    const respuesta = ultimoMsg ? ultimoMsg.content.toString().toLowerCase() : '';
    
    if (/empresa|automotora|tienda|concesionario|retail|comercio/.test(respuesta)) {
      console.log(`[recopilar] Usuario confirmó: venta por EMPRESA → Reclamo SERNAC`);
      // Reclasificar como SERNAC y continuar
      return await recopilarDatos({
        ...state,
        tipoDocumento: 'reclamo SERNAC',
        datosRecopilados: {
          ...state.datosRecopilados,
          tipo_documento: 'reclamo SERNAC',
          tipo_vendedor: 'empresa'
        },
        datosFaltantes: []
      });
    } else if (/particular|persona|privado|amigo|conocido/.test(respuesta)) {
      console.log(`[recopilar] Usuario confirmó: venta por PARTICULAR → Demanda civil`);
      // Reclasificar como demanda civil y continuar
      return await recopilarDatos({
        ...state,
        tipoDocumento: 'demanda civil engaño',
        datosRecopilados: {
          ...state.datosRecopilados,
          tipo_documento: 'demanda civil engaño',
          tipo_vendedor: 'particular'
        },
        datosFaltantes: []
      });
    }
  }
  
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
    // OVERRIDE PRE-LLM: Forzar clasificacion por regex (mas rapido y preciso)
    // ═══════════════════════════════════════════════════════════════
    const textoNorm = texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const OVERRIDES: [RegExp, string][] = [
      [/licencia\s+(de\s+)?conducir|uber|didil?|cabify/, 'solicitud administrativa'],
      [/pension\s+alimenticia|debo\s+alimentos|deudor\s+alimentos/, 'registro deudores pensiones alimentos'],
      [/elimin(ar|acion)(\s+\S+)?\s+(de\s+)?(antecedentes|prontuario)|borrar\s+(antecedentes|prontuario)/, 'eliminacion antecedentes penales'],
      [/limpi(a|ar)(\s+\S+)?\s+(hoja\s+de\s+)?vida\s+(del\s+)?conductor|limpiar\s+registro/, 'limpieza hoja vida conductor'],
      [/omis(ion|ir)(\s+\S+)?\s+antecedentes|vif|violencia\s+intrafamiliar/, 'omision antecedentes violencia intrafamiliar'],
      [/registro\s+(nacional\s+)?deudor(es)?|deudor\s+(de\s+)?pension(es)?|moroso\s+pension/, 'registro deudores pensiones alimentos'],
      [/acuerdo\s+(de\s+)?confidencialidad|nda|confidencial/, 'acuerdo confidencialidad'],
      [/acuerdo\s+(de\s+)?pago|convenio\s+pago|reprogramar\s+deuda/, 'acuerdo pago deuda'],
      [/divorcio\s+(de\s+)?mutuo\s+acuerdo/, 'acuerdo divorcio mutuo acuerdo'],
      [/tuici[o]n\s+compartida|cuidado\s+personal\s+(compartido\s+)?hijos|tenencia\s+compartida|custodia\s+compartida/, 'acuerdo tuicion compartida'],
      [/certificado\s+(de\s+)?antecedentes/, 'certificado antecedentes fines especiales'],
    ];
    for (const [regex, tipoForzado] of OVERRIDES) {
      if (regex.test(textoNorm)) {
        console.log(`[recopilar] PRE-OVERRIDE: forzado a "${tipoForzado}"`);
        return await recopilarDatos({
          ...state,
          tipoDocumento: tipoForzado,
          datosRecopilados: { ...state.datosRecopilados, tipo_documento: tipoForzado },
          datosFaltantes: []
        });
      }
    }
    
    // ═══════════════════════════════════════════════════════════════
    // CLASIFICACION CON LLM (temperature=0 para determinismo)
    // ═══════════════════════════════════════════════════════════════
    const clasificacionLLM = await llmComplete({
      system: `Clasifica documentos legales chilenos. Regla de oro: PRIMERO determina QUE QUIERE LOGRAR el usuario.

PASO 1 - INTENCION (que quiere lograr):
- "reclamar", "cobrar", "que me devuelvan", "reclamo", "que me paguen" → RECLAMAR/COBRAR → carta reclamo cobranza
- "prescribir", "eliminar multa" → PRESCRIBIR → prescripcion multa tag
- "demandar" → DEMANDAR → demanda civil
- "desalojo", "echar inquilino" → DESALOJAR → desahucio arrendador
- "defenderme", "me quieren echar" → DEFENDERSE → defensa arrendatario
- "poder", "que alguien haga por mi" → PODER → poder simple
- "recurso proteccion", "vulneraron mis derechos", "me cortaron luz/agua" → RECURSO → recurso proteccion
- "renunciar" → RENUNCIA → carta renuncia
- "finiquito" → FINIQUITO → finiquito laboral
- "alimentos", "pension hijo" → ALIMENTOS → demanda alimentos
- "ver a mi hijo", "visitas" → VISITAS → regulacion visitas
- "contrato" → CONTRATO → contrato arriendo o trabajo

PASO 2 - CONTEXTO NO ANULA INTENCION:
Ejemplos CORRECTOS:
- "reclamo porque mi arrendador no devuelve garantia" → INTENCION RECLAMAR → carta reclamo cobranza
- "reclamo a empresa por mal servicio" → INTENCION RECLAMAR → reclamo sernac
- "carta para que mi ex empleador me pague" → INTENCION RECLAMAR → carta reclamo cobranza
- "me quieren echar del depto" → INTENCION DEFENDERSE → defensa arrendatario
- "quiero echar al inquilino" → INTENCION DESALOJAR → desahucio arrendador

CASOS ESPECIALES (debes detectar exactamente):
- Si pide "carta de recomendacion", "certificado trabajo", "curriculum", "CV" → documento_no_legal
- Si dice "compre auto/producto" sin decir automotora/particular → necesito_clarificacion_vendedor
- Si dice "compre auto en automotora" → reclamo sernac
- Si dice "compre auto a particular" → demanda civil
- "me echaron del trabajo" → despido injustificado
- "no me pagan cotizaciones" → denuncia no pago cotizaciones
- "demanda por divorcio" → necesito_clarificacion (requiere abogado)
- "eliminar antecedentes penales", "borrar prontuario" → eliminacion antecedentes penales
- "limpiar hoja vida conductor", "limpiar registro conductor" → limpieza hoja vida conductor
- "omision antecedentes vif", "borrar antecedentes violencia intrafamiliar" → omision antecedentes vif
- "inscribir deudor pension alimentos", "registro nacional deudores" → registro deudores pensiones alimentos
- "acuerdo confidencialidad", "nda" → acuerdo confidencialidad
- "acuerdo pago deuda", "convenio pago" → acuerdo pago deuda
- "divorcio mutuo acuerdo" → acuerdo divorcio mutuo acuerdo
- "tuicion compartida", "cuidado personal hijos" → acuerdo tuicion compartida
- "certificado antecedentes", "certificado de antecedentes" → certificado antecedentes fines especiales

SI NO SABES → necesito_clarificacion
NO uses tipos genericos: judicial, otro, general, documento, legal

Responde SOLO el tipo (una linea).`,
      messages: [{ role: 'user', content: texto }],
      temperature: 0,
      maxTokens: 50
    });
    
    if (clasificacionLLM) {
      const tipoDetectado = clasificacionLLM.trim().toLowerCase().replace(/['"\.]/g, '').trim();
      console.log(`[recopilar] LLM clasifico como: "${tipoDetectado}"`);
      
      // OVERRIDE: Forzar clasificacion para tipos nuevos que el LLM no detecta
      const textoNorm = texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const OVERRIDES: [RegExp, string][] = [
        [/elimin(ar|acion)(\s+\S+)?\s+(de\s+)?(antecedentes|prontuario)|borrar\s+(antecedentes|prontuario)/, 'eliminacion antecedentes penales'],
        [/limpi(a|ar)(\s+\S+)?\s+(hoja\s+de\s+)?vida\s+(del\s+)?conductor|limpiar\s+registro/, 'limpieza hoja vida conductor'],
        [/omis(ion|ir)(\s+\S+)?\s+antecedentes|vif|violencia\s+intrafamiliar/, 'omision antecedentes violencia intrafamiliar'],
        [/registro\s+(nacional\s+)?deudor(es)?|deudor\s+(de\s+)?pension(es)?|moroso\s+pension/, 'registro deudores pensiones alimentos'],
        [/acuerdo\s+(de\s+)?confidencialidad|nda|confidencial/, 'acuerdo confidencialidad'],
        [/acuerdo\s+(de\s+)?pago|convenio\s+pago|reprogramar\s+deuda/, 'acuerdo pago deuda'],
        [/divorcio\s+(de\s+)?mutuo\s+acuerdo/, 'acuerdo divorcio mutuo acuerdo'],
        [/tuici[o]n\s+compartida|cuidado\s+personal\s+(compartido\s+)?hijos|tenencia\s+compartida|custodia\s+compartida|padres\s+de\s+\S+\s+hijo/, 'acuerdo tuicion compartida'],
        [/certificado\s+(de\s+)?antecedentes/, 'certificado antecedentes fines especiales'],
      ];
      for (const [regex, tipo] of OVERRIDES) {
        if (regex.test(textoNorm)) {
          console.log(`[recopilar] OVERRIDE: forzado a "${tipo}"`);
          return await recopilarDatos({
            ...state,
            tipoDocumento: tipo,
            datosRecopilados: { ...state.datosRecopilados, tipo_documento: tipo },
            datosFaltantes: []
          });
        }
      }
      
      // VALIDACION: Rechazar tipos genericos
      // ═══════════════════════════════════════════════════════════
      const tiposGenericos = ['judicial', 'otro', 'general', 'documento', 'legal', 'necesito_clarificacion', 'no se', 'no sé', 'indefinido'];
      const esGenerico = tiposGenericos.some(g => tipoDetectado === g || tipoDetectado.includes(g));
      
      if (esGenerico) {
        console.log(`[recopilar] Tipo generico detectado: "${tipoDetectado}" - pidiendo clarificacion`);
        
        // CONTADOR DE REINTENTOS: si ya estamos en la segunda vuelta, ofrecer opciones
        const estadoAnteriorDatos = Object.keys(state.datosRecopilados).length;
        const mensajesPrevios = state.conversationHistory.filter(m => m.role === 'user').length;
        
        if (mensajesPrevios >= 2) {
          console.log(`[recopilar] El usuario ya intento ${mensajesPrevios} veces - ofreciendo opciones`);
          return {
            responseMessage: `Disculpa, no estoy logrando entender exactamente qué documento necesitas. Aquí tienes los documentos que puedo ayudarte a redactar:

📄 **Finiquito laboral** - término de relación laboral
📄 **Carta de renuncia** - renuncia voluntaria al trabajo
📄 **Poder simple** - autorización para que alguien haga un trámite por ti
📄 **Carta reclamo / cobranza** - para cobrar una deuda o reclamar algo
📄 **Reclamo SERNAC** - queja contra una empresa
📄 **Demanda de alimentos** - pensión para hijos
📄 **Recurso de protección** - vulneración de derechos
📄 **Prescripción multa TAG / deuda** - para eliminar multas viejas
📄 **Despido injustificado** - si te echaron sin razón
📄 **Contrato de arriendo** - para arrendar una propiedad

¿Cuál de estos se acerca más a lo que necesitas?`,
            datosFaltantes: ['tipo_documento']
          };
        }
        
        return {
          responseMessage: 'Necesito entender mejor tu situacion. Puedes describir con mas detalle que documento necesitas? Por ejemplo: un finiquito laboral, un poder para otra persona, un reclamo contra una empresa, una defensa por desalojo, etc.',
          datosFaltantes: ['tipo_documento', 'nombre', 'rut']
        };
      }
      
      // ═══════════════════════════════════════════════════════════
      // CASO ESPECIAL 1: Documento NO legal (carta recomendación, CV)
      // ═══════════════════════════════════════════════════════════
      if (tipoDetectado === 'documento_no_legal' || tipoDetectado.includes('no legal')) {
        console.log(`[recopilar] Documento NO legal detectado - informando al usuario`);
        return {
          responseMessage: 'Lo que necesitas no es un documento legal que yo pueda ayudarte a redactar. Las cartas de recomendación, certificados laborales y currículums son documentos corporativos que debe emitir tu empleador o tú mismo.\n\nSi necesitas un documento legal relacionado con tu trabajo (finiquito, reclamo por despido, etc.), puedo ayudarte. ¿Hay algún problema legal que necesites resolver?',
          datosFaltantes: []
        };
      }
      
      // ═══════════════════════════════════════════════════════════
      // CASO ESPECIAL 2: Caso ambiguo (auto/producto - empresa vs particular)
      // ═══════════════════════════════════════════════════════════
      if (tipoDetectado === 'necesito_clarificacion_vendedor' || tipoDetectado.includes('clarificacion_vendedor')) {
        console.log(`[recopilar] Caso ambiguo vendedor - pidiendo aclaracion`);
        return {
          responseMessage: 'Para ayudarte correctamente, necesito saber: ¿compraste el producto/auto a una empresa/automotora/tienda, o se lo compraste a un particular?\n\n- Si fue en empresa/automotora → Reclamo SERNAC (Ley del Consumidor)\n- Si fue a particular → Demanda civil por engaño',
          datosFaltantes: ['tipo_vendedor', 'tipo_documento']
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
        
        // Extraer requisitos de la plantilla para contextualizar al LLM
        const requisitosPlantilla = getTemplateRequirements(template);
        console.log(`[recopilar] Requisitos de plantilla: ${requisitosPlantilla.join(', ')}`);
        
        // MAPA: tipo_documento → campos canónicos para datos_faltantes
        // Estos son nombres que el sistema de extracción (extraerDatos) entiende
        const CAMPOS_CANONICOS: Record<string, string[]> = {
          'carta reclamo cobranza': ['nombre', 'rut', 'destinatario', 'detalle_caso', 'monto', 'que_quiere'],
          'reclamo sernac': ['nombre', 'rut', 'empresa', 'detalle_caso', 'que_quiere'],
          'finiquito laboral': ['nombre', 'rut', 'empleador', 'cargo', 'sueldo', 'fecha_inicio', 'fecha_termino'],
          'despido injustificado': ['nombre', 'rut', 'empleador', 'cargo', 'sueldo', 'fecha_inicio', 'fecha_despido', 'detalle_caso'],
          'poder simple': ['nombre', 'rut', 'apoderado', 'facultades'],
          'demanda alimentos': ['nombre', 'rut', 'demandado', 'hijos', 'monto'],
          'recurso proteccion': ['nombre', 'rut', 'recurrido', 'detalle_caso', 'derecho_vulnerado'],
          'prescripcion multa tag': ['nombre', 'rut', 'patente'],
          'defensa arrendatario': ['nombre', 'rut', 'direccion', 'detalle_caso'],
          'desahucio arrendador': ['nombre', 'rut', 'arrendatario', 'inmueble', 'detalle_caso'],
          'contrato arriendo': ['nombre', 'rut', 'arrendatario', 'inmueble', 'renta'],
          'carta renuncia': ['nombre', 'rut', 'empleador'],
          'declaracion jurada': ['nombre', 'rut', 'detalle_caso'],
        };
        
        // Buscar campos canónicos, o fallback a nombre+rut si no hay mapeo
        const tipoNorm = tipoDetectado.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        let camposFaltantes = ['nombre', 'rut'];
        for (const [key, fields] of Object.entries(CAMPOS_CANONICOS)) {
          if (tipoNorm.includes(key) || key.includes(tipoNorm)) {
            camposFaltantes = fields;
            break;
          }
        }
        
        // VERIFICAR si los datos extraídos ya cubren todo (primer mensaje con datos completos)
        const datosRecop = state.datosRecopilados;
        const faltantesReales = camposFaltantes.filter(campo => {
          const val = datosRecop[campo];
          return !val || (typeof val === 'string' && val.trim().length === 0);
        });
        
        if (faltantesReales.length === 0) {
          console.log(`[recopilar] ✅ Datos completos en primer mensaje para: ${tipoDetectado}`);
          return {
            tipoDocumento: tipoDetectado,
            datosRecopilados: { 
              ...state.datosRecopilados, 
              tipo_documento: tipoDetectado,
              template_id: template.id,
              template_titulo: template.titulo
            },
            ready: true,
            responseMessage: 'Tengo todos los datos necesarios para tu documento. Procedo a redactarlo.',
            datosFaltantes: []
          };
        }
        
        // Mensaje personalizado con hint de la plantilla
        const mensajeConPlantilla = `Perfecto, te ayudare con un "${template.titulo}". 

Esta es una plantilla oficial chilena verificada (${template.articulos.slice(0, 2).join(', ')}).

Para comenzar, necesito tu nombre completo y RUT (puedes darme ambos en el mismo mensaje).`;

        return {
          tipoDocumento: tipoDetectado,
          datosRecopilados: { 
            ...state.datosRecopilados, 
            tipo_documento: tipoDetectado,
            template_id: template.id,
            template_titulo: template.titulo
          },
          responseMessage: mensajeConPlantilla,
          datosFaltantes: camposFaltantes
        };
      }
      
      // ═══════════════════════════════════════════════════════════════
      // 🔥 SIN PLANTILLA LOCAL → BUSCAR EN HUB_GUIDES + RAG
      // ═══════════════════════════════════════════════════════════════
      console.log(`[recopilar] SIN PLANTILLA LOCAL para tipo: ${tipoDetectado}`);
      console.log(`[recopilar] Buscando en hub_guides.json...`);

      let guiaPrompt = '';
      const guide = findGuide(tipoDetectado);
      if (guide) {
        guiaPrompt = buildGuidePrompt(tipoDetectado, guide);
        console.log(`[recopilar] ✅ Guía encontrada en hub_guides para: ${tipoDetectado}`);
        state.datosRecopilados.template_fuente = 'hub_guides';
      } else {
        console.log(`[recopilar] Sin guía en hub_guides, consultando RAG...`);
        try {
          const requisitosRAG = await obtenerRequisitos(tipoDetectado);
          if (requisitosRAG) {
            guiaPrompt = requisitosRAG.slice(0, 500);
            state.datosRecopilados.template_fuente = 'RAG local';
          }
        } catch (e) {
          console.error('[recopilar] Error consultando RAG:', e);
        }

        // Si tampoco hay RAG, buscar en BCN en vivo
        if (!guiaPrompt) {
          try {
            const bcnResult = await buscarMarcoLegal(tipoDetectado);
            if (bcnResult.encontrado && bcnResult.marcoLegal) {
              guiaPrompt = bcnResult.marcoLegal.slice(0, 500);
              state.datosRecopilados.template_fuente = bcnResult.fuente || 'BCN';
              console.log(`[recopilar] ✅ Marco legal encontrado en BCN para: ${tipoDetectado}`);
            }
          } catch (e) {
            console.error('[recopilar] Error buscando en BCN:', e);
          }
        }
      }

      // Si hay guía de hub_guides, pedir datos más específicos
      const mensaje = guiaPrompt
        ? `Perfecto, te ayudare con un "${tipoDetectado}". Para comenzar, necesito tu nombre completo y RUT (puedes darme ambos en el mismo mensaje).`
        : `Perfecto, te ayudare con un "${tipoDetectado}". Para comenzar, necesito tu nombre completo y RUT (puedes darme ambos en el mismo mensaje).`;

      return {
        tipoDocumento: tipoDetectado,
        datosRecopilados: { 
          ...state.datosRecopilados, 
          tipo_documento: tipoDetectado,
          ...(guiaPrompt ? { guia_contexto: guiaPrompt } : {})
        },
        responseMessage: mensaje,
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
    // 🔥 PASO 2: NO HAY PLANTILLA → BUSCAR EN HUB_GUIDES + RAG
    console.log(`[recopilar] SIN PLANTILLA para "${state.tipoDocumento}" → buscando en hub_guides.json`);

    const guide = findGuide(state.tipoDocumento);
    if (guide) {
      const guiaPrompt = buildGuidePrompt(state.tipoDocumento!, guide);
      requisitosOficiales = `MARCO LEGAL (hub_guides):\n${guiaPrompt}`;
      console.log(`[recopilar] ✅ Guía encontrada en hub_guides: ${state.tipoDocumento}`);
      state.datosRecopilados.template_fuente = 'hub_guides';
      state.datosRecopilados.guia_contexto = guiaPrompt;
    } else {
      console.log(`[recopilar] Sin guía en hub_guides, consultando RAG...`);
      try {
        requisitosOficiales = await obtenerRequisitos(state.tipoDocumento);
        if (requisitosOficiales) {
          console.log('[recopilar] Requisitos encontrados en RAG');
          state.datosRecopilados.template_fuente = 'RAG local';
        }
      } catch (e) {
        console.error('[recopilar] Error RAG:', e);
      }

      // Búsqueda en BCN en vivo como último recurso
      if (!requisitosOficiales) {
        try {
          const bcnResult = await buscarMarcoLegal(state.tipoDocumento!);
          if (bcnResult.encontrado && bcnResult.marcoLegal) {
            requisitosOficiales = bcnResult.marcoLegal.slice(0, 800);
            state.datosRecopilados.template_fuente = bcnResult.fuente || 'BCN';
            console.log(`[recopilar] ✅ Marco legal BCN encontrado en vivo`);
          }
        } catch (e) {
          console.error('[recopilar] Error BCN:', e);
        }
      }
    }
  }

  // Validar completitud con TypeScript (red de seguridad)
  const validacionTS = validateReadyState({
    tipo_documento: state.tipoDocumento,
    ...state.datosRecopilados
  });
  
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

    // CASO 1: TypeScript detecta campos faltantes → BLOQUEAR
    if (!validacionTS.valid) {
      console.log(`[recopilar] FALTAN CAMPOS: ${validacionTS.missing.join(', ')}`);
      const pregunta = generateMissingFieldQuestion(validacionTS.missing);
      return {
        responseMessage: pregunta,
        datosFaltantes: validacionTS.missing,
        ready: false
      };
    }
    
    // CASO 2: TypeScript dice que hay campos suficientes
    // Pero NO marcamos ready=true automaticamente.
    // Primero verificamos con el LLM si los datos cumplen requisitos legales.
    console.log(`[recopilar] Campos presentes. Verificando validez legal con LLM...`);
    
    const datosParaLLM = JSON.stringify(state.datosRecopilados, null, 2);
    const tipoDoc = state.tipoDocumento || 'documento legal';
    
    const verifPrompt = `Eres un validador de documentos legales chilenos. Revisa si los datos recopilados son SUFICIENTES para redactar un documento valido y util para el cliente.

TIPO DE DOCUMENTO: ${tipoDoc}
${requisitosOficiales ? 'REQUISITOS LEGALES:\n' + requisitosOficiales : ''}

DATOS RECOPILADOS:
${datosParaLLM}

REGLAS:
1. ¿El documento con estos datos seria valido ante un tribunal, institucion o empresa chilena?
2. Si falta un dato CRITICO sin el cual el documento seria rechazado → responde "falta: [que falta]"
3. Si todos los datos esenciales estan presentes → responde "ok"
4. Si el cliente no pudo dar un dato pero el documento igual es util (ej: direccion de la contraparte) → "ok"
5. Si literalmente no hay datos utiles → "falta: datos del caso"

Responde SOLO "ok" o "falta: [explicacion breve]".`;

          // Validación TypeScript superada → ready=true sin llamada LLM adicional
        console.log('[recopilar] ✅ DATOS COMPLETOS - ready=true');
        return {
          ready: true,
          datosFaltantes: [],
          responseMessage: 'Perfecto, tengo todos los datos necesarios para redactar tu documento. Procedo a generar el escrito.'
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
