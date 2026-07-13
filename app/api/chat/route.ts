// ─────────────────────────────────────────────────────────────────────────────
// CHAT API — Gemini 2.5 Flash directo
// - systemInstruction con GEMINI_SYSTEM_PROMPT
// - Cada respuesta se parte por ===PREVIEW===
// - Cuando el LLM dice [COBRAR] → triggerPayment: true
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { GEMINI_SYSTEM_PROMPT, MOCK_FALLBACK_RESPONSE } from '@/lib/prompts';
import { checkRateLimit, getClientIp, CHAT_RATE_LIMIT } from '@/lib/rateLimit';
import { llmComplete, activeProvider } from '@/lib/llm';

export async function POST(req: NextRequest) {
  // Rate limiting
  const ip = getClientIp(req.headers);
  const rl = checkRateLimit(`chat:${ip}`, CHAT_RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Intenta en unos segundos.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetMs / 1000)) } }
    );
  }

  try {
    const { message, caseHistory } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
    }

    // ─── Mock mode (sin API key) ──────────────────────────────────────────
    if (activeProvider() === 'mock') {
      console.warn('[chat] MOCK MODE — sin GEMINI_API_KEY');
      return NextResponse.json(MOCK_FALLBACK_RESPONSE);
    }

    // ─── Construir historial de mensajes ──────────────────────────────────
    const messages = [...(caseHistory ?? []), { role: 'user', content: message }];

    // ─── Llamar a Gemini con systemInstruction ───────────────────────────
    const responseText = await llmComplete({
      system: GEMINI_SYSTEM_PROMPT,
      messages,
      temperature: 0.2,
      maxTokens: 4096,
    });

    if (!responseText) {
      console.error('[chat] Gemini no devolvió respuesta');
      return NextResponse.json(MOCK_FALLBACK_RESPONSE);
    }

    // ─── Parsear respuesta: split por ===PREVIEW=== ──────────────────────
    const parts = responseText.split('===').filter(p => p.trim().length > 0);
    // Buscar la sección después de "===PREVIEW==="
    let preview = '';
    let chat = '';
    let triggerPayment = false;

    const previewIndex = responseText.indexOf('===PREVIEW===');
    if (previewIndex >= 0) {
      chat = responseText.substring(0, previewIndex).trim();
      preview = responseText.substring(previewIndex + '==='.length + 'PREVIEW'.length + '==='.length).trim();
      
      // Remover cualquier otra etiqueta === suelta
      preview = preview.replace(/===\s*[^=]+?===/g, '').trim();
    } else {
      // Sin ===PREVIEW=== -> todo es chat, sin preview
      chat = responseText.trim();
    }

    // ─── Detectar [COBRAR] ───────────────────────────────────────────────
    if (chat.includes('[COBRAR]')) {
      triggerPayment = true;
      chat = chat.replace('[COBRAR]', '').trim();
    }

    return NextResponse.json({
      chat,
      preview,
      triggerPayment,
    });
  } catch (err) {
    console.error('[chat] Error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
