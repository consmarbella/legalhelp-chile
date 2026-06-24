/**
 * LANGGRAPH: Flujo del agente conversacional legal
 * 
 * Arquitectura:
 * Usuario → clasificar tipo → recopilar datos → validar → generar
 * 
 * El agente DECIDE cuándo usar cada tool.
 */

import { StateGraph, END, START } from '@langchain/langgraph';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { llmComplete } from '@/lib/llm';

// ─── STATE DEL AGENTE ────────────────────────────────────────────────────────
// Este es el "contexto" que se pasa entre nodos
export interface AgentState {
  messages: Array<HumanMessage | AIMessage | SystemMessage>;
  tipoDocumento: string | null;
  datosRecopilados: Record<string, unknown>;
  datosFaltantes: string[];
  ready: boolean;
  responseMessage: string;
  conversationHistory: Array<{ role: string; content: string }>;
}

// ─── SYSTEM PROMPT CORTO ─────────────────────────────────────────────────────
const AGENT_SYSTEM_PROMPT = `Eres un abogado chileno experto en documentos legales.

FUENTES DE CONOCIMIENTO:
- Tienes acceso a plantillas oficiales de BCN (Biblioteca del Congreso Nacional)
- Código del Trabajo chileno (actualizado)
- Código Civil chileno
- Ley 19.496 sobre Protección de Derechos del Consumidor
- Dirección del Trabajo Chile

TU TRABAJO:
1. Identificar qué documento necesita el cliente
2. Consultar requisitos oficiales usando "consultar_requisitos_legales"
3. Si NO encuentras requisitos en el RAG, usa "buscar_fuentes_oficiales" para buscar en BCN/leyes
4. Si encuentras información útil nueva, usa "agregar_conocimiento_nuevo" para guardarla
5. Preguntar SOLO los datos que faltan (uno por turno)
6. Validar completitud con "validar_completitud_datos"
7. Cuando tengas TODO, marcar ready=true

APRENDIZAJE INCREMENTAL:
- La PRIMERA VEZ que alguien pregunta por un documento nuevo, búscalo en fuentes oficiales
- USA "agregar_conocimiento_nuevo" para guardarlo en el RAG
- La PRÓXIMA VEZ que alguien pregunte lo mismo, YA lo tendrás en tu base de datos
- Esto te hace más eficiente con cada conversación

REGLAS CRÍTICAS:
- NUNCA inventes datos que el cliente no dio
- USA las tools para consultar requisitos oficiales
- NO te bases en "tu conocimiento" - consulta las fuentes oficiales
- NO preguntes lo mismo dos veces
- Si el cliente dice "no sé", acepta y avanza
- Marca ready=true SOLO después de validar completitud
- APRENDE: Cada búsqueda exitosa debe agregarse al RAG

Habla en español chileno, de forma clara y profesional. Una pregunta por turno.`;

// ─── NODOS DEL GRAPH ─────────────────────────────────────────────────────────

/**
 * NODO 1: Analizar mensaje del usuario y decidir qué hacer
 */
async function analizarMensaje(state: AgentState): Promise<Partial<AgentState>> {
  const ultimoMensaje = state.messages[state.messages.length - 1];
  
  // Si ya está ready, no hacer nada más
  if (state.ready) {
    return {
      responseMessage: 'Tengo todos los datos necesarios. Procedo a redactar tu documento.',
      ready: true
    };
  }

  // Construir prompt para DeepSeek
  const conversationText = state.messages
    .map(m => `${m instanceof HumanMessage ? 'Usuario' : 'Asistente'}: ${m.content}`)
    .join('\n');

  const prompt = `${AGENT_SYSTEM_PROMPT}

Conversación hasta ahora:
${conversationText}

Datos recopilados: ${JSON.stringify(state.datosRecopilados, null, 2)}
Tipo de documento: ${state.tipoDocumento || 'no identificado aún'}

Responde SOLO con la siguiente pregunta para el usuario (una pregunta corta y directa).`;

  try {
    const response = await llmComplete({
      system: AGENT_SYSTEM_PROMPT,
      messages: state.messages.map(m => ({
        role: m instanceof HumanMessage ? 'user' : 'assistant',
        content: m.content.toString()
      })),
      temperature: 0.2,
      maxTokens: 512
    });

    if (!response) {
      return {
        responseMessage: '¿Puedes contarme más sobre tu situación?'
      };
    }

    return {
      responseMessage: response.trim(),
      messages: [...state.messages, new AIMessage(response.trim())]
    };

  } catch (error) {
    console.error('[graph] Error en analizarMensaje:', error);
    return {
      responseMessage: 'Disculpa, hubo un error. ¿Puedes repetir lo último?',
    };
  }
}

/**
 * NODO 2: Extraer datos estructurados del mensaje
 * 
 * USA EL LLM para entender la respuesta del usuario.
 * El LLM ya sabe qué se preguntó y qué datos faltan.
 * Fallback a regex solo si LLM no responde.
 */
async function extraerDatos(state: AgentState): Promise<Partial<AgentState>> {
  const ultimoMensaje = state.messages[state.messages.length - 1];
  
  if (!(ultimoMensaje instanceof HumanMessage)) {
    return {};
  }

  const contenido = ultimoMensaje.content.toString();
  const contenidoLower = contenido.toLowerCase();
  const datosActuales = { ...state.datosRecopilados };

  console.log('[extraer] Analizando:', contenido.slice(0, 60));

  // ═══════════════════════════════════════════════════════════════
  // EXTRACCIÓN CON LLM: DeepSeek entiende cualquier formato
  // ═══════════════════════════════════════════════════════════════
  
  const datosExistentes = JSON.stringify(datosActuales, null, 2);
  const faltantes = (state.datosFaltantes || []).join(', ') || 'todos los datos del caso';
  
  const extractionPrompt = `Eres un extractor de datos de documentos legales chilenos.

DATOS YA RECOPILADOS:
${datosExistentes}

DATOS QUE FALTAN: ${faltantes}

ÚLTIMO MENSAJE DEL USUARIO: "${contenido}"

INSTRUCCIONES:
- Extrae SOLO datos que el usuario EXPLÍCITAMENTE menciona en su mensaje
- Si el usuario responde con un dato simple (ej: "gerente operaciones"), ese es el dato que se le preguntó (el primer campo de DATOS QUE FALTAN)
- Responde SOLO en formato JSON con los campos extraídos
- PROHIBIDO inventar datos: NO pongas direcciones, fechas, montos o nombres que el usuario NO dijo
- Si no hay datos claros en el mensaje, responde {}
- Normaliza: nombres capitalizados, RUT con formato XX.XXX.XXX-X, cargo capitalizado
- "850 mil" = 850000, "un palo" = 1000000, "500 lucas" = 500000

CAMPOS POSIBLES:
- tipo_documento (finiquito laboral, poder simple, reclamo SERNAC, regulacion visitas, defensa arrendatario, etc.)
- nombre (nombre completo de la persona)
- rut (RUT chileno)
- empleador / empresa (nombre de la empresa)
- cargo (cargo en la empresa)
- sueldo (monto numérico sin símbolos)
- fecha_inicio (cuándo empezó a trabajar)
- fecha_termino / fecha_despido (cuándo terminó)
- detalle_caso (qué pasó, los hechos - SOLO si el usuario da una narrativa)
- apoderado (nombre del apoderado, para poderes)
- demandado (nombre del demandado)
- monto (monto solicitado)
- patente (patente vehículo)
- direccion (dirección/domicilio)
- recurrido (quien vulneró derechos)

REGLA DE ORO: Si el usuario NO dijo un dato, NO lo pongas. Prefiero {} a inventar.

Responde SOLO el JSON, nada más.`;

  try {
    const llmResponse = await llmComplete({
      system: 'Extrae datos estructurados del mensaje. Responde SOLO JSON válido.',
      messages: [{ role: 'user', content: extractionPrompt }],
      temperature: 0.1,
      maxTokens: 300
    });

    if (llmResponse) {
      // Parsear JSON del LLM
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const datosExtraidos = JSON.parse(jsonMatch[0]);
          console.log('[extraer] LLM extrajo:', Object.keys(datosExtraidos));
          
          // Mergear datos extraídos con los existentes (no sobreescribir existentes)
          for (const [key, value] of Object.entries(datosExtraidos)) {
            if (value && !datosActuales[key]) {
              datosActuales[key] = value;
            }
          }
          
          // Sincronizar empresa/empleador
          if (datosActuales.empresa && !datosActuales.empleador) datosActuales.empleador = datosActuales.empresa;
          if (datosActuales.empleador && !datosActuales.empresa) datosActuales.empresa = datosActuales.empleador;
          
          console.log('[extraer] Datos después de LLM:', Object.keys(datosActuales).filter(k => datosActuales[k]));
          
          return {
            datosRecopilados: datosActuales,
            tipoDocumento: (datosActuales.tipo_documento as string) || state.tipoDocumento
          };
        } catch (e) {
          console.error('[extraer] Error parseando JSON del LLM:', e);
        }
      }
    }
  } catch (error) {
    console.error('[extraer] Error LLM:', error);
  }

  // ═══════════════════════════════════════════════════════════════
  // FALLBACK: Extracción por patrones (si LLM no responde)
  // ═══════════════════════════════════════════════════════════════
  console.log('[extraer] Fallback a regex...');

  // PASO 1: Detectar tipo de documento (semántica amplia - cubre 240+ tipos)
  if (!state.tipoDocumento && !datosActuales.tipo_documento) {
    // Categoría LABORAL
    if (contenidoLower.includes('poder') || contenidoLower.includes('autor') || contenidoLower.includes('mandato') || contenidoLower.includes('apoder')) {
      datosActuales.tipo_documento = 'poder simple';
    } else if (contenidoLower.includes('finiquito')) {
      datosActuales.tipo_documento = 'finiquito laboral';
    } else if (contenidoLower.includes('renunc')) {
      datosActuales.tipo_documento = 'carta_renuncia';
    } else if ((contenidoLower.includes('despid') || contenidoLower.includes('desvincula')) && (contenidoLower.includes('injust') || contenidoLower.includes('indemniz') || contenidoLower.includes('cotizac'))) {
      datosActuales.tipo_documento = 'despido_injustificado';
    } else if (contenidoLower.includes('despid') || contenidoLower.includes('desvincula') || contenidoLower.includes('echaron')) {
      datosActuales.tipo_documento = 'despido_injustificado';
    // Categoría CONSUMIDOR
    } else if (contenidoLower.includes('sernac') || contenidoLower.includes('reclam') && (contenidoLower.includes('empresa') || contenidoLower.includes('tienda') || contenidoLower.includes('servicio'))) {
      datosActuales.tipo_documento = 'reclamo SERNAC';
    } else if (contenidoLower.includes('compré') || contenidoLower.includes('contraté') || contenidoLower.includes('me cobraron') || contenidoLower.includes('no me entregaron')) {
      datosActuales.tipo_documento = 'reclamo SERNAC';
    } else if (contenidoLower.includes('internet') || contenidoLower.includes('fibra') || contenidoLower.includes('megas') || contenidoLower.includes('cable') || contenidoLower.includes('telefonía')) {
      datosActuales.tipo_documento = 'reclamo SERNAC';
    // Categoría FAMILIA
    } else if (contenidoLower.includes('alimento') || contenidoLower.includes('pensión aliment') || (contenidoLower.includes('pension') && contenidoLower.includes('hijo'))) {
      datosActuales.tipo_documento = 'demanda_alimentos';
    } else if (contenidoLower.includes('divorcio') || contenidoLower.includes('separar')) {
      datosActuales.tipo_documento = 'demanda_divorcio';
    } else if (contenidoLower.includes('custodia') || contenidoLower.includes('tuición') || contenidoLower.includes('cuidado personal')) {
      datosActuales.tipo_documento = 'demanda_custodia';
    } else if (contenidoLower.includes('visita') && (contenidoLower.includes('hijo') || contenidoLower.includes('menor'))) {
      datosActuales.tipo_documento = 'regulacion_visitas';
    // Categoría TRÁNSITO/TAG
    } else if (contenidoLower.includes('tag') || contenidoLower.includes('autopista') || contenidoLower.includes('peaje') || contenidoLower.includes('telepeaje')) {
      datosActuales.tipo_documento = 'prescripción multa TAG';
    } else if (contenidoLower.includes('multa') && (contenidoLower.includes('tránsito') || contenidoLower.includes('transito') || contenidoLower.includes('parte'))) {
      datosActuales.tipo_documento = 'prescripcion_multa_transito';
    // Categoría CONSTITUCIONAL
    } else if (contenidoLower.includes('recurso') && (contenidoLower.includes('protec') || contenidoLower.includes('amparo'))) {
      datosActuales.tipo_documento = 'recurso_proteccion';
    } else if (contenidoLower.includes('corta') && (contenidoLower.includes('luz') || contenidoLower.includes('agua') || contenidoLower.includes('gas'))) {
      datosActuales.tipo_documento = 'recurso_proteccion';
    // Categoría ARRIENDO/INMOBILIARIO
    } else if (contenidoLower.includes('arriendo') || contenidoLower.includes('arrendar') || contenidoLower.includes('arrendamiento')) {
      datosActuales.tipo_documento = 'contrato_arriendo';
    } else if (contenidoLower.includes('desahucio') || contenidoLower.includes('echar') && contenidoLower.includes('arrendatario')) {
      datosActuales.tipo_documento = 'desahucio_arriendo';
    // Categoría PENAL
    } else if (contenidoLower.includes('querella') || contenidoLower.includes('estafa') || contenidoLower.includes('robo') || contenidoLower.includes('hurto')) {
      datosActuales.tipo_documento = 'querella_criminal';
    } else if (contenidoLower.includes('denuncia') && (contenidoLower.includes('penal') || contenidoLower.includes('fiscal') || contenidoLower.includes('carabinero'))) {
      datosActuales.tipo_documento = 'denuncia_penal';
    // Categoría DEUDAS
    } else if (contenidoLower.includes('prescri') && (contenidoLower.includes('deuda') || contenidoLower.includes('crédito'))) {
      datosActuales.tipo_documento = 'prescripcion_deuda';
    } else if (contenidoLower.includes('cobro') || contenidoLower.includes('pagar') && contenidoLower.includes('no me')) {
      datosActuales.tipo_documento = 'cobro_judicial';
    // Categoría LABORAL AVANZADO
    } else if (contenidoLower.includes('acoso') || contenidoLower.includes('mobbing') || contenidoLower.includes('hostigamiento')) {
      datosActuales.tipo_documento = 'denuncia_acoso_laboral';
    } else if (contenidoLower.includes('tutela') && contenidoLower.includes('laboral')) {
      datosActuales.tipo_documento = 'tutela_laboral';
    } else if (contenidoLower.includes('contrato') && contenidoLower.includes('trabajo')) {
      datosActuales.tipo_documento = 'contrato_trabajo';
    // Categoría VECINAL/COMUNIDAD
    } else if (contenidoLower.includes('vecino') || contenidoLower.includes('ruido') || contenidoLower.includes('medianero')) {
      datosActuales.tipo_documento = 'reclamo_vecinal';
    // Categoría ADMINISTRATIVA
    } else if (contenidoLower.includes('certificado') || contenidoLower.includes('constancia')) {
      datosActuales.tipo_documento = 'certificado';
    } else if (contenidoLower.includes('declaración jurada') || contenidoLower.includes('declaracion jurada')) {
      datosActuales.tipo_documento = 'declaracion_jurada';
    // Si menciona "demandar" genéricamente
    } else if (contenidoLower.includes('demandar') || contenidoLower.includes('demanda')) {
      datosActuales.tipo_documento = 'demanda_civil';
    // Si menciona "carta" genéricamente
    } else if (contenidoLower.includes('carta') && (contenidoLower.includes('enviar') || contenidoLower.includes('escribir') || contenidoLower.includes('redactar'))) {
      datosActuales.tipo_documento = 'carta_documento';
    }
    // Si no detectamos nada aquí, el nodo recopilar lo clasificará con LLM
  }

  // PASO 2: Extraer NOMBRES (cualquier nombre propio de 2-4 palabras)
  if (!datosActuales.nombre) {
    // Intentar con mayúscula primero
    let nombreMatch = contenido.match(/\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3})\b/);
    
    // Si no encuentra, intentar con minúscula (usuario escribe sin mayúsculas)
    if (!nombreMatch) {
      nombreMatch = contenido.match(/\b([a-záéíóúñA-ZÁÉÍÓÚÑ]{2,}(?:\s+[a-záéíóúñA-ZÁÉÍÓÚÑ]{2,}){1,3})\b/);
    }
    
    if (nombreMatch) {
      const posibleNombre = nombreMatch[1];
      // Filtrar palabras que NO son nombres
      const noEsNombre = /necesito|quiero|para|poder|reclamo|empresa|constructora|banco|supermercado|restaurant|ltda|spa|sociedad|hola|gracias|buenas|buenos|tengo|estoy|soy|trabajo|trabajé|mi nombre|me llamo/i.test(posibleNombre);
      if (!noEsNombre && posibleNombre.length > 4) {
        // Capitalizar el nombre correctamente
        datosActuales.nombre = posibleNombre
          .split(' ')
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');
      }
    }
    
    // También detectar patrones como "me llamo X" o "soy X"
    if (!datosActuales.nombre) {
      const patternNombre = contenido.match(/(?:me llamo|soy|mi nombre es)\s+([a-záéíóúñA-ZÁÉÍÓÚÑ]+(?:\s+[a-záéíóúñA-ZÁÉÍÓÚÑ]+){1,3})/i);
      if (patternNombre) {
        datosActuales.nombre = patternNombre[1]
          .split(' ')
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');
      }
    }
  }

  // PASO 3: Extraer RUT (muy flexible con formatos)
  if (!datosActuales.rut) {
    // Formato 1: Con puntos y guión (12.345.678-9)
    let rutMatch = contenido.match(/\b(\d{1,2}\.\d{3}\.\d{3}-[\dkK])\b/);
    
    // Formato 2: Con guión sin puntos (12345678-9)
    if (!rutMatch) {
      rutMatch = contenido.match(/\b(\d{7,8}-[\dkK])\b/);
    }
    
    // Formato 3: Solo números (123456789 o 12345678k) — 8 o 9 dígitos seguidos
    if (!rutMatch) {
      rutMatch = contenido.match(/\b(\d{7,8}[\dkK])\b/);
    }
    
    // Formato 4: Con puntos sin guión (12.345.678-9 variantes)
    if (!rutMatch) {
      rutMatch = contenido.match(/\b(\d{1,2}[\.\d]{3,9}-?[\dkK])\b/);
    }
    
    if (rutMatch) {
      const rut = rutMatch[1];
      // Validar longitud mínima para que no sea un número random
      if (rut.replace(/[\.\-]/g, '').length >= 8) {
        datosActuales.rut = rut;
      }
    }
  }

  // PASO 4: Extraer EMPLEADOR/EMPRESA (cualquier entidad mencionada)
  if (!datosActuales.empleador && !datosActuales.empresa) {
    // Patrón 1: Palabra clave + nombre
    const empMatch1 = contenido.match(/(?:Constructora|Empresa|Banco|Sociedad|Restaurant|Supermercado|Tienda|Hotel|Clínica|Hospital|Colegio|Universidad|Municipalidad)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?)(?:[,\.]|RUT|cargo|sueldo|desde|$)/i);
    if (empMatch1) {
      const empresaNombre = empMatch1[0].replace(/[,\.\s]+$/, '').trim();
      datosActuales.empleador = empresaNombre;
      datosActuales.empresa = empresaNombre; // Sync both fields
    } else {
      // Patrón 2: Buscar nombres de empresas conocidas o con sufijos
      const empMatch2 = contenido.match(/\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,3})\s*(?:Ltda|S\.A\.|SpA|SPA|S\.A|SA)\b/);
      if (empMatch2) {
        const empresaNombre = empMatch2[0].trim();
        datosActuales.empleador = empresaNombre;
        datosActuales.empresa = empresaNombre;
      } else {
        // Patrón 3: Buscar después de "en" o "trabajo en"
        const empMatch3 = contenido.match(/(?:en|trabajo en|trabajé en)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?)/i);
        if (empMatch3 && !datosActuales.nombre) {
          datosActuales.empleador = empMatch3[1].trim();
          datosActuales.empresa = empMatch3[1].trim();
        }
        // Patrón 4: Nombres de empresas reconocidas (Falabella, VTR, Enel, etc.)
        const empresasConocidas = /\b(Falabella|Ripley|Paris|Lider|Jumbo|Santa Isabel|Walmart|Tottus|Unimarc|VTR|Entel|Movistar|Claro|Enel|CGE|Aguas Andinas|Essbio|BancoEstado|Santander|BCI|Itaú|Scotiabank|Cencosud|SMU|Transbank|Sernac|AFP|Isapre|Fonasa|SII|Registro Civil|Previred|Mutual|ACHS|IST)\b/i;
        const empMatch4 = contenido.match(empresasConocidas);
        if (empMatch4) {
          datosActuales.empresa = empMatch4[1];
          datosActuales.empleador = empMatch4[1];
        }
      }
    }
  }

  // PASO 5: Extraer CARGO (después de "cargo:" o "como")
  if (!datosActuales.cargo) {
    const cargoMatch = contenido.match(/(?:cargo[:\s]+|como\s+)([a-záéíóúñ\s]+?)(?:[,\.]|sueldo|desde|trabajé|$)/i);
    if (cargoMatch) {
      datosActuales.cargo = cargoMatch[1].trim();
    }
  }

  // PASO 6: Extraer SUELDO (con $, sin $, con puntos)
  if (!datosActuales.sueldo) {
    const sueldoMatch = contenido.match(/(?:sueldo|remuneración|renta)[:\s]*\$?([\d\.,]+)/i);
    if (sueldoMatch) {
      datosActuales.sueldo = sueldoMatch[1].replace(/\./g, '').replace(',', '');
    }
  }

  // PASO 7: Extraer FECHAS (inicio y término)
  if (!datosActuales.fecha_inicio) {
    const fechaInicioMatch = contenido.match(/(?:desde|ingresé|entré|inicio)[:\s]+([\w\s]+?\d{4})/i);
    if (fechaInicioMatch) {
      datosActuales.fecha_inicio = fechaInicioMatch[1].trim();
    }
  }

  if (!datosActuales.fecha_termino && !datosActuales.fecha_despido) {
    const fechaTerminoMatch = contenido.match(/(?:hasta|despid|terminó|salí)[:\s]+([\w\s]+?\d{4})/i);
    if (fechaTerminoMatch) {
      datosActuales.fecha_termino = fechaTerminoMatch[1].trim();
    }
  }

  // PASO 8: Extraer PATENTE (formato chileno XXXX00)
  if (!datosActuales.patente) {
    const patenteMatch = contenido.match(/\b([A-Z]{2,4}\d{2,4}|[A-Z]{4}\d{2})\b/);
    if (patenteMatch) {
      datosActuales.patente = patenteMatch[1];
    }
  }

  // PASO 9: Extraer APODERADO (segundo nombre después del primero)
  if ((state.tipoDocumento === 'poder simple' || datosActuales.tipo_documento === 'poder simple') && !datosActuales.apoderado) {
    // Buscar en el mensaje actual todos los nombres propios
    const nombres = contenido.match(/\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3})\b/g);
    if (nombres && nombres.length >= 1) {
      for (const nom of nombres) {
        const noEsNombre = /necesito|quiero|para|reclamo|empresa|constructora|banco|supermercado|avenida|calle|pasaje|primo|hermano|madre|padre/i.test(nom);
        // Si ya tenemos un nombre guardado y este es diferente, es el apoderado
        if (datosActuales.nombre && nom !== datosActuales.nombre && !noEsNombre) {
          datosActuales.apoderado = nom;
          break;
        }
        // Si no tenemos nombre aún, este es el primero (el poderdante)
        if (!datosActuales.nombre && !noEsNombre) {
          datosActuales.nombre = nom;
        }
      }
    }
  }

  // PASO 10: Extraer DEMANDADO (para demandas)
  if (!datosActuales.demandado && (contenidoLower.includes('demandado') || contenidoLower.includes('padre') || contenidoLower.includes('madre'))) {
    const demandadoMatch = contenido.match(/(?:demandado es|padre|madre de mi hija?|padre de mis hijos?)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3})/i);
    if (demandadoMatch) {
      datosActuales.demandado = demandadoMatch[1].trim();
    }
  }

  // PASO 11: Extraer HIJO(S) (para alimentos)
  if (!datosActuales.hijo && !datosActuales.hijos) {
    const hijoMatch = contenido.match(/(?:hijo|hija|menor)\s+(?:se llama|es|:)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3})/i);
    if (hijoMatch) {
      datosActuales.hijo = hijoMatch[1].trim();
    }
  }

  // PASO 12: Extraer DETALLE_CASO (para reclamos, recursos - texto narrativo largo)
  if (!datosActuales.detalle_caso && contenido.length > 100) {
    // Si el mensaje es largo y parece narrativo, guardarlo como detalle
    if (datosActuales.tipo_documento === 'reclamo SERNAC' || 
        datosActuales.tipo_documento === 'recurso_proteccion' ||
        contenidoLower.includes('compré') ||
        contenidoLower.includes('llamé') ||
        contenidoLower.includes('problema') ||
        contenidoLower.includes('reclamo')) {
      datosActuales.detalle_caso = contenido;
    }
  }

  // PASO 13: Extraer DIRECCIÓN (número + calle)
  if (!datosActuales.direccion) {
    const dirMatch = contenido.match(/\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?\s+\d{1,5}(?:\s*,?\s*[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?)\b/);
    if (dirMatch) {
      const posibleDir = dirMatch[1];
      // Validar que no sea otra cosa (cargo, sueldo, etc.)
      if (!/cargo|sueldo|empresa|rut|desde|hasta/i.test(posibleDir)) {
        datosActuales.direccion = posibleDir.trim();
      }
    }
  }

  // PASO 14: Extraer MONTO (para demanda de alimentos, reclamos)
  if (!datosActuales.monto) {
    const montoMatch = contenido.match(/(?:pido|solicito|exijo|monto)\s+\$?([\d\.,]+)|(\$[\d\.,]+)\s+(?:mensual|al mes|por mes)/i);
    if (montoMatch) {
      const montoStr = montoMatch[1] || montoMatch[2];
      datosActuales.monto = montoStr.replace(/[\$\.\,]/g, '');
    }
  }

  // PASO 15: Extraer RECURRIDO (para recursos de protección)
  if ((state.tipoDocumento === 'recurso_proteccion' || datosActuales.tipo_documento === 'recurso_proteccion') && !datosActuales.recurrido) {
    // Si ya tenemos empresa, esa es el recurrido
    if (datosActuales.empresa) {
      datosActuales.recurrido = datosActuales.empresa;
    }
  }

  // PASO 16: Extraer DERECHO_VULNERADO (para recursos de protección)
  if ((state.tipoDocumento === 'recurso_proteccion' || datosActuales.tipo_documento === 'recurso_proteccion') && !datosActuales.derecho_vulnerado) {
    // Inferir por contexto
    if (contenidoLower.includes('vida') || contenidoLower.includes('salud') || contenidoLower.includes('oxígeno') || contenidoLower.includes('enfermo')) {
      datosActuales.derecho_vulnerado = 'Art. 19 N°1 (vida e integridad física) y N°9 (protección salud)';
    } else if (contenidoLower.includes('propiedad') || contenidoLower.includes('patrimonio')) {
      datosActuales.derecho_vulnerado = 'Art. 19 N°24 (propiedad)';
    } else if (contenidoLower.includes('trabajo') || contenidoLower.includes('empleo')) {
      datosActuales.derecho_vulnerado = 'Art. 19 N°16 (libertad de trabajo)';
    } else {
      datosActuales.derecho_vulnerado = 'derechos constitucionales fundamentales';
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // NORMALIZACIÓN: Corregir ortografía, capitalización y formato
  // ═══════════════════════════════════════════════════════════════
  
  // Nombres: siempre capitalizados (alejandro matteucci → Alejandro Matteucci)
  if (datosActuales.nombre && typeof datosActuales.nombre === 'string') {
    datosActuales.nombre = capitalizarNombre(datosActuales.nombre as string);
  }
  if (datosActuales.apoderado && typeof datosActuales.apoderado === 'string') {
    datosActuales.apoderado = capitalizarNombre(datosActuales.apoderado as string);
  }
  if (datosActuales.demandado && typeof datosActuales.demandado === 'string') {
    datosActuales.demandado = capitalizarNombre(datosActuales.demandado as string);
  }
  if (datosActuales.hijo && typeof datosActuales.hijo === 'string') {
    datosActuales.hijo = capitalizarNombre(datosActuales.hijo as string);
  }
  
  // Empresa: capitalizar (falabella → Falabella)
  if (datosActuales.empresa && typeof datosActuales.empresa === 'string') {
    datosActuales.empresa = capitalizarNombre(datosActuales.empresa as string);
  }
  if (datosActuales.empleador && typeof datosActuales.empleador === 'string') {
    datosActuales.empleador = capitalizarNombre(datosActuales.empleador as string);
  }
  
  // RUT: formato estándar (12345678-9 → 12.345.678-9)
  if (datosActuales.rut && typeof datosActuales.rut === 'string') {
    datosActuales.rut = formatearRUT(datosActuales.rut as string);
  }
  
  // Cargo: primera letra mayúscula (vendedor → Vendedor)
  if (datosActuales.cargo && typeof datosActuales.cargo === 'string') {
    const cargo = (datosActuales.cargo as string).trim().toLowerCase();
    datosActuales.cargo = cargo.charAt(0).toUpperCase() + cargo.slice(1);
  }
  
  // Dirección: capitalizar
  if (datosActuales.direccion && typeof datosActuales.direccion === 'string') {
    datosActuales.direccion = capitalizarNombre(datosActuales.direccion as string);
  }

  console.log('[extraer] Datos extraídos:', Object.keys(datosActuales).filter(k => datosActuales[k]));

  return {
    datosRecopilados: datosActuales,
    tipoDocumento: datosActuales.tipo_documento as string || state.tipoDocumento
  };
}

// ─── HELPERS DE NORMALIZACIÓN ─────────────────────────────────────────────────

/**
 * Capitaliza un nombre: alejandro matteucci → Alejandro Matteucci
 * Respeta partículas: de, del, la, las, los, el
 */
function capitalizarNombre(texto: string): string {
  const particulas = ['de', 'del', 'la', 'las', 'los', 'el', 'en', 'y'];
  return texto
    .trim()
    .split(/\s+/)
    .map((palabra, i) => {
      const lower = palabra.toLowerCase();
      // Partículas van en minúscula excepto si es la primera palabra
      if (i > 0 && particulas.includes(lower)) return lower;
      // Capitalizar
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

/**
 * Formatea RUT chileno: 12345678-9 → 12.345.678-9
 */
function formatearRUT(rut: string): string {
  // Limpiar: quitar puntos y espacios existentes
  let limpio = rut.replace(/\s+/g, '').replace(/\./g, '');
  
  // Si ya tiene guión, separar cuerpo y dígito verificador
  if (limpio.includes('-')) {
    const [cuerpo, dv] = limpio.split('-');
    // Agregar puntos cada 3 dígitos desde la derecha
    const conPuntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${conPuntos}-${dv}`;
  }
  
  // Si no tiene guión pero parece RUT (último char es dígito o K)
  if (/^\d{7,8}[\dkK]$/.test(limpio)) {
    const cuerpo = limpio.slice(0, -1);
    const dv = limpio.slice(-1);
    const conPuntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${conPuntos}-${dv}`;
  }
  
  return rut; // Devolver tal cual si no reconoce el formato
}

/**
 * NODO 3: Decidir siguiente acción
 */
function decidirSiguienteAccion(state: AgentState): typeof END | 'recopilar' {
  // Si ya está ready, terminar
  if (state.ready) {
    console.log('[graph] Estado ready=true, finalizando');
    return END;
  }

  // Si no está ready, seguir recopilando
  console.log('[graph] Continuando recopilación de datos');
  return 'recopilar';
}

/**
 * NODO 4: Recopilar datos faltantes
 * 
 * LÓGICA MEJORADA:
 * 1. Si NO hay tipo → buscar en RAG qué tipo podría ser
 * 2. Si RAG no tiene resultado → buscar en fuentes oficiales (web)
 * 3. Si ya hay tipo → validar completitud y preguntar dato faltante
 * 4. SIEMPRE responder con algo útil, nunca "no sé"
 */
async function recopilarDatos(state: AgentState): Promise<Partial<AgentState>> {
  console.log('[recopilar] Datos actuales:', Object.keys(state.datosRecopilados));
  console.log('[recopilar] Tipo documento:', state.tipoDocumento);
  
  const { obtenerRequisitos, consultarRAG, agregarDocumentoAlRAG } = await import('./vectorstore');
  const { validarCompletitudTool } = await import('./tools');

  // ═══════════════════════════════════════════════════════════════
  // CASO 1: NO SABEMOS QUÉ TIPO DE DOCUMENTO ES
  // ═══════════════════════════════════════════════════════════════
  if (!state.tipoDocumento) {
    // Tomar el último mensaje del usuario para intentar identificar
    const ultimoMsg = state.messages[state.messages.length - 1];
    const texto = ultimoMsg ? ultimoMsg.content.toString() : '';
    
    // PASO A: Buscar en RAG si hay algo parecido
    let encontradoEnRAG = false;
    let tipoSugerido = '';
    
    if (texto.length > 5) {
      try {
        const resultadosRAG = await consultarRAG(texto, 5);
        
        if (resultadosRAG.length > 0) {
          const metadata = resultadosRAG[0].metadata;
          const contenidoTop = resultadosRAG[0].pageContent.toLowerCase();
          
          // Solo confiar en RAG si tiene ALTA relevancia
          // (al menos 3 palabras significativas del query coinciden con el resultado)
          const palabrasQuery = texto.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
          const palabrasCoinciden = palabrasQuery.filter((w: string) => contenidoTop.includes(w));
          const ratioCoincidencia = palabrasCoinciden.length / Math.max(palabrasQuery.length, 1);
          
          console.log(`[recopilar] RAG relevancia: ${(ratioCoincidencia * 100).toFixed(0)}% (${palabrasCoinciden.length}/${palabrasQuery.length} palabras)`);
          
          // Solo si coincidencia > 50%
          if (ratioCoincidencia > 0.5 && (metadata.templateId || metadata.plantillaId)) {
            encontradoEnRAG = true;
            tipoSugerido = metadata.docType || metadata.tipo || '';
            console.log(`[recopilar] RAG alta confianza, tipo: ${tipoSugerido}`);
          }
        }
      } catch (error) {
        console.error('[recopilar] Error consultando RAG:', error);
      }
    }
    
    // PASO B: Si encontramos algo en RAG, asignar tipo y pedir datos
    if (encontradoEnRAG && tipoSugerido) {
      return {
        tipoDocumento: tipoSugerido,
        datosRecopilados: { ...state.datosRecopilados, tipo_documento: tipoSugerido },
        responseMessage: `Entendido, necesitas un documento de tipo "${tipoSugerido}". Para comenzar, necesito tu nombre completo y RUT.`,
        datosFaltantes: ['nombre', 'rut']
      };
    }
    
    // PASO C: Usar el LLM para clasificar inteligentemente (si hay LLM disponible)
    const clasificacionLLM = await llmComplete({
      system: `Eres un clasificador de documentos legales chilenos. Clasifica EXACTAMENTE lo que el usuario necesita desde SU perspectiva.

REGLAS CRÍTICAS:
1. NO inventes. Si no estás seguro, responde "otro"
2. Clasifica desde la perspectiva del USUARIO (no de la contraparte)
3. Distingue bien:
   - "no me dejan ver a mi hijo" = regulacion visitas (NO alimentos)
   - "me desalojan / me quieren echar" = defensa arrendatario (NO desahucio)
   - "quiero echar al arrendatario" = desahucio arrendador
   - "pensión para mi hijo" = demanda alimentos
   - "vecino construyó algo" = denuncia obra nueva o reclamo vecinal (NO reclamo SERNAC)
   - "me cortaron la luz/agua" = recurso proteccion
4. Si es ambiguo o no calza bien en ninguna categoría, responde "otro"

Tipos:
- finiquito laboral
- poder simple
- reclamo SERNAC (solo consumidor vs empresa comercial)
- carta renuncia
- demanda alimentos (pensión alimenticia)
- regulacion visitas (derecho a ver a los hijos)
- custodia (cuidado personal del menor)
- recurso proteccion
- prescripcion multa TAG
- despido injustificado
- defensa arrendatario (me quieren desalojar, me subieron la renta ilegalmente)
- desahucio arrendador (quiero que se vaya el arrendatario)
- contrato arriendo (hacer un contrato nuevo)
- querella criminal
- denuncia penal
- prescripcion deuda
- demanda civil
- contrato trabajo
- declaracion jurada
- certificado
- solicitud administrativa
- carta documento
- denuncia obra nueva (vecino construyó algo ilegal)
- reclamo vecinal (ruidos, molestias entre vecinos)
- otro

Responde SOLO el tipo, nada más.`,
      messages: [{ role: 'user', content: texto }],
      temperature: 0.1,
      maxTokens: 50
    });
    
    if (clasificacionLLM && clasificacionLLM.trim().toLowerCase() !== 'otro') {
      const tipoDetectado = clasificacionLLM.trim().toLowerCase().replace(/['"]/g, '');
      console.log(`[recopilar] LLM clasificó como: ${tipoDetectado}`);
      
      // Guardar clasificación aprendida en RAG
      try {
        await agregarDocumentoAlRAG(
          `Documento tipo: ${tipoDetectado}\nConsulta original del usuario: ${texto}\nClasificación: Este tipo de solicitud corresponde a "${tipoDetectado}"`,
          {
            titulo: `Clasificación: ${tipoDetectado}`,
            tipo: 'clasificacion_aprendida',
            fuente: 'LLM + interacción usuario',
            tags: [tipoDetectado, ...texto.split(' ').filter((w: string) => w.length > 4).slice(0, 5)]
          }
        );
      } catch (e) { /* no falla si no puede persistir */ }
      
      return {
        tipoDocumento: tipoDetectado,
        datosRecopilados: { ...state.datosRecopilados, tipo_documento: tipoDetectado },
        responseMessage: `Perfecto, te ayudaré con un "${tipoDetectado}". Para comenzar, necesito tu nombre completo y RUT.`,
        datosFaltantes: ['nombre', 'rut']
      };
    }
    
    // PASO D: Si LLM no está disponible o dice "otro", inferir del texto directamente
    // Buscar palabras clave genéricas que no se capturaron en extraerDatos
    const textoLower = texto.toLowerCase();
    let tipoInferido = '';
    
    if (textoLower.includes('contrato') && textoLower.includes('trabajo')) tipoInferido = 'contrato trabajo';
    else if (textoLower.includes('contrato')) tipoInferido = 'contrato arriendo';
    else if (textoLower.includes('carta')) tipoInferido = 'carta documento';
    else if (textoLower.includes('solicitud') || textoLower.includes('solicitar')) tipoInferido = 'solicitud administrativa';
    else if (textoLower.includes('certificado')) tipoInferido = 'certificado';
    else if (textoLower.includes('declaraci')) tipoInferido = 'declaracion jurada';
    else if (textoLower.includes('demand')) tipoInferido = 'demanda civil';
    else if (textoLower.includes('recurs')) tipoInferido = 'recurso_proteccion';
    
    if (tipoInferido) {
      return {
        tipoDocumento: tipoInferido,
        datosRecopilados: { ...state.datosRecopilados, tipo_documento: tipoInferido },
        responseMessage: `Entendido, te ayudaré con un "${tipoInferido}". ¿Cuál es tu nombre completo y RUT?`,
        datosFaltantes: ['nombre', 'rut']
      };
    }
    
    // PASO D: Último recurso - pedir que describa mejor
    return {
      responseMessage: '¿Puedes describir con más detalle qué documento necesitas? Por ejemplo: un finiquito, un poder, un reclamo, una demanda, etc. También necesitaré tu nombre completo y RUT.',
      datosFaltantes: ['tipo_documento', 'nombre', 'rut']
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // CASO 2: YA SABEMOS EL TIPO → VALIDAR Y PREGUNTAR LO QUE FALTA
  // ═══════════════════════════════════════════════════════════════
  
  // PASO 1: Consultar requisitos oficiales del RAG
  let requisitosOficiales = '';
  try {
    requisitosOficiales = await obtenerRequisitos(state.tipoDocumento);
    console.log('[recopilar] Requisitos BCN:', requisitosOficiales.slice(0, 100));
  } catch (error) {
    console.error('[recopilar] Error consultando RAG:', error);
  }

  // PASO 2: Validar completitud
  try {
    const validacion = await validarCompletitudTool.invoke({
      tipoDocumento: state.tipoDocumento,
      datosRecopilados: state.datosRecopilados
    });

    console.log('[recopilar] Validación:', {
      completo: validacion.completo,
      faltantes: validacion.datos_faltantes
    });

    if (validacion.completo) {
      return {
        ready: true,
        datosFaltantes: [],
        responseMessage: 'Tengo todos los datos necesarios para tu documento. Procedo a redactarlo.'
      };
    }

    // Generar pregunta inteligente
    let pregunta = validacion.siguiente_pregunta || '¿Puedes darme más información?';
    
    // Si hay requisitos BCN relevantes, mencionarlos
    if (requisitosOficiales && validacion.datos_faltantes && validacion.datos_faltantes.length > 0) {
      const campoFaltante = validacion.datos_faltantes[0];
      if (requisitosOficiales.toLowerCase().includes(campoFaltante.toLowerCase())) {
        pregunta += ` (obligatorio según normativa vigente)`;
      }
    }

    return {
      responseMessage: pregunta,
      datosFaltantes: validacion.datos_faltantes || [],
      ready: false
    };

  } catch (error) {
    console.error('[graph] Error en recopilarDatos:', error);
    return {
      responseMessage: '¿Puedes contarme más sobre tu situación?'
    };
  }
}

/**
 * NODO 5: Validar completitud final
 */
async function validarCompletitud(state: AgentState): Promise<Partial<AgentState>> {
  const { validarCompletitudTool } = await import('./tools');
  
  try {
    const validacion = await validarCompletitudTool.invoke({
      tipoDocumento: state.tipoDocumento || 'general',
      datosRecopilados: state.datosRecopilados
    });

    if (validacion.completo) {
      return {
        ready: true,
        datosFaltantes: [],
        responseMessage: 'Tengo todos los datos necesarios para tu documento. Procedo a redactarlo.'
      };
    }

    return {
      ready: false,
      datosFaltantes: validacion.datos_faltantes || [],
      responseMessage: validacion.siguiente_pregunta || 'Necesito algunos datos más.'
    };

  } catch (error) {
    console.error('[graph] Error en validarCompletitud:', error);
    return {
      ready: false,
      responseMessage: 'Déjame verificar qué datos faltan...'
    };
  }
}

// ─── CONSTRUCCIÓN DEL GRAPH ──────────────────────────────────────────────────

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

  // Agregar nodos (solo los esenciales)
  workflow.addNode('extraer', extraerDatos);
  workflow.addNode('recopilar', recopilarDatos);

  // Flujo LINEAL: START → extraer → recopilar → END
  // Usamos type assertions para evitar errores de TypeScript con tipos estrictos
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

  // Extraer solo los datos relevantes del documento (excluir metadatos como response_message, etc.)
  const datosRecopilados = Object.keys(currentData).reduce((acc, key) => {
    // Excluir metadatos internos
    if (['response_message', 'tipo_documento', 'datos_faltantes', 'ready', 'datos_recopilados'].includes(key)) {
      return acc;
    }
    // Incluir datos del documento
    acc[key] = currentData[key];
    return acc;
  }, {} as Record<string, unknown>);

  const initialState: AgentState = {
    messages,
    tipoDocumento: currentData.tipo_documento as string || null,
    datosRecopilados: {
      ...(currentData.datos_recopilados as Record<string, unknown> || {}),
      ...datosRecopilados // Merge flatten + nested
    },
    datosFaltantes: (currentData.datos_faltantes as string[]) || [],
    ready: currentData.ready === true,
    responseMessage: '',
    conversationHistory
  };

  try {
    // 🔥 CLAVE: recursionLimit=3 porque solo queremos 1 ciclo (extraer → recopilar → decidir)
    // No queremos que el graph ejecute múltiples turnos, solo UNO
    const result = await graph.invoke(initialState as any, {
      recursionLimit: 3 // extraer → recopilar → END (o recopilar otra vez si falla)
    });
    
    const returnValue = {
      response_message: result.responseMessage,
      tipo_documento: result.tipoDocumento,
      datos_recopilados: result.datosRecopilados,
      datos_faltantes: result.datosFaltantes,
      ready: result.ready,
      ...((result.datosRecopilados || {}) as any) // Flatten datos para compatibilidad con tu API actual
    };
    
    return returnValue;

  } catch (error) {
    console.error('[graph] Error ejecutando agente:', error);
    throw error;
  }
}
