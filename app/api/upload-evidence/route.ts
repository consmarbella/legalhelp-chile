/**
 * upload-evidence/route.ts — API para subir PDFs de evidencia a Supabase Storage.
 *
 * Flujo:
 * 1. El usuario paga la tramitación automatizada ($7.999)
 * 2. Se le redirige a /upload-evidence?orderId=xxx
 * 3. Sube Finiquito (PDF) y Certificado AFC (PDF)
 * 4. Esta API los guarda en Supabase Storage bucket 'judicial-documents'
 * 5. Se actualiza la orden con las URLs de los documentos
 * 6. Playwright los usará para subirlos a la OJV
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getOrderByOrderId, updateOrder } from '@/lib/orderStore';

const BUCKET_NAME = 'judicial-documents';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const finiquitoFile = formData.get('finiquito') as File | null;
    const afcFile = formData.get('afc') as File | null;
    const orderId = formData.get('orderId') as string | null;

    // Validar campos requeridos
    if (!finiquitoFile || !afcFile || !orderId) {
      return NextResponse.json(
        { error: 'Faltan archivos requeridos (finiquito, afc) o orderId' },
        { status: 400 }
      );
    }

    // Validar que sean PDFs
    if (!finiquitoFile.name.endsWith('.pdf') || !afcFile.name.endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Ambos archivos deben ser PDF' },
        { status: 400 }
      );
    }

    // Validar tamaño máximo (10MB cada uno)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (finiquitoFile.size > MAX_SIZE || afcFile.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Los archivos no pueden superar los 10MB cada uno' },
        { status: 400 }
      );
    }

    // Verificar que la orden existe y está aprobada
    const order = await getOrderByOrderId(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }
    if (order.status !== 'approved') {
      return NextResponse.json(
        { error: 'La orden debe estar aprobada antes de subir evidencias' },
        { status: 403 }
      );
    }

    // Verificar que Supabase está disponible
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase no está configurado. Las evidencias no pueden almacenarse.' },
        { status: 500 }
      );
    }

    // Subir Finiquito a Supabase Storage
    const finiquitoBytes = await finiquitoFile.arrayBuffer();
    const finiquitoPath = `${orderId}/finiquito.pdf`;
    const { error: finiquitoError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(finiquitoPath, Buffer.from(finiquitoBytes), {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (finiquitoError) {
      console.error('[upload-evidence] Error subiendo finiquito:', finiquitoError.message);
      return NextResponse.json(
        { error: 'Error al subir el finiquito: ' + finiquitoError.message },
        { status: 500 }
      );
    }

    // Subir Certificado AFC a Supabase Storage
    const afcBytes = await afcFile.arrayBuffer();
    const afcPath = `${orderId}/certificado-afc.pdf`;
    const { error: afcError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(afcPath, Buffer.from(afcBytes), {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (afcError) {
      console.error('[upload-evidence] Error subiendo AFC:', afcError.message);
      return NextResponse.json(
        { error: 'Error al subir el certificado AFC: ' + afcError.message },
        { status: 500 }
      );
    }

    // Obtener URLs públicas
    const { data: finiquitoUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(finiquitoPath);

    const { data: afcUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(afcPath);

    // Actualizar la orden con las URLs de los documentos
    const evidenceData = JSON.stringify({
      finiquito_url: finiquitoUrlData.publicUrl,
      afc_url: afcUrlData.publicUrl,
      uploaded_at: new Date().toISOString(),
    });

    await updateOrder(orderId, {
      documentUrl: evidenceData,
    });

    console.log(`[upload-evidence] Evidencias subidas para orden ${orderId}`);

    return NextResponse.json({
      ok: true,
      finiquito_url: finiquitoUrlData.publicUrl,
      afc_url: afcUrlData.publicUrl,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[upload-evidence] Error:', message);
    return NextResponse.json(
      { error: 'Error interno al procesar los archivos' },
      { status: 500 }
    );
  }
}
