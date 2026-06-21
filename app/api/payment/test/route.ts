import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { saveOrder } from '@/lib/orderStore';
import { getDocPriceCLP, MONTHLY_PRICE_CLP } from '@/lib/constants';

/**
 * POST /api/payment/test
 * Crea una orden YA APROBADA para probar el flujo completo
 * (vista previa → "pago" → generar → descargar) SIN pasar por MercadoPago
 * y SIN cobrar dinero real.
 *
 * Protección: solo funciona si ALLOW_TEST_PAYMENT === 'true' en env vars.
 * Para activar: agregar la variable en Vercel. Para desactivar: quitarla.
 */
function testModeEnabled(): boolean {
  return process.env.ALLOW_TEST_PAYMENT === 'true';
}

export async function POST(req: NextRequest) {
  if (!testModeEnabled()) {
    return NextResponse.json({ error: 'No disponible' }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { plan, caseData, docId } = body as {
      plan: 'single' | 'monthly';
      caseData: Record<string, unknown>;
      docId?: string;
    };

    if (!plan || !caseData) {
      return NextResponse.json({ error: 'plan y caseData son requeridos' }, { status: 400 });
    }

    const orderId = randomUUID();
    const amount  = plan === 'single' ? getDocPriceCLP(docId) : MONTHLY_PRICE_CLP;

    // Orden creada directamente como 'approved' (pago simulado)
    await saveOrder({
      orderId,
      preferenceId: `TEST-${orderId}`,
      status: 'approved',
      plan,
      amount,
      caseDataJson: JSON.stringify(caseData),
      createdAt: Date.now(),
      paidAt: Date.now(),
      mpPaymentId: `TEST-${Date.now()}`,
    });

    // Redirige a la misma página de éxito que el flujo real;
    // usamos el origin de la petición para quedarnos en este deploy (no producción).
    const base = req.nextUrl.origin;

    return NextResponse.json({
      orderId,
      test: true,
      checkoutUrl: `${base}/pago/exito?orderId=${orderId}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[payment/test] error:', message);
    return NextResponse.json({ error: 'Error creando orden de prueba' }, { status: 500 });
  }
}
