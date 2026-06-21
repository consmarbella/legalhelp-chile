import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { getOrderByOrderId, updateOrder } from '@/lib/orderStore';

const accessToken = process.env.MP_ACCESS_TOKEN ?? '';
const mp = new MercadoPagoConfig({ accessToken });

/**
 * GET /api/payment/status?orderId=xxx
 * 
 * El frontend hace polling cada 3s. Si la orden local sigue 'pending',
 * consulta directamente a MercadoPago como fallback (porque el webhook
 * puede tardar o no llegar). Con binary_mode + auto_return='approved',
 * si MP redirigió al usuario a /pago/exito, el pago está aprobado.
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
  // Si la orden sigue pending, el webhook puede no haber llegado aún.
  // Buscamos el pago en MP usando el external_reference (nuestro orderId).
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
        const mpStatus = payment.status; // approved | rejected | pending | in_process

        if (mpStatus === 'approved') {
          // Actualizar la orden local (lo que debía hacer el webhook)
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
    console.error('[payment/status] fallback MP error:', err);
    // Si falla la consulta a MP, simplemente devolvemos pending
  }

  // Sigue pending (webhook no llegó Y MP no confirma aún)
  return NextResponse.json({
    orderId: order.orderId,
    status: order.status,
    plan: order.plan,
    paidAt: order.paidAt ?? null,
  });
}
