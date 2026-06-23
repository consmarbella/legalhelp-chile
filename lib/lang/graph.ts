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

Tu trabajo es:
1. Entender qué documento necesita el cliente
2. Identificar el tipo de documento usando la tool "identificar_template"
3. Consultar los requisitos necesarios usando "consultar_requisitos_legales"
4. Preguntar SOLO los datos que faltan (uno por turno)
5. Validar completitud con "validar_completitud_datos" antes de marcar ready
6. Cuando tengas TODO lo necesario, marcar ready=true

REGLAS CRÍTICAS:
- NUNCA inventes datos que el cliente no dio
- USA las tools ANTES de responder
- NO preguntes lo mismo dos veces
- Si el cliente dice "no sé", acepta y avanza al siguiente dato
- Marca ready=true SOLO después de llamar a "validar_completitud_datos" y confirmar que está completo

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

  // Detectar tipo de documento si aún no está
  if (!state.tipoDocumento) {
    if (/poder|autoriza|mandato|cobre|apoder/i.test(contenido)) {
      datosActuales.tipo_documento = 'poder simple';
    } else if (/finiquito|despido|desvincula/.test(contenidoLower)) {
      datosActuales.tipo_documento = 'finiquito laboral';
    } else if (/reclamo|sernac|consumidor/.test(contenidoLower)) {
      datosActuales.tipo_documento = 'reclamo SERNAC';
    } else if (/licencia.*conducir/.test(contenidoLower)) {
      datosActuales.tipo_documento = 'solicitud de licencia de conducir';
    } else if (/tag|autopista|peaje/.test(contenidoLower)) {
      datosActuales.tipo_documento = 'prescripción multa TAG';
    }
  }

  // Extraer datos básicos
  // Nombre (buscar patrón de 2-4 palabras con nombres propios)
  if (!datosActuales.nombre) {
    const nombreMatch = contenido.match(/([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3})/);
    if (nombreMatch && !/necesito|quiero|para|poder|reclamo|empresa|constructora/i.test(nombreMatch[0])) {
      datosActuales.nombre = nombreMatch[0];
      console.log('[extraer] Nombre encontrado:', datosActuales.nombre);
    }
  }

  // RUT
  if (!datosActuales.rut && /\d{1,2}[\.\d]{0,8}-?[\dkK]/.test(contenido)) {
    const match = contenido.match(/(\d{1,2}[\.\d]{0,8}-?[\dkK])/);
    if (match) {
      datosActuales.rut = match[1];
      console.log('[extraer] RUT encontrado:', datosActuales.rut);
    }
  }

  // Empleador / Empresa
  if (!datosActuales.empleador && !datosActuales.empresa) {
    // Patrón 1: "Constructora ABC" o "Empresa XYZ"
    let empMatch = contenido.match(/(Constructora|Empresa|Banco|Sociedad|Ltda|S\.A\.|SpA)\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?)(?:,|RUT|\.|$)/);
    if (empMatch) {
      datosActuales.empleador = empMatch[0].replace(/[,\.\s]+$/, '').trim();
      console.log('[extraer] Empleador encontrado:', datosActuales.empleador);
    }
  }

  // Cargo
  if (!datosActuales.cargo && /cargo[:\s]+([\w\s]+)/i.test(contenido)) {
    const match = contenido.match(/cargo[:\s]+([\w\s]+?)(?:,|sueldo|desde|$)/i);
    if (match) {
      datosActuales.cargo = match[1].trim();
      console.log('[extraer] Cargo encontrado:', datosActuales.cargo);
    }
  }

  // Sueldo
  if (!datosActuales.sueldo && /sueldo[:\s]*\$?[\d\.,]+/i.test(contenido)) {
    const match = contenido.match(/sueldo[:\s]*(\$?[\d\.,]+)/i);
    if (match) {
      datosActuales.sueldo = match[1].replace(/\./g, '').replace(',', '');
      console.log('[extraer] Sueldo encontrado:', datosActuales.sueldo);
    }
  }

  // Fechas (inicio y término)
  if (!datosActuales.fecha_inicio && /desde\s+([\w\s]+?\d{4})/i.test(contenido)) {
    const match = contenido.match(/desde\s+([\w\s]+?\d{4})/i);
    if (match) {
      datosActuales.fecha_inicio = match[1].trim();
      console.log('[extraer] Fecha inicio:', datosActuales.fecha_inicio);
    }
  }

  if (!datosActuales.fecha_termino && /hasta\s+([\w\s]+?\d{4})/i.test(contenido)) {
    const match = contenido.match(/hasta\s+([\w\s]+?\d{4})/i);
    if (match) {
      datosActuales.fecha_termino = match[1].trim();
      console.log('[extraer] Fecha término:', datosActuales.fecha_termino);
    }
  }

  // Apoderado (para poderes) - segundo nombre completo en el mensaje
  if ((state.tipoDocumento === 'poder simple' || /poder/i.test(contenidoLower)) && !datosActuales.apoderado && datosActuales.nombre) {
    // Si ya tenemos un nombre, buscar OTRO nombre distinto
    const nombres = contenido.match(/([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3})/g);
    if (nombres && nombres.length > 1) {
      // El primer nombre es el mandante, el segundo es el apoderado
      for (const nom of nombres) {
        if (nom !== datosActuales.nombre && !/necesito|quiero|para|reclamo|empresa|constructora/i.test(nom)) {
          datosActuales.apoderado = nom;
          console.log('[extraer] Apoderado encontrado:', datosActuales.apoderado);
          break;
        }
      }
    }
  }

  // Dirección
  if (!datosActuales.direccion && /\d{1,5}\s*[,]?\s*[A-ZÁÉÍÓÚÑ]/i.test(contenido)) {
    const dirMatch = contenido.match(/([A-ZÁÉÍÓÚÑ][a-záéíóúñ\s]+\d{1,5}(?:\s*,?\s*[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?)/);
    if (dirMatch && !/(cargo|sueldo|empresa)/i.test(dirMatch[0])) {
      datosActuales.direccion = dirMatch[0].trim();
      console.log('[extraer] Dirección encontrada:', datosActuales.direccion);
    }
  }

  console.log('[extraer] Datos extraídos:', Object.keys(datosActuales).filter(k => datosActuales[k]));

  return {
    datosRecopilados: datosActuales,
    tipoDocumento: datosActuales.tipo_documento as string || state.tipoDocumento
  };
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
 */
async function recopilarDatos(state: AgentState): Promise<Partial<AgentState>> {
  console.log('[recopilar] Datos actuales:', Object.keys(state.datosRecopilados));
  console.log('[recopilar] Tipo documento:', state.tipoDocumento);
  
  // Si no sabemos el tipo aún, preguntar por el caso
  if (!state.tipoDocumento) {
    return {
      responseMessage: '¿Cuál es tu nombre completo y RUT para comenzar?',
      datosFaltantes: ['nombre', 'rut']
    };
  }

  // Llamar a la tool de validación para saber qué falta
  const { validarCompletitudTool } = await import('./tools');
  
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

    return {
      responseMessage: validacion.siguiente_pregunta || '¿Puedes darme más información?',
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

  // Flujo LINEAL: extraer → recopilar → END (sin loops)
  // El "loop" lo maneja el frontend llamando de nuevo a la API
  workflow.addEdge(START, 'extraer');
  workflow.addEdge('extraer', 'recopilar');
  workflow.addEdge('recopilar', END); // SIEMPRE terminar después de recopilar

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
    datosFaltantes: [],
    ready: currentData.ready === true,
    responseMessage: '',
    conversationHistory
  };

  try {
    // 🔥 CLAVE: recursionLimit=3 porque solo queremos 1 ciclo (extraer → recopilar → decidir)
    // No queremos que el graph ejecute múltiples turnos, solo UNO
    const result = await graph.invoke(initialState, {
      recursionLimit: 3 // extraer → recopilar → END (o recopilar otra vez si falla)
    });
    
    return {
      response_message: result.responseMessage,
      tipo_documento: result.tipoDocumento,
      datos_recopilados: result.datosRecopilados,
      datos_faltantes: result.datosFaltantes,
      ready: result.ready,
      ...result.datosRecopilados // Flatten datos para compatibilidad con tu API actual
    };

  } catch (error) {
    console.error('[graph] Error ejecutando agente:', error);
    throw error;
  }
}
