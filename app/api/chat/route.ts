import { NextRequest, NextResponse } from 'next/server';
import { DEEPSEEK_SYSTEM_PROMPT, MOCK_FALLBACK_RESPONSE } from '@/lib/prompts';

// Dynamic — DeepSeek decides which fields to collect per document type
type CaseData = Record<string, unknown>;

// ─── JSON extraction with brace balancing ────────────────────────────────────
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

// ─── Smart mock (used when no API key) ───────────────────────────────────────
function detectTipo(msg: string): string | null {
  const m = msg.toLowerCase();
  if (/arrend/.test(m))                   return 'contrato de arriendo';
  if (/finiquito|despido|laboral/.test(m)) return 'finiquito laboral';
  if (/\btag\b|multa|autopista/.test(m))  return 'prescripción TAG';
  if (/sernac|reclamo|consumidor/.test(m)) return 'carta reclamo SERNAC';
  if (/pension|alimento/.test(m))          return 'demanda de alimentos';
  if (/poder|autoriza/.test(m))            return 'poder simple';
  if (/proteccion|recurso/.test(m))        return 'recurso de protección';
  if (/desalojo|lanzamiento/.test(m))      return 'demanda de desalojo';
  return null;
}

function smartMock(message: string, current: CaseData): CaseData {
  const updated: CaseData = { ...current };

  if (!updated.tipo_documento) {
    updated.tipo_documento = detectTipo(message);
  }

  const isDescription = message.length > 50
    || /\b(necesito|quiero|tengo|debo|para|porque|me |mis |hay |quisiera|busco)\b/i.test(message);

  if (!updated.nombre && !isDescription) {
    updated.nombre = message.trim();
  } else if (!updated.rut && /\d{6,}/.test(message)) {
    updated.rut = message.trim();
  } else if (!updated.nombre && isDescription && !updated.contexto) {
    updated.contexto = message.trim();
  } else if (updated.nombre && updated.rut && !updated.direccion) {
    updated.direccion = message.trim();
  }

  const nombre = updated.nombre as string | undefined;
  const first = nombre?.split(' ')[0] ?? '';

  const nextQ = !updated.tipo_documento
    ? '¿Qué tipo de documento necesitás redactar?'
    : !updated.nombre
      ? '¿Cuál es tu nombre completo?'
      : !updated.rut
        ? `${first}, ¿cuál es tu RUT?`
        : !updated.direccion
          ? '¿Cuál es tu domicilio?'
          : `¡Perfecto, ${first}! Tengo todo lo necesario. Tu documento está listo para generarse.`;

  const ready = !!(updated.nombre && updated.rut && updated.direccion);

  return {
    ...updated,
    response_message: nextQ,
    ready,
  };
}

// ─── DeepSeek call ───────────────────────────────────────────────────────────
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
        temperature: 0.3,
        max_tokens: 1024,
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

// ─── Route handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { message, caseHistory, currentCaseData } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
    }

    const useMock = !process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY === 'mock';

    if (useMock) {
      return NextResponse.json(smartMock(message, currentCaseData ?? {}));
    }

    // Real DeepSeek path
    const messages = [...(caseHistory ?? []), { role: 'user', content: message }];
    let responseText = await callDeepSeek(messages);
    let jsonData = responseText ? extractJSON(responseText) : null;

    // Retry up to 2 times if JSON parse fails
    for (let i = 0; i < 2 && !jsonData; i++) {
      responseText = await callDeepSeek([
        ...messages,
        { role: 'assistant', content: responseText ?? '' },
        { role: 'user', content: 'Responde SOLO con JSON válido, sin texto fuera del JSON.' },
      ]);
      jsonData = responseText ? extractJSON(responseText) : null;
    }

    return NextResponse.json(jsonData ?? smartMock(message, currentCaseData ?? {}) ?? MOCK_FALLBACK_RESPONSE);
  } catch (err) {
    console.error('Chat API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
