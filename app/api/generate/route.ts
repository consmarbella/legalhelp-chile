// ─────────────────────────────────────────────────────────────────────────────
// GENERATE API — Redacción de documentos
// POST /api/generate — body: { docId, data, plan }
// ─────────────────────────────────────────────────────────────────────────────
// Para TAG: usa plantilla determinista (sin IA)
// Para otros: DeepSeek con fallback a previewEngine local
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `Eres un abogado litigante chileno. Tu tarea es formalizar el relato de los hechos proporcionado por un usuario, transformándolo en un lenguaje formal, claro y adecuado para ser insertado en un escrito legal (como un reclamo, descargos o poder).
REGLAS:
1. Mantén los hechos exactos proporcionados por el usuario.
2. Redacta en primera persona ("vengo en exponer", "concurro a", "el día X").
3. No agregues preámbulos, saludos, ni despedidas. Devuelve ÚNICAMENTE el texto formalizado.
4. Mantén la concisión y la precisión legal chilena.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { docId, data, plan } = body;

    if (!docId || !data) {
      return NextResponse.json({ error: 'docId y data son requeridos' }, { status: 400 });
    }

    // ── TAG: Motor Determinista en Python (Descarga ZIP) ─────────────────────────────
    if (docId === 'tag') {
      try {
        const pythonUrl = process.env.NEXT_PUBLIC_API_URL 
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/generate_tag_zip`
          : 'http://127.0.0.1:5328/api/generate_tag_zip';
          
        const response = await fetch(pythonUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        
        if (response.ok) {
          // El endpoint retorna un binario (application/zip)
          const arrayBuffer = await response.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          return NextResponse.json({
            documento: "Tus escritos están listos y empaquetados. Haz clic en el botón de descarga para obtener tus archivos de Word listos para imprimir.",
            fuente: 'plantilla-tag',
            titulo: 'Escritos de Prescripción TAG',
            zip_base64: base64
          });
        }
      } catch (e) {
        console.error('[generate] Error al generar ZIP TAG:', e);
      }
      return NextResponse.json({ error: 'Error generando ZIP de multas TAG' }, { status: 500 });
    }
    // ── OTROS DOCS: Híbrido (DeepSeek para narrativa -> Python determinista) ────────────────────────
    
    // 1. Identificar campos narrativos que requieren formalización por IA
    const NARRATIVE_KEYS = ['RELATO_HECHOS_PROBLEMA', 'EXPLICACION_Y_DEFENSA_HECHOS', 'DETALLE_TRAMITE_AUTORIZADO', 'MOTIVOS_RENUNCIA'];
    
    let processedData = { ...data } as Record<string, string>;
    const deepseekKey = process.env.DEEPSEEK_API_KEY;

    if (deepseekKey && deepseekKey.length > 10) {
      for (const key of Object.keys(processedData)) {
        if (NARRATIVE_KEYS.includes(key) && processedData[key]) {
          try {
            console.log(`[generate] Formalizando narrativa para clave: ${key}`);
            const userPrompt = `Por favor, formaliza el siguiente relato informal para un documento legal:\n\n"${processedData[key]}"`;
            
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
                max_tokens: 1500,
              }),
            });

            if (response.ok) {
              const result = await response.json();
              const content = result.choices?.[0]?.message?.content?.trim();
              if (content) {
                processedData[key] = content;
              }
            }
          } catch (e) {
            console.warn(`[generate] DeepSeek falló al formalizar ${key}, usando texto original:`, e);
          }
        }
      }
    }

    // 2. Enviar datos (con narrativa formalizada) al motor determinista de Python
    try {
      const pythonUrl = process.env.NEXT_PUBLIC_API_URL 
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/generate_template`
        : 'http://127.0.0.1:5328/api/generate_template';
        
      const response = await fetch(pythonUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: docId,
          variables: processedData
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.ok && result.documento) {
          return NextResponse.json({
            documento: result.documento,
            fuente: 'plantilla-determinista-hibrida'
          });
        }
      }
    } catch (e) {
      console.error('[generate] Python endpoint falló:', e);
    }

    // Fallback en caso de que Python falle
    return NextResponse.json({
      documento: "Hubo un error al generar el documento. Por favor, intente nuevamente.",
      fuente: 'error'
    });
  } catch (err) {
    console.error('[generate] Error:', err);
    return NextResponse.json({ error: 'Error generando documento' }, { status: 500 });
  }
}
