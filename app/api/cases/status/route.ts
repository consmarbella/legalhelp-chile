import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const caseId = req.nextUrl.searchParams.get('caseId');

  if (!caseId) {
    return NextResponse.json({ error: 'caseId requerido' }, { status: 400 });
  }

  if (!supabase) {
    return NextResponse.json({ error: 'Supabase no configurado' }, { status: 500 });
  }

  try {
    const { data, error } = await supabase
      .from('cases')
      .select('status, receipt_url, error_log')
      .eq('id', caseId)
      .single();

    if (error) {
      // Si no encuentra la fila, puede que se esté creando aún, asumimos pending
      if (error.code === 'PGRST116') {
        return NextResponse.json({ status: 'pending' });
      }
      throw error;
    }

    return NextResponse.json({
      status: data.status || 'pending',
      receiptUrl: data.receipt_url,
      errorLog: data.error_log,
    });
  } catch (err: any) {
    console.error('[cases/status] Error:', err.message);
    return NextResponse.json({ error: 'Fallo al consultar estado' }, { status: 500 });
  }
}
