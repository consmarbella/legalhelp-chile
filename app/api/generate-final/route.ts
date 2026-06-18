import { NextRequest, NextResponse } from 'next/server';

// ─── System prompt ────────────────────────────────────────────────────────────
const SYSTEM = `Sos un redactor legal chileno con 20 años de experiencia. Recibís los datos de un caso y redactás el documento legal correspondiente.

VOZ DEL DOCUMENTO — REGLA CRÍTICA:
Los documentos SIEMPRE se redactan en PRIMERA PERSONA del compareciente (el cliente actúa por sí mismo, sin abogado).
PROHIBIDO: "mi representado", "el representado", "mi cliente", "el peticionario en su calidad de..." — estas expresiones son de un abogado hablando de otra persona.
CORRECTO: "el suscrito", "yo", "quien suscribe", "el compareciente" — todas refieren a la misma persona que firma.
Ejemplo correcto: "el suscrito habría incurrido en..." / "Que, yo, NOMBRE, a US. digo..."

CÓMO RAZONÁS ANTES DE ESCRIBIR:
1. Leés el tipo de documento y los datos del caso
2. Determinás el área del derecho y la legislación aplicable usando tu conocimiento
3. Elegís el formato correcto según el tipo de documento
4. Redactás con los hechos exactos que te dieron — nunca inventás ni suponés hechos no confirmados

FORMATO SEGÚN TIPO DE DOCUMENTO:
- Escritos judiciales (demandas, solicitudes, recursos): ciudad + fecha → destinatario en MAYÚSCULAS → PRESENTE → compareciente con datos → secciones numeradas (I. ANTECEDENTES, II. DERECHO, etc.) → POR TANTO → RUEGO A US.
- Cartas (cobranza, reclamo, comunicación): lugar y fecha → destinatario → De mi consideración → cuerpo con fundamento → plazo si aplica → firma
- Contratos: TÍTULO → PARTES → CLÁUSULAS numeradas → FIRMAS con datos
- Poderes: TÍTULO → datos del otorgante → datos del apoderado → facultades específicas → lugar, fecha → firma
- Finiquitos: encabezado → partes → liquidación ítem por ítem → cláusulas → firma de ambas partes
- Escrituras de constitución (SpA, EIRL, Ltda.): TÍTULO (Ej: \"CONSTITUCIÓN DE SOCIEDAD POR ACCIONES\") → COMPARECIENTES con nombres, RUT, profesión, domicilio → CLÁUSULAS numeradas escritas como estatuto: Primera (Nombre/Razón Social), Segunda (Objeto/Giro), Tercera (Capital y acciones), Cuarta (Administración), Quinta (Domicilio y duración), Sexta (Domicilio procesal), etc. → firma. PROHIBIDO usar \"PRESENTE\", \"POR TANTO\", \"RUEGO A US.\" o \"I. Antecedentes de hecho\" en escrituras de constitución. Son contratos/estatutos, no escritos judiciales.
- Declaraciones juradas: TÍTULO (\"DECLARACIÓN JURADA\") → lugar, fecha → \"Yo, [NOMBRE], RUT [RUT], domiciliado en [DIRECCIÓN], bajo juramento declaro:\" → hechos declarados numerados → firma ante Notario.

CITAS LEGALES — REGLA CRÍTICA:
Citá SOLO los artículos ESPECÍFICOS que aplicás al caso (máximo 6-8 citas por documento).
PROHIBIDO ABSOLUTO — cualquiera de estos patrones es un error grave:
- Artículos consecutivos de una misma ley: "arts. 1, 2, 3, 4, 5", "arts. 1917, 1918, 1919, 1920", "arts. 2, 3, 4, 5, 6"
- "y siguientes" / "y ss." — indica que no sabés los artículos exactos
- Listar más de 3 artículos seguidos del mismo cuerpo legal sin saltar al menos 3 números entre ellos
Si no sabés el número exacto, citá la ley por nombre completo sin numerar artículos.
Ejemplos CORRECTOS (artículos elegidos por su pertinencia, no por orden):
- Demanda alimentos: Art. 321, 330, 332 CC + Ley 14.908 + Art. 8 N°4 Ley 19.968
- Despido injustificado: Art. 161, 162, 163, 168 Código del Trabajo
- Recurso protección: Art. 20 Constitución + art. 19 N°1 o N°9 según el caso
- Prescripción deuda bancaria: Art. 2515, 2518 CC
- Arrendamiento/desalojo: Art. 1° y 3° Ley 18.101 + Art. 1977 CC (no citar 1915-1920 seguidos)
- No pago cotizaciones: Art. 19 DL 3.500 + Ley 17.322 (sin listar arts. 1,2,3 seguidos)
- Garantía consumidor: Art. 3° b), 20 y 23 Ley 19.496 (no citar arts. 2,3,4,5 seguidos)
- Reclamo Isapre: Ley 18.933 art. 38 ter + Art. 19 N°9 Constitución

HECHOS DEL CASO — REGLA CRÍTICA:
Usá SOLO los hechos que figuran en los datos proporcionados. Nunca inventés, ni infierás ni "completés" lo que falta.
PROHIBIDO inventar: fechas concretas no dadas, síntomas/defectos específicos no mencionados, montos no confirmados, declaraciones de la contraparte, resultado de trámites no informados.
Si un hecho falta y es esencial: escribí [DATO PENDIENTE].
Si un hecho falta y no es esencial (ej.: dirección de la contraparte): omití el campo directamente sin avisar.
Ejemplo de error: el cliente dijo "TV llegó rota" → NO escribas "el televisor presentó líneas verticales en la pantalla y apagados repentinos" — esos son hechos inventados.
Ejemplo correcto: "el producto adquirido presentó fallas al momento de su entrega, lo que el suscrito constató al recibirlo."
Si un dato numérico fue dado (sueldo, monto, años), hacé los cálculos que correspondan (indemnizaciones, plazos, etc.).

TEXTO PLANO: prohibido markdown, asteriscos, negritas, HTML, almohadillas.`;

// ─── Perplexity: busca legislación chilena vigente ────────────────────────────
async function searchLeyVigente(tipoDoc: string): Promise<string | null> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return null;

  const query = `Legislación chilena vigente 2025-2026 para redactar "${tipoDoc}": artículos exactos aplicables, procedimiento, requisitos formales. Solo derecho chileno.`;

  try {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'Eres un asistente jurídico especializado en derecho chileno. Responde con los artículos y leyes exactas y vigentes. Sé conciso y preciso.',
          },
          { role: 'user', content: query },
        ],
        max_tokens: 600,
        temperature: 0.1,
        search_recency_filter: 'year',
        return_citations: true,
      }),
    });

    if (!res.ok) {
      console.error('[perplexity] error:', res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const content: string = data.choices?.[0]?.message?.content ?? '';
    if (!content) return null;

    // Adjuntar fuentes si las hay
    const citations: string[] = (data.citations ?? []).slice(0, 3);
    const sources = citations.length > 0 ? `\nFuentes: ${citations.join(' | ')}` : '';

    return content + sources;
  } catch (err) {
    console.error('[perplexity] fetch error:', err);
    return null;
  }
}

// ─── DeepSeek: genera el documento con contexto legal verificado ──────────────
async function callDeepSeek(
  tipo: string,
  datos: Record<string, unknown>,
  marcoLegal: string | null
): Promise<string | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey === 'mock') return null;

  const datosStr = Object.entries(datos)
    .filter(([k]) => !['tipo_documento', 'response_message', 'ready'].includes(k))
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');

  const marcoSection = marcoLegal
    ? `\n\nMARCO LEGAL VIGENTE (verificado con búsqueda web actualizada):\n${marcoLegal}\n\nUSA ESTOS ARTÍCULOS como base — están confirmados como vigentes.`
    : '';

  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM },
          {
            role: 'user',
            content: `Redacta el siguiente documento legal chileno.\n\nFECHA DE HOY: ${new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Santiago' })} — usá esta fecha en el encabezado del documento. NUNCA uses [DIA], [MES] ni placeholders de fecha.\n\nTIPO DE DOCUMENTO: ${tipo}\n\nDATOS DEL CASO:\n${datosStr}${marcoSection}\n\nRedacta el documento completo, profesional y listo para usar. Si falta la dirección de la contraparte, omití ese campo en lugar de poner [DATO PENDIENTE].`,
          },
        ],
        temperature: 0.3,
        max_tokens: 8192,
      }),
    });
    if (!res.ok) { console.error('[deepseek] generate-final error:', res.status); return null; }
    const json = await res.json();
    return json.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    console.error('[deepseek] generate-final error:', err);
    return null;
  }
}

// ─── Mock fallback ────────────────────────────────────────────────────────────
function buildMock(tipo: string, datos: Record<string, unknown>): string {
  const today = new Date().toLocaleDateString('es-CL', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Santiago',
  });
  const nombre    = String(datos.nombre ?? datos.arrendatario ?? datos.trabajador ?? '[NOMBRE]');
  const rut       = String(datos.rut ?? '[RUT]');
  const domicilio = String(datos.direccion ?? datos.domicilio ?? '[DOMICILIO]');
  const dest      = String(datos.destinatario ?? datos.tribunal ?? '[DESTINATARIO]');

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

// ─── Route handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const caseData: Record<string, unknown> = await req.json();
    const tipo = String(caseData.tipo_documento ?? 'documento legal');

    // Buscar legislación vigente en paralelo mientras preparamos datos
    const [marcoLegal] = await Promise.all([
      searchLeyVigente(tipo),
    ]);

    if (marcoLegal) {
      console.log(`[perplexity] marco legal obtenido para "${tipo}" (${marcoLegal.length} chars)`);
    } else {
      console.log(`[perplexity] sin clave o error — generando sin marco legal verificado`);
    }

    const document = await callDeepSeek(tipo, caseData, marcoLegal) ?? buildMock(tipo, caseData);

    return NextResponse.json({ document, marcoLegalUsado: !!marcoLegal });
  } catch (err) {
    console.error('[generate-final] error:', err);
    return NextResponse.json({ error: 'Error generando el documento' }, { status: 500 });
  }
}
