import { NextRequest, NextResponse } from 'next/server';
import { findTemplate } from '@/lib/templates';
import { checkRateLimit, getClientIp, GENERATE_RATE_LIMIT } from '@/lib/rateLimit';

interface CaseData {
  materia: string | null;
  nombre: string | null;
  rut: string | null;
  direccion: string | null;
  destinatario: string | null;
  hechos: string | null;
  ley_citada: string | null;
}

// ─── System prompt base ───────────────────────────────────────────────────────
const BASE_SYSTEM = `Eres un abogado senior chileno con 20 años de experiencia en litigios. Redactas escritos legales con razonamiento jurídico propio, no como un formulario.

REGLAS ABSOLUTAS:
- Texto plano únicamente. PROHIBIDO: asteriscos (*), negritas (**), markdown, bloques de código, almohadillas (#).
- Nunca uses "MATERIA:" como encabezado — no es formato judicial chileno.
- Estructura: "Santiago, [fecha]" → destinatario en MAYÚSCULAS → "PRESENTE" → compareciente → secciones → POR TANTO → RUEGO A US. → firma.
- Cita SOLO artículos que existen. Nunca listes artículos consecutivos.
- Extensión: 300-600 palabras. Conciso y efectivo.
- El escrito debe poder presentarse hoy ante la institución.

DATOS FALTANTES — REGLA CRÍTICA:
- NUNCA inventes fechas, nombres, RUTs ni datos que el usuario no haya proporcionado.
- Si falta una fecha concreta → escribe exactamente: [FECHA]
- Si falta el nombre de la contraparte → escribe exactamente: [NOMBRE CONTRAPARTE]
- Si falta el número de causa → escribe exactamente: [RIT/ROL N°]
- Si falta cualquier otro dato → escribe [DATO PENDIENTE] con descripción breve.
- El cliente completará esos campos antes de presentar el escrito. Es preferible un campo vacío que un dato falso.

MONTOS Y CÁLCULOS — RAZONAMIENTO PERMITIDO:
- Si el usuario mencionó una cifra base y puedes calcular un total lógico (ej: 4 meses × $350.000), PUEDES incluirlo.
- Pero escríbelo como estimación, no como hecho probado: "suma que asciende aproximadamente a $1.400.000 (4 meses × $350.000 mensuales, monto a acreditar en juicio)".
- Si no hay cifra base alguna → escribe [$MONTO] sin inventar.
- Este razonamiento aritmético es parte de tu criterio como abogado: úsalo, pero con transparencia.`;

// ─── Prompt CON template (artículos verificados + razonamiento libre) ─────────
function buildPromptWithTemplate(data: CaseData, template: ReturnType<typeof findTemplate>) {
  return {
    system: `${BASE_SYSTEM}

IMPORTANTE: Se te proporciona un framework legal verificado para este tipo de caso.
Úsalo como REFERENCIA de artículos y estructura, pero razona el caso como un abogado real:
analiza los hechos, construye argumentos propios, personaliza según la situación específica.
NO rellenes mecánicamente — PIENSA el caso y escríbelo con criterio jurídico propio.`,
    user: `Redacta el siguiente escrito legal chileno.

DATOS DEL CASO:
- Nombre: ${data.nombre ?? 'Sin nombre'}
- RUT: ${data.rut ?? 'Sin RUT'}
- Domicilio: ${data.direccion ?? 'Sin domicilio'}
- Destinatario: ${data.destinatario ?? 'Sin destinatario'}
- Hechos: ${data.hechos ?? 'Sin hechos'}
${data.ley_citada ? `- Ley mencionada: ${data.ley_citada}` : ''}

FRAMEWORK LEGAL VERIFICADO PARA ESTE TIPO DE CASO (${template!.titulo}):
Artículos correctos a citar: ${template!.articulos.join(' | ')}
Estructura base: ${template!.esqueleto.substring(0, 600)}...

INSTRUCCIÓN ESPECÍFICA: ${template!.instruccion_llm}

Redacta el escrito completo razonando el caso, no llenando un formulario.
Usa los artículos verificados del framework pero construye los argumentos según los hechos específicos del cliente.`,
  };
}

// ─── Prompt SIN template (LLM razona libremente) ─────────────────────────────
function buildPromptFreeform(data: CaseData) {
  return {
    system: `${BASE_SYSTEM}

No existe un template para este tipo de caso. Razona jurídicamente desde cero como abogado senior.
Identifica qué tipo de documento es más apropiado, qué artículos chilenos aplican exactamente,
y construye el escrito con pleno criterio jurídico propio. Si no estás seguro de un artículo específico,
cita la ley general aplicable sin inventar numeración.`,
    user: `Redacta el siguiente escrito legal chileno.

DATOS DEL CASO:
- Nombre: ${data.nombre ?? 'Sin nombre'}
- RUT: ${data.rut ?? 'Sin RUT'}
- Domicilio: ${data.direccion ?? 'Sin domicilio'}
- Destinatario: ${data.destinatario ?? 'Sin destinatario'}
- Materia: ${data.materia ?? 'Sin materia'}
- Hechos: ${data.hechos ?? 'Sin hechos'}
${data.ley_citada ? `- Ley mencionada: ${data.ley_citada}` : ''}

Analiza el caso, determina el tipo de documento correcto y redáctalo con razonamiento jurídico propio.`,
  };
}

// ─── Fallback mock cuando no hay API ────────────────────────────────────────
function buildMockDocument(data: CaseData): string {
  const today = new Date().toLocaleDateString('es-CL', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Santiago',
  });
  return `Santiago, ${today}

${(data.destinatario ?? 'SEÑOR DIRECTOR').toUpperCase()}
PRESENTE

${(data.nombre ?? 'EL SUSCRITO').toUpperCase()}, RUT ${data.rut ?? 'XX.XXX.XXX-X'}, domiciliado en ${data.direccion ?? '[domicilio]'}, a SS. respetuosamente digo:

I. ANTECEDENTES DE HECHO

${data.hechos ?? '[Descripción de los hechos]'}

II. FUNDAMENTO LEGAL

${data.ley_citada ?? 'La presente solicitud se funda en la legislación chilena vigente aplicable al caso.'}

POR TANTO,

RUEGO A SS.: Acoger la presente solicitud y resolver conforme a derecho.

${data.nombre ?? 'NOMBRE DEL SOLICITANTE'}
RUT: ${data.rut ?? 'XX.XXX.XXX-X'}`;
}

// ─── Llamada a DeepSeek ───────────────────────────────────────────────────────
async function callDeepSeek(system: string, user: string): Promise<string | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey === 'mock') return null;

  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: system },
          { role: 'user',   content: user   },
        ],
        temperature: 0.4,
        max_tokens: 2048,
      }),
    });
    if (!res.ok) { console.error('DeepSeek generate error:', res.status); return null; }
    const json = await res.json();
    return json.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    console.error('DeepSeek generate error:', err);
    return null;
  }
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
    const caseData: CaseData = await req.json();

    const apiKey = process.env.DEEPSEEK_API_KEY;
    const useMock = !apiKey || apiKey === 'mock';

    if (useMock) {
      return NextResponse.json({
        document: buildMockDocument(caseData),
        usedTemplate: false,
        templateId: null,
      });
    }

    // Buscar template verificado
    const template = findTemplate(caseData.materia, caseData.hechos);

    const { system, user } = template
      ? buildPromptWithTemplate(caseData, template)
      : buildPromptFreeform(caseData);

    const document = await callDeepSeek(system, user) ?? buildMockDocument(caseData);

    return NextResponse.json({
      document,
      usedTemplate: !!template,
      templateId: template?.id ?? null,
    });

  } catch (err) {
    console.error('Generate error:', err);
    return NextResponse.json({ error: 'Error generando el documento' }, { status: 500 });
  }
}
