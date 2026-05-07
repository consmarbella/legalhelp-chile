import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { randomUUID } from 'crypto';
import { saveOrder } from '@/lib/orderStore';
import { validateEnv } from '@/lib/validateEnv';

const accessToken = process.env.MP_ACCESS_TOKEN ?? '';
const isSandbox   = accessToken.startsWith('TEST-');

const mp = new MercadoPagoConfig({ accessToken });

const PLANS = {
  single:  { label: 'Documento legal único – Legalhelp', amount: 13990 },
  monthly: { label: 'Plan mensual ilimitado – Legalhelp', amount: 19990 },
} as const;

export async function POST(req: NextRequest) {
  validateEnv();
  try {
    const body = await req.json();
    const { plan, caseData, docPrice } = body as {
      plan: 'single' | 'monthly';
      caseData: Record<string, unknown>;
      docPrice?: number;
    };

    if (!plan || !caseData) {
      return NextResponse.json({ error: 'plan y caseData son requeridos' }, { status: 400 });
    }

    const orderId = randomUUID();
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3002';

    // Precio: usa el del documento si es pago único y viene definido
    const amount = plan === 'single' && docPrice ? docPrice : PLANS[plan].amount;

    const preference = await new Preference(mp).create({
      body: {
        external_reference: orderId,          // lo usamos para recuperar la orden en el webhook
        items: [
          {
            id: plan,
            title: PLANS[plan].label,
            quantity: 1,
            unit_price: amount,
            currency_id: 'CLP',
          },
        ],
        back_urls: {
          success: `${base}/pago/exito?orderId=${orderId}`,
          failure: `${base}/pago/error?orderId=${orderId}`,
          pending: `${base}/pago/pendiente?orderId=${orderId}`,
        },
        auto_return: 'approved',              // redirige automáticamente si pago OK
        notification_url: `${base}/api/payment/webhook`,
        statement_descriptor: 'Legalhelp',
        expires: true,
        expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // expira en 30 min
      },
    });

    // Guardar orden pendiente
    saveOrder({
      orderId,
      preferenceId: preference.id!,
      status: 'pending',
      plan,
      amount,
      caseDataJson: JSON.stringify(caseData),
      createdAt: Date.now(),
    });

    return NextResponse.json({
      orderId,
      preferenceId: preference.id,
      // sandbox_init_point para tokens TEST-, init_point para producción
      checkoutUrl: isSandbox
        ? (preference.sandbox_init_point ?? preference.init_point)
        : preference.init_point,
    });

  } catch (err) {
    console.error('[payment/create]', err);
    return NextResponse.json({ error: 'Error creando preferencia de pago' }, { status: 500 });
  }
}
