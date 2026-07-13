import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { findMateriaById } from '@/lib/demandas/materias-autorep';
import { getOrderByOrderId, updateOrder } from '@/lib/orderStore';
import { buildDemandaGraph, DemandaState } from '@/lib/demandas/graph';

const RATE_LIMIT = { maxRequests: 5, windowMs: 60_000 };

/**
 * Trunca el documento para vista previa (primer ~70%).
 * El cliente ve casi todo el documento pero no el final (firma, montos exactos,
 * petitorio completo), suficiente para engancharlo a pagar.
 */
function truncateForPreview(doc: string): string {
  const lines = doc.split('\n');
  const keep = Math.max(10, Math.ceil(lines.length * 0.7));
  const slice = lines.slice(0, keep);
  while (slice.length && slice[slice.length - 1].trim() === '') slice.pop();
  return slice.join('\n');
}

/**
 * POST /api/demandas/generate
 * Ejecuta el grafo LangGraph completo:
 *   clasificar → viabilidad → recopilar → retrieve_juris → redactar → self_check
 *
 * SIN orderId → devuelve preview truncado (primer 40%).
 * CON orderId + approved → devuelve documento completo.
 *
 * Requiere:
 *   - materia_detectada: id de la materia
 *   - datos_recopilados: datos del caso
 *   - orderId: opcional, para verificar pago
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const rl = checkRateLimit(`demandas-gen:${ip}`, RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetMs / 1000)) } }
    );
  }

  try {
    const body = await req.json();
    const { materia_detectada, datos_recopilados, orderId } = body;

    // Verificar pago (si hay orderId)
    let isPaid = false;
    if (orderId) {
      const order = await getOrderByOrderId(orderId);
      if (order && order.status === 'approved') {
        isPaid = true;
      } else {
        return NextResponse.json({ error: 'Pago no verificado.' }, { status: 403 });
      }
    }

    // Verificar materia
    const materia = materia_detectada ? findMateriaById(materia_detectada) : null;
    if (!materia) {
      return NextResponse.json({ error: 'Materia no identificada.' }, { status: 400 });
    }

    console.log(`[demandas/generate] Ejecutando grafo LangGraph para "${materia.nombre}" (paid=${isPaid})`);

    // Ejecutar el grafo
    const graph = buildDemandaGraph();
    const initialState: typeof DemandaState.State = {
      userMessages: [],
      currentMessage: JSON.stringify(datos_recopilados),
      materiaId: materia_detectada,
      viable: true,
      motivoNoViable: null,
      derivarAbogado: false,
      datosRecopilados: datos_recopilados || {},
      datosFaltantes: [],
      ready: true,
      jurisprudencia: [],
      borrador: null,
      selfCheckErrors: [],
      selfCheckPassed: false,
      selfCheckAttempts: 0,
      documentoFinal: null,
      responseMessage: '',
      ticket: materia.ticket_sugerido,
    };

    const result = await graph.invoke(initialState);

    const docFinal = result.documentoFinal || result.borrador;

    if (docFinal) {
      // Persistir documento si está pago
      if (isPaid && orderId) {
        await updateOrder(orderId, { documentUrl: docFinal }).catch(err => {
          console.error('[demandas/generate] Failed to persist document:', err);
        });
      }

      return NextResponse.json({
        document: isPaid ? docFinal : truncateForPreview(docFinal),
        preview: !isPaid,
        materia: materia.nombre,
        tribunal: materia.tribunal,
        ticket: materia.ticket_sugerido,
        selfCheckPassed: result.selfCheckPassed,
        selfCheckAttempts: result.selfCheckAttempts,
        jurisprudenciaUsada: result.jurisprudencia.length,
        ...(result.selfCheckErrors?.length ? { selfCheckErrors: result.selfCheckErrors } : {}),
        ...(!result.selfCheckPassed && result.borrador ? { warning: 'El documento fue generado pero no pasó todas las verificaciones automáticas. Revíselo antes de presentar.' } : {}),
      });
    }

    return NextResponse.json({ error: 'No se pudo generar el documento.' }, { status: 500 });
  } catch (err) {
    console.error('[demandas/generate] error:', err);
    return NextResponse.json({ error: 'Error interno al generar la demanda.' }, { status: 500 });
  }
}
