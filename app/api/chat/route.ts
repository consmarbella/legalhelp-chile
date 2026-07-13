// ─────────────────────────────────────────────────────────────────────────────
// CHAT API — Wrap puro de Gemini 2.5 Flash
// Recibe { history }, llama al modelo, devuelve { textoCrudo, triggerPayment }
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const SYSTEM_PROMPT = `Actúa como un abogado y notario senior en Chile. Conversa con el cliente libremente para diagnosticar su caso, pídele los datos necesarios paso a paso mediante un interrogatorio breve y preciso, y genera el borrador en tiempo real dentro del mismo texto. Cuando el documento esté listo, indícale explícitamente que proceda al pago escribiendo el código [COBRAR].`;

export async function POST(req: NextRequest) {
  try {
    const { history } = await req.json();
    if (!Array.isArray(history)) {
      return NextResponse.json({ textoCrudo: 'Error: historial inválido', triggerPayment: false }, { status: 400 });
    }

    // ─── Mock mode ──────────────────────────────────────────────────
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'mock') {
      return NextResponse.json({ textoCrudo: '¿Cuál es tu nombre completo y RUT?', triggerPayment: false });
    }

    // ─── Mapear al formato de Google GenAI ───────────────────────────
    const contents = history.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'assistant' ? 'model' as const : 'user' as const,
      parts: [{ text: msg.content }],
    }));

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.0,
        maxOutputTokens: 8192,
      },
    });

    const textoCrudo = response.text ?? response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const triggerPayment = textoCrudo.includes('[COBRAR]');

    // ─── Devolver texto crudo + señal de pago ───────────────────────
    return NextResponse.json({ textoCrudo, triggerPayment });
  } catch (err) {
    console.error('[chat] Error:', err);
    return NextResponse.json({ textoCrudo: 'Error al conectar con el modelo. Intenta de nuevo.', triggerPayment: false }, { status: 500 });
  }
}
