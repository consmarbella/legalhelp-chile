import { NextResponse } from 'next/server';
import { executeLastMile, RoutingData } from '@/lib/playwrightExecutor';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, pass, rut, claveUnica, pdfBase64, routingData, caseId } = body;

    if (!email || !pass || !rut || !claveUnica || !pdfBase64 || !routingData || !caseId) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos (Protocolo de Volatilidad activado)' }, { status: 400 });
    }

    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    const route = routingData as RoutingData;

    // 1. Crear o iniciar sesión de usuario en Supabase
    let userId = null;
    if (supabase) {
      // Intentar crear la cuenta
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: pass,
      });
      
      if (authError && authError.message.includes('User already registered')) {
        // Si ya existe, hacer sign in
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: pass,
        });
        if (signInError) {
          return NextResponse.json({ error: 'Contraseña incorrecta para el correo ingresado.' }, { status: 401 });
        }
        userId = signInData.user?.id;
      } else if (authError) {
        return NextResponse.json({ error: 'Error al crear la cuenta: ' + authError.message }, { status: 500 });
      } else {
        userId = authData.user?.id;
      }

      // Vincular el caso a este usuario
      if (userId) {
        await supabase.from('cases').update({ user_id: userId }).eq('id', caseId);
      }
    }

    // 2. Ejecución asíncrona segura del bot
    // IMPORTANTE: En producción, esto debería enviarse a una cola (Inngest, BullMQ o Vercel Background Functions)
    // Para no bloquear la respuesta HTTP. Como MVP, lo dejamos await (asume entorno sin timeout o ejecución rápida).
    // O mejor aún, no lo esperamos y respondemos de inmediato para el Dashboard:
    
    // Disparamos la última milla de forma "flotante" para no agotar el timeout HTTP
    executeLastMile(rut, claveUnica, pdfBuffer, route, caseId).catch(console.error);

    // Limpieza de variables en memoria local de la request principal
    let wipe = { rut: '', claveUnica: '', pass: '' };
    wipe.rut = '';
    wipe.claveUnica = '';
    wipe.pass = '';

    // Devolvemos el control inmediatamente para que el usuario vaya al Dashboard
    return NextResponse.json({ 
      success: true, 
      message: 'Demanda enviada a cola de procesamiento en ' + route.system_target,
      caseId: caseId
    });

  } catch (error: any) {
    console.error('Error en ruta /tramitar:', error.message);
    return NextResponse.json({ success: false, error: 'Fallo interno del servidor.' }, { status: 500 });
  }
}
