import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { saveOrder } from '@/lib/orderStore';
import { getDocPriceCLP } from '@/lib/constants';

export async function POST(req: NextRequest) {
  try {
    const { password, caseData, docId } = await req.json() as { password: string; caseData: Record<string, unknown>; docId?: string; };
    const devPassword = process.env.DEV_BYPASS_PASSWORD || '4321';
    if (!password || password !== devPassword) return NextResponse.json({ error: 'Clave incorrecta' }, { status: 401 });
    if (!caseData) return NextResponse.json({ error: 'caseData requerido' }, { status: 400 });
    const orderId = `DEV-BYPASS-${randomUUID()}`;
    await saveOrder({ orderId, preferenceId: orderId, status: 'approved', plan: 'single', amount: getDocPriceCLP(docId), caseDataJson: JSON.stringify(caseData), createdAt: Date.now(), paidAt: Date.now(), mpPaymentId: `DEV-${Date.now()}` });
    return NextResponse.json({ orderId, bypassed: true });
  } catch (err) {
    console.error('[dev/bypass] error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
