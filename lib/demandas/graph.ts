/**
 * graph.ts — Grafo LangGraph REAL para demandas autorep.
 * ─────────────────────────────────────────────────────────────────────────────
 * Usa @langchain/langgraph (StateGraph) con nodos reales, condicionales y loop.
 *
 * GRAFO:
 *   START → clasificar → viabilidad ─┬─(viable)──→ recopilar → retrieve_juris → redactar → self_check ─┬─(ok)──→ END
 *                                     │                                                                  │
 *                                     └─(no viable)→ derivar → END                                      └─(error)→ redactar (loop)
 */

import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { llmComplete, LLMMessage } from '@/lib/llm';
import { MATERIAS_AUTOREP, findMateriaById, findMateriaByKeywords } from './materias-autorep';
import { DEMANDAS_CHAT_SYSTEM, DEMANDAS_GENERATE_SYSTEM } from './prompts';
import { retrieveJurisprudencia } from './retrieve';

// ─── Estado del grafo (Annotation) ───────────────────────────────────────────
export const DemandaState = Annotation.Root({
  // Input
  userMessages: Annotation<LLMMessage[]>({ reducer: (_, v) => v, default: () => [] }),
  currentMessage: Annotation<string>({ reducer: (_, v) => v, default: () => '' }),

  // Clasificación
  materiaId: Annotation<string | null>({ reducer: (_, v) => v, default: () => null }),

  // Viabilidad
  viable: Annotation<boolean | null>({ reducer: (_, v) => v, default: () => null }),
  motivoNoViable: Annotation<string | null>({ reducer: (_, v) => v, default: () => null }),
  derivarAbogado: Annotation<boolean>({ reducer: (_, v) => v, default: () => false }),

  // Datos
  datosRecopilados: Annotation<Record<string, unknown>>({ reducer: (_, v) => v, default: () => ({}) }),
  datosFaltantes: Annotation<string[]>({ reducer: (_, v) => v, default: () => [] }),
  ready: Annotation<boolean>({ reducer: (_, v) => v, default: () => false }),

  // Jurisprudencia
  jurisprudencia: Annotation<string[]>({ reducer: (_, v) => v, default: () => [] }),

  // Generación
  borrador: Annotation<string | null>({ reducer: (_, v) => v, default: () => null }),

  // Self-check
  selfCheckErrors: Annotation<string[]>({ reducer: (_, v) => v, default: () => [] }),
  selfCheckPassed: Annotation<boolean>({ reducer: (_, v) => v, default: () => false }),
  selfCheckAttempts: Annotation<number>({ reducer: (_, v) => v, default: () => 0 }),

  // Output
  documentoFinal: Annotation<string | null>({ reducer: (_, v) => v, default: () => null }),
  responseMessage: Annotation<string>({ reducer: (_, v) => v, default: () => '' }),
  ticket: Annotation<number>({ reducer: (_, v) => v, default: () => 0 }),
});

type State = typeof DemandaState.State;

// ─── NODO: Clasificar ────────────────────────────────────────────────────────
async function clasificarNode(state: State): Promise<Partial<State>> {
  // Intentar clasificar por keywords primero (rápido, sin LLM)
  const allText = state.userMessages.map(m => m.content).join(' ') + ' ' + state.currentMessage;
  const match = findMateriaByKeywords(allText);
  if (match) {
    return { materiaId: match.id };
  }
  // Si no matchea por keywords, dejar null (el chat seguirá preguntando)
  return { materiaId: null };
}

// ─── NODO: Viabilidad ────────────────────────────────────────────────────────
async function viabilidadNode(state: State): Promise<Partial<State>> {
  if (!state.materiaId) {
    return { viable: null }; // aún no clasificado, no podemos determinar
  }
  const materia = findMateriaById(state.materiaId);
  if (!materia) {
    return {
      viable: false,
      motivoNoViable: 'Esta materia no está en nuestro catálogo de autorepresentación. Requiere abogado.',
      derivarAbogado: true,
    };
  }
  // Verificar que la materia permite autorep (siempre true en nuestro catálogo,
  // pero la compuerta existe para futuras materias mixtas)
  if (materia.requiere_abogado) {
    return {
      viable: false,
      motivoNoViable: `${materia.nombre} requiere abogado patrocinante (Ley 18.120).`,
      derivarAbogado: true,
    };
  }
  return {
    viable: true,
    ticket: materia.ticket_sugerido,
  };
}

// ─── NODO: Recopilar datos ───────────────────────────────────────────────────
async function recopilarNode(state: State): Promise<Partial<State>> {
  const materia = state.materiaId ? findMateriaById(state.materiaId) : null;
  const materiasCtx = MATERIAS_AUTOREP.map(m =>
    `- ${m.id}: ${m.nombre} | Requisitos: ${m.requisitos_minimos.join(', ')}`
  ).join('\n');

  const systemEnhanced = `${DEMANDAS_CHAT_SYSTEM}\n\nCATÁLOGO:\n${materiasCtx}\n\nMATERIA DETECTADA: ${state.materiaId || 'pendiente'}\nDATOS ACTUALES: ${JSON.stringify(state.datosRecopilados)}\n`;

  const messages: LLMMessage[] = [
    ...state.userMessages,
    { role: 'user', content: state.currentMessage },
  ];

  const raw = await llmComplete({
    system: systemEnhanced,
    messages,
    maxTokens: 1500,
    temperature: 0.25,
  });

  if (!raw) {
    return { responseMessage: 'Problema al conectar con el sistema. Intenta de nuevo.' };
  }

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        responseMessage: parsed.response_message || raw,
        materiaId: parsed.materia_detectada || state.materiaId,
        datosRecopilados: { ...state.datosRecopilados, ...parsed.datos_recopilados },
        datosFaltantes: parsed.datos_faltantes || [],
        ready: parsed.ready || false,
        derivarAbogado: parsed.derivar_abogado || false,
        viable: parsed.viable ?? state.viable,
        motivoNoViable: parsed.motivo_no_viable || state.motivoNoViable,
      };
    }
  } catch { /* parse error */ }

  return { responseMessage: raw };
}

// ─── NODO: Retrieve jurisprudencia ───────────────────────────────────────────
async function retrieveNode(state: State): Promise<Partial<State>> {
  if (!state.materiaId) return {};
  const fallos = await retrieveJurisprudencia(state.materiaId);
  return { jurisprudencia: fallos };
}

// ─── NODO: Redactar ──────────────────────────────────────────────────────────
async function redactarNode(state: State): Promise<Partial<State>> {
  const materia = state.materiaId ? findMateriaById(state.materiaId) : null;
  if (!materia) return { borrador: null };

  const today = new Date().toLocaleDateString('es-CL', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Santiago',
  });

  const datosStr = Object.entries(state.datosRecopilados)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');

  const jurisBlock = state.jurisprudencia.length > 0
    ? `\n\nJURISPRUDENCIA RELEVANTE (cita estos fallos para fundamentar):\n${state.jurisprudencia.join('\n\n')}`
    : '';

  // Si hay errores de self-check previos, incluirlos como corrección
  const correccionBlock = state.selfCheckErrors.length > 0
    ? `\n\nCORRECCIONES REQUERIDAS (tu borrador anterior tenía estos errores, corrígelos):\n${state.selfCheckErrors.map(e => '- ' + e).join('\n')}`
    : '';

  const userPrompt = `Redacta la siguiente demanda/escrito judicial chileno.

FECHA DE HOY: ${today}

MATERIA: ${materia.nombre}
TRIBUNAL COMPETENTE: ${materia.tribunal}
PLAZO LEGAL: ${materia.plazo}

ARTÍCULOS Y LEYES A CITAR (USA EXCLUSIVAMENTE ESTOS):
${materia.base_legal.map(a => '• ' + a).join('\n')}
${jurisBlock}
${correccionBlock}

DATOS DEL CASO:
${datosStr}

Redacta el escrito COMPLETO en formato judicial chileno listo para presentar ante ${materia.tribunal}. Incluye suma, individualización, hechos, derecho, petitorio con POR TANTO.`;

  const document = await llmComplete({
    system: `${DEMANDAS_GENERATE_SYSTEM}\n\nMATERIA_ID: ${materia.id}`,
    messages: [{ role: 'user', content: userPrompt }],
    maxTokens: 10000,
    temperature: 0.3,
  });

  // Strip markdown
  const clean = document
    ? document
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/__(.*?)__/g, '$1')
        .replace(/(^|\n)\s*#{1,6}\s+/g, '$1')
        .replace(/`{1,3}/g, '')
        .replace(/[ \t]+\n/g, '\n')
    : null;

  return {
    borrador: clean,
    selfCheckAttempts: state.selfCheckAttempts + 1,
  };
}

// ─── NODO: Self-Check ────────────────────────────────────────────────────────
async function selfCheckNode(state: State): Promise<Partial<State>> {
  if (!state.borrador || !state.materiaId) {
    return { selfCheckPassed: false, selfCheckErrors: ['No hay borrador para verificar'] };
  }

  const materia = findMateriaById(state.materiaId);
  if (!materia) {
    return { selfCheckPassed: false, selfCheckErrors: ['Materia no encontrada'] };
  }

  const errors: string[] = [];
  const doc = state.borrador.toLowerCase();

  // 1. Verificar que cita al menos UN artículo del framework
  const citaAlMenosUno = materia.base_legal.some(art => {
    const numMatch = art.match(/\d+/);
    return numMatch ? doc.includes(numMatch[0]) : false;
  });
  if (!citaAlMenosUno) {
    errors.push(`No se encontró ninguna cita de los artículos verificados: ${materia.base_legal.join(', ')}`);
  }

  // 2. Verificar estructura judicial básica
  if (!doc.includes('por tanto')) {
    errors.push('Falta el "POR TANTO" (petitorio) requerido en un escrito judicial chileno.');
  }
  if (!doc.includes('rut') && !doc.includes('r.u.t')) {
    errors.push('No se menciona RUT del solicitante (requerido para individualización).');
  }

  // 3. Verificar que no inventó artículos fuera del framework
  // Buscar patrones "art. NNN" o "artículo NNN" y verificar contra la base
  const artMentions = doc.match(/art[ií]culo?\s*\.?\s*(\d+)/gi) || [];
  const allowedNums = new Set(materia.base_legal.flatMap(a => {
    const nums = a.match(/\d+/g);
    return nums || [];
  }));
  for (const mention of artMentions) {
    const num = mention.match(/\d+/)?.[0];
    if (num && !allowedNums.has(num)) {
      // Permitir artículos de la CPR (19, 20) y códigos comunes en contexto
      const commonAllowed = new Set(['19', '20', '21', '1', '2', '3', '4', '5']);
      if (!commonAllowed.has(num)) {
        errors.push(`Posible artículo inventado: "${mention}" no está en el framework legal verificado.`);
      }
    }
  }

  // 4. Verificar longitud mínima (un escrito judicial real tiene al menos 800 chars)
  if (state.borrador.length < 800) {
    errors.push('El escrito es demasiado corto para un documento judicial. Debe ser más extenso y fundamentado.');
  }

  const passed = errors.length === 0;

  return {
    selfCheckPassed: passed,
    selfCheckErrors: errors,
    documentoFinal: passed ? state.borrador : null,
  };
}

// ─── NODO: Derivar a abogado ─────────────────────────────────────────────────
async function derivarNode(state: State): Promise<Partial<State>> {
  return {
    derivarAbogado: true,
    responseMessage: 'Tu caso requiere patrocinio de abogado (Ley 18.120). Te derivaremos a un profesional de nuestra red que recibirá tu caso ya preparado por la IA — así pagas solo la revisión y firma, no la redacción completa.',
  };
}

// ─── Condicionales ───────────────────────────────────────────────────────────
function afterViabilidad(state: State): 'recopilar' | 'derivar' {
  if (state.viable === false || state.derivarAbogado) return 'derivar';
  return 'recopilar';
}

function afterSelfCheck(state: State): typeof END | 'redactar' {
  if (state.selfCheckPassed) return END;
  // Max 2 intentos de corrección para no loopar infinito
  if (state.selfCheckAttempts >= 3) return END;
  return 'redactar';
}

// ─── Construir el grafo ──────────────────────────────────────────────────────
export function buildDemandaGraph() {
  const graph = new StateGraph(DemandaState)
    .addNode('clasificar', clasificarNode)
    .addNode('viabilidad', viabilidadNode)
    .addNode('recopilar', recopilarNode)
    .addNode('retrieve_juris', retrieveNode)
    .addNode('redactar', redactarNode)
    .addNode('self_check', selfCheckNode)
    .addNode('derivar', derivarNode)
    .addEdge(START, 'clasificar')
    .addEdge('clasificar', 'viabilidad')
    .addConditionalEdges('viabilidad', afterViabilidad)
    .addEdge('recopilar', 'retrieve_juris')
    .addEdge('retrieve_juris', 'redactar')
    .addEdge('redactar', 'self_check')
    .addConditionalEdges('self_check', afterSelfCheck)
    .addEdge('derivar', END);

  return graph.compile();
}
