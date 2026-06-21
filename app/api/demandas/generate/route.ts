import { NextRequest, NextResponse } from 'next/server';
import { llmComplete } from '@/lib/llm';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { DEMANDAS_GENERATE_SYSTEM } from '@/lib/demandas/prompts';
import { findMateriaById } from '@/lib/demandas/materias-autorep';

const RATE_LIMIT = { maxRequests: 5, windowMs: 60_000 };

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const rl = checkRateLimit(`demandas-gen:${ip}`, RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetMs / 1000)) } }
    );
  }

  try {
    const caseData = await req.json();
    const materiaId = caseData.materia_detectada;
    const materia = materiaId ? findMateriaById(materiaId) : null;

    if (!materia) {
      return NextResponse.json({ error: 'Materia no identificada o no viable.' }, { status: 400 });
    }

    // Verificar viabilidad
    if (caseData.viable === false) {
      return NextResponse.json({ error: 'Caso no viable para autorepresentación.' }, { status: 400 });
    }

    // Construir el prompt de generación con grounding legal verificado
    const today = new Date().toLocaleDateString('es-CL', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Santiago',
    });

    // Extraer datos recopilados (flatten)
    const datos = caseData.datos_recopilados || caseData;
    const datosStr = Object.entries(datos)
      .filter(([k, v]) => v && !['materia_detectada', 'viable', 'ready', 'response_message', 'datos_faltantes', 'derivar_abogado'].includes(k))
      .map(([k, v]) => `- ${k}: ${v}`)
      .join('\n');

    const frameworkBlock = `
MATERIA: ${materia.nombre}
TRIBUNAL COMPETENTE: ${materia.tribunal}
PLAZO LEGAL: ${materia.plazo}

ARTÍCULOS Y LEYES A CITAR (USA EXCLUSIVAMENTE ESTOS):
${materia.base_legal.map(a => '• ' + a).join('\n')}

REQUISITOS DEL ESCRITO:
${materia.requisitos_minimos.map(r => '• ' + r).join('\n')}
`;

    const userPrompt = `Redacta la siguiente demanda/escrito judicial chileno.

FECHA DE HOY: ${today} — usá esta fecha en el encabezado.

${frameworkBlock}

DATOS DEL CASO:
${datosStr}

Redacta el escrito COMPLETO, profesional, en formato judicial chileno, listo para presentar ante ${materia.tribunal}. Incluye suma, individualización, hechos, derecho, petitorio. Si falta un dato, déjalo como [COMPLETAR].`;

    const document = await llmComplete({
      system: DEMANDAS_GENERATE_SYSTEM,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 10000,
      temperature: 0.3,
    });

    if (!document) {
      return NextResponse.json({ error: 'Error generando el documento.' }, { status: 500 });
    }

    // Strip markdown por si acaso
    const clean = document
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/(^|\n)\s*#{1,6}\s+/g, '$1')
      .replace(/`{1,3}/g, '')
      .replace(/[ \t]+\n/g, '\n');

    return NextResponse.json({
      document: clean,
      materia: materia.nombre,
      tribunal: materia.tribunal,
      ticket: materia.ticket_sugerido,
    });
  } catch (err) {
    console.error('[demandas/generate] error:', err);
    return NextResponse.json({ error: 'Error generando la demanda.' }, { status: 500 });
  }
}
