import { NextRequest, NextResponse } from 'next/server';
import { getOrderByOrderId } from '@/lib/orderStore';

/**
 * GET /api/demandas/status?orderId=xxx
 * Verifica el estado de una orden de demanda (usado por el frontend para polling).
 * Como fallback, si está pending, consulta a MercadoPago directamente.
 */
export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get('orderId');

  if (!orderId) {
    return NextResponse.json({ error: 'orderId requerido' }, { status: 400 });
  }

  const order = await getOrderByOrderId(orderId);

  if (!order) {
    return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
  }

  // Si ya está approved o failed, devolver inmediatamente
  if (order.status !== 'pending') {
    return NextResponse.json({
      orderId: order.orderId,
      status: order.status,
      plan: order.plan,
      paidAt: order.paidAt ?? null,
    });
  }

  // ─── Fallback: consultar directamente a MercadoPago ─────────────────────
  const accessToken = process.env.MP_ACCESS_TOKEN ?? '';
  if (accessToken) {
    try {
      const searchRes = await fetch(
        `https://api.mercadopago.com/v1/payments/search?external_reference=${orderId}&sort=date_created&criteria=desc&limit=1`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const results = searchData.results;

        if (results && results.length > 0) {
          const payment = results[0];
          const mpStatus = payment.status;

          if (mpStatus === 'approved') {
            const { updateOrder } = await import('@/lib/orderStore');
            await updateOrder(orderId, {
              status: 'approved',
              mpPaymentId: String(payment.id),
              paidAt: Date.now(),
            });

            return NextResponse.json({
              orderId: order.orderId,
              status: 'approved',
              plan: order.plan,
              paidAt: Date.now(),
            });
          }

          if (mpStatus === 'rejected') {
            const { updateOrder } = await import('@/lib/orderStore');
            await updateOrder(orderId, { status: 'failed' });
            return NextResponse.json({
              orderId: order.orderId,
              status: 'failed',
              plan: order.plan,
              paidAt: null,
            });
          }
        }
      }
    } catch (err) {
      console.error('[demandas/status] fallback MP error:', err);
    }
  }

  // Sigue pending
  return NextResponse.json({
    orderId: order.orderId,
    status: order.status,
    plan: order.plan,
    paidAt: null,
  });
}
