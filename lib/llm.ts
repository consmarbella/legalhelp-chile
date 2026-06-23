// ─────────────────────────────────────────────────────────────────────────────
// Capa de modelo configurable.
// - Si ANTHROPIC_API_KEY esta seteada  -> usa Claude (Haiku por defecto) con
//   prompt caching en el system prompt (90% mas barato en los tokens repetidos).
// - Si no, cae a DEEPSEEK_API_KEY (comportamiento actual).
// Cambiar de modelo = setear/quitar la env var. No requiere tocar codigo.
//
// Env vars:
//   ANTHROPIC_API_KEY   -> activa Claude
//   ANTHROPIC_MODEL     -> id del modelo (default 'claude-haiku-4-5')
//   DEEPSEEK_API_KEY    -> fallback
// ─────────────────────────────────────────────────────────────────────────────

export interface LLMMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface LLMOptions {
  system: string;
  messages: LLMMessage[];
  maxTokens?: number;
  temperature?: number;
}

/** Devuelve el texto de la respuesta, o null si no hay proveedor / hubo error. */
export async function llmComplete(opts: LLMOptions): Promise<string | null> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey && anthropicKey !== 'mock') {
    const out = await callAnthropic(anthropicKey, opts);
    if (out !== null) return out;
    // si Anthropic falla, intenta DeepSeek como respaldo
  }
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  if (deepseekKey && deepseekKey !== 'mock') {
    return callDeepSeek(deepseekKey, opts);
  }
  return null;
}

/** Cual proveedor esta activo (para logs/flags). */
export function activeProvider(): 'anthropic' | 'deepseek' | 'mock' {
  if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'mock') return 'anthropic';
  if (process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY !== 'mock') return 'deepseek';
  return 'mock';
}

// ─── Anthropic (Claude) con prompt caching ──────────────────────────────────
async function callAnthropic(apiKey: string, { system, messages, maxTokens = 2048, temperature = 0.2 }: LLMOptions): Promise<string | null> {
  const model = process.env.ANTHROPIC_MODEL || 'claude-opus-4-20250514';
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        // El system prompt es estatico -> se cachea (lecturas a 10% del precio).
        system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      }),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.error(`[llm] Anthropic HTTP ${res.status}:`, errBody.slice(0, 300));
      return null;
    }
    const data = await res.json();
    const text = Array.isArray(data.content)
      ? data.content.filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('')
      : '';
    return text || null;
  } catch (err) {
    console.error('[llm] Anthropic error:', err);
    return null;
  }
}

// ─── DeepSeek (fallback) ─────────────────────────────────────────────────────
async function callDeepSeek(apiKey: string, { system, messages, maxTokens = 2048, temperature = 0.2 }: LLMOptions): Promise<string | null> {
  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'system', content: system }, ...messages],
        temperature,
        max_tokens: maxTokens,
      }),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.error(`[llm] DeepSeek HTTP ${res.status}:`, errBody.slice(0, 300));
      return null;
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    console.error('[llm] DeepSeek error:', err);
    return null;
  }
}
