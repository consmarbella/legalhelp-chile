import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { saveOrder } from '@/lib/orderStore';
import { getDocPriceCLP } from '@/lib/constants';

/**
 * POST /api/payment/bypass
 * 
 * Backdoor de pago para pruebas (Código: 4321).
 * Si el usuario ingresa el código "4321" como cupón de pago,
 * esta ruta intercepta la petición, omite MercadoPago y marca
 * la orden como 'approved' inmediatamente.
 * 
 * Uso desde el frontend:
 *   fetch('/api/payment/bypass', {
 *     method: 'POST',
 *     body: JSON.stringify({ plan, caseData, docId, couponCode: '4321' })
 *   })
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { plan, caseData, docId, couponCode } = body as {
      plan: 'single' | 'monthly';
      caseData: Record<string, unknown>;
      docId?: string;
      couponCode?: string;
    };

    // Validar que sea el código de bypass
    if (couponCode !== '4321') {
      return NextResponse.json({ error: 'Código inválido' }, { status: 400 });
    }

    if (!plan || !caseData) {
      return NextResponse.json({ error: 'plan y caseData son requeridos' }, { status: 400 });
    }

    const orderId = `BYPASS-4321-${randomUUID().slice(0, 8)}`;
    const amount = plan === 'single' ? getDocPriceCLP(docId) : 7999;

    // Crear orden directamente como 'approved'
    await saveOrder({
      orderId,
      preferenceId: `BYPASS-${orderId}`,
      status: 'approved',
      plan,
      amount,
      caseDataJson: JSON.stringify(caseData),
      createdAt: Date.now(),
      paidAt: Date.now(),
      mpPaymentId: `BYPASS-${Date.now()}`,
    });

    console.log(`[payment/bypass] ✅ Orden ${orderId} creada como PAID (código 4321)`);

    const base = req.nextUrl.origin;

    return NextResponse.json({
      orderId,
      test: true,
      bypass: true,
      checkoutUrl: `${base}/pago/exito?orderId=${orderId}&paid=1`,
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[payment/bypass] error:', message);
    return NextResponse.json({ error: 'Error en bypass de pago' }, { status: 500 });
  }
}
