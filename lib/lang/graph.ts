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
 * ENFOQUE HÍBRIDO:
 * 1. Primero intenta con LLM (si está disponible)
 * 2. Fallback a extracción basada en patrones mejorados
 * 3. Usa reglas semánticas (no casos específicos)
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

  // PASO 1: Detectar tipo de documento (semántica, no keywords exactas)
  if (!state.tipoDocumento && !datosActuales.tipo_documento) {
    if (contenidoLower.includes('poder') || contenidoLower.includes('autor') || contenidoLower.includes('mandato') || contenidoLower.includes('apoder')) {
      datosActuales.tipo_documento = 'poder simple';
    } else if (contenidoLower.includes('finiquito') || contenidoLower.includes('despid') || contenidoLower.includes('desvincula')) {
      datosActuales.tipo_documento = 'finiquito laboral';
    } else if (contenidoLower.includes('reclam') || contenidoLower.includes('sernac') || 
               (contenidoLower.includes('consum') || contenidoLower.includes('product') || contenidoLower.includes('servicio') || 
                contenidoLower.includes('compré') || contenidoLower.includes('contraté') || 
                contenidoLower.includes('internet') || contenidoLower.includes('fibra') || contenidoLower.includes('megas'))) {
      datosActuales.tipo_documento = 'reclamo SERNAC';
    } else if (contenidoLower.includes('renunc')) {
      datosActuales.tipo_documento = 'carta_renuncia';
    } else if (contenidoLower.includes('alimento') || contenidoLower.includes('pensión') || contenidoLower.includes('pension') || contenidoLower.includes('demandar')) {
      datosActuales.tipo_documento = 'demanda_alimentos';
    } else if (contenidoLower.includes('tag') || contenidoLower.includes('autopista') || contenidoLower.includes('peaje') || contenidoLower.includes('telepeaje')) {
      datosActuales.tipo_documento = 'prescripción multa TAG';
    } else if (contenidoLower.includes('protec') || contenidoLower.includes('amparo') || (contenidoLower.includes('corta') && contenidoLower.includes('luz'))) {
      datosActuales.tipo_documento = 'recurso_proteccion';
    } else if ((contenidoLower.includes('despid') || contenidoLower.includes('desvincula')) && (contenidoLower.includes('injust') || contenidoLower.includes('cotizac'))) {
      datosActuales.tipo_documento = 'despido_injustificado';
    }
  }

  // PASO 2: Extraer NOMBRES (cualquier nombre propio de 2-4 palabras)
  if (!datosActuales.nombre) {
    const nombreMatch = contenido.match(/\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3})\b/);
    if (nombreMatch) {
      const posibleNombre = nombreMatch[1];
      // Filtrar palabras que NO son nombres
      const noEsNombre = /necesito|quiero|para|poder|reclamo|empresa|constructora|banco|supermercado|restaurant|ltda|spa|sociedad/i.test(posibleNombre);
      if (!noEsNombre) {
        datosActuales.nombre = posibleNombre;
      }
    }
  }

  // PASO 3: Extraer RUT (flexible con formatos)
  if (!datosActuales.rut) {
    const rutMatch = contenido.match(/\b(\d{1,2}[\.\d]{3,9}-?[\dkK])\b/);
    if (rutMatch) {
      const rut = rutMatch[1];
      // Validar que parezca RUT (no sea un número random como "2019")
      if (rut.length >= 9 || rut.includes('.') || rut.includes('-')) {
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

  // PASO 1: Consultar requisitos oficiales del RAG (plantillas BCN)
  const { obtenerRequisitos } = await import('./vectorstore');
  
  let requisitosOficiales = '';
  try {
    requisitosOficiales = await obtenerRequisitos(state.tipoDocumento);
    console.log('[recopilar] Requisitos BCN:', requisitosOficiales.slice(0, 100));
  } catch (error) {
    console.error('[recopilar] Error consultando RAG:', error);
  }

  // PASO 2: Validar con validateReadyState (tu lógica actual)
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

    // Agregar contexto de requisitos oficiales a la pregunta
    let pregunta = validacion.siguiente_pregunta || '¿Puedes darme más información?';
    
    // Si hay requisitos BCN relevantes, mencionarlos
    if (requisitosOficiales && validacion.datos_faltantes && validacion.datos_faltantes.length > 0) {
      const campoFaltante = validacion.datos_faltantes[0];
      if (requisitosOficiales.toLowerCase().includes(campoFaltante.toLowerCase())) {
        pregunta += ` (Este dato es obligatorio según plantillas oficiales BCN)`;
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
    datosFaltantes: [],
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
