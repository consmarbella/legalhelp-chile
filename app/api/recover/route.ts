import { NextRequest, NextResponse } from 'next/server';
import { getOrderByOrderId } from '@/lib/orderStore';

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get('orderId');
  if (!orderId || orderId.trim() === '') return NextResponse.json({ error: 'orderId requerido' }, { status: 400 });
  try {
    const order = await getOrderByOrderId(orderId.trim());
    if (!order) return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    if (order.status !== 'approved') return NextResponse.json({ error: 'Orden no está aprobada' }, { status: 403 });
    if (!order.documentUrl) return NextResponse.json({ error: 'Documento aún no generado para esta orden' }, { status: 404 });
    return NextResponse.json({ orderId: order.orderId, document: order.documentUrl, plan: order.plan, paidAt: order.paidAt });
  } catch (err) { console.error('[recover] error:', err); return NextResponse.json({ error: 'Error interno' }, { status: 500 }); }
}
