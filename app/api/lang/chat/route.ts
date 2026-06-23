import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { nodoRecopilar, emptyState, type DocState } from '@/lib/documentos/graph';
import { LLMMessage } from '@/lib/llm';

const RATE_LIMIT = { maxRequests: 20, windowMs: 60_000 };

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const rl = checkRateLimit(`lang-chat:${ip}`, RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetMs / 1000)) } }
    );
  }

  try {
    const { message, caseHistory, currentState } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'message requerido' }, { status: 400 });
    }

    // Rebuild state from client
    const state: DocState = {
      ...emptyState(),
      ...(currentState || {}),
      messages: (caseHistory || []).map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })) as LLMMessage[],
      currentMessage: message,
    };

    // Run Nodo 1: Recopilador
    const result = await nodoRecopilar(state);

    return NextResponse.json({
      datos: result.datos,
      datosFaltantes: result.datosFaltantes,
      ready: result.ready,
      response_message: result.responseMessage,
      tipo_documento: result.tipoDocumento,
    });
  } catch (err) {
    console.error('[lang/chat] error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
