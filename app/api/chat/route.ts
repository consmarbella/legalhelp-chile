import { NextRequest, NextResponse } from 'next/server';
import { DEEPSEEK_SYSTEM_PROMPT } from '@/lib/prompts';
import { checkRateLimit, getClientIp, CHAT_RATE_LIMIT } from '@/lib/rateLimit';
import { llmComplete, activeProvider } from '@/lib/llm';
import { findTemplate, getTemplateRequirements, type LegalTemplate } from '@/lib/templates';
import { validateReadyState, generateMissingFieldQuestion } from '@/lib/validateReady';

type CaseData = Record<string, unknown>;

// ─── JSON extraction ──────────────────────────────────────────────────────────
function extractJSON(text: string): CaseData | null {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0, end = -1;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    if (text[i] === '}') depth--;
    if (depth === 0) { end = i; break; }
  }
  if (end === -1) return null;
  try { return JSON.parse(text.slice(start, end + 1)); } catch { return null; }
}

// ─── Smart mock (fallback sin API key) ───────────────────────────────────────
// Solo recoge datos básicos en secuencia. DeepSeek es quien razona el caso real.
function smartMock(message: string, current: CaseData): CaseData {
  const updated: CaseData = { ...current };
  const m = message.toLowerCase();

  // Detectar tipo de documento de forma genérica
  if (!updated.tipo_documento) {
    if (/licencia.*(conducir|manejar)|sacar.*licencia/.test(m))
      updated.tipo_documento = /pens[ií]on|alimento|debo/.test(m)
        ? 'solicitud de alzamiento de suspensión de licencia de conducir'
        : 'solicitud de licencia de conducir';
    else if (/despido|desvincula|finiquito/.test(m)) updated.tipo_documento = 'reclamo por despido injustificado';
    else if (/\btag\b|autopista/.test(m))            updated.tipo_documento = 'solicitud de prescripción de deuda TAG';
    else if (/sernac|garant[íi]a|consumidor/.test(m)) updated.tipo_documento = 'carta reclamo SERNAC';
    else if (/arrend|desalojo/.test(m))              updated.tipo_documento = 'demanda de arrendamiento';
    else if (/pens[ií]on|alimento/.test(m))          updated.tipo_documento = 'demanda de alimentos';
    else if (/protecci[oó]n/.test(m))                updated.tipo_documento = 'recurso de protección';
    else if (/poder|autoriza/.test(m))               updated.tipo_documento = 'poder simple';
    else if (/prescripci[oó]n|deuda.*a[ñn]os/.test(m)) updated.tipo_documento = 'solicitud de prescripción de deuda';
  }

  // Recopilar datos básicos en secuencia
  const originalTipo = updated.tipo_documento;
  const isDesc = message.length > 35 || /\b(necesito|quiero|tengo|debo|para|porque)\b/i.test(message);
  // Si el mensaje activó tipo_documento por keyword (ej: initialContext "Poder simple notarial")
  // y no es descriptivo, NO lo trates como nombre del usuario
  if (!updated.nombre && !isDesc && !(originalTipo !== updated.tipo_documento && updated.tipo_documento)) updated.nombre = message.trim();
  else if (!updated.rut && /^\d[\d.\-kK]+$/.test(message.trim()))         updated.rut = message.trim();
  else if (updated.nombre && updated.rut && !updated.direccion)           updated.direccion = message.trim();
  else if (updated.nombre && updated.rut && updated.direccion && !updated.detalle_caso) updated.detalle_caso = message.trim();

  const tipo  = updated.tipo_documento as string | undefined;
  const first = (updated.nombre as string | undefined)?.split(' ')[0] ?? '';
  const tieneBase = !!(updated.nombre && updated.rut && updated.direccion);
  const isReady   = tieneBase && !!(updated.detalle_caso);

  const nextQ = !tipo
    ? 'Cuéntame tu situación con detalle para preparar el documento.'
    : !updated.nombre
      ? '¿Cuál es tu nombre completo?'
      : !updated.rut
        ? `${first}, ¿cuál es tu RUT?`
        : !updated.direccion
          ? '¿Cuál es tu domicilio?'
          : !updated.detalle_caso
            ? '¿Puedes darme más detalles? (contraparte, monto, fecha, motivo)'
            : `¡Listo, ${first}! Tengo lo necesario para redactar tu documento.`;

  return { ...updated, response_message: nextQ, ready: isReady };
}

// ─── Guía de plantilla: si hay plantilla, MANDA la plantilla ─────────────────
// Construye una instrucción extra para el system prompt con los datos exactos
// que la plantilla necesita, para que el chat los pida uno por uno y solo marque
// ready:true cuando los tenga todos. Si no hay plantilla, devuelve '' (el chat
// sigue generando libre, como antes).
function buildTemplateGuidance(t: LegalTemplate): string {
  const reqs = getTemplateRequirements(t);
  const lista = reqs.length
    ? reqs.map((r, i) => `   ${i + 1}. ${r}`).join('\n')
    : '   (los antecedentes propios del caso)';
  return `

PLANTILLA IDENTIFICADA PARA ESTE CASO: "${t.titulo}".
Los datos clave que este documento necesita son (como GUÍA, no como script rígido):
${lista}
Indicaciones para recopilar estos datos:
- Si el cliente ya respondió algo implícitamente (ej: "ya estoy saldado" = no se le debe dinero, montos = $0), dalo por resuelto y avanza.
- No preguntes cada sub-ítem de un desglose por separado. Una sola pregunta resumen basta (ej: "¿cuánto te deben en total?" cubre todos los sub-montos).
- Si el cliente dice que algo no aplica a su caso, acéptalo y sigue con lo siguiente.
- Cuando tengas los datos suficientes para generar un documento competente, marca ready:true. No necesitas completar cada ítem si el contexto ya los cubre.
No le menciones al cliente leyes, artículos ni el nombre de la plantilla; ese análisis es solo interno.`;
}

// ─── Modelo configurable (Anthropic/Haiku si hay key, si no DeepSeek) ─────────
async function callLLM(
  messages: { role: string; content: string }[],
  extraSystem = ''
): Promise<string | null> {
  return llmComplete({
    system: DEEPSEEK_SYSTEM_PROMPT + extraSystem,
    messages: messages as { role: 'user' | 'assistant'; content: string }[],
    temperature: 0.2,
    maxTokens: 2048,
  });
}

// ─── Route ────────────────────────────────────────────────────────────────────
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

    const useMock = activeProvider() === 'mock';
    if (useMock) {
      console.warn('[chat] USANDO MOCK — sin ANTHROPIC_API_KEY ni DEEPSEEK_API_KEY');
      return NextResponse.json(smartMock(message, currentCaseData ?? {}));
    }

    // Contar intercambios (ya no se etiqueta el mensaje)
    const userTurns = (caseHistory ?? []).filter((m: { role: string }) => m.role === 'user').length + 1;
    const taggedMessage = message;

    // ─── Si hay plantilla, la plantilla MANDA: se inyecta su checklist ──────
    // Se busca con el tipo de documento ya detectado (persiste entre turnos) y
    // el mensaje/detalle actual. Si no matchea ninguna, guidance = '' (libre).
    const prior = (currentCaseData ?? {}) as CaseData;
    const priorTipo = typeof prior.tipo_documento === 'string' ? prior.tipo_documento : null;
    const priorDetalle = typeof prior.detalle_caso === 'string' ? prior.detalle_caso : '';
    const template = findTemplate(priorTipo, `${message} ${priorDetalle}`);
    const guidance = template ? buildTemplateGuidance(template) : '';

    const messages = [...(caseHistory ?? []), { role: 'user', content: taggedMessage }];
    let responseText = await callLLM(messages, guidance);
    let jsonData = responseText ? extractJSON(responseText) : null;

    // Hasta 2 reintentos si no devuelve JSON
    for (let i = 0; i < 2 && !jsonData; i++) {
      responseText = await callLLM([
        ...messages,
        { role: 'assistant', content: responseText ?? '' },
        { role: 'user', content: 'Responde SOLO con JSON válido, sin texto adicional.' },
      ], guidance);
      jsonData = responseText ? extractJSON(responseText) : null;
    }

    if (!jsonData) {
      console.error('[chat] DeepSeek no devolvió JSON válido después de reintentos — usando mock');
    }

    // ─── Normalize alias to canonical keys ────────────────────────────────
    function normalizeKeys(d: Record<string, unknown>) {
      if (!d.nombre && d.nombre_completo) d.nombre = d.nombre_completo;
      if (!d.direccion && d.domicilio)    d.direccion = d.domicilio;
      if (!d.detalle_caso && d.hechos)    d.detalle_caso = d.hechos;
      if (!d.detalle_caso && d.contexto)  d.detalle_caso = d.contexto;
      if (!d.detalle_caso && d.situacion) d.detalle_caso = d.situacion;
      if (!d.detalle_caso && d.motivo)    d.detalle_caso = d.motivo;
      // También tomar alias desde datos_recopilados si existe
      const r = d.datos_recopilados as Record<string, unknown> | undefined;
      if (r && typeof r === 'object') {
        if (!d.nombre && r.nombre)               d.nombre = r.nombre;
        if (!d.nombre && r.nombre_completo)       d.nombre = r.nombre_completo;
        if (!d.rut && r.rut)                       d.rut = r.rut;
        if (!d.direccion && r.direccion)           d.direccion = r.direccion;
        if (!d.direccion && r.domicilio)           d.direccion = r.domicilio;
        if (!d.detalle_caso && r.detalle_caso)     d.detalle_caso = r.detalle_caso;
        if (!d.detalle_caso && r.hechos)           d.detalle_caso = r.hechos;
        if (!d.detalle_caso && r.contexto)         d.detalle_caso = r.contexto;
      }
      return d;
    }

    // Merge: previous accumulated data + new output from DeepSeek
    // This ensures fields collected in earlier turns are never lost even if
    // DeepSeek omits them while still asking follow-up questions.
    const merged = jsonData
      ? normalizeKeys({ ...(currentCaseData ?? {}), ...jsonData })
      : smartMock(message, currentCaseData ?? {});

    // ─── VALIDACIÓN CRÍTICA: TypeScript verifica campos obligatorios ────────
    const validation = validateReadyState(merged);
    
    if (merged.ready === true && !validation.valid) {
      // LLM dice ready pero faltan campos → BLOQUEAR
      console.log(`[chat] BLOCKED ready=true — missing: ${validation.missing.join(', ')}`);
      merged.ready = false;
      merged.datos_faltantes = validation.missing;
      const question = generateMissingFieldQuestion(validation.missing);
      if (question) merged.response_message = question;
    } else if (merged.ready !== true && validation.valid) {
      // LLM sigue preguntando pero TypeScript confirma que ya tiene todo → FORZAR READY
      console.log(`[chat] FORCED ready=true — all fields present`);
      merged.ready = true;
      merged.datos_faltantes = [];
      merged.response_message = `Tengo todos los datos necesarios para tu documento. Procedo a redactarlo.`;
    }

    return NextResponse.json(merged);

  } catch (err) {
    console.error('Chat API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
