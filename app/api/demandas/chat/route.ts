import { NextRequest, NextResponse } from 'next/server';
import { llmComplete, LLMMessage } from '@/lib/llm';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { DEMANDAS_CHAT_SYSTEM } from '@/lib/demandas/prompts';
import { MATERIAS_AUTOREP } from '@/lib/demandas/materias-autorep';

const RATE_LIMIT = { maxRequests: 15, windowMs: 60_000 };

/**
 * Extrae el primer objeto JSON válido de un texto.
 */
function extractJSON(text: string): Record<string, unknown> | null {
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

/**
 * Mergea los datos_recopilados del LLM con los acumulados del frontend.
 * También toma alias: datos_recopilados.datos_recopilados (anidado) → mergea igual.
 */
function mergeData(current: Record<string, unknown>, incoming: Record<string, unknown>): Record<string, unknown> {
  const merged = { ...(current.datos_recopilados as Record<string, unknown> || {}) };

  // Incoming puede tener datos_recopilados anidado o plano
  const newData = incoming.datos_recopilados as Record<string, unknown> | undefined;
  if (newData && typeof newData === 'object') {
    Object.assign(merged, newData);
  }

  const result = { ...current, ...incoming };
  result.datos_recopilados = merged;
  return result;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const rl = checkRateLimit(`demandas-chat:${ip}`, RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Intenta en unos segundos.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetMs / 1000)) } }
    );
  }

  try {
    const { message, caseHistory, currentCaseData } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'message requerido' }, { status: 400 });
    }

    const priorData = (currentCaseData || {}) as Record<string, unknown>;

    // Contexto de materias para el LLM (le permite clasificar)
    const materiasCtx = MATERIAS_AUTOREP.map(m =>
      `- ${m.id}: ${m.nombre} | Tribunal: ${m.tribunal} | Plazo: ${m.plazo} | Requisitos: ${m.requisitos_minimos.join(', ')}`
    ).join('\n');

    const systemEnhanced = `${DEMANDAS_CHAT_SYSTEM}\n\nCATÁLOGO DE MATERIAS DISPONIBLES:\n${materiasCtx}\n\nDATOS RECOPILADOS HASTA AHORA (DEBES INCLUIRLOS EN TU RESPUESTA COMO datos_recopilados):\n${JSON.stringify(priorData.datos_recopilados || {}, null, 2)}\n`;

    // Historial de mensajes
    const messages: LLMMessage[] = [
      ...(Array.isArray(caseHistory) ? caseHistory : []).map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    // Hasta 2 intentos para obtener JSON válido
    let raw = await llmComplete({
      system: systemEnhanced,
      messages,
      maxTokens: 1500,
      temperature: 0.25,
    });

    for (let attempt = 0; attempt < 2; attempt++) {
      if (!raw) break;
      const parsed = extractJSON(raw);
      if (parsed) {
        // Merge con datos anteriores y devolver
        const merged = mergeData(priorData, parsed);
        // Asegurar que response_message sea string
        if (!merged.response_message && typeof merged.response_message !== 'string') {
          merged.response_message = parsed.response_message || raw.slice(0, 300);
        }
        return NextResponse.json(merged);
      }
      // Reintentar pidiendo JSON
      raw = await llmComplete({
        system: systemEnhanced,
        messages: [
          ...messages,
          { role: 'assistant', content: raw },
          { role: 'user', content: 'Responde SOLO con JSON válido, sin texto adicional.' },
        ],
        maxTokens: 1500,
        temperature: 0.25,
      });
    }

    // Fallback: devolver el texto como response_message
    return NextResponse.json({
      response_message: raw || 'Problema al conectar con el sistema. Intenta de nuevo.',
      ready: false,
    });
  } catch (err) {
    console.error('[demandas/chat] error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
