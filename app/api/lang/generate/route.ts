import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { runGenerationPipeline, emptyState, type DocState } from '@/lib/documentos/graph';

const RATE_LIMIT = { maxRequests: 5, windowMs: 60_000 };

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const rl = checkRateLimit(`lang-gen:${ip}`, RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetMs / 1000)) } }
    );
  }

  try {
    const { datos, orderId } = await req.json();

    if (!datos || typeof datos !== 'object') {
      return NextResponse.json({ error: 'datos requeridos' }, { status: 400 });
    }

    // Build state with collected data
    const state: DocState = {
      ...emptyState(),
      datos,
      ready: true,
    };

    // Run pipeline: clasificar → validar → redactar → filtrar
    console.log('[lang/generate] Running 4-node pipeline...');
    const result = await runGenerationPipeline(state);

    if (!result.viable) {
      return NextResponse.json({
        error: 'Caso no viable',
        motivo: result.motivoNoViable,
        viable: false,
      });
    }

    const doc = result.documentoFinal || result.documento || '';

    // Truncate for preview if no orderId
    const isPaid = !!orderId;
    const output = isPaid ? doc : truncate(doc);

    return NextResponse.json({
      document: output,
      preview: !isPaid,
      tipo_documento: result.tipoDocumento,
      ley_aplicable: result.leyAplicable,
      tribunal: result.tribunal,
    });
  } catch (err) {
    console.error('[lang/generate] error:', err);
    return NextResponse.json({ error: 'Error generando documento' }, { status: 500 });
  }
}

function truncate(doc: string): string {
  const lines = doc.split('\n');
  const keep = Math.max(6, Math.ceil(lines.length * 0.4));
  return lines.slice(0, keep).join('\n');
}
