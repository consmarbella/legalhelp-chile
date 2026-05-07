import { NextRequest, NextResponse } from 'next/server';
import { getOrderByOrderId } from '@/lib/orderStore';

/**
 * GET /api/payment/status?orderId=xxx
 * El frontend hace polling cada 3 segundos hasta que el webhook confirme el pago.
 */
export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get('orderId');

  if (!orderId) {
    return NextResponse.json({ error: 'orderId requerido' }, { status: 400 });
  }

  const order = getOrderByOrderId(orderId);

  if (!order) {
    return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
  }

  return NextResponse.json({
    orderId:   order.orderId,
    status:    order.status,       // pending | approved | failed
    plan:      order.plan,
    paidAt:    order.paidAt ?? null,
  });
}
