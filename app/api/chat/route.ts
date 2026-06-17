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

// ─── Smart mock (fallback sin API key) ───────────────────────────────────────
// Solo recoge datos básicos en secuencia. DeepSeek es quien razona el caso real.
function smartMock(message: string, current: CaseData): CaseData {
  const updated: CaseData = { ...current };
  const m = message.toLowerCase();

  // Detectar tipo de documento de forma genérica
  if (!updated.tipo_documento) {
    if (/licencia.*(conducir|manejar)|sacar.*licencia/.test(m))
      updated.tipo_documento = /pens[ií]on|alimento|debo/.test(m)
        ? 'solicitud de alzamiento de suspensión de licencia de conducir'
        : 'solicitud de licencia de conducir';
    else if (/despido|desvincula|finiquito/.test(m)) updated.tipo_documento = 'reclamo por despido injustificado';
    else if (/\btag\b|autopista/.test(m))            updated.tipo_documento = 'solicitud de prescripción de deuda TAG';
    else if (/sernac|garant[íi]a|consumidor/.test(m)) updated.tipo_documento = 'carta reclamo SERNAC';
    else if (/arrend|desalojo/.test(m))              updated.tipo_documento = 'demanda de arrendamiento';
    else if (/pens[ií]on|alimento/.test(m))          updated.tipo_documento = 'demanda de alimentos';
    else if (/protecci[oó]n/.test(m))                updated.tipo_documento = 'recurso de protección';
    else if (/poder|autoriza/.test(m))               updated.tipo_documento = 'poder simple';
    else if (/prescripci[oó]n|deuda.*a[ñn]os/.test(m)) updated.tipo_documento = 'solicitud de prescripción de deuda';
  }

  // Recopilar datos básicos en secuencia
  const originalTipo = updated.tipo_documento;
  const isDesc = message.length > 35 || /\b(necesito|quiero|tengo|debo|para|porque)\b/i.test(message);
  // Si el mensaje activó tipo_documento por keyword (ej: initialContext "Poder simple notarial")
  // y no es descriptivo, NO lo trates como nombre del usuario
  if (!updated.nombre && !isDesc && !(originalTipo !== updated.tipo_documento && updated.tipo_documento)) updated.nombre = message.trim();
  else if (!updated.rut && /^\d[\d.\-kK]+$/.test(message.trim()))         updated.rut = message.trim();
  else if (updated.nombre && updated.rut && !updated.direccion)           updated.direccion = message.trim();
  else if (updated.nombre && updated.rut && updated.direccion && !updated.detalle_caso) updated.detalle_caso = message.trim();

  const tipo  = updated.tipo_documento as string | undefined;
  const first = (updated.nombre as string | undefined)?.split(' ')[0] ?? '';
  const tieneBase = !!(updated.nombre && updated.rut && updated.direccion);
  const isReady   = tieneBase && !!(updated.detalle_caso);

  const nextQ = !tipo
    ? 'Contame tu situación con detalle para preparar el documento.'
    : !updated.nombre
      ? '¿Cuál es tu nombre completo?'
      : !updated.rut
        ? `${first}, ¿cuál es tu RUT?`
        : !updated.direccion
          ? '¿Cuál es tu domicilio?'
          : !updated.detalle_caso
            ? '¿Podés darme más detalles? (contraparte, monto, fecha, motivo)'
            : `¡Listo, ${first}! Tengo lo necesario para redactar tu documento.`;

  return { ...updated, response_message: nextQ, ready: isReady };
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
        max_tokens: 1024,  // aumentado: el JSON acumulado puede tener muchos campos
      }),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.error(`[chat] DeepSeek HTTP ${res.status}:`, errBody.slice(0, 200));
      return null;
    }
    const data = await res.json();
    const content: string | null = data.choices?.[0]?.message?.content ?? null;
    const finishReason: string = data.choices?.[0]?.finish_reason ?? 'unknown';
    if (finishReason === 'length') {
      console.warn('[chat] DeepSeek finish_reason=length — JSON truncado, aumentar max_tokens');
    }
    console.log(`[chat] DeepSeek OK finish=${finishReason} tokens=${data.usage?.completion_tokens ?? '?'}`);
    return content;
  } catch (err) {
    console.error('[chat] DeepSeek fetch error:', err);
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
    if (useMock) {
      console.warn('[chat] USANDO MOCK — DEEPSEEK_API_KEY no configurada o es "mock"');
      return NextResponse.json(smartMock(message, currentCaseData ?? {}));
    }

    // Contar intercambios (ya no se etiqueta el mensaje)
    const userTurns = (caseHistory ?? []).filter((m: { role: string }) => m.role === 'user').length + 1;
    const taggedMessage = message;

    const messages = [...(caseHistory ?? []), { role: 'user', content: taggedMessage }];
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

    if (!jsonData) {
      console.error('[chat] DeepSeek no devolvió JSON válido después de reintentos — usando mock');
    }
    // Merge: previous accumulated data + new output from DeepSeek
    // This ensures fields collected in earlier turns are never lost even if
    // DeepSeek omits them while still asking follow-up questions.
    const merged = jsonData
      ? { ...(currentCaseData ?? {}), ...jsonData }
      : smartMock(message, currentCaseData ?? {});
    return NextResponse.json(merged);

  } catch (err) {
    console.error('Chat API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
