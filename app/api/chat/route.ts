// ─────────────────────────────────────────────────────────────────────────────
// CHAT API — Wrap puro de Gemini 2.5 Flash
// Recibe { history }, llama al modelo, devuelve { textoCrudo, triggerPayment }
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const SYSTEM_PROMPT = `Eres un abogado litigante chileno. Tu objetivo es redactar escritos judiciales reales.

### REGLAS ESTRICTAS ###

1. **INTERROGATORIO COMPLETO OBLIGATORIO**: No puedes generar el documento hasta que tengas TODOS los datos. Pregunta de a 1 o 2 datos por turno. Datos mínimos según el caso:
   - Generales: nombre completo, RUT, domicilio del solicitante
   - Causa: tribunal, RIT, carátula (si existe)
   - Datos de la contraparte (si aplica): nombre, RUT, domicilio
   - Específicos del caso: montos, fechas, hijos (nombres, edades), relación laboral, etc.

2. **ESTRUCTURA DEL DOCUMENTO**: Cuando tengas todos los datos, genera el escrito con formato judicial chileno real:

   "[SOLICITUD DE ...]"
   
   "MATERIA: ..."
   
   "SEÑOR JUEZ"
   
   "[NOMBRE COMPLETO], [RUT], [DOMICILIO], a S.S. respetuosamente digo:"
   
   "[CUERPO DEL ESCRITO con fundamentos de hecho y derecho, artículos citados]"
   
   "POR TANTO,"
   "A S.S. PIDO: ..."
   
   (fecha)

3. **NO APRESURARTE**: Si el cliente te da información incompleta, pídele lo que falta. No digas "tengo todo listo" si solo tienes nombre y RUT.

4. **MARCAR PAGO**: Cuando el documento esté COMPLETO y listo, agrega al final del escrito la línea "[COBRAR]" para que el sistema active el pago.`;

// ─────────────────────────────────────────────────────────────────────────────
// FRASES DE FALLBACK LOCAL (cuando Gemini falla por quota 429)
// ─────────────────────────────────────────────────────────────────────────────
const PREGUNTAS_FALLBACK = [
  '¿Cuál es tu nombre completo?',
  '¿Cuál es tu RUT?',
  '¿Cuál es tu domicilio o dirección?',
  '¿Cuál es tu correo electrónico?',
  '¿Cuál es tu número de teléfono?',
  '¿En qué comuna resides?',
  '¿Cuál es la fecha del hecho que quieres documentar?',
  '¿Cuál es el monto aproximado involucrado?',
  '¿Tienes algún RUT de la otra parte o contraparte?',
  '¿Podrías describir con más detalle los hechos?',
  '¿Tienes algún documento de respaldo o prueba?',
  '¿Has hecho algún trámite previo por este caso?',
  '¿Cuál es tu estado civil?',
  '¿Tienes hijos? ¿Cuántos y de qué edades?',
  '¿Trabajas actualmente? ¿Dónde?',
  'Gracias por esa información. ¿Podrías indicarme algún detalle adicional relevante?',
  'Entendido. ¿Cuál es el tribunal o juzgado donde debería presentarse este escrito?',
  'Perfecto, ya tengo datos suficientes. Déjame redactar tu documento.\n\n[COBRAR]',
];

function getFallbackResponse(historyLength: number): string {
  const idx = Math.min(historyLength, PREGUNTAS_FALLBACK.length - 1);
  return PREGUNTAS_FALLBACK[idx];
}

// ─────────────────────────────────────────────────────────────────────────────
// POST handler
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Destructure history OUTSIDE try so it's available in catch
  let history: { role: string; content: string }[] = [];
  try {
    const body = await req.json();
    history = body.history || [];
    if (!Array.isArray(history)) {
      history = [];
    }
  } catch {
    history = [];
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'mock') {
      const fallback = getFallbackResponse(history.length);
      return NextResponse.json({ textoCrudo: fallback, triggerPayment: fallback.includes('[COBRAR]') });
    }

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

    return NextResponse.json({ textoCrudo, triggerPayment });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[chat] Error:', errMsg);

    // Rate limit → fallback local en vez de error 500
    if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED')) {
      const fallback = getFallbackResponse(history.length);
      return NextResponse.json({ textoCrudo: fallback, triggerPayment: fallback.includes('[COBRAR]') });
    }

    return NextResponse.json({ textoCrudo: 'Error al conectar con el modelo. Intenta de nuevo.', triggerPayment: false }, { status: 500 });
  }
}
