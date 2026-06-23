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
import { geminiComplete } from './llm-gemini';
import { generarContextoLegal, buscarDocumentos, getConocimiento } from './knowledge';

// Use Gemini Flash if available, fallback to Anthropic/DeepSeek
async function complete(opts: { system: string; messages: { role: 'user' | 'assistant'; content: string }[]; maxTokens?: number; temperature?: number }): Promise<string | null> {
  // Try Gemini first (fast + cheap)
  const gemini = await geminiComplete(opts);
  if (gemini) return gemini;
  // Fallback to existing LLM (Anthropic/DeepSeek)
  return llmComplete({ ...opts, messages: opts.messages as LLMMessage[] });
}

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
// Extrae datos, identifica tipo de documento, y pregunta lo que falta según el tipo.
const RECOPILADOR_PROMPT = `Eres un asistente que recopila datos para documentos legales chilenos.
Tu trabajo: extraer datos del mensaje, identificar el tipo de documento, y preguntar SOLO lo esencial.

═══ REGLA PRINCIPAL ═══
Con 3 respuestas del usuario debes tener suficiente para generar. MÁXIMO 3-4 preguntas.

═══ DATOS ESENCIALES (los únicos que NECESITAS) ═══
1. Nombre completo + RUT del solicitante
2. Domicilio del solicitante (calle, número, comuna)
3. Nombre de la contraparte/apoderado/empresa (RUT si lo dan, pero NO lo exijas)
4. Qué quiere hacer / qué le pasó (el "caso" o la "facultad")

═══ DATOS QUE NUNCA DEBES PEDIR ═══
- Domicilio de la contraparte/empresa/trabajador/apoderado
- Número de boleta, factura, póliza, contrato
- Testigos o pruebas
- RUT de instituciones (municipalidad, isapre, SII)
- Fechas exactas al día (basta "junio 2026" o "hace 4 meses")
- Forma de pago detallada
- Email, teléfono, vigencia de poderes
- "Confirmación" de nada ("¿confirmas que no tienes bienes?")
- Tipo específico de subsidio/programa

═══ REGLAS DE EXTRACCIÓN ═══
- Si dice "MI auto/casa/trabajo" → es SUYO, no preguntes titularidad.
- Si dice "mi hermano/contador/mamá" + nombre → ese es el apoderado/parte.
- Si da varios datos en un mensaje, extráelos TODOS.
- Acepta RUT en cualquier formato.
- Infiere lo que puedas del contexto.

═══ CUÁNDO MARCAR READY ═══
ready=true cuando tengas:
✓ Nombre + RUT + domicilio del solicitante
✓ Identificada la contraparte/apoderado (al menos nombre)
✓ Claro qué documento necesita y para qué

Si ya tienes esos 3 puntos → ready=true. NO sigas preguntando.

DATOS RECOPILADOS HASTA AHORA:
{datos_actuales}

Responde SOLO JSON válido:
{
  "tipo_documento": "tipo detectado",
  "datos_extraidos": {"campo": "valor", ...},
  "datos_faltantes": ["solo lo ESENCIAL que falta"],
  "ready": true/false,
  "response_message": "pregunta O confirmación"
}`;

export async function nodoRecopilar(state: DocState): Promise<DocState> {
  const datosCtx = JSON.stringify(state.datos);
  const prompt = RECOPILADOR_PROMPT.replace('{datos_actuales}', datosCtx);

  const raw = await complete({
    system: prompt,
    messages: [...state.messages, { role: 'user', content: state.currentMessage }],
    maxTokens: 800,
    temperature: 0.1,
  });

  if (!raw) return { ...state, responseMessage: '¿Cuál es tu nombre completo y RUT?' };

  try {
    const json = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
    const nuevoDatos = { ...state.datos, ...(json.datos_extraidos || {}) };

    // Persist tipo_documento from first classification
    const tipo = json.tipo_documento || state.tipoDocumento || null;

    return {
      ...state,
      datos: nuevoDatos,
      datosFaltantes: json.datos_faltantes || [],
      ready: json.ready || false,
      responseMessage: json.response_message || '',
      tipoDocumento: tipo,
    };
  } catch {
    return { ...state, responseMessage: 'Cuéntame tu situación para poder ayudarte.' };
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
  // Inyectar conocimiento de la base de datos de documentos chilenos
  const contextoLegal = generarContextoLegal(JSON.stringify(state.datos));
  const promptConContexto = CLASIFICADOR_PROMPT.replace('{datos}', JSON.stringify(state.datos))
    + (contextoLegal ? `\n\nCONOCIMIENTO LEGAL CHILENO DISPONIBLE:\n${contextoLegal}` : '');

  const raw = await complete({
    system: promptConContexto,
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

  const raw = await complete({
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

  // Inyectar conocimiento específico del tipo de documento
  const contextoLegal = generarContextoLegal(
    `${state.tipoDocumento || ''} ${JSON.stringify(state.datos)}`
  );

  const prompt = REDACTOR_PROMPT
    .replace('{tipo}', state.tipoDocumento || 'documento legal')
    .replace('{ley}', state.leyAplicable || 'legislación chilena vigente')
    .replace('{tribunal}', state.tribunal || 'no aplica')
    .replace('{datos}', JSON.stringify(state.datos))
    .replace('{fecha}', fecha)
    + (contextoLegal ? `\n\nCONOCIMIENTO LEGAL CHILENO (usa estos artículos y leyes reales):\n${contextoLegal}` : '');

  const raw = await complete({
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

  const raw = await complete({
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
