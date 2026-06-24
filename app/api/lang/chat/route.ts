/**
 * API ROUTE: /api/lang/chat
 * 
 * Reemplazo de /api/chat pero usando LangGraph + RAG
 * Compatible con el mismo frontend (mismo formato de request/response)
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, CHAT_RATE_LIMIT } from '@/lib/rateLimit';
import { runAgent } from '@/lib/lang/graph';

export async function POST(req: NextRequest) {
  // Rate limiting (igual que tu API actual)
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

    // Verificar que tengamos las API keys necesarias
    if (!process.env.OPENAI_API_KEY) {
      console.error('[lang/chat] Falta OPENAI_API_KEY');
      return NextResponse.json(
        { error: 'Configuración incompleta del servidor' },
        { status: 500 }
      );
    }

    console.log(`[lang/chat] Mensaje recibido: "${message.slice(0, 50)}..."`);
    console.log(`[lang/chat] Historia: ${(caseHistory || []).length} mensajes`);
    console.log(`[lang/chat] Datos actuales:`, currentCaseData);

    // Ejecutar el agente LangGraph
    const result = await runAgent(
      message,
      caseHistory || [],
      currentCaseData || {}
    );

    console.log(`[lang/chat] Respuesta del agente:`, {
      tipo: result.tipo_documento,
      ready: result.ready,
      faltantes: result.datos_faltantes
    });

    // Formatear respuesta en el mismo formato que tu API actual
    // para que el frontend funcione sin cambios
    const response = {
      response_message: result.response_message,
      tipo_documento: result.tipo_documento,
      datos_recopilados: result.datos_recopilados,
      datos_faltantes: result.datos_faltantes,
      ready: result.ready,
      // Flatten datos para compatibilidad
      ...((result.datos_recopilados || {}) as any),
      // Metadata del agente
      agent: 'langgraph',
      version: '1.0'
    };

    return NextResponse.json(response);

  } catch (err) {
    console.error('[lang/chat] Error:', err);
    
    // Error más descriptivo
    const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
    
    return NextResponse.json(
      { 
        error: 'Error procesando tu solicitud',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}
