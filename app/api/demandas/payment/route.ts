import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { randomUUID } from 'crypto';
import { saveOrder } from '@/lib/orderStore';
import { validateEnv } from '@/lib/validateEnv';
import { checkRateLimit, getClientIp, PAYMENT_RATE_LIMIT } from '@/lib/rateLimit';
import { findMateriaById } from '@/lib/demandas/materias-autorep';

/**
 * POST /api/demandas/payment
 * Crea una preferencia de pago para demandas autorep.
 * El precio se resuelve EN EL SERVIDOR según la materia (no del cliente).
 */

const accessToken = process.env.MP_ACCESS_TOKEN ?? '';
const isSandbox = accessToken.startsWith('TEST-');
const mp = new MercadoPagoConfig({ accessToken });

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const rl = checkRateLimit(`demandas-pay:${ip}`, PAYMENT_RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetMs / 1000)) } }
    );
  }

  validateEnv();

  try {
    const body = await req.json();
    const { materiaId, caseData } = body as {
      materiaId: string;
      caseData: Record<string, unknown>;
    };

    if (!materiaId || !caseData) {
      return NextResponse.json({ error: 'materiaId y caseData son requeridos' }, { status: 400 });
    }

    // Precio resuelto en el servidor desde el catálogo de materias
    const materia = findMateriaById(materiaId);
    if (!materia) {
      return NextResponse.json({ error: 'Materia no válida' }, { status: 400 });
    }
    const amount = materia.ticket_sugerido;

    const orderId = randomUUID();
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3002';

    const payerEmail = typeof caseData.email === 'string' && caseData.email.includes('@')
      ? caseData.email
      : undefined;

    const preference = await new Preference(mp).create({
      body: {
        external_reference: orderId,
        items: [
          {
            id: `demanda-${materiaId}`,
            title: `Demanda: ${materia.nombre} - LegalHelp`,
            quantity: 1,
            unit_price: amount,
            currency_id: 'CLP',
          },
        ],
        ...(payerEmail ? { payer: { email: payerEmail } } : {}),
        back_urls: {
          success: `${base}/demandas?paid=1&orderId=${orderId}`,
          failure: `${base}/demandas?error=1`,
          pending: `${base}/demandas?pending=1&orderId=${orderId}`,
        },
        binary_mode: true,
        auto_return: 'approved',
        notification_url: `${base}/api/payment/webhook`,
        statement_descriptor: 'LegalHelp Demanda',
        payment_methods: {
          installments: 1,
          default_installments: 1,
        },
      },
    });

    await saveOrder({
      orderId,
      preferenceId: preference.id!,
      status: 'pending',
      plan: 'single',
      amount,
      caseDataJson: JSON.stringify(caseData),
      createdAt: Date.now(),
    });

    return NextResponse.json({
      orderId,
      preferenceId: preference.id,
      amount,
      materia: materia.nombre,
      checkoutUrl: isSandbox
        ? (preference.sandbox_init_point ?? preference.init_point)
        : preference.init_point,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[demandas/payment] error:', message);
    return NextResponse.json({ error: 'Error creando preferencia de pago' }, { status: 500 });
  }
}
