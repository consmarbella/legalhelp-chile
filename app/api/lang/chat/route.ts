/**
 * API ROUTE: /api/lang/chat
 * 
 * Agente LangGraph + RAG para documentos legales chilenos.
 * Compatible con el mismo frontend (mismo formato de request/response)
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, CHAT_RATE_LIMIT } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  // Rate limiting
  const ip = getClientIp(req.headers);
  const rl = checkRateLimit(`chat:${ip}`, CHAT_RATE_LIMIT);
  
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Intenta en unos segundos.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetMs / 1000)) } }
    );
  }

  try {
    const { message, caseHistory, currentCaseData } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
    }

    // Verificar DEEPSEEK_API_KEY
    if (!process.env.DEEPSEEK_API_KEY) {
      console.error('[lang/chat] Falta DEEPSEEK_API_KEY');
      return NextResponse.json(
        { response_message: 'Error de configuración del servidor. Contacta al administrador.' },
        { status: 500 }
      );
    }

    console.log(`[lang/chat] Mensaje: "${message.slice(0, 50)}..." | Historia: ${(caseHistory || []).length} msgs`);

    // Importar dinámicamente para evitar errores de carga en cold start
    const { runAgent } = await import('@/lib/lang/graph');

    // Ejecutar el agente LangGraph
    console.log(`[lang/chat] Llamando runAgent...`);
    const result = await runAgent(
      message,
      caseHistory || [],
      currentCaseData || {}
    );

    console.log(`[lang/chat] Resultado: tipo=${result.tipo_documento}, ready=${result.ready}`);

    // Respuesta compatible con el frontend
    const response = {
      response_message: result.response_message,
      tipo_documento: result.tipo_documento,
      datos_recopilados: result.datos_recopilados,
      datos_faltantes: result.datos_faltantes,
      ready: result.ready,
      ...((result.datos_recopilados || {}) as any),
      agent: 'langgraph',
      version: '1.0'
    };

    return NextResponse.json(response);

  } catch (err) {
    console.error('[lang/chat] Error:', err instanceof Error ? err.message : err);
    console.error('[lang/chat] Stack:', err instanceof Error ? err.stack : '');
    
    return NextResponse.json(
      { 
        response_message: 'Hubo un error procesando tu mensaje. Por favor intenta de nuevo.',
        error: process.env.NODE_ENV === 'development' ? String(err) : undefined
      },
      { status: 500 }
    );
  }
}
