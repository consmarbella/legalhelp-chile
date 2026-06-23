/**
 * Gemini Flash client for /lang pipeline.
 * Uses Google's Gemini 2.0 Flash — fast, cheap, good at structured tasks.
 *
 * Env var: GEMINI_API_KEY
 */

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface GeminiOptions {
  system: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  maxTokens?: number;
  temperature?: number;
}

export async function geminiComplete(opts: GeminiOptions): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Convert messages to Gemini format
  const contents: GeminiMessage[] = opts.messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.system }] },
        contents,
        generationConfig: {
          temperature: opts.temperature ?? 0.2,
          maxOutputTokens: opts.maxTokens ?? 2048,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      console.error(`[gemini] HTTP ${res.status}:`, err.slice(0, 200));
      return null;
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
    return text;
  } catch (err) {
    console.error('[gemini] error:', err);
    return null;
  }
}
