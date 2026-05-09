import { NextRequest, NextResponse } from 'next/server';

// ─── System prompt ────────────────────────────────────────────────────────────
const SYSTEM = `Eres un redactor legal chileno con 20 años de experiencia. Redactas cualquier tipo de documento legal.

REGLAS ABSOLUTAS:
- Texto plano únicamente. PROHIBIDO: asteriscos (*), negritas (**), markdown, almohadillas (#), HTML.
- Adapta el formato al tipo de documento:
  * Escritos judiciales: "Santiago, [fecha]" → destinatario MAYÚSCULAS → PRESENTE → compareciente → secciones → POR TANTO → RUEGO A US.
  * Contratos: título → PARTES → CLÁUSULAS numeradas → FIRMAS
  * Cartas: lugar y fecha → destinatario → cuerpo → despedida → firma
  * Finiquitos: encabezado → partes → liquidación detallada → cláusulas → firma
  * Poderes/autorizaciones: encabezado → otorgante → apoderado → facultades → firma
- Cita SOLO artículos que existan y estén vigentes. Si no estás seguro, cita la ley general.
- El documento debe poder usarse hoy.

DATOS FALTANTES: NUNCA inventes datos. Si falta algo → escribe [DATO PENDIENTE].`;

// ─── Perplexity: busca legislación chilena vigente ────────────────────────────
async function searchLeyVigente(tipoDoc: string): Promise<string | null> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return null;

  const query = `Legislación chilena vigente 2025-2026 para redactar "${tipoDoc}": artículos exactos aplicables, procedimiento, requisitos formales. Solo derecho chileno.`;

  try {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'Eres un asistente jurídico especializado en derecho chileno. Responde con los artículos y leyes exactas y vigentes. Sé conciso y preciso.',
          },
          { role: 'user', content: query },
        ],
        max_tokens: 600,
        temperature: 0.1,
        search_recency_filter: 'year',
        return_citations: true,
      }),
    });

    if (!res.ok) {
      console.error('[perplexity] error:', res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const content: string = data.choices?.[0]?.message?.content ?? '';
    if (!content) return null;

    // Adjuntar fuentes si las hay
    const citations: string[] = (data.citations ?? []).slice(0, 3);
    const sources = citations.length > 0 ? `\nFuentes: ${citations.join(' | ')}` : '';

    return content + sources;
  } catch (err) {
    console.error('[perplexity] fetch error:', err);
    return null;
  }
}

// ─── DeepSeek: genera el documento con contexto legal verificado ──────────────
async function callDeepSeek(
  tipo: string,
  datos: Record<string, unknown>,
  marcoLegal: string | null
): Promise<string | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey === 'mock') return null;

  const datosStr = Object.entries(datos)
    .filter(([k]) => !['tipo_documento', 'response_message', 'ready'].includes(k))
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');

  const marcoSection = marcoLegal
    ? `\n\nMARCO LEGAL VIGENTE (verificado con búsqueda web actualizada):\n${marcoLegal}\n\nUSA ESTOS ARTÍCULOS como base — están confirmados como vigentes.`
    : '';

  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM },
          {
            role: 'user',
            content: `Redacta el siguiente documento legal chileno.\n\nTIPO DE DOCUMENTO: ${tipo}\n\nDATOS DEL CASO:\n${datosStr}${marcoSection}\n\nRedacta el documento completo, profesional y listo para usar.`,
          },
        ],
        temperature: 0.3,
        max_tokens: 2048,
      }),
    });
    if (!res.ok) { console.error('[deepseek] generate-final error:', res.status); return null; }
    const json = await res.json();
    return json.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    console.error('[deepseek] generate-final error:', err);
    return null;
  }
}

// ─── Mock fallback ────────────────────────────────────────────────────────────
function buildMock(tipo: string, datos: Record<string, unknown>): string {
  const today = new Date().toLocaleDateString('es-CL', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Santiago',
  });
  const nombre    = String(datos.nombre ?? datos.arrendatario ?? datos.trabajador ?? '[NOMBRE]');
  const rut       = String(datos.rut ?? '[RUT]');
  const domicilio = String(datos.direccion ?? datos.domicilio ?? '[DOMICILIO]');
  const dest      = String(datos.destinatario ?? datos.tribunal ?? '[DESTINATARIO]');

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

// ─── Route handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const caseData: Record<string, unknown> = await req.json();
    const tipo = String(caseData.tipo_documento ?? 'documento legal');

    // Buscar legislación vigente en paralelo mientras preparamos datos
    const [marcoLegal] = await Promise.all([
      searchLeyVigente(tipo),
    ]);

    if (marcoLegal) {
      console.log(`[perplexity] marco legal obtenido para "${tipo}" (${marcoLegal.length} chars)`);
    } else {
      console.log(`[perplexity] sin clave o error — generando sin marco legal verificado`);
    }

    const document = await callDeepSeek(tipo, caseData, marcoLegal) ?? buildMock(tipo, caseData);

    return NextResponse.json({ document, marcoLegalUsado: !!marcoLegal });
  } catch (err) {
    console.error('[generate-final] error:', err);
    return NextResponse.json({ error: 'Error generando el documento' }, { status: 500 });
  }
}
