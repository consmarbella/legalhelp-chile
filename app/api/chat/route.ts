import { NextRequest, NextResponse } from 'next/server';
import { DEEPSEEK_SYSTEM_PROMPT } from '@/lib/prompts';

type CaseData = Record<string, unknown>;

// ─── JSON extraction ──────────────────────────────────────────────────────────
function extractJSON(text: string): CaseData | null {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0, end = -1;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    if (text[i] === '}') depth--;
    if (depth === 0) { end = i; break; }
  }
  if (end === -1) return null;
  try { return JSON.parse(text.slice(start, end + 1)); } catch { return null; }
}

// ─── Smart mock (solo cuando no hay API key) ──────────────────────────────────
function smartMock(message: string, current: CaseData): CaseData {
  const updated: CaseData = { ...current };
  const m = message.toLowerCase();

  if (!updated.tipo_documento) {
    if (/licencia.*(conducir|manejar)|sacar.*licencia|conducir.*licencia/.test(m))
      updated.tipo_documento = /pens[ií]on|alimento|debo/.test(m)
        ? 'solicitud de alzamiento de suspensión de licencia de conducir'
        : 'solicitud de licencia de conducir';
    else if (/finiquito|despido|desvincula/.test(m)) updated.tipo_documento = 'finiquito laboral';
    else if (/\btag\b|autopista|telepass/.test(m))   updated.tipo_documento = 'prescripción de deuda TAG';
    else if (/sernac|reclamo/.test(m))               updated.tipo_documento = 'carta reclamo SERNAC';
    else if (/arrend|desalojo/.test(m))              updated.tipo_documento = 'contrato de arriendo';
    else if (/pens[ií]on|alimento/.test(m))          updated.tipo_documento = 'demanda de alimentos';
    else if (/recurso.*protecci[oó]n/.test(m))       updated.tipo_documento = 'recurso de protección';
    else if (/poder simple|autoriza/.test(m))        updated.tipo_documento = 'poder simple';
  }

  const isDesc = message.length > 40 || /\b(necesito|quiero|tengo|debo|para)\b/i.test(message);
  if (!updated.nombre && !isDesc) updated.nombre = message.trim();
  else if (!updated.rut && /\d{6,}/.test(message)) updated.rut = message.trim();
  else if (updated.nombre && updated.rut && !updated.direccion) updated.direccion = message.trim();

  const tipo  = updated.tipo_documento as string | undefined;
  const first = (updated.nombre as string | undefined)?.split(' ')[0] ?? '';

  const nextQ = !tipo
    ? 'Contame tu situación para identificar qué documento necesitás.'
    : !updated.nombre
      ? `Para redactar la ${tipo}, ¿cuál es tu nombre completo?`
      : !updated.rut
        ? `${first}, ¿cuál es tu RUT?`
        : !updated.direccion
          ? '¿Cuál es tu domicilio?'
          : `¡Listo, ${first}! Tengo todo lo necesario.`;

  return {
    ...updated,
    response_message: nextQ,
    ready: !!(updated.nombre && updated.rut && updated.direccion),
  };
}

// ─── DeepSeek ─────────────────────────────────────────────────────────────────
async function callDeepSeek(messages: { role: string; content: string }[]): Promise<string | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey === 'mock') return null;
  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'system', content: DEEPSEEK_SYSTEM_PROMPT }, ...messages],
        temperature: 0.2,
        max_tokens: 512,
      }),
    });
    if (!res.ok) { console.error('DeepSeek error:', res.status); return null; }
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    console.error('DeepSeek fetch error:', err);
    return null;
  }
}

// ─── Route ────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { message, caseHistory, currentCaseData } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
    }

    const useMock = !process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY === 'mock';
    if (useMock) return NextResponse.json(smartMock(message, currentCaseData ?? {}));

    const messages = [...(caseHistory ?? []), { role: 'user', content: message }];
    let responseText = await callDeepSeek(messages);
    let jsonData = responseText ? extractJSON(responseText) : null;

    // Hasta 2 reintentos si no devuelve JSON
    for (let i = 0; i < 2 && !jsonData; i++) {
      responseText = await callDeepSeek([
        ...messages,
        { role: 'assistant', content: responseText ?? '' },
        { role: 'user', content: 'Responde SOLO con JSON válido, sin texto adicional.' },
      ]);
      jsonData = responseText ? extractJSON(responseText) : null;
    }

    return NextResponse.json(jsonData ?? smartMock(message, currentCaseData ?? {}));

  } catch (err) {
    console.error('Chat API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
