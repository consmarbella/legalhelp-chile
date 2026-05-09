import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { randomUUID } from 'crypto';
import { saveOrder } from '@/lib/orderStore';
import { validateEnv } from '@/lib/validateEnv';

const accessToken = process.env.MP_ACCESS_TOKEN ?? '';
const isSandbox   = accessToken.startsWith('TEST-');

const mp = new MercadoPagoConfig({ accessToken });

const PLANS = {
  single:  { label: 'Documento legal - Legalhelp', amount: 10000 },
  monthly: { label: 'Plan mensual - Legalhelp', amount: 19990 },
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
        auto_return: 'approved',
        notification_url: `${base}/api/payment/webhook`,
        statement_descriptor: 'Legalhelp',
        payment_methods: {
          installments: 1,             // 1 cuota = compatible con débito y crédito
          default_installments: 1,
          excluded_payment_methods: [],
          excluded_payment_types: [],
        },
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

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const cause = (err as Record<string, unknown>)?.cause;
    const mpError = (err as Record<string, unknown>)?.error;
    console.error('[payment/create] error:', message);
    console.error('[payment/create] cause:', JSON.stringify(cause ?? null));
    console.error('[payment/create] mpError:', JSON.stringify(mpError ?? null));
    return NextResponse.json({ error: 'Error creando preferencia de pago', detail: message }, { status: 500 });
  }
}
