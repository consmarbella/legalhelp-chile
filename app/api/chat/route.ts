import { NextRequest, NextResponse } from 'next/server';
import { DEEPSEEK_SYSTEM_PROMPT } from '@/lib/prompts';

type CaseData = Record<string, unknown>;

// ─── Detección programática del tipo de documento ────────────────────────────
// Corre en el servidor ANTES de DeepSeek — no depende del LLM
function detectTipo(msg: string): string | null {
  const m = msg.toLowerCase();

  // Licencia de conducir
  if (/licencia.*(conducir|manejar)|conducir.*licencia|renovar.*licencia|sacar.*licencia/.test(m)) {
    if (/pens[ií]on|alimento|debo|deuda|suspend/.test(m))
      return 'solicitud de alzamiento de suspensión de licencia de conducir';
    return 'solicitud de licencia de conducir';
  }
  // TAG / multas
  if (/\btag\b|autopista|telepass|multa.*(transit|auto)|prescripci[oó]n.*multa/.test(m))
    return 'prescripción de deuda TAG';
  // Finiquito / laboral
  if (/finiquito|me despidieron|despido|desvincula|term[ií]n.*contrato|laboral/.test(m))
    return 'finiquito laboral';
  // Pensión alimenticia
  if (/pens[ií]on.*(aliment|hijo)|aliment.*pens[ií]on|no.*paga.*pension|demand.*alimento/.test(m))
    return 'demanda de alimentos';
  // SERNAC / reclamo consumidor
  if (/sernac|reclamo.*(empresa|tienda|product)|consumidor|garantía|devoluci[oó]n/.test(m))
    return 'carta reclamo SERNAC';
  // Arriendo
  if (/arrend|arrendador|arrendatario|contrato.*arriendo|desalojo|lanzamiento/.test(m))
    return 'contrato de arriendo';
  // Recurso de protección
  if (/recurso.*protecci[oó]n|protecci[oó]n.*recurso|derecho.*vulnerad/.test(m))
    return 'recurso de protección';
  // Poder / autorización
  if (/poder simple|autoriza.*notarial|mandato|apoderado/.test(m))
    return 'poder simple';
  // Deuda / cobro
  if (/me deben|cobrar.*deuda|deuda.*cobrar|carta.*cobro/.test(m))
    return 'carta de cobro de deuda';
  // Herencia
  if (/herencia|sucesi[oó]n|falleci[oó]|difunto/.test(m))
    return 'posesión efectiva';

  return null;
}

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

// ─── Smart mock (sin API key) ─────────────────────────────────────────────────
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
  } else if (updated.nombre && updated.rut && !updated.direccion) {
    updated.direccion = message.trim();
  } else if (!updated.nombre && isDescription && !updated.contexto) {
    updated.contexto = message.trim();
  }

  const nombre  = updated.nombre as string | undefined;
  const first   = nombre?.split(' ')[0] ?? '';
  const tipo    = updated.tipo_documento as string | undefined;

  let nextQ: string;
  if (!tipo) {
    nextQ = '¿Cuál es tu situación? Contame qué necesitás resolver.';
  } else if (!updated.nombre) {
    nextQ = `Para redactar tu ${tipo}, ¿cuál es tu nombre completo?`;
  } else if (!updated.rut) {
    nextQ = `${first}, ¿cuál es tu RUT?`;
  } else if (!updated.direccion) {
    nextQ = '¿Cuál es tu domicilio?';
  } else {
    nextQ = `¡Perfecto, ${first}! Tengo todo lo necesario. Tu documento está listo.`;
  }

  const ready = !!(updated.nombre && updated.rut && updated.direccion);

  return { ...updated, response_message: nextQ, ready };
}

// ─── DeepSeek call ────────────────────────────────────────────────────────────
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

// ─── Route handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { message, caseHistory, currentCaseData } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
    }

    // Detección programática del tipo — siempre corre, independiente del LLM
    const detectedTipo = detectTipo(message);
    const currentTipo  = currentCaseData?.tipo_documento as string | null;
    const tipoFinal    = currentTipo ?? detectedTipo;

    const useMock = !process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY === 'mock';

    if (useMock) {
      const mockResult = smartMock(message, currentCaseData ?? {});
      if (detectedTipo && !mockResult.tipo_documento) mockResult.tipo_documento = detectedTipo;
      return NextResponse.json(mockResult);
    }

    // Inyectar el tipo detectado en el mensaje para que DeepSeek no lo tenga que adivinar
    const enrichedMessage = tipoFinal
      ? `[DOCUMENTO: ${tipoFinal}]\n\nMensaje del usuario: ${message}`
      : message;

    const messages = [
      ...(caseHistory ?? []),
      { role: 'user', content: enrichedMessage },
    ];

    let responseText = await callDeepSeek(messages);
    let jsonData     = responseText ? extractJSON(responseText) : null;

    // Retry si no devolvió JSON válido
    for (let i = 0; i < 2 && !jsonData; i++) {
      responseText = await callDeepSeek([
        ...messages,
        { role: 'assistant', content: responseText ?? '' },
        { role: 'user', content: 'Responde SOLO con JSON válido, sin texto fuera del JSON.' },
      ]);
      jsonData = responseText ? extractJSON(responseText) : null;
    }

    if (!jsonData) {
      return NextResponse.json(smartMock(message, currentCaseData ?? {}));
    }

    // Garantizar que el tipo detectado programáticamente no se pierda
    if (tipoFinal && !jsonData.tipo_documento) {
      jsonData.tipo_documento = tipoFinal;
    }

    return NextResponse.json(jsonData);

  } catch (err) {
    console.error('Chat API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
