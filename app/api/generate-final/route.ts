import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, GENERATE_RATE_LIMIT } from '@/lib/rateLimit';
import { getOrderByOrderId, updateOrder } from '@/lib/orderStore';
import { findTemplate } from '@/lib/templates';
import { GENERATE_SYSTEM_PROMPT as SYSTEM } from '@/lib/prompts';
import { llmComplete } from '@/lib/llm';
import { checkDocument, buildCorrectionPrompt } from '@/lib/postChecker';
import { buscarMarcoLegal } from '@/lib/bcnScraper';

// ─── Genera el documento usando llmComplete ───────────────────────────────────
async function generateDocument(
  tipo: string,
  datos: Record<string, unknown>
): Promise<string | null> {
  // Flatten the case data into readable lines with semantic labels.
  // datos_recopilados is a nested object — expand it instead of printing [object Object].
  // datos_faltantes is an array — skip it (it's about what's missing, not case content).
  const SKIP_KEYS = ['tipo_documento', 'response_message', 'ready', 'datos_faltantes', 'orderId', 'analisis_legal', 'ley_referencia', 'entidad_referencia'];

  // Semantic label mapping: maps internal field keys to explicit labels
  // that help the LLM understand what each piece of data represents.
  const SEMANTIC_LABELS: Record<string, string> = {
    nombre: 'NOMBRE DEL COMPARECIENTE',
    rut: 'RUT DEL COMPARECIENTE',
    direccion: 'DOMICILIO DEL COMPARECIENTE',
    comuna: 'COMUNA DEL COMPARECIENTE',
    empleador: 'EMPRESA/EMPLEADOR',
    rut_empleador: 'RUT DEL EMPLEADOR',
    direccion_empleador: 'DOMICILIO DEL EMPLEADOR',
    cargo: 'CARGO DESEMPENADO',
    sueldo: 'SUELDO BRUTO MENSUAL',
    fecha_inicio: 'FECHA INICIO RELACION LABORAL',
    fecha_termino: 'FECHA DE TERMINO',
    causal: 'CAUSAL DE TERMINO',
    demandado: 'DEMANDADO/A',
    rut_demandado: 'RUT DEL DEMANDADO/A',
    direccion_demandado: 'DOMICILIO DEL DEMANDADO/A',
    hijos: 'HIJOS/AS',
    monto: 'MONTO SOLICITADO',
    tribunal: 'TRIBUNAL COMPETENTE',
    destinatario_inferido: 'DESTINATARIO/TRIBUNAL',
    patente: 'PATENTE DEL VEHICULO',
    inmueble: 'DIRECCION DEL INMUEBLE',
    arrendador: 'ARRENDADOR',
    arrendatario: 'ARRENDATARIO',
    apoderado: 'APODERADO/A',
    rut_apoderado: 'RUT DEL APODERADO/A',
    facultades: 'FACULTADES OTORGADAS',
    hechos: 'HECHOS DEL CASO',
    motivo: 'MOTIVO/FUNDAMENTO',
    contraparte: 'CONTRAPARTE',
  };

  function flatten(obj: Record<string, unknown>, lines: string[] = []): string[] {
    for (const [k, v] of Object.entries(obj)) {
      if (SKIP_KEYS.includes(k)) continue;
      if (v === null || v === undefined || v === '') continue;
      if (typeof v === 'object' && !Array.isArray(v)) {
        // Nested object (like datos_recopilados) — expand its entries
        flatten(v as Record<string, unknown>, lines);
      } else if (Array.isArray(v)) {
        const label = SEMANTIC_LABELS[k] || k.toUpperCase().replace(/_/g, ' ');
        lines.push(`- ${label}: ${v.join(', ')}`);
      } else {
        const label = SEMANTIC_LABELS[k] || k.toUpperCase().replace(/_/g, ' ');
        lines.push(`- ${label}: ${v}`);
      }
    }
    return lines;
  }

  // Dedupe lines (a field may appear both at root and inside datos_recopilados)
  const datosStr = [...new Set(flatten(datos))].join('\n');

  // ─── Plantilla verificada (artículos correctos + esqueleto) ──────────────
  // Si el caso matchea una de las plantillas, se le da al modelo el
  // FRAMEWORK LEGAL VERIFICADO para que no invente leyes ni se equivoque de via.
  const template = findTemplate(tipo, datosStr);
  const frameworkBlock = template
    ? `\n\nFRAMEWORK LEGAL VERIFICADO PARA ESTE CASO (${template.titulo} — tipo ${template.tipo}):\n` +
      `Artículos correctos a citar (USA EXCLUSIVAMENTE estos; NO cites ni inventes otros):\n${template.articulos.map(a => '- ' + a).join('\n')}\n\n` +
      `ESTRUCTURA BASE DEL DOCUMENTO (respeta este esqueleto; rellena los [[...]] con los hechos del caso y deja [DATO] como espacio para completar si falta):\n${template.esqueleto}\n\n` +
      `INSTRUCCIÓN ESPECÍFICA: ${template.instruccion_llm}`
    : '';

  // Red de seguridad: si NO hay plantilla, usar guía local o BCN
  let groundingBlock = '';
  if (!template) {
    // 1. Usar guía de hub_guides si está disponible
    const guiaContexto = typeof datos.guia_contexto === 'string' ? datos.guia_contexto.trim() : '';
    const leyRef = typeof datos.ley_referencia === 'string' ? datos.ley_referencia.trim() : '';
    const entidadRef = typeof datos.entidad_referencia === 'string' ? datos.entidad_referencia.trim() : '';

    if (guiaContexto) {
      groundingBlock = `\n\nGUÍA DEL DOCUMENTO "${tipo}" (de base de conocimiento LegalHelp):\n${guiaContexto}`;
    } else if (leyRef || entidadRef) {
      groundingBlock = `\n\nMARCO LEGAL DE REFERENCIA (de la ficha de este documento; úsalo como guía y cita las leyes por su nombre):\n${leyRef}` +
        (entidadRef ? `\n\nAUTORIDAD O DESTINATARIO: ${entidadRef}` : '');
    } else {
      // Buscar en BCN en vivo usando el scraper real
      console.log(`[generate-final] Sin plantilla ni guía. Buscando en BCN: ${tipo}`);
      try {
        const bcnResult = await buscarMarcoLegal(tipo);
        if (bcnResult.encontrado && bcnResult.marcoLegal) {
          console.log(`[generate-final] ✅ BCN: ${bcnResult.fuente}`);
          groundingBlock = `\n\nMARCO LEGAL OBTENIDO DEL BCN (Biblioteca del Congreso Nacional) para este caso:\n${bcnResult.marcoLegal}\n\nFuente: ${bcnResult.fuente}`;
        }
      } catch (bcnError) {
        console.error('[generate-final] Error BCN:', bcnError);
      }
    }
  }

  // Build a KEY DATA MAPPING section that explicitly maps common template markers
  // to actual values from the case data, making it impossible for the LLM to miss
  function buildKeyDataMapping(datos: Record<string, unknown>): string {
    const mappings: string[] = [];
    const allData: Record<string, unknown> = {};
    
    // Collect all data from nested and top-level
    function collectAll(obj: Record<string, unknown>) {
      for (const [k, v] of Object.entries(obj)) {
        if (SKIP_KEYS.includes(k)) continue;
        if (v === null || v === undefined || v === '') continue;
        if (typeof v === 'object' && !Array.isArray(v)) {
          collectAll(v as Record<string, unknown>);
        } else {
          allData[k] = v;
        }
      }
    }
    collectAll(datos);

    // Map fields to common template markers
    if (allData.nombre) mappings.push(`[[NOMBRE]] / [[NOMBRE EN MAYUSCULAS]] / [NOMBRE] = ${allData.nombre}`);
    if (allData.rut) mappings.push(`[[RUT]] / [RUT] = ${allData.rut}`);
    if (allData.direccion) mappings.push(`[[DIRECCION]] / [DIRECCION] = ${allData.direccion}`);
    if (allData.empleador) mappings.push(`[[EMPLEADOR]] / [[RAZON SOCIAL]] / [razon social] = ${allData.empleador}`);
    if (allData.rut_empleador) mappings.push(`[[RUT EMPLEADOR]] = ${allData.rut_empleador}`);
    if (allData.direccion_empleador) mappings.push(`[[DIRECCION EMPLEADOR]] = ${allData.direccion_empleador}`);
    if (allData.cargo) mappings.push(`[[CARGO]] / [cargo] = ${allData.cargo}`);
    if (allData.sueldo) mappings.push(`[[SUELDO]] / [[REMUNERACION]] = ${allData.sueldo}`);
    if (allData.fecha_inicio) mappings.push(`[[FECHA DE INICIO]] / [[FECHA INICIO]] = ${allData.fecha_inicio}`);
    if (allData.fecha_termino) mappings.push(`[[FECHA DE TERMINO]] / [[FECHA TERMINO]] = ${allData.fecha_termino}`);
    if (allData.causal) mappings.push(`[[CAUSAL DE TERMINO]] / [[CAUSAL]] = ${allData.causal}`);
    if (allData.demandado) mappings.push(`[[DEMANDADO]] / [[CONTRAPARTE]] = ${allData.demandado}`);
    if (allData.rut_demandado) mappings.push(`[[RUT DEMANDADO]] = ${allData.rut_demandado}`);
    if (allData.direccion_demandado) mappings.push(`[[DIRECCION DEMANDADO]] = ${allData.direccion_demandado}`);
    if (allData.hijos) mappings.push(`[[HIJOS]] / [[NOMBRE DEL MENOR]] = ${allData.hijos}`);
    if (allData.monto) mappings.push(`[[MONTO]] = ${allData.monto}`);
    if (allData.tribunal) mappings.push(`[[TRIBUNAL]] = ${allData.tribunal}`);
    if (allData.patente) mappings.push(`[[PATENTE]] = ${allData.patente}`);
    if (allData.comuna) mappings.push(`[[COMUNA]] = ${allData.comuna}`);

    if (mappings.length === 0) return '';
    return `\n\n=== DATOS CLAVE PARA SUSTITUIR (usa estos valores EXACTOS, NO inventes placeholders) ===\n${mappings.join('\n')}\n=== FIN DATOS CLAVE ===`;
  }

  const keyDataSection = buildKeyDataMapping(datos);

   const userMessage = `Redacta el siguiente documento legal chileno.\n\nFECHA DE HOY: ${new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Santiago' })} — usá esta fecha en el encabezado del documento. NUNCA uses [DIA], [MES] ni placeholders de fecha. NO confundas la fecha de hoy con las fechas del caso entregadas en los datos.\n\nTIPO DE DOCUMENTO: ${template?.titulo ?? tipo}\n\nDATOS DEL CASO:\n${datosStr}\n\n=== INSTRUCCION DE SUSTITUCION OBLIGATORIA ===\nLos DATOS DEL CASO arriba contienen TODA la informacion recopilada del cliente. DEBES usar estos valores TEXTUALMENTE en el documento.\n- Si dice "NOMBRE DEL COMPARECIENTE: Valentina Paz Herrera Saavedra", el documento DEBE decir "Valentina Paz Herrera Saavedra" donde corresponda el nombre.\n- Si dice "RUT DEL COMPARECIENTE: 17.890.123-4", el documento DEBE decir "17.890.123-4" donde corresponda el RUT.\n- Si dice "EMPRESA/EMPLEADOR: Banco de Chile", el documento DEBE decir "Banco de Chile" donde corresponda el empleador.\n- PROHIBIDO producir placeholders genericos como [nombre completo], [razon social], [describir...], [fecha de...], [monto de...], [cargo desempeñado], [nombre del hijo] cuando el dato YA ESTA en los DATOS DEL CASO.\n- Los marcadores [[...]] de la plantilla deben ser reemplazados con los datos reales proporcionados arriba.\n- Solo usa [DATO PENDIENTE] para informacion que genuinamente NO aparece en los DATOS DEL CASO.\n=== FIN INSTRUCCION ===\n\n=== INSTRUCCION DE CALCULO DE MONTOS ===\nCuando el documento incluya montos que dependen de los datos del caso (sueldo, fechas, etc.), DEBES CALCULARLOS usando los valores proporcionados.\n\nREGLAS DE CALCULO:\n- Indemnización por años de servicio (Art. 163 CT): 30 días de sueldo por cada año trabajado. Ej: sueldo $1.200.000, 4 años = $1.200.000 × 4 = $4.800.000\n- Indemnización sustitutiva de aviso previo (Art. 161 CT): 30 días de sueldo = 1 sueldo mensual\n- Feriado proporcional (Art. 73 CT): (días pendientes / 15) × (sueldo / 30) × días hábiles pendientes. Ej: 10 días pendientes, sueldo $1.200.000 = (10/15) × ($1.200.000/30) × 10 = aproximado\n- Remuneración pendiente: días trabajados en el último mes × (sueldo / 30)\n- Si no tienes todos los datos para calcular exactamente, haz una estimacion razonable y pon "aproximado"\n- PROHIBIDO dejar $_ o $_____ o [monto] en lugar de un numero calculado\n- SIEMPRE calcula y escribe el monto numerico aunque sea estimado\n- INFERIR CAUSAL: Si el usuario dijo "renuncié", la causal es Art. 159 N°2 (renuncia voluntaria). Si dijo "me echaron/despidieron", la causal es Art. 161 (necesidades empresa) y debe marcarse como "Art. 161 CT". Si no hay información, dejar "Art. 159 N°2 CT (renuncia voluntaria)" si renunció, o "[DATO PENDIENTE]" si no hay datos.\n=== FIN CALCULO ===\n${frameworkBlock}${groundingBlock}${keyDataSection}\n\nRedacta el documento completo, profesional y listo para usar. ${template ? 'Sigue la ESTRUCTURA BASE y cita SOLO los artículos verificados entregados.' : 'Usa el formato chileno que corresponda al tipo de documento.'} Si falta un dato de la contraparte, déjalo como espacio para completar en lugar de inventarlo.`;

  return llmComplete({
    system: SYSTEM,
    messages: [{ role: 'user', content: userMessage }],
    maxTokens: 8192,
    temperature: 0.1,
  });
}

// ─── Mock fallback ────────────────────────────────────────────────────────────
function buildMock(tipo: string, datos: Record<string, unknown>): string {
  const today = new Date().toLocaleDateString('es-CL', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Santiago',
  });
  const nombre    = String(datos.nombre ?? datos.arrendatario ?? datos.trabajador ?? '[NOMBRE]');
  const rut       = String(datos.rut ?? '[RUT]');
  const domicilio = String(datos.direccion ?? datos.domicilio ?? '[DOMICILIO]');
  const dest      = String(datos.destinatario_inferido ?? datos.destinatario ?? datos.tribunal ?? '[DESTINATARIO]');

  return `Santiago, ${today}

${dest.toUpperCase()}
PRESENTE

${nombre.toUpperCase()}, RUT ${rut}, domiciliado en ${domicilio}, a US. respetuosamente digo:

I. ANTECEDENTES

Que vengo en solicitar ${tipo}, en virtud de los hechos y fundamentos que se exponen a continuación.

II. FUNDAMENTO LEGAL

La presente solicitud se funda en la legislación chilena vigente aplicable al caso.

POR TANTO,

RUEGO A US.: Acoger la presente solicitud y resolver conforme a derecho.

${nombre}
RUT: ${rut}`;
}

// ─── Sanitiza el documento: elimina markdown que el modelo pueda colar ───────
// Garantiza texto plano (sin **negritas**, # titulos, `code`) independiente de
// si el modelo respeta o no la instruccion del prompt. Fix determinista.
function stripMarkdown(s: string): string {
  return s
    .replace(/\*\*(.*?)\*\*/g, '$1')   // **negrita**
    .replace(/__(.*?)__/g, '$1')        // __negrita__
    .replace(/(^|\n)\s*#{1,6}\s+/g, '$1') // # titulos
    .replace(/\*\*/g, '')               // ** sueltos
    .replace(/`{1,3}/g, '')             // `code`
    .replace(/[ \t]+\n/g, '\n');        // espacios al final de linea
}

// ─── Trunca el documento para la VISTA PREVIA (sin pago) ─────────────────────
// Se envía al cliente ~70% del documento. Suficiente para que el cliente vea
// el contenido real y se enganche, pero sin revelar el final (firma, montos exactos,
// petitorio completo). El frontend agrega un overlay de blur a partir del 65%.
function truncateForPreview(doc: string): string {
  const lines = doc.split('\n');
  // Mostrar 70% del documento: ven bastante, falta lo justo para motivar el pago
  const keep = Math.max(10, Math.ceil(lines.length * 0.7));
  const slice = lines.slice(0, keep);
  while (slice.length && slice[slice.length - 1].trim() === '') slice.pop();
  return slice.join('\n');
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Rate limiting
  const ip = getClientIp(req.headers);
  const rl = checkRateLimit(`generate:${ip}`, GENERATE_RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Intenta en unos segundos.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetMs / 1000)) } }
    );
  }

  try {
    const caseData: Record<string, unknown> = await req.json();

    // ─── Payment verification ───────────────────────────────────────────────
    // Sin orderId => es una VISTA PREVIA (se devuelve truncada).
    // Con orderId => debe estar 'approved' para devolver el documento completo.
    const orderId = typeof caseData.orderId === 'string' ? caseData.orderId : null;
    let isPaid = false;
    if (orderId) {
      const order = await getOrderByOrderId(orderId);
      if (!order || order.status !== 'approved') {
        return NextResponse.json({ error: 'Pago no verificado' }, { status: 403 });
      }
      isPaid = true;
    }

    const tipo = String(caseData.tipo_documento ?? 'documento legal');

    // LLM generates the document — no external search needed
    console.log(`[generate-final] Generating "${tipo}" with LLM (paid=${isPaid})`);
    let document = await generateDocument(tipo, caseData) ?? buildMock(tipo, caseData);
    let clean = stripMarkdown(document);

    // ─── CAPA 4: Verificación post-generación (reglas duras) ──────────────
    const check = checkDocument(clean, tipo);
    if (!check.passed) {
      console.log(`[generate-final] CHECK FAILED: ${check.errors.join('; ')}`);
      // Reintentar UNA vez con prompt de corrección
      const correctionPrompt = buildCorrectionPrompt(check.errors);
      const retry = await llmComplete({
        system: SYSTEM,
        messages: [
          { role: 'user', content: `Redacta el siguiente documento legal chileno.\n\nTIPO: ${tipo}\nDATOS:\n${JSON.stringify(caseData)}` },
          { role: 'assistant', content: document },
          { role: 'user', content: correctionPrompt },
        ],
        maxTokens: 8192,
        temperature: 0.2,
      });
      if (retry) {
        clean = stripMarkdown(retry);
        const recheck = checkDocument(clean, tipo);
        if (!recheck.passed) {
          console.warn(`[generate-final] RECHECK FAILED (entregando anyway): ${recheck.errors.join('; ')}`);
        }
      }
    }
    if (check.warnings.length > 0) {
      console.log(`[generate-final] WARNINGS: ${check.warnings.join('; ')}`);
    }

    if (isPaid && orderId) {
      await updateOrder(orderId, { documentUrl: clean }).catch(err => {
        console.error('[generate-final] Failed to persist document:', err);
      });
    }

    // El documento completo SOLO se entrega con pago verificado.
    return NextResponse.json({
      document: isPaid ? clean : truncateForPreview(clean),
      preview: !isPaid,
    });
  } catch (err) {
    console.error('[generate-final] error:', err);
    return NextResponse.json({ error: 'Error generando el documento' }, { status: 500 });
  }
}
