// ─────────────────────────────────────────────────────────────────────────────
// LLM: Gemini 2.5 Flash via SDK @google/genai
// Env: GEMINI_API_KEY (obligatoria)
// ─────────────────────────────────────────────────────────────────────────────

import { GoogleGenAI } from '@google/genai';

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

let genAIInstance: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!genAIInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'mock') {
      throw new Error('GEMINI_API_KEY no está configurada');
    }
    genAIInstance = new GoogleGenAI({ apiKey });
  }
  return genAIInstance;
}

/**
 * Traduce mensajes del formato interno (LLMMessage[]) al formato de Gemini.
 * - "assistant" → "model"
 * - contenido va en parts: [{ text: content }]
 */
function adaptMessages(messages: LLMMessage[]): { role: 'user' | 'model'; parts: { text: string }[] }[] {
  return messages.map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));
}

export async function llmComplete(opts: LLMOptions): Promise<string | null> {
  try {
    const ai = getGenAI();

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: adaptMessages(opts.messages),
      config: {
        systemInstruction: opts.system,
        temperature: opts.temperature ?? 0.0,
        maxOutputTokens: opts.maxTokens ?? 4096,
      },
    });

    const text = response.text ?? response.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
    return text;
  } catch (err) {
    console.error('[llm] Gemini error:', err);
    return null;
  }
}

export function activeProvider(): 'gemini' | 'mock' {
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'mock') return 'gemini';
  return 'mock';
}
