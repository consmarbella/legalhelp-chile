/**
 * graph.ts — Pipeline SIMPLIFICADA de documentos legales chilenos.
 * 2 nodos útiles: Recopilar (chat) + Redactar (generar documento).
 * Modelo: DeepSeek V3. Validación: TypeScript (no depende del LLM).
 */

import { llmComplete, LLMMessage } from '@/lib/llm';
import { generarContextoLegal } from './knowledge';

// ─── Estado ──────────────────────────────────────────────────────────────────
export interface DocState {
  messages: LLMMessage[];
  currentMessage: string;
  datos: Record<string, string>;
  datosFaltantes: string[];
  ready: boolean;
  responseMessage: string;
  tipoDocumento: string | null;
  leyAplicable: string | null;
  tribunal: string | null;
  viable: boolean;
  motivoNoViable: string | null;
  documento: string | null;
  errores: string[];
  documentoFinal: string | null;
}

export function emptyState(): DocState {
  return {
    messages: [], currentMessage: '', datos: {}, datosFaltantes: [],
    ready: false, responseMessage: '', tipoDocumento: null,
    leyAplicable: null, tribunal: null, viable: true,
    motivoNoViable: null, documento: null, errores: [], documentoFinal: null,
  };
}

// ─── VALIDACIÓN TYPESCRIPT — Campos obligatorios por tipo ────────────────────
const REQUIRED: Record<string, string[]> = {
  poder: ['mandante', 'rut', 'apoderado', 'facultades'],
  poder_notarial: ['mandante', 'rut', 'apoderado', 'facultades'],
  poder_simple: ['mandante', 'rut', 'apoderado', 'facultades'],
  carta_reclamo: ['nombre', 'rut', 'empresa', 'hechos'],
  demanda_laboral: ['nombre', 'rut', 'empresa', 'cargo', 'sueldo', 'fecha_despido'],
  finiquito: ['nombre', 'rut', 'empresa', 'cargo', 'sueldo', 'fecha_inicio', 'fecha_termino'],
  recurso_proteccion: ['nombre', 'rut', 'recurrido', 'hechos'],
  declaracion_jurada: ['nombre', 'rut', 'declaracion'],
  contrato_arriendo: ['arrendador', 'arrendatario', 'inmueble', 'renta'],
  prescripcion: ['nombre', 'rut', 'patente'],
};

function validateFields(tipo: string | null, datos: Record<string, string>): { valid: boolean; missing: string[] } {
  if (!tipo) {
    // Sin tipo: al menos nombre + rut + algo más
    const keys = Object.keys(datos).join(' ');
    const hasName = keys.includes('nombre') || keys.includes('mandante');
    const hasRut = keys.includes('rut');
    return { valid: hasName && hasRut, missing: !hasName ? ['nombre'] : !hasRut ? ['rut'] : [] };
  }

  const tipoNorm = tipo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_');
  const schema = REQUIRED[tipoNorm] || Object.values(REQUIRED).find((_, i) => tipoNorm.includes(Object.keys(REQUIRED)[i]));

  if (!schema) {
    // Sin schema: al menos 3 campos con datos reales
    return { valid: Object.values(datos).filter(v => v && v.length > 1).length >= 3, missing: [] };
  }

  const allKeys = Object.keys(datos).join(' ').toLowerCase();
  const allVals = Object.values(datos).join(' ').toLowerCase();
  const missing = schema.filter(f => !allKeys.includes(f) && !allVals.includes(f));
  return { valid: missing.length === 0, missing };
}

// ─── NODO 1: RECOPILADOR ────────────────────────────────────────────────────
const RECOPILADOR_PROMPT = `Eres un asistente legal chileno. Recopilas datos para redactar documentos.

REGLAS:
1. Detecta qué documento necesita el usuario.
2. Extrae TODOS los datos del mensaje (nombre, RUT, dirección, hechos, etc.)
3. Pregunta UN solo dato a la vez (el más importante que falte).
4. Si dice "mi mamá/hermano/contador" → ese es el apoderado/contraparte.
5. NUNCA preguntes: email, teléfono, domicilio de empresa, testigos, número boleta.
6. Marca ready=true cuando tengas todo para un documento COMPLETO y ÚTIL.

PARA PODERES: necesitas mandante(nombre+rut+domicilio) + apoderado(nombre+rut) + qué puede hacer.
PARA DEMANDAS: necesitas demandante(nombre+rut+domicilio) + demandado + hechos + pretensión.
PARA RECLAMOS: necesitas reclamante(nombre+rut) + empresa + hechos + qué quiere.

DATOS YA RECOPILADOS: {datos_actuales}

Responde SOLO JSON:
{"tipo_documento":"...","datos_extraidos":{...},"datos_faltantes":[...],"ready":true/false,"response_message":"..."}`;

export async function nodoRecopilar(state: DocState): Promise<DocState> {
  const prompt = RECOPILADOR_PROMPT.replace('{datos_actuales}', JSON.stringify(state.datos));

  const raw = await llmComplete({
    system: prompt,
    messages: [...state.messages, { role: 'user', content: state.currentMessage }],
    maxTokens: 600,
    temperature: 0.1,
  });

  if (!raw) return { ...state, responseMessage: '¿Cuál es tu nombre completo y RUT?' };

  try {
    const json = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
    const nuevoDatos = { ...state.datos, ...(json.datos_extraidos || {}) };
    const tipo = json.tipo_documento || state.tipoDocumento || null;

    // VALIDACIÓN TypeScript — el LLM no decide solo, TypeScript confirma
    const v = validateFields(tipo, nuevoDatos);
    const readyReal = json.ready === true && v.valid;

    let msg = json.response_message || '';
    if (json.ready && !v.valid && v.missing.length > 0) {
      msg = `Necesito un dato más: ¿cuál es ${v.missing[0].replace(/_/g, ' ')}?`;
    }

    return {
      ...state,
      datos: nuevoDatos,
      datosFaltantes: v.missing,
      ready: readyReal,
      responseMessage: msg,
      tipoDocumento: tipo,
    };
  } catch {
    return { ...state, responseMessage: 'Cuéntame tu situación para poder ayudarte.' };
  }
}

// ─── NODO 2: REDACTAR (único nodo de generación) ────────────────────────────
const REDACTOR_PROMPT = `Eres un redactor legal chileno con 20 años de experiencia.
Redacta en PRIMERA PERSONA del compareciente. Texto plano, sin markdown.

TIPO: {tipo}
DATOS: {datos}
FECHA: {fecha}

FORMATO SEGÚN TIPO:
- Poderes: TÍTULO → otorgante(nombre+rut+domicilio) → apoderado(nombre+rut) → facultades → firma
- Escritos judiciales: ciudad+fecha → destinatario MAYÚSCULAS → compareciente → hechos → derecho → POR TANTO
- Cartas: fecha → destinatario → cuerpo → firma
- Contratos: TÍTULO → partes → cláusulas → firmas

REGLAS:
- USA SOLO datos proporcionados. NUNCA inventes nombres, RUT, fechas, montos.
- Si falta dato esencial: [DATO PENDIENTE]
- Cita máximo 4-5 artículos específicos. PROHIBIDO "y siguientes".
- Texto plano sin asteriscos, sin markdown, sin negritas.

{contexto_legal}

Redacta el documento completo:`;

export async function nodoRedactar(state: DocState): Promise<DocState> {
  const fecha = new Date().toLocaleDateString('es-CL', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Santiago',
  });

  const contextoLegal = generarContextoLegal(
    `${state.tipoDocumento || ''} ${JSON.stringify(state.datos)}`
  );

  const prompt = REDACTOR_PROMPT
    .replace('{tipo}', state.tipoDocumento || 'documento legal')
    .replace('{datos}', JSON.stringify(state.datos))
    .replace('{fecha}', fecha)
    .replace('{contexto_legal}', contextoLegal ? `LEYES APLICABLES:\n${contextoLegal}` : '');

  const raw = await llmComplete({
    system: prompt,
    messages: [{ role: 'user', content: 'Redacta el documento completo.' }],
    maxTokens: 4096,
    temperature: 0.3,
  });

  return { ...state, documento: raw || null, documentoFinal: raw || null };
}

// ─── PIPELINE: Solo Redactar (la clasificación ya se hizo en Recopilar) ─────
export async function runGenerationPipeline(state: DocState): Promise<DocState> {
  const s = await nodoRedactar(state);
  return s;
}
