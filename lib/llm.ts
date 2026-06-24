// ─────────────────────────────────────────────────────────────────────────────
// LLM: DeepSeek V3 o Anthropic como fallback
// Env: DEEPSEEK_API_KEY o ANTHROPIC_API_KEY
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

/**
 * Completa con DeepSeek o Anthropic (fallback automático)
 */
export async function llmComplete(opts: LLMOptions): Promise<string | null> {
  // Intento 1: DeepSeek
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  if (deepseekKey && deepseekKey !== 'mock') {
    try {
      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${deepseekKey}`,
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

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content ?? null;
        if (content) return content;
      } else {
        const err = await res.text().catch(() => '');
        console.error(`[llm] DeepSeek ${res.status}:`, err.slice(0, 300));
      }
    } catch (err) {
      console.error('[llm] DeepSeek error:', err);
    }
  }

  // Intento 2: Anthropic (fallback)
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const anthropicModel = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
  if (anthropicKey && anthropicKey !== 'mock') {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: anthropicModel,
          max_tokens: opts.maxTokens ?? 2048,
          system: opts.system,
          messages: opts.messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          temperature: opts.temperature ?? 0.2,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.content?.[0]?.text ?? null;
        if (content) return content;
      } else {
        const err = await res.text().catch(() => '');
        console.error(`[llm] Anthropic ${res.status}:`, err.slice(0, 300));
      }
    } catch (err) {
      console.error('[llm] Anthropic error:', err);
    }
  }

  // Intento 3: OpenAI (si existe)
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey && openaiKey !== 'mock') {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: opts.system },
            ...opts.messages,
          ],
          temperature: opts.temperature ?? 0.2,
          max_tokens: opts.maxTokens ?? 2048,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return data.choices?.[0]?.message?.content ?? null;
      }
    } catch (err) {
      console.error('[llm] OpenAI error:', err);
    }
  }

  console.error('[llm] ⚠️ Ningún proveedor LLM disponible');
  return null;
}

export function activeProvider(): 'deepseek' | 'anthropic' | 'openai' | 'mock' {
  if (process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY !== 'mock') return 'deepseek';
  if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'mock') return 'anthropic';
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'mock') return 'openai';
  return 'mock';
}
