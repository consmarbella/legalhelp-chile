// ─────────────────────────────────────────────────────────────────────────────
// LLM: DeepSeek V3 — ÚNICO modelo.
// Env: DEEPSEEK_API_KEY
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

export async function llmComplete(opts: LLMOptions): Promise<string | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey === 'mock') {
    console.error('[llm] No hay DEEPSEEK_API_KEY configurada');
    return null;
  }

  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: opts.system },
          ...opts.messages,
        ],
        temperature: opts.temperature ?? 0.2,
        max_tokens: opts.maxTokens ?? 2048,
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      console.error(`[llm] DeepSeek ${res.status}:`, err.slice(0, 300));
      return null;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    console.error('[llm] DeepSeek error:', err);
    return null;
  }
}

export function activeProvider(): 'deepseek' | 'mock' {
  if (process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY !== 'mock') return 'deepseek';
  return 'mock';
}
