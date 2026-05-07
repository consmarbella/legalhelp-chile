import { NextRequest, NextResponse } from 'next/server';
import { DEEPSEEK_SYSTEM_PROMPT, MOCK_FALLBACK_RESPONSE } from '@/lib/prompts';

interface CaseData {
  response_message: string;
  materia: string | null;
  nombre: string | null;
  rut: string | null;
  direccion: string | null;
  destinatario: string | null;
  hechos: string | null;
  ley_citada: string | null;
  ready: boolean;
  campos_faltantes: string[];
}

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

// ─── Helpers ─────────────────────────────────────────────────────────────────
const capitalize = (s: string) =>
  s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

// Detect what field we're currently waiting for based on current state
function pendingField(data: Partial<CaseData>): string | null {
  if (!data.nombre)       return 'nombre';
  if (!data.rut)          return 'rut';
  if (!data.direccion)    return 'direccion';
  if (!data.destinatario) return 'destinatario';
  if (!data.hechos)       return 'hechos';
  return null;
}

// ─── Detect if a message is a situation description vs a direct answer ────────
function isDescription(msg: string): boolean {
  // Long messages or messages with sentence verbs are descriptions, not answers
  if (msg.length > 40) return true;
  if (/\b(necesito|quiero|tengo|debo|para|porque|ya que|me|mis|hay|es que|quisiera|busco)\b/i.test(msg)) return true;
  return false;
}

function detectMateria(msg: string): string | null {
  const m = msg.toLowerCase();
  if (/licencia|conducir|manejar/.test(m))         return 'Licencia de conducir';
  if (/finiquito|despido|laboral/.test(m))          return 'Laboral';
  if (/\btag\b|multa|autopista/.test(m))            return 'Prescripción TAG';
  if (/sernac|reclamo|consumidor/.test(m))          return 'Reclamo SERNAC';
  if (/arrend/.test(m))                             return 'Arrendamiento';
  if (/pension|alimento/.test(m))                   return 'Pensión de alimentos';
  return null;
}

// ─── Smart mock ──────────────────────────────────────────────────────────────
function smartMock(message: string, current: Partial<CaseData>): CaseData {
  const updated: Partial<CaseData> = { ...current };
  const firstChar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  // Always try to detect materia
  if (!updated.materia) updated.materia = detectMateria(message);

  // ── STATE MACHINE ──────────────────────────────────────────────────────────
  // We look at what's currently missing and decide what this message answers.

  if (!updated.nombre) {
    // Expecting: nombre  OR  initial description
    if (isDescription(message)) {
      // It's the opening description — save as hechos, ask for nombre
      if (!updated.hechos) updated.hechos = firstChar(message);
      // nombre stays null → will ask for it below
    } else {
      // Direct answer → it's the name
      updated.nombre = capitalize(message.trim());
    }

  } else if (!updated.rut) {
    // Expecting: RUT — accept ANYTHING the user types, no format enforcement
    updated.rut = message.trim().toUpperCase();

  } else if (!updated.direccion) {
    // Expecting: address
    updated.direccion = firstChar(message.trim());

  } else if (!updated.destinatario) {
    // Expecting: destinatario
    updated.destinatario = firstChar(message.trim());

  } else if (!updated.hechos) {
    // Expecting: hechos (rare, usually set from first message)
    updated.hechos = firstChar(message.trim());
  }

  // ── Explicit overrides for packed messages ("soy Juan, RUT 1234, vivo en X")
  const explicitName = message.match(/(?:me llamo|soy|mi nombre es)\s+([A-Za-záéíóúüñÁÉÍÓÚÜÑ ]{3,40})/i);
  if (explicitName && !updated.nombre) updated.nombre = capitalize(explicitName[1].trim());

  const explicitRut = message.match(/\b\d{7,8}[-–]\d[kK]?\b/);
  if (explicitRut && !updated.rut) updated.rut = explicitRut[0].toUpperCase();

  const explicitAddr = message.match(/(?:vivo en|domicilio[: ]+|dirección[: ]+)\s*(.{5,60})/i);
  if (explicitAddr && !updated.direccion) updated.direccion = firstChar(explicitAddr[1].trim());

  // ── Build response ──────────────────────────────────────────────────────────
  const missing: string[] = [];
  if (!updated.nombre)       missing.push('nombre');
  if (!updated.rut)          missing.push('rut');
  if (!updated.direccion)    missing.push('direccion');
  if (!updated.destinatario) missing.push('destinatario');
  if (!updated.hechos)       missing.push('hechos');

  const first = updated.nombre?.split(' ')[0] ?? '';

  const nextQuestion = (() => {
    if (!updated.nombre)       return '¿Cuál es tu nombre completo?';
    if (!updated.rut)          return `${first}, ¿cuál es tu RUT?`;
    if (!updated.direccion)    return `Perfecto. ¿Cuál es tu dirección de domicilio?`;
    if (!updated.destinatario) return '¿A quién va dirigido el escrito? (institución, empresa o persona)';
    if (!updated.hechos)       return 'Contame brevemente los hechos de tu situación.';
    return `¡Listo, ${first}! Tengo todo lo necesario. Tu documento está listo para descargar.`;
  })();

  return {
    response_message:    nextQuestion,
    materia:             updated.materia      ?? null,
    nombre:              updated.nombre       ?? null,
    rut:                 updated.rut          ?? null,
    direccion:           updated.direccion    ?? null,
    destinatario:        updated.destinatario ?? null,
    hechos:              updated.hechos       ?? null,
    ley_citada:          updated.ley_citada   ?? null,
    ready:               missing.length === 0,
    campos_faltantes:    missing,
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
