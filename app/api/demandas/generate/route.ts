import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { findMateriaById } from '@/lib/demandas/materias-autorep';
import { getOrderByOrderId } from '@/lib/orderStore';
import { buildDemandaGraph, DemandaState } from '@/lib/demandas/graph';

const RATE_LIMIT = { maxRequests: 5, windowMs: 60_000 };

/**
 * POST /api/demandas/generate
 * Ejecuta el grafo LangGraph completo:
 *   clasificar → viabilidad → recopilar → retrieve_juris → redactar → self_check
 *
 * Requiere:
 *   - materia_detectada: id de la materia
 *   - datos_recopilados: datos del caso
 *   - orderId: para verificar pago (obligatorio)
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

    // Verificar pago
    if (!orderId) {
      return NextResponse.json({ error: 'Pago requerido para generar demanda.' }, { status: 403 });
    }
    const order = await getOrderByOrderId(orderId);
    if (!order || order.status !== 'approved') {
      return NextResponse.json({ error: 'Pago no verificado.' }, { status: 403 });
    }

    // Verificar materia
    const materia = materia_detectada ? findMateriaById(materia_detectada) : null;
    if (!materia) {
      return NextResponse.json({ error: 'Materia no identificada.' }, { status: 400 });
    }

    console.log(`[demandas/generate] Ejecutando grafo LangGraph para "${materia.nombre}"`);

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

    if (result.documentoFinal) {
      return NextResponse.json({
        document: result.documentoFinal,
        materia: materia.nombre,
        tribunal: materia.tribunal,
        ticket: materia.ticket_sugerido,
        selfCheckPassed: result.selfCheckPassed,
        selfCheckAttempts: result.selfCheckAttempts,
        jurisprudenciaUsada: result.jurisprudencia.length,
      });
    }

    // Si el self-check no pasó después de 3 intentos, devolver el borrador con advertencia
    if (result.borrador) {
      return NextResponse.json({
        document: result.borrador,
        materia: materia.nombre,
        tribunal: materia.tribunal,
        ticket: materia.ticket_sugerido,
        selfCheckPassed: false,
        selfCheckErrors: result.selfCheckErrors,
        warning: 'El documento fue generado pero no pasó todas las verificaciones automáticas. Revíselo antes de presentar.',
      });
    }

    return NextResponse.json({ error: 'No se pudo generar el documento.' }, { status: 500 });
  } catch (err) {
    console.error('[demandas/generate] error:', err);
    return NextResponse.json({ error: 'Error interno al generar la demanda.' }, { status: 500 });
  }
}
