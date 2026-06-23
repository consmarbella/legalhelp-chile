import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { runGenerationPipeline, emptyState, type DocState } from '@/lib/documentos/graph';
import { getOrderByOrderId, updateOrder } from '@/lib/orderStore';

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

    // ─── Payment verification (igual que /api/generate-final) ───────────────
    let isPaid = false;
    if (orderId && typeof orderId === 'string') {
      const order = await getOrderByOrderId(orderId);
      if (!order || order.status !== 'approved') {
        return NextResponse.json({ error: 'Pago no verificado' }, { status: 403 });
      }
      isPaid = true;
    }

    // Build state with collected data
    const state: DocState = {
      ...emptyState(),
      datos,
      ready: true,
    };

    // Run pipeline: clasificar → validar → redactar → filtrar
    console.log(`[lang/generate] Running pipeline (paid=${isPaid})...`);
    const result = await runGenerationPipeline(state);

    if (!result.viable) {
      return NextResponse.json({
        error: 'Caso no viable',
        motivo: result.motivoNoViable,
        viable: false,
      });
    }

    const doc = result.documentoFinal || result.documento || '';

    // Persistir documento completo en la orden (para recuperación)
    if (isPaid && orderId) {
      await updateOrder(orderId, { documentUrl: doc }).catch(err => {
        console.error('[lang/generate] persist failed:', err);
      });
    }

    return NextResponse.json({
      document: isPaid ? doc : truncate(doc),
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
