import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import crypto from 'crypto';
import { getOrderByOrderId, getOrderByPreferenceId, updateOrder } from '@/lib/orderStore';

const mp = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN ?? '',
});

/**
 * Valida la firma x-signature de MercadoPago.
 * Solo se aplica si MP_WEBHOOK_SECRET está configurado; si no, se omite
 * (no rompe instalaciones que aún no tienen el secreto configurado).
 * Doc: manifest = `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
 */
function isValidSignature(req: NextRequest, dataId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true; // sin secreto => no validamos (el re-fetch a MP ya mitiga)

  const xSignature = req.headers.get('x-signature') ?? '';
  const xRequestId = req.headers.get('x-request-id') ?? '';

  // x-signature: "ts=1700000000,v1=abcdef..."
  const parts: Record<string, string> = {};
  for (const segment of xSignature.split(',')) {
    const [k, v] = segment.split('=').map(s => s?.trim());
    if (k && v) parts[k] = v;
  }
  const ts = parts['ts'];
  const v1 = parts['v1'];
  if (!ts || !v1) return false;

  // El id alfanumérico debe ir en minúscula (los payment id numéricos no cambian)
  const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestId};ts:${ts};`;
  const computed = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(v1));
  } catch {
    return false;
  }
}

/**
 * MercadoPago envía dos tipos de notificaciones:
 *   1. IPN clásico: GET ?id=...&topic=payment
 *   2. Webhooks modernos: POST con body { type: "payment", data: { id: "..." } }
 * Manejamos ambos.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const searchParams = req.nextUrl.searchParams;

    // Extraer payment ID desde body o query
    const type  = body.type  ?? searchParams.get('topic');
    const rawId = body.data?.id ?? searchParams.get('id');

    if (type !== 'payment' || !rawId) {
      // MP también envía notificaciones de tipo "merchant_order", etc. — las ignoramos
      return NextResponse.json({ ok: true });
    }

    const paymentId = String(rawId);
    console.log('[webhook] payment id:', paymentId);

    // Validar firma (si MP_WEBHOOK_SECRET está configurado).
    // MP firma usando el id del query param data.id; usamos ese y, si no, rawId.
    const signedId = searchParams.get('data.id') ?? paymentId;
    if (!isValidSignature(req, signedId)) {
      console.warn('[webhook] firma inválida — notificación rechazada');
      return NextResponse.json({ error: 'firma inválida' }, { status: 401 });
    }

    // Consultar el estado del pago en MP
    const paymentData = await new Payment(mp).get({ id: paymentId });

    const status           = paymentData.status;          // approved | rejected | pending | ...
    const externalRef      = paymentData.external_reference; // nuestro orderId
    const preferenceId     = ((paymentData as unknown) as Record<string, unknown>).preference_id as string ?? '';

    console.log('[webhook] status:', status, '| ref:', externalRef);

    // Buscar la orden: primero por external_reference (nuestro orderId), luego por preferenceId
    let order = externalRef ? (await getOrderByOrderId(externalRef) ?? null) : null;
    if (!order && preferenceId) order = await getOrderByPreferenceId(preferenceId) ?? null;

    if (!order) {
      console.warn('[webhook] orden no encontrada para ref:', externalRef, 'prefId:', preferenceId);
      return NextResponse.json({ ok: true }); // devolvemos 200 para que MP no reintente
    }

    if (status === 'approved') {
      await updateOrder(order.orderId, {
        status: 'approved',
        mpPaymentId: paymentId,
        paidAt: Date.now(),
      });
      console.log('[webhook] orden aprobada:', order.orderId);
    } else if (status === 'rejected' || status === 'cancelled') {
      await updateOrder(order.orderId, { status: 'failed' });
    }

    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error('[webhook] error:', err);
    // Siempre 200 para que MP no reintente en bucle
    return NextResponse.json({ ok: true });
  }
}

// MP también puede enviar GET para verificar el endpoint
export async function GET() {
  return NextResponse.json({ ok: true });
}
