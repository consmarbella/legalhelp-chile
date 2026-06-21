import { NextRequest, NextResponse } from 'next/server';
import { llmComplete, LLMMessage } from '@/lib/llm';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { DEMANDAS_CHAT_SYSTEM } from '@/lib/demandas/prompts';
import { MATERIAS_AUTOREP } from '@/lib/demandas/materias-autorep';

const RATE_LIMIT = { maxRequests: 15, windowMs: 60_000 };

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

    // Contexto de materias para el LLM (le permite clasificar)
    const materiasCtx = MATERIAS_AUTOREP.map(m =>
      `- ${m.id}: ${m.nombre} | Tribunal: ${m.tribunal} | Plazo: ${m.plazo} | Requisitos: ${m.requisitos_minimos.join(', ')}`
    ).join('\n');

    const systemEnhanced = `${DEMANDAS_CHAT_SYSTEM}\n\nCATÁLOGO DE MATERIAS DISPONIBLES:\n${materiasCtx}\n\nDATOS RECOPILADOS HASTA AHORA:\n${JSON.stringify(currentCaseData || {})}\n`;

    // Historial de mensajes
    const messages: LLMMessage[] = [
      ...(Array.isArray(caseHistory) ? caseHistory : []).map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    const raw = await llmComplete({
      system: systemEnhanced,
      messages,
      maxTokens: 1500,
      temperature: 0.25,
    });

    if (!raw) {
      return NextResponse.json({
        response_message: 'Problema al conectar con el sistema. Intenta de nuevo.',
        ready: false,
      });
    }

    // Parsear JSON del LLM
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json(parsed);
      }
    } catch { /* si no es JSON válido, devolvemos como texto */ }

    return NextResponse.json({
      response_message: raw,
      ready: false,
    });
  } catch (err) {
    console.error('[demandas/chat] error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
