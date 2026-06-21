/**
 * graph.ts — Definición del grafo de demandas (arquitectura LangGraph).
 * ─────────────────────────────────────────────────────────────────────────────
 * Este archivo define la estructura del grafo de agentes para el módulo de
 * demandas autorep. Hoy se ejecuta como llamadas secuenciales; cuando se
 * integre el SDK de LangGraph (langgraph-js o Python), estos nodos se conectan
 * directamente como StateGraph.
 *
 * GRAFO:
 *   [intake] → [clasificar] → [viabilidad] → [recopilar] → [retrieve_juris] → [redactar] → [self_check] → [output]
 *                                   ↓ (no viable)
 *                            [derivar_abogado]
 *
 * Estado compartido (DemandaState):
 *   - mensajes del usuario
 *   - materia detectada
 *   - datos recopilados
 *   - viable (bool)
 *   - jurisprudencia recuperada
 *   - borrador del escrito
 *   - errores del self-check
 *   - documento final
 */

// ─── Estado del grafo ────────────────────────────────────────────────────────
export interface DemandaState {
  // Input
  userMessages: { role: 'user' | 'assistant'; content: string }[];
  currentMessage: string;

  // Clasificación
  materiaId: string | null;
  materiaNombre: string | null;

  // Viabilidad
  viable: boolean | null;
  motivoNoViable: string | null;
  derivarAbogado: boolean;

  // Datos
  datosRecopilados: Record<string, unknown>;
  datosFaltantes: string[];
  ready: boolean;

  // Retrieval (jurisprudencia)
  jurisprudenciaRecuperada: string[];
  fuentesConsultadas: string[];

  // Generación
  borradorEscrito: string | null;

  // Self-check
  erroresVerificacion: string[];
  citasValidas: boolean;

  // Output
  documentoFinal: string | null;
  responseMessage: string;
}

export const INITIAL_STATE: DemandaState = {
  userMessages: [],
  currentMessage: '',
  materiaId: null,
  materiaNombre: null,
  viable: null,
  motivoNoViable: null,
  derivarAbogado: false,
  datosRecopilados: {},
  datosFaltantes: [],
  ready: false,
  jurisprudenciaRecuperada: [],
  fuentesConsultadas: [],
  borradorEscrito: null,
  erroresVerificacion: [],
  citasValidas: false,
  documentoFinal: null,
  responseMessage: '',
};

// ─── Nodos del grafo ─────────────────────────────────────────────────────────
// Cada nodo recibe el estado, lo modifica y lo devuelve.
// Cuando migremos a LangGraph SDK, estos se registran como:
//   graph.addNode("clasificar", clasificarNode);
//   graph.addEdge("intake", "clasificar");
//   graph.addConditionalEdge("viabilidad", ...) etc.

export type GraphNode = (state: DemandaState) => Promise<Partial<DemandaState>>;

/**
 * Nodo 1: INTAKE
 * Recibe el mensaje del usuario y lo agrega al estado.
 */
export const intakeNode: GraphNode = async (state) => {
  return {
    userMessages: [...state.userMessages, { role: 'user' as const, content: state.currentMessage }],
  };
};

/**
 * Nodo 2: CLASIFICAR
 * Usa el LLM (Flash/barato) para determinar la materia.
 * (La implementación real llama al LLM; acá definimos el contrato.)
 */
export const clasificarNode: GraphNode = async (state) => {
  // TODO: implementar con LLM Flash para clasificación rápida y barata
  // Por ahora el chat endpoint hace esto inline
  return state;
};

/**
 * Nodo 3: VIABILIDAD (compuerta)
 * Verifica:
 *   - ¿La materia está en el catálogo de autorep?
 *   - ¿El plazo está vigente?
 *   - ¿Faltan antecedentes críticos?
 * Si no viable → derivar a abogado.
 */
export const viabilidadNode: GraphNode = async (state) => {
  // TODO: lógica de verificación contra catálogo + plazos
  // Por ahora el chat endpoint maneja esto
  return state;
};

/**
 * Nodo 4: RECOPILAR
 * Itera con el usuario hasta tener todos los datos necesarios.
 * Loop: pregunta → respuesta → actualiza datos → ¿faltan? → loop/ready
 */
export const recopilarNode: GraphNode = async (state) => {
  // TODO: loop de recopilación (hoy lo hace el chat endpoint)
  return state;
};

/**
 * Nodo 5: RETRIEVE JURISPRUDENCIA
 * Busca sentencias y fallos relevantes en:
 *   - Base local de fallos curados (SQL/JSON)
 *   - BCN (Biblioteca del Congreso Nacional) — leyes vigentes
 *   - Poder Judicial (buscador de causas/fallos)
 *
 * Este nodo es el que da la VENTAJA sobre un abogado barato:
 * analiza jurisprudencia que a $200K nadie revisaría.
 */
export const retrieveJurisprudenciaNode: GraphNode = async (state) => {
  // TODO: implementar retrieval real
  // - Consultar base SQL de fallos por materia
  // - Enriquecer con BCN (leychile.cl API o scraping)
  // - Formatear como contexto para el nodo de redacción
  return {
    jurisprudenciaRecuperada: [],
    fuentesConsultadas: [],
  };
};

/**
 * Nodo 6: REDACTAR
 * Usa el LLM potente (Claude/GPT-4) con:
 *   - Framework legal verificado (de la materia)
 *   - Datos del caso
 *   - Jurisprudencia recuperada
 * Genera el borrador del escrito.
 */
export const redactarNode: GraphNode = async (state) => {
  // TODO: implementar (hoy lo hace /api/demandas/generate)
  return state;
};

/**
 * Nodo 7: SELF-CHECK (verificación automática)
 * Revisa el borrador:
 *   - ¿Las citas legales son correctas? (contra catálogo)
 *   - ¿Cumple requisitos procesales? (suma, petitorio, tribunal)
 *   - ¿Los datos del usuario están completos?
 *   - ¿No hay artículos inventados?
 * Si falla → vuelve a redactar con correcciones.
 */
export const selfCheckNode: GraphNode = async (state) => {
  // TODO: implementar verificación
  // - Extraer citas del borrador
  // - Validar contra base_legal de la materia
  // - Verificar estructura (suma, POR TANTO, etc.)
  return {
    erroresVerificacion: [],
    citasValidas: true,
  };
};

/**
 * Nodo 8: OUTPUT
 * Entrega el documento final al usuario.
 */
export const outputNode: GraphNode = async (state) => {
  return {
    documentoFinal: state.borradorEscrito,
  };
};

/**
 * Nodo DERIVAR (branch condicional)
 * Si el caso no es viable para autorep, deriva a la red de abogados.
 */
export const derivarAbogadoNode: GraphNode = async (state) => {
  return {
    derivarAbogado: true,
    responseMessage: 'Tu caso requiere patrocinio de abogado (Ley 18.120). Te derivaremos a un profesional de nuestra red que recibirá tu caso ya preparado por la IA — así pagas solo la revisión y firma, no la redacción completa.',
  };
};

// ─── Ejecutor simple (pre-LangGraph) ─────────────────────────────────────────
// Cuando tengamos el SDK de LangGraph, esto se reemplaza por:
//   const graph = new StateGraph({ channels: ... })
//   graph.addNode(...) / graph.addEdge(...) / graph.compile()
//
// Por ahora el flujo lo orquesta el endpoint /api/demandas/chat (intake →
// clasificar → viabilidad → recopilar, todo en una sola llamada LLM con el
// system prompt que define los pasos) y /api/demandas/generate (retrieve →
// redactar → output, con self-check básico via strip de markdown).
