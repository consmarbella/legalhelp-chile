import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, GENERATE_RATE_LIMIT } from '@/lib/rateLimit';
import { getOrderByOrderId, updateOrder } from '@/lib/orderStore';
import { findTemplate } from '@/lib/templates';
import { GENERATE_SYSTEM_PROMPT as SYSTEM } from '@/lib/prompts';
import { llmComplete } from '@/lib/llm';

// ─── Genera el documento usando llmComplete ───────────────────────────────────
async function generateDocument(
  tipo: string,
  datos: Record<string, unknown>
): Promise<string | null> {
  // Flatten the case data into readable lines.
  // datos_recopilados is a nested object — expand it instead of printing [object Object].
  // datos_faltantes is an array — skip it (it's about what's missing, not case content).
  const SKIP_KEYS = ['tipo_documento', 'response_message', 'ready', 'datos_faltantes', 'orderId', 'analisis_legal', 'ley_referencia', 'entidad_referencia'];

  function flatten(obj: Record<string, unknown>, lines: string[] = []): string[] {
    for (const [k, v] of Object.entries(obj)) {
      if (SKIP_KEYS.includes(k)) continue;
      if (v === null || v === undefined || v === '') continue;
      if (typeof v === 'object' && !Array.isArray(v)) {
        // Nested object (like datos_recopilados) — expand its entries
        flatten(v as Record<string, unknown>, lines);
      } else if (Array.isArray(v)) {
        lines.push(`- ${k}: ${v.join(', ')}`);
      } else {
        lines.push(`- ${k}: ${v}`);
      }
    }
    return lines;
  }

  // Dedupe lines (a field may appear both at root and inside datos_recopilados)
  const datosStr = [...new Set(flatten(datos))].join('\n');

  // ─── Plantilla verificada (artículos correctos + esqueleto) ──────────────
  // Si el caso matchea una de las plantillas, se le da al modelo el
  // FRAMEWORK LEGAL VERIFICADO para que no invente leyes ni se equivoque de via.
  const template = findTemplate(tipo, datosStr);
  const frameworkBlock = template
    ? `\n\nFRAMEWORK LEGAL VERIFICADO PARA ESTE CASO (${template.titulo} — tipo ${template.tipo}):\n` +
      `Artículos correctos a citar (USA EXCLUSIVAMENTE estos; NO cites ni inventes otros):\n${template.articulos.map(a => '- ' + a).join('\n')}\n\n` +
      `ESTRUCTURA BASE DEL DOCUMENTO (respeta este esqueleto; rellena los [[...]] con los hechos del caso y deja [DATO] como espacio para completar si falta):\n${template.esqueleto}\n\n` +
      `INSTRUCCIÓN ESPECÍFICA: ${template.instruccion_llm}`
    : '';

  // Red de seguridad: si NO hay plantilla, usa el marco legal y la autoridad
  // curados de la ficha de la página del sitemap como grounding. Asi todas las
  // paginas del sitemap generan un documento con base legal pertinente.
  const leyRef = typeof datos.ley_referencia === 'string' ? datos.ley_referencia.trim() : '';
  const entidadRef = typeof datos.entidad_referencia === 'string' ? datos.entidad_referencia.trim() : '';
  const groundingBlock = !template && (leyRef || entidadRef)
    ? `\n\nMARCO LEGAL DE REFERENCIA (de la ficha de este documento; úsalo como guía y cita las leyes por su nombre. NUNCA escribas "y siguientes" ni artículos consecutivos inventados):\n${leyRef}` +
      (entidadRef ? `\n\nAUTORIDAD O DESTINATARIO AL QUE SE DIRIGE: ${entidadRef}` : '')
    : '';

  const userMessage = `Redacta el siguiente documento legal chileno.\n\nFECHA DE HOY: ${new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Santiago' })} — usá esta fecha en el encabezado del documento. NUNCA uses [DIA], [MES] ni placeholders de fecha. NO confundas la fecha de hoy con las fechas del caso entregadas en los datos.\n\nTIPO DE DOCUMENTO: ${template?.titulo ?? tipo}\n\nDATOS DEL CASO:\n${datosStr}${frameworkBlock}${groundingBlock}\n\nRedacta el documento completo, profesional y listo para usar. ${template ? 'Sigue la ESTRUCTURA BASE y cita SOLO los artículos verificados entregados.' : 'Usa el formato chileno que corresponda al tipo de documento.'} Si falta un dato de la contraparte, déjalo como espacio para completar en lugar de inventarlo.`;

  return llmComplete({
    system: SYSTEM,
    messages: [{ role: 'user', content: userMessage }],
    maxTokens: 8192,
    temperature: 0.3,
  });
}

// ─── Mock fallback ────────────────────────────────────────────────────────────
function buildMock(tipo: string, datos: Record<string, unknown>): string {
  const today = new Date().toLocaleDateString('es-CL', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Santiago',
  });
  const nombre    = String(datos.nombre ?? datos.arrendatario ?? datos.trabajador ?? '[NOMBRE]');
  const rut       = String(datos.rut ?? '[RUT]');
  const domicilio = String(datos.direccion ?? datos.domicilio ?? '[DOMICILIO]');
  const dest      = String(datos.destinatario_inferido ?? datos.destinatario ?? datos.tribunal ?? '[DESTINATARIO]');

  return `Santiago, ${today}

${dest.toUpperCase()}
PRESENTE

${nombre.toUpperCase()}, RUT ${rut}, domiciliado en ${domicilio}, a US. respetuosamente digo:

I. ANTECEDENTES

Que vengo en solicitar ${tipo}, en virtud de los hechos y fundamentos que se exponen a continuación.

II. FUNDAMENTO LEGAL

La presente solicitud se funda en la legislación chilena vigente aplicable al caso.

POR TANTO,

RUEGO A US.: Acoger la presente solicitud y resolver conforme a derecho.

${nombre}
RUT: ${rut}`;
}

// ─── Sanitiza el documento: elimina markdown que el modelo pueda colar ───────
// Garantiza texto plano (sin **negritas**, # titulos, `code`) independiente de
// si el modelo respeta o no la instruccion del prompt. Fix determinista.
function stripMarkdown(s: string): string {
  return s
    .replace(/\*\*(.*?)\*\*/g, '$1')   // **negrita**
    .replace(/__(.*?)__/g, '$1')        // __negrita__
    .replace(/(^|\n)\s*#{1,6}\s+/g, '$1') // # titulos
    .replace(/\*\*/g, '')               // ** sueltos
    .replace(/`{1,3}/g, '')             // `code`
    .replace(/[ \t]+\n/g, '\n');        // espacios al final de linea
}

// ─── Trunca el documento para la VISTA PREVIA (sin pago) ─────────────────────
// Solo se envía al cliente ~40% del documento (coincide con el overlay de blur
// del front). Asi el texto completo NUNCA sale del servidor sin pago verificado.
function truncateForPreview(doc: string): string {
  const lines = doc.split('\n');
  const keep = Math.max(6, Math.ceil(lines.length * 0.4));
  const slice = lines.slice(0, keep);
  while (slice.length && slice[slice.length - 1].trim() === '') slice.pop();
  return slice.join('\n');
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Rate limiting
  const ip = getClientIp(req.headers);
  const rl = checkRateLimit(`generate:${ip}`, GENERATE_RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Intenta en unos segundos.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetMs / 1000)) } }
    );
  }

  try {
    const caseData: Record<string, unknown> = await req.json();

    // ─── Payment verification ───────────────────────────────────────────────
    // Sin orderId => es una VISTA PREVIA (se devuelve truncada).
    // Con orderId => debe estar 'approved' para devolver el documento completo.
    const orderId = typeof caseData.orderId === 'string' ? caseData.orderId : null;
    let isPaid = false;
    if (orderId) {
      const order = await getOrderByOrderId(orderId);
      if (!order || order.status !== 'approved') {
        return NextResponse.json({ error: 'Pago no verificado' }, { status: 403 });
      }
      isPaid = true;
    }

    const tipo = String(caseData.tipo_documento ?? 'documento legal');

    // LLM generates the document — no external search needed
    console.log(`[generate-final] Generating "${tipo}" with LLM (paid=${isPaid})`);
    const document = await generateDocument(tipo, caseData) ?? buildMock(tipo, caseData);
    const clean = stripMarkdown(document);

    if (isPaid && orderId) {
      await updateOrder(orderId, { documentUrl: clean }).catch(err => {
        console.error('[generate-final] Failed to persist document:', err);
      });
    }

    // El documento completo SOLO se entrega con pago verificado.
    return NextResponse.json({
      document: isPaid ? clean : truncateForPreview(clean),
      preview: !isPaid,
    });
  } catch (err) {
    console.error('[generate-final] error:', err);
    return NextResponse.json({ error: 'Error generando el documento' }, { status: 500 });
  }
}
