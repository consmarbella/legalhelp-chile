// ─────────────────────────────────────────────────────────────────────────────
// GENERATE API — Redacción de documentos
// POST /api/generate — body: { docId, data, plan }
// ─────────────────────────────────────────────────────────────────────────────
// Para TAG: usa plantilla determinista (sin IA)
// Para otros: DeepSeek con fallback a previewEngine local
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `Eres un abogado litigante chileno de excelencia. Tu única tarea es redactar el escrito formal final correspondiente al documento solicitado, utilizando las variables entregadas.

REGLAS ESTRICTAS:
1. No hagas preguntas. Ya tienes todos los datos.
2. Redacta el documento completo con formato judicial chileno real: encabezado, materia, cuerpo legal con fundamentos de hecho y derecho, artículos citados con precisión, POR TANTO, petición concreta, fecha y firma.
3. Cada escrito debe citar las leyes chilenas correctas. Para multas TAG: Ley 18.287. Para finiquitos: Código del Trabajo. Para protección: Art. 20 CPR. Para familia: Ley 19.947.
4. NO dejes placeholders ni corchetes vacíos. Todo debe estar completo y listo para presentar en tribunal o notaría.
5. Usa datos reales, fechas coherentes, montos correctos.
6. El documento debe estar en español formal chileno.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { docId, data, plan } = body;

    if (!docId || !data) {
      return NextResponse.json({ error: 'docId y data son requeridos' }, { status: 400 });
    }

    // ── TAG: Plantilla determinista, SIN IA ─────────────────────────────
    if (docId === 'tag') {
      const { generateTagDocument } = await import('@/lib/tagTemplate');
      const documento = generateTagDocument(data);
      return NextResponse.json({
        documento,
        fuente: 'plantilla-tag',
        titulo: 'Escrito de Prescripción TAG (Art. 24 Ley 18.287)',
      });
    }

    // ── OTROS DOCS: DeepSeek con fallback local ────────────────────────
    // Construir texto con todas las variables
    let userPrompt = `Genera el documento legal para "${docId}".\n\nDatos del caso:\n`;
    for (const [key, val] of Object.entries(data as Record<string, string>)) {
      if (val) userPrompt += `- ${key}: ${val}\n`;
    }
    if (plan) userPrompt += `\nPlan de pago: ${plan}`;

    // Intentar DeepSeek primero
    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    if (deepseekKey && deepseekKey.length > 10) {
      try {
        const response = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${deepseekKey}`,
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.2,
            max_tokens: 4096,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          const content = result.choices?.[0]?.message?.content?.trim();
          if (content) {
            return NextResponse.json({ documento: content, fuente: 'deepseek' });
          }
        }
      } catch (e) {
        console.warn('[generate] DeepSeek falló, usando fallback:', e);
      }
    }

    // Fallback: renderizar plantilla local
    const { renderPreview } = await import('@/lib/previewEngine');
    const preview = renderPreview(docId, data as Record<string, string>, true);

    return NextResponse.json({
      documento: preview + '\n\n---\n*Documento generado por LegalHelp Chile*',
      fuente: 'plantilla',
    });
  } catch (err) {
    console.error('[generate] Error:', err);
    return NextResponse.json({ error: 'Error generando documento' }, { status: 500 });
  }
}
