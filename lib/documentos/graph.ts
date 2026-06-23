/**
 * graph.ts — Pipeline de 5 nodos para documentos legales chilenos.
 * Usa DeepSeek (barato) con prompts cortos y especializados.
 *
 * PIPELINE:
 *   recopilar → clasificar → validar → redactar → filtrar
 *
 * Cada nodo hace UNA sola cosa. No hay prompt gigante.
 */

import { llmComplete, LLMMessage } from '@/lib/llm';

// ─── Estado ──────────────────────────────────────────────────────────────────
export interface DocState {
  // Input
  messages: LLMMessage[];
  currentMessage: string;

  // Nodo 1: Recopilador
  datos: Record<string, string>;
  datosFaltantes: string[];
  ready: boolean;
  responseMessage: string;

  // Nodo 2: Clasificador
  tipoDocumento: string | null;
  leyAplicable: string | null;
  tribunal: string | null;

  // Nodo 3: Validador
  viable: boolean;
  motivoNoViable: string | null;

  // Nodo 4: Redactor
  documento: string | null;

  // Nodo 5: Filtro
  errores: string[];
  documentoFinal: string | null;
}

export function emptyState(): DocState {
  return {
    messages: [],
    currentMessage: '',
    datos: {},
    datosFaltantes: [],
    ready: false,
    responseMessage: '',
    tipoDocumento: null,
    leyAplicable: null,
    tribunal: null,
    viable: true,
    motivoNoViable: null,
    documento: null,
    errores: [],
    documentoFinal: null,
  };
}

// ─── NODO 1: RECOPILADOR ────────────────────────────────────────────────────
// Solo extrae datos y pregunta lo que falta. NO razona legalmente.
const RECOPILADOR_PROMPT = `Eres un asistente que recopila datos para documentos legales chilenos.
Tu ÚNICO trabajo es extraer datos del mensaje del usuario y preguntar lo que falta.

REGLAS:
- Extrae: nombre, rut, direccion, hechos, contraparte, montos, fechas, patente, tribunal, etc.
- Si el usuario dice "MI auto/casa/depto" → el bien está a SU nombre. No preguntes.
- Si el usuario da su dirección, NO la pidas de nuevo.
- NUNCA preguntes email ni teléfono.
- NUNCA preguntes vigencia de poderes para trámites puntuales.
- NUNCA preguntes "¿a nombre de quién está?" si dijo "mi [cosa]".
- Pregunta UN dato por mensaje, el más importante que falte.
- Cuando tengas: nombre + RUT + dirección + hechos del caso → marca ready=true.

DATOS RECOPILADOS HASTA AHORA:
{datos_actuales}

Responde SOLO JSON:
{
  "datos_extraidos": {"campo": "valor", ...},
  "datos_faltantes": ["dato1", "dato2"],
  "ready": true/false,
  "response_message": "pregunta siguiente o confirmación"
}`;

export async function nodoRecopilar(state: DocState): Promise<DocState> {
  const prompt = RECOPILADOR_PROMPT.replace('{datos_actuales}', JSON.stringify(state.datos));

  const raw = await llmComplete({
    system: prompt,
    messages: [...state.messages, { role: 'user', content: state.currentMessage }],
    maxTokens: 800,
    temperature: 0.1,
  });

  if (!raw) return { ...state, responseMessage: '¿Cuál es tu nombre completo y RUT?' };

  try {
    const json = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
    const nuevoDatos = { ...state.datos, ...(json.datos_extraidos || {}) };
    return {
      ...state,
      datos: nuevoDatos,
      datosFaltantes: json.datos_faltantes || [],
      ready: json.ready || false,
      responseMessage: json.response_message || '',
    };
  } catch {
    return { ...state, responseMessage: 'Dame tu nombre completo y RUT para empezar.' };
  }
}

// ─── NODO 2: CLASIFICADOR ───────────────────────────────────────────────────
// Determina qué tipo de documento es y qué ley aplica.
const CLASIFICADOR_PROMPT = `Eres un clasificador legal chileno. Recibes los datos de un caso y determinas:
1. Tipo exacto de documento (carta reclamo, poder, contrato, demanda, recurso, etc.)
2. Ley o norma principal aplicable
3. Tribunal o institución competente (si aplica)

DATOS DEL CASO:
{datos}

Responde SOLO JSON:
{
  "tipo_documento": "nombre del documento",
  "ley_aplicable": "Ley N° XXXX o Código del Trabajo art. XX",
  "tribunal": "tribunal competente o null si no aplica"
}`;

export async function nodoClasificar(state: DocState): Promise<DocState> {
  const prompt = CLASIFICADOR_PROMPT.replace('{datos}', JSON.stringify(state.datos));

  const raw = await llmComplete({
    system: prompt,
    messages: [{ role: 'user', content: 'Clasifica este caso.' }],
    maxTokens: 300,
    temperature: 0.1,
  });

  if (!raw) return state;

  try {
    const json = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
    return {
      ...state,
      tipoDocumento: json.tipo_documento || null,
      leyAplicable: json.ley_aplicable || null,
      tribunal: json.tribunal || null,
    };
  } catch {
    return state;
  }
}

// ─── NODO 3: VALIDADOR ──────────────────────────────────────────────────────
// Verifica requisitos legales (plazos, competencia, etc.)
const VALIDADOR_PROMPT = `Eres un validador legal chileno. Verificas si el caso cumple los requisitos para el documento solicitado.

CASO:
- Tipo: {tipo}
- Ley: {ley}
- Datos: {datos}

Verifica:
1. ¿Los plazos legales están vigentes? (prescripción, caducidad)
2. ¿Hay datos suficientes para un documento válido?
3. ¿El tribunal/destinatario es correcto?

Responde SOLO JSON:
{
  "viable": true/false,
  "motivo_no_viable": "razón si no es viable, null si sí es viable",
  "observaciones": "notas para el redactor"
}`;

export async function nodoValidar(state: DocState): Promise<DocState> {
  const prompt = VALIDADOR_PROMPT
    .replace('{tipo}', state.tipoDocumento || 'no clasificado')
    .replace('{ley}', state.leyAplicable || 'no determinada')
    .replace('{datos}', JSON.stringify(state.datos));

  const raw = await llmComplete({
    system: prompt,
    messages: [{ role: 'user', content: 'Valida este caso.' }],
    maxTokens: 400,
    temperature: 0.1,
  });

  if (!raw) return state;

  try {
    const json = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
    return {
      ...state,
      viable: json.viable !== false,
      motivoNoViable: json.motivo_no_viable || null,
    };
  } catch {
    return state;
  }
}

// ─── NODO 4: REDACTOR ───────────────────────────────────────────────────────
// Redacta el documento legal completo.
const REDACTOR_PROMPT = `Eres un redactor legal chileno con 20 años de experiencia.
Redacta el documento en PRIMERA PERSONA del compareciente (NO de un abogado).

TIPO: {tipo}
LEY APLICABLE: {ley}
TRIBUNAL: {tribunal}
DATOS: {datos}
FECHA: {fecha}

FORMATO:
- Escritos judiciales: ciudad+fecha → destinatario MAYÚSCULAS → PRESENTE → compareciente → secciones (I. II. III.) → POR TANTO → RUEGO A US.
- Cartas: lugar+fecha → destinatario → cuerpo → firma
- Contratos: TÍTULO → PARTES → CLÁUSULAS → FIRMAS
- Poderes: TÍTULO → otorgante → apoderado → facultades → firma

REGLAS:
- NUNCA inventes datos que no estén en los DATOS proporcionados.
- Si falta un dato, pon [DATO PENDIENTE].
- Cita SOLO artículos específicos (máx 6). PROHIBIDO "y siguientes".
- Texto plano sin markdown.

Redacta el documento completo:`;

export async function nodoRedactar(state: DocState): Promise<DocState> {
  const fecha = new Date().toLocaleDateString('es-CL', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Santiago',
  });

  const prompt = REDACTOR_PROMPT
    .replace('{tipo}', state.tipoDocumento || 'documento legal')
    .replace('{ley}', state.leyAplicable || 'legislación chilena vigente')
    .replace('{tribunal}', state.tribunal || 'no aplica')
    .replace('{datos}', JSON.stringify(state.datos))
    .replace('{fecha}', fecha);

  const raw = await llmComplete({
    system: prompt,
    messages: [{ role: 'user', content: 'Redacta el documento completo.' }],
    maxTokens: 4096,
    temperature: 0.3,
  });

  return { ...state, documento: raw || null };
}

// ─── NODO 5: FILTRO DE CALIDAD ──────────────────────────────────────────────
// Revisa errores, artículos mal citados, datos cambiados.
const FILTRO_PROMPT = `Eres un juez revisor estricto. Revisas un documento legal chileno.

DOCUMENTO:
{documento}

DATOS ORIGINALES DEL CLIENTE:
{datos}

Revisa:
1. ¿Los nombres y RUT coinciden con los datos originales?
2. ¿Los artículos citados existen y son correctos para este tipo de caso?
3. ¿Hay errores ortográficos graves?
4. ¿Se inventaron hechos que no están en los datos originales?
5. ¿El formato es correcto para el tipo de documento?

Si hay errores GRAVES (nombre cambiado, ley inventada, formato incorrecto):
Responde el documento CORREGIDO completo.

Si no hay errores graves:
Responde exactamente el mismo documento sin cambios.

Responde SOLO el texto del documento (sin comentarios ni explicaciones):`;

export async function nodoFiltrar(state: DocState): Promise<DocState> {
  if (!state.documento) return state;

  const prompt = FILTRO_PROMPT
    .replace('{documento}', state.documento)
    .replace('{datos}', JSON.stringify(state.datos));

  const raw = await llmComplete({
    system: prompt,
    messages: [{ role: 'user', content: 'Revisa y corrige si es necesario.' }],
    maxTokens: 4096,
    temperature: 0.1,
  });

  return { ...state, documentoFinal: raw || state.documento };
}

// ─── PIPELINE COMPLETA ──────────────────────────────────────────────────────
export async function runGenerationPipeline(state: DocState): Promise<DocState> {
  let s = await nodoClasificar(state);
  s = await nodoValidar(s);

  if (!s.viable) return s;

  s = await nodoRedactar(s);
  s = await nodoFiltrar(s);
  return s;
}
