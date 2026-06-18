import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { randomUUID } from 'crypto';
import { saveOrder } from '@/lib/orderStore';
import { validateEnv } from '@/lib/validateEnv';
import { checkRateLimit, getClientIp, PAYMENT_RATE_LIMIT } from '@/lib/rateLimit';

const accessToken = process.env.MP_ACCESS_TOKEN ?? '';
const isSandbox   = accessToken.startsWith('TEST-');

const mp = new MercadoPagoConfig({ accessToken });

const PLANS = {
  single:  { label: 'Documento legal - Legalhelp', amount: 10000 },
  monthly: { label: 'Plan mensual - Legalhelp', amount: 19990 },
} as const;

export async function POST(req: NextRequest) {
  // Rate limiting
  const ip = getClientIp(req.headers);
  const rl = checkRateLimit(`payment:${ip}`, PAYMENT_RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Intenta en unos segundos.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetMs / 1000)) } }
    );
  }

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

    // Si el usuario proporcionó su e-mail en el chat, pasárselo a MP
    // → el campo llega validado y el botón "Pagar" arranca en azul (no gris)
    const payerEmail = typeof caseData.email === 'string' && caseData.email.includes('@')
      ? caseData.email
      : undefined;

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
        ...(payerEmail ? { payer: { email: payerEmail } } : {}),
        back_urls: {
          success: `${base}/pago/exito?orderId=${orderId}`,
          failure: `${base}/pago/error?orderId=${orderId}`,
          pending: `${base}/pago/pendiente?orderId=${orderId}`,
        },
        binary_mode: true,
        auto_return: 'approved',
        notification_url: `${base}/api/payment/webhook`,
        statement_descriptor: 'Legalhelp',
        payment_methods: {
          installments: 1,             // 1 cuota = compatible con débito y crédito
          default_installments: 1,
        },
      },
    });

    // Guardar orden pendiente
    await saveOrder({
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
