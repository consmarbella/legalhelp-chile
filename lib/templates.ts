// ─────────────────────────────────────────────────────────────────────────────
// BIBLIOTECA DE TEMPLATES LEGALES CHILENOS
// Artículos verificados. LLM rellena [[variables]] con los hechos del caso.
// Para casos sin template → LLM genera libremente (flag usedTemplate: false)
// ─────────────────────────────────────────────────────────────────────────────

export interface LegalTemplate {
  id: string;
  /** Palabras clave para matching automático */
  keywords: string[];
  titulo: string;
  tipo: 'judicial' | 'carta' | 'recurso' | 'administrativo' | 'acuerdo';
  /** Artículos legales verificados */
  articulos: string[];
  /** Esqueleto del documento. [[VARIABLE]] = rellena el LLM. [DATO] = dato del usuario */
  esqueleto: string;
  /** Instrucción al LLM sobre qué rellenar */
  instruccion_llm: string;
  /** Destinatario/tribunal correcto (autoridad). Opcional: si está, manda sobre el modelo. */
  entidad?: string;
}

export const TEMPLATES: LegalTemplate[] = [

  // ── 1. PRESCRIPCIÓN DE DEUDA / MULTA TAG ────────────────────────────────
  {
    id: 'prescripcion-tag',
    keywords: ['tag', 'autopista', 'telepeaje', 'peaje', 'deuda tag', 'prescripcion tag', 'deuda autopista', 'costanera', 'vespucio', 'autopista central', 'multa tag', 'multa de transito tag', 'multa autopista', 'infraccion tag', 'circular sin tag', 'parte por tag', 'multa por no tener tag', 'prescripcion multa tag', 'prescripcion multa', 'prescripcion multa transito', 'multa de transito', 'juzgado policia local', 'prescripcion juzgado policia', 'escrito de prescripcion ante juzgado de policia local', 'prescripcion ante juzgado'],
    titulo: 'Solicitud de prescripción de multa de tránsito por TAG (ante JPL)',
    tipo: 'judicial',
    articulos: ["Art. 24 Ley 18.287 (prescripción de la acción contravencional: 3 años desde la anotación de la multa en el Registro Civil)", "Art. 25 Ley 18.287 (prescripción de la pena: 3 años desde la sentencia ejecutoriada)", "Art. 171 Ley 18.290 Ley de Tránsito (procedimiento por infracciones)"],
    esqueleto: `[CIUDAD], [FECHA]

EN LO PRINCIPAL: Solicita declaración de prescripción de multa(s) de tránsito. OTROSÍ: Acompaña Certificado de Multas No Pagadas.

SEÑOR(A) JUEZ(A) DEL JUZGADO DE POLICÍA LOCAL DE [[COMUNA DEL JPL]]
PRESENTE

[NOMBRE EN MAYÚSCULAS], RUT [RUT], domiciliado en [DIRECCIÓN], propietario inscrito del vehículo patente [[PATENTE]], a US. respetuosamente digo:

I. INDIVIDUALIZACIÓN DE LA(S) INFRACCIÓN(ES)

Según consta en el Certificado de Multas de Tránsito No Pagadas emitido por el Servicio de Registro Civil e Identificación, que se acompaña en el otrosí, registro la(s) siguiente(s) multa(s) de tránsito:

[[LISTAR CADA MULTA: número de parte/infracción, fecha de la anotación en el Registro Civil (o fecha de la infracción si no se conoce la de anotación), tramo o autopista donde ocurrió, y monto si se conoce. Si son varias, listar cada una por separado.]]

II. PRESCRIPCIÓN (ART. 24 LEY 18.287)

El artículo 24 de la Ley 18.287 establece que la acción para perseguir la responsabilidad contravencional prescribe en el plazo de 3 años contados desde que la multa fue anotada en el Registro de Multas de Tránsito No Pagadas del Registro Civil.

En el presente caso, la(s) multa(s) individualizada(s) fue(ron) anotada(s) con fecha [[FECHA(S) DE ANOTACIÓN]], habiendo transcurrido con exceso el plazo de 3 años sin que se haya notificado sentencia condenatoria ni se haya ejecutado cobro alguno.

III. PETICIÓN

POR TANTO,

RUEGO A US.: Declarar prescrita(s) la(s) multa(s) de tránsito individualizada(s) en el acápite I, ordenar su eliminación del Registro de Multas de Tránsito No Pagadas del Registro Civil y oficiar a la Dirección de Tránsito correspondiente para que proceda a la cancelación de la(s) anotación(es), permitiendo la obtención del permiso de circulación.

OTROSÍ: Acompaño Certificado de Multas de Tránsito No Pagadas emitido por el Servicio de Registro Civil e Identificación, que acredita la existencia y antigüedad de la(s) multa(s) referida(s).

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: 'MULTAS DE TRÁNSITO ante Juzgado de Policía Local. El solicitante debe ser el PROPIETARIO INSCRITO del vehículo. PEDIR: patente, comuna del JPL donde se cursó la infracción, fechas de cada multa. El plazo de 3 años corre desde la ANOTACIÓN en el Registro Civil. Si el cliente no tiene las fechas de anotación, indicarle que saque el Certificado de Multas No Pagadas en www.registrocivil.cl. Si las multas tienen MENOS de 3 años, NO generar — informar que aún no prescribe y sugerir convenio de pago al 20% en su municipalidad. Si el cliente solo tiene DEUDA DE PEAJE (cobros de la autopista, no multas del JPL), informarle que esa deuda prescribe sola en 5 años, no requiere documento legal, y puede simplemente negociar directo con la concesionaria un pago parcial.',
  },

  // ── 2. PRESCRIPCIÓN DE DEUDA GENERAL (Banco, retail, etc.) ──────────────
  {
    id: 'prescripcion-deuda',
    keywords: ['deuda prescrita', 'deuda', 'banco', 'retail', 'tienda', 'credito', 'morosidad', 'dicom', 'prescripcion bancaria', 'prescripcion deuda bancaria'],
    titulo: 'Carta de prescripción de deuda general',
    tipo: 'carta',
    articulos: ['Art. 2514 Código Civil', 'Art. 2515 Código Civil', 'Ley 19.628 sobre Protección de la Vida Privada (datos morosos)'],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYÚSCULAS]
PRESENTE

[NOMBRE EN MAYÚSCULAS], RUT [RUT], domiciliado en [DIRECCIÓN], me dirijo a Ud. para hacer valer la prescripción extintiva de la deuda que me atribuye.

I. ANTECEDENTES

[[DESCRIBIR: naturaleza de la deuda, institución, monto aproximado, período]]

II. FUNDAMENTO LEGAL

Conforme al artículo 2514 del Código Civil, la acción para cobrar obligaciones ordinarias prescribe en cinco años desde que la obligación se hizo exigible. La deuda reclamada data de [[PERÍODO]], habiéndose cumplido en exceso dicho plazo.

Adicionalmente, el artículo 17 de la Ley N° 19.628 sobre Protección de la Vida Privada establece que los datos sobre obligaciones económicas de carácter comercial o bancario solo pueden comunicarse durante cinco años desde que la obligación se hizo exigible, plazo ya vencido.

III. PETICIÓN

Solicito: (1) declarar la prescripción de la obligación; (2) abstenerse de efectuar cualquier gestión de cobro; (3) eliminar mis datos de los registros de morosidad (DICOM u otros) en el plazo de 72 horas.

En caso de persistir en el cobro, me reservo el derecho de ejercer las acciones legales correspondientes ante el SERNAC y los tribunales competentes.

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: 'Rellena [[DESCRIBIR]] con los datos del caso. [[PERÍODO]] con el período de la deuda. Ajusta el tono si la deuda es reciente (menos de 5 años) para indicar que se solicita información o plan de pago en vez de prescripción.',
  },

  // ── 3. RECLAMO SERNAC ───────────────────────────────────────────────────
  {
    id: 'reclamo-sernac',
    keywords: ['sernac', 'consumidor', 'cobro indebido', 'publicidad engañosa', 'derecho del consumidor', 'reclamo a empresa'],
    titulo: 'Reclamo ante SERNAC / empresa',
    tipo: 'carta',
    articulos: ['Art. 3 Ley 19.496 (derechos del consumidor)', 'Art. 19 Ley 19.496 (garantía legal 3 meses)', 'Art. 23 Ley 19.496 (infracciones del proveedor)'],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYÚSCULAS]
PRESENTE

[NOMBRE EN MAYÚSCULAS], RUT [RUT], domiciliado en [DIRECCIÓN], en calidad de consumidor, interpone el presente reclamo en virtud de la Ley N° 19.496 sobre Protección de los Derechos de los Consumidores.

I. HECHOS

[[DESCRIBIR: qué producto o servicio, cuándo se contrató/compró, qué ocurrió, qué gestiones previas se hicieron]]

II. DERECHOS VULNERADOS

Lo anterior infringe los siguientes derechos consagrados en la Ley N° 19.496:

El artículo 3 letra b) garantiza el derecho a una información veraz y oportuna. El artículo 19 establece una garantía legal mínima de tres meses para bienes de consumo. El artículo 23 sanciona al proveedor que cause daño al consumidor por negligencia o incumplimiento contractual.

III. PETICIÓN CONCRETA

[[DESCRIBIR LA PETICIÓN: reembolso, cambio, reparación, indemnización, término de contrato]]

Se fija un plazo de 10 días hábiles para dar respuesta satisfactoria, vencido el cual se presentará denuncia formal ante el SERNAC y se ejercerán las acciones legales pertinentes.

[NOMBRE]
RUT: [RUT]
Correo de contacto: [[CORREO SI LO TIENE]]`,
    instruccion_llm: 'Rellena [[DESCRIBIR]] los hechos concretos del caso. La petición debe ser específica (monto de reembolso, tipo de reparación, etc.). Si no hay correo, omite esa línea.',
  },

  // ── 4. FINIQUITO LABORAL ────────────────────────────────────────────────
  // 4a. Finiquito laboral ESTÁNDAR (bilateral: lo firman trabajador y empleador).
  //     Es el match por defecto para "necesito un finiquito".
  {
    id: 'finiquito-estandar',
    keywords: ['finiquito', 'finiquito laboral', 'finiquito de trabajo', 'fin de obra', 'termino de relacion laboral', 'finiquito de mutuo acuerdo'],
    titulo: 'Finiquito laboral',
    tipo: 'acuerdo',
    articulos: [
      'Art. 177 del Código del Trabajo (ratificación del finiquito ante ministro de fe)',
      'Art. 163 del Código del Trabajo (indemnización por años de servicio)',
      'Art. 73 del Código del Trabajo (feriado proporcional)',
    ],
    esqueleto: `FINIQUITO

En [CIUDAD], a [FECHA], comparecen: por una parte [DESTINATARIO], en adelante "el empleador"; y por la otra, [NOMBRE EN MAYÚSCULAS], cédula de identidad N° [RUT], domiciliado en [DIRECCIÓN], en adelante "el trabajador". Ambas partes dejan constancia del término de la relación laboral y se otorgan el más amplio finiquito en los siguientes términos:

PRIMERO: El trabajador se desempeñó como [[CARGO]] para el empleador desde el [[FECHA DE INICIO]] hasta el [[FECHA DE TÉRMINO]], fecha en que la relación laboral terminó por la causal de [[CAUSAL DE TÉRMINO (indicar numeral del Art. 159, 160 o 161 del Codigo del Trabajo)]].

SEGUNDO: El empleador paga en este acto al trabajador la suma total de $[[MONTO TOTAL]], correspondiente al siguiente desglose:
  a) Remuneracion pendiente (dias trabajados en el ultimo mes): $[[MONTO O "_____"]]
  b) Feriado proporcional (Art. 73 CT): $[[MONTO O "_____"]]
  c) Gratificacion proporcional: $[[MONTO O "_____"]]
  d) Indemnizacion por anos de servicio (Art. 163 CT): $[[MONTO O "_____"]]
  e) Indemnizacion sustitutiva del aviso previo (Art. 161 CT): $[[MONTO O "_____"]]
  f) Otros conceptos: [[DETALLAR SI CORRESPONDE]]

TERCERO: El trabajador declara recibir conforme las sumas señaladas y otorga al empleador el mas amplio, completo y total finiquito, declarando que nada se le adeuda por concepto alguno derivado de la relacion laboral ni de su termino.

CUARTO: El presente finiquito se firma en señal de conformidad y debera ratificarse ante Ministro de Fe (Notario Publico o Inspector del Trabajo), conforme al articulo 177 del Codigo del Trabajo.

QUINTO: El empleador declara que las cotizaciones previsionales se encuentran al dia, acreditando con certificado de la respectiva AFP e Isapre/Fonasa, conforme al articulo 162 inciso 5 del Codigo del Trabajo. Se adjunta certificado de cotizaciones previsionales.


_____________________________            _____________________________
[NOMBRE]                                  [DESTINATARIO]
Trabajador — RUT [RUT]                    Empleador


_____________________________
MINISTRO DE FE
(Notario Publico / Inspector del Trabajo)
Timbre y firma`,
    instruccion_llm: 'Documento BILATERAL de finiquito laboral (lo firman trabajador y empleador). NO uses formato de escrito judicial (sin "EN LO PRINCIPAL", "RUEGO A US." ni "PRESENTE"). OBLIGATORIO: desglosar TODOS los conceptos pagados por separado (remuneracion pendiente, feriado proporcional, gratificacion, indemnizacion anos servicio, indemnizacion aviso previo). Si el empleador no informa montos, dejar $_____ para cada item. Incluir siempre la clausula de cotizaciones al dia (QUINTO). NO asumas que al trabajador se le adeuda algo: este es el finiquito de termino normal, no una demanda ni un reclamo.',
  },
  // 4b. Cobro de finiquito: carta para RECLAMAR prestaciones NO pagadas.
  {
    id: 'finiquito-cobro',
    keywords: ['cobro de finiquito', 'reclamar finiquito', 'reclamo de finiquito', 'finiquito impago', 'no me pagaron el finiquito', 'no me han pagado el finiquito', 'me deben el finiquito', 'cobrar finiquito', 'finiquito no pagado'],
    titulo: 'Cobro de finiquito y prestaciones laborales',
    tipo: 'carta',
    articulos: ['Art. 162 Código del Trabajo (finiquito y cotizaciones previas)', 'Art. 163 Código del Trabajo (indemnización por años de servicio)', 'Art. 171 Código del Trabajo (despido indirecto)', 'Art. 168 Código del Trabajo (recargo 30% a 100% por despido injustificado)', 'Art. 169 Código del Trabajo (plazo 60 días hábiles para demandar)'],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYÚSCULAS]
PRESENTE

[NOMBRE EN MAYÚSCULAS], RUT [RUT], ex trabajador de esa empresa, por medio del presente instrumento requiero el pago íntegro de las prestaciones laborales adeudadas.

I. ANTECEDENTES

[[DESCRIBIR: cargo, fecha de inicio, fecha de término, causal de despido, si hay cotizaciones impagas, montos aproximados]]

II. FUNDAMENTO LEGAL

El artículo 162 del Código del Trabajo establece que el empleador solo puede poner término al contrato si acredita el pago de las cotizaciones previsionales. Si existen cotizaciones impagas, el despido es ineficaz y el empleador debe seguir pagando remuneraciones hasta regularizar (Ley Bustos, Art. 162 incisos 5 a 7 CT: nulidad del despido por cotizaciones impagas, el empleador debe continuar pagando remuneraciones y cotizaciones hasta la convalidacion del despido).

El artículo 163 establece el derecho a indemnización por años de servicio equivalente a 30 días de la última remuneración mensual por cada año trabajado.

El artículo 168 establece que si el despido es declarado injustificado, procede un recargo del 30% (causal Art. 161), 50% (Art. 159 N°4-6) o 100% (Art. 160) sobre la indemnización por años de servicio.

El artículo 169 establece un plazo de 60 días hábiles desde la separación para demandar ante el Juzgado del Trabajo.

[[SI CORRESPONDE: artículo 171 para autodespido/despido indirecto]]

III. PETICIÓN

Solicito el pago en el plazo de 5 días hábiles de: [[LISTAR PRESTACIONES: finiquito, cotizaciones impagas, indemnización por años de servicio, feriado proporcional, etc.]]

De no recibir respuesta favorable, concurriré a la Inspección del Trabajo y/o presentaré demanda ante el Juzgado del Trabajo, solicitando además el recargo legal del 50% o 100% según corresponda.

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: 'Rellena los hechos laborales especificos. Calcular las prestaciones adeudadas: indemnizacion anos servicio (Art. 163), indemnizacion sustitutiva aviso previo (30 dias, Art. 161 inc. 2), feriado proporcional (Art. 73), cotizaciones impagas si las hay. Si hay cotizaciones impagas, invocar Ley Bustos (Art. 162 inc. 5-7 CT: nulidad del despido). Incluye o excluye el Art. 171 segun si el trabajador renuncio por incumplimiento del empleador. Recordar: plazo para demandar es 60 dias habiles (Art. 169 CT).',
  },

  // ── 5. AUTORIZACIÓN LICENCIA CONDUCIR (DEUDA ALIMENTOS) ─────────────────
  {
    id: 'licencia-alimentos',
    keywords: ['licencia de conducir', 'licencia', 'conducir', 'uber', 'taxi', 'deuda alimenticia', 'suspension licencia', 'retencion licencia'],
    titulo: 'Solicitud judicial de autorización para obtener licencia de conducir',
    tipo: 'judicial',
    entidad: 'Juzgado de Familia donde se tramita la causa de alimentos',
    articulos: ['Art. 14 Ley 14.908 (autorización judicial de licencia a deudor alimentario)', 'Art. 19 N°16 CPR (libertad de trabajo)', 'Art. 3 Ley 14.908 (medidas de apremio proporcionales)'],
    esqueleto: `[CIUDAD], [FECHA]

EN LO PRINCIPAL: Solicita autorización para obtener licencia de conducir.

[DESTINATARIO EN MAYÚSCULAS]
[RIT/RUC SI LO TIENE]
PRESENTE

[NOMBRE EN MAYÚSCULAS], RUT [RUT], domiciliado en [DIRECCIÓN], en los autos sobre pensión de alimentos seguidos en este Tribunal, a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR: situación laboral (Uber/taxi/repartidor), cómo la falta de licencia impide trabajar, monto de la deuda alimenticia, compromiso de pago]]

La imposibilidad de obtener o renovar la licencia de conducir ha generado un círculo vicioso: sin licencia no puedo generar ingresos, y sin ingresos no puedo cumplir con la obligación alimenticia, perjudicando en definitiva al propio alimentario.

II. FUNDAMENTO LEGAL

El artículo 14 de la Ley N° 14.908 faculta a este Tribunal para autorizar excepcionalmente la obtención de licencia de conducir cuando se acredita que dicho documento es indispensable para el sustento del alimentante y el cumplimiento de la pensión.

El artículo 19 N° 16 de la Constitución Política de la República garantiza la libertad de trabajo, derecho que no puede ser restringido si ello impide precisamente el cumplimiento de la obligación que motivó la medida.

El artículo 3 de la Ley N° 14.908 establece que las medidas de apremio deben ser proporcionales y no pueden tornarse contraproducentes para el alimentario.

III. PETICIÓN

POR TANTO,

RUEGO A US.: Tener por presentada esta solicitud y, en definitiva, autorizar a [NOMBRE] para obtener/renovar licencia de conducir clase [[CLASE]], por ser indispensable para su actividad laboral, oficiar al Registro Civil para proceder a su emisión, bajo el compromiso de destinar el [[PORCENTAJE]] de sus ingresos mensuales al pago de la pensión adeudada y futura.

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: 'Rellena con los hechos del cliente. [[CLASE]] = tipo de licencia (B, C, D). [[PORCENTAJE]] = 30-50% según lo que ofrezca el cliente. Si no menciona porcentaje, usa 30%. Incluir RIT/RUC si el cliente los proporcionó.',
  },

  // ── 6. PODER SIMPLE ─────────────────────────────────────────────────────
  {
    id: 'poder-simple',
    keywords: ['poder', 'mandato', 'autorización', 'representar', 'apoderado', 'poder simple', 'poder especial'],
    titulo: 'Poder simple / mandato especial',
    tipo: 'acuerdo',
    articulos: ['Art. 2116 Código Civil (contrato de mandato)', 'Art. 2132 Código Civil (mandato especial)', 'Art. 7 CPC (facultades del mandato judicial)', 'Art. 1801 Código Civil (solemnidades en compraventa de inmuebles - requiere escritura pública)'],
    esqueleto: `[CIUDAD], [FECHA]

PODER ESPECIAL

Yo, [NOMBRE EN MAYÚSCULAS], RUT [RUT], domiciliado en [DIRECCIÓN], por medio del presente instrumento otorgo poder especial a:

[DESTINATARIO EN MAYÚSCULAS], [[RUT DEL APODERADO]], domiciliado en [[DIRECCIÓN DEL APODERADO]],

para que en mi nombre y representación [[DESCRIBIR EL ACTO ESPECÍFICO PARA EL QUE SE OTORGA EL PODER]].

Las facultades que se otorgan incluyen: [[LISTAR FACULTADES ESPECÍFICAS]].

Este poder [[TIENE / NO TIENE]] facultad de delegar y se otorga [[CON / SIN]] responsabilidad solidaria.

El presente poder tendrá vigencia [[PERÍODO O "hasta que sea revocado expresamente"]].

NOTA IMPORTANTE: Si el poder es para celebrar actos solemnes (compraventa de inmuebles, constitucion de hipoteca, cancelacion de hipoteca, constitucion de sociedades, etc.), este documento DEBE otorgarse por escritura publica ante Notario, conforme al Art. 1801 del Codigo Civil. Un poder simple NO es suficiente para dichos actos.

Para constancia, firma el poderdante:

_________________________________
[NOMBRE]
RUT: [RUT]
Domicilio: [DIRECCIÓN]`,
    instruccion_llm: 'Rellena el acto especifico, facultades y periodo. Si el poder es para cobrar, incluir facultad de recibir y dar recibo. Si es para juicio, incluir facultades del Art. 7 CPC. ADVERTENCIA CRITICA: Si el usuario necesita el poder para actos solemnes (compraventa de inmuebles, hipoteca, constitucion de sociedades), informar que REQUIERE escritura publica ante Notario per Art. 1801 CC - un poder simple NO sirve para esos actos. Ajusta segun los hechos del caso.',
  },

  // ── 7. RECURSO DE REPOSICIÓN (MULTA TRÁNSITO / MUNICIPALIDAD) ───────────
  {
    id: 'recurso-reposicion-multa',
    keywords: ['reposición', 'reposicion', 'multa tránsito', 'infracción', 'carabineros', 'municipalidad', 'juzgado policía local'],
    titulo: 'Recurso de reposición ante Juzgado de Policía Local',
    tipo: 'recurso',
    articulos: ['Art. 19 Ley 18.287 (recurso de reposición ante JPL)', 'Art. 171 Ley 18.290 (infracciones de tránsito)', 'Art. 19 N°3 CPR (debido proceso)'],
    esqueleto: `[CIUDAD], [FECHA]

EN LO PRINCIPAL: Interpone recurso de reposición. EN EL OTROSÍ: Solicita suspensión.

SEÑOR JUEZ DEL JUZGADO DE POLICÍA LOCAL DE [CIUDAD]
PRESENTE

[NOMBRE EN MAYÚSCULAS], RUT [RUT], domiciliado en [DIRECCIÓN], en los autos sobre infracción de tránsito Rol N° [[ROL]], a US. respetuosamente digo:

I. ANTECEDENTES

[[DESCRIBIR: qué infracción, cuándo, dónde, por qué es errónea o injusta la multa]]

II. FUNDAMENTO DEL RECURSO

[[ARGUMENTO PRINCIPAL: error de identificación del vehículo, señalética inexistente, emergencia justificada, error en la parte, etc.]]

El artículo 19 N° 3 de la Constitución garantiza el derecho al debido proceso e impugnación de las resoluciones que afecten derechos.

III. PETICIÓN

POR TANTO, interpongo recurso de reposición en contra de la multa cursada y RUEGO A US.: acoger el presente recurso, dejar sin efecto la multa impuesta y archivar los antecedentes.

EN EL OTROSÍ: Solicito suspender el cobro de la multa mientras se resuelve el presente recurso.

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: 'Rellena [[ROL]] si el cliente lo tiene. Argumenta según los hechos específicos. Si no tiene el número de rol, omite esa línea y usa "en los autos sobre infracción de tránsito de fecha [fecha]".',
  },

  // ── 8. RECURSO DE PROTECCIÓN ────────────────────────────────────────────
  {
    id: 'recurso-proteccion',
    keywords: ['protección', 'proteccion', 'recurso de protección', 'derechos fundamentales', 'amparo', 'acto arbitrario', 'ilegal'],
    titulo: 'Recurso de protección',
    tipo: 'recurso',
    articulos: ['Art. 20 CPR (recurso de protección)', 'Auto Acordado Corte Suprema sobre Recurso de Protección (1992)', 'Art. 19 CPR (garantías constitucionales afectadas)'],
    esqueleto: `[CIUDAD], [FECHA]

EN LO PRINCIPAL: Recurso de protección. PRIMER OTROSÍ: Medida cautelar urgente.

ILUSTRÍSIMA CORTE DE APELACIONES DE [CIUDAD]
PRESENTE

[NOMBRE EN MAYÚSCULAS], RUT [RUT], domiciliado en [DIRECCIÓN], deduce recurso de protección en contra de [[RECURRIDO: institución o persona que realiza el acto]], con domicilio en [[DIRECCIÓN DEL RECURRIDO]], por los hechos que a continuación se exponen.

I. ACTO U OMISIÓN RECURRIDA

[[DESCRIBIR: qué hizo o dejó de hacer el recurrido, cuándo, cómo afecta al recurrente]]

II. GARANTÍAS CONSTITUCIONALES AFECTADAS

El acto descrito vulnera [[INDICAR GARANTÍA]] consagrada en el artículo 19 N° [[NÚMERO]] de la Constitución Política de la República, que garantiza [[DESCRIPCIÓN DE LA GARANTÍA]].

III. PETICIÓN

POR TANTO, y de conformidad con el artículo 20 de la Constitución Política de la República,

RUEGO A US.I.: Tener por interpuesto el presente recurso de protección, ordenar a [[RECURRIDO]] [[ACCIÓN QUE SE SOLICITA]] y, en definitiva, restablecer el imperio del derecho y asegurar la debida protección de mis derechos vulnerados.

PRIMER OTROSÍ: Solicito decretar como medida cautelar urgente la suspensión inmediata del acto recurrido mientras se tramita el presente recurso.

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: 'Identifica la garantía constitucional afectada (Art. 19 N°2 igualdad, N°1 vida, N°9 salud, N°16 trabajo, N°21 actividad económica, N°24 propiedad). Argumenta el acto arbitrario e ilegal. Sé específico en la petición cautelar.',
  },

  // ── 9. RECLAMO SERVICIOS BÁSICOS (Agua, Luz, Gas) ───────────────────────
  {
    id: 'reclamo-servicios-basicos',
    keywords: ['agua', 'luz', 'eléctrica', 'electrica', 'gas', 'corte', 'servicio básico', 'movistar', 'entel', 'vtr', 'claro', 'internet', 'cobro', 'factura'],
    titulo: 'Reclamo ante empresa de servicios básicos',
    tipo: 'carta',
    articulos: ['Art. 3 Ley 19.496 (derechos del consumidor)', 'Art. 25 Ley 19.496 (servicios deficientes)', 'Ley 18.410 (Superintendencia de Electricidad y Combustibles) o DFL 382 (agua potable) según corresponda'],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYÚSCULAS]
DEPARTAMENTO DE ATENCIÓN AL CLIENTE
PRESENTE

[NOMBRE EN MAYÚSCULAS], RUT [RUT], cliente N° [[NÚMERO DE CLIENTE SI LO TIENE]], domiciliado en [DIRECCIÓN], interpone reclamo formal en contra de esa empresa.

I. ANTECEDENTES

[[DESCRIBIR: qué servicio, qué problema (corte, cobro excesivo, falla técnica), desde cuándo, gestiones previas realizadas (llamados, tickets)]]

II. FUNDAMENTO LEGAL

El artículo 25 de la Ley N° 19.496 establece el derecho a recibir el servicio en las condiciones contratadas. [[AGREGAR LEY SECTORIAL SEGÚN TIPO: Ley 18.410 para electricidad/gas, DFL 382 para agua potable, Ley General de Telecomunicaciones para telefonía/internet]].

III. PETICIÓN

Solicito en el plazo de 5 días hábiles: [[PETICIÓN ESPECÍFICA: restablecimiento del servicio, corrección de factura, indemnización por daños, compensación]]

En caso de no obtener respuesta satisfactoria, presentaré reclamo ante la Superintendencia correspondiente y el SERNAC, reservándome el derecho a ejercer acciones legales.

[NOMBRE]
RUT: [RUT]
Teléfono de contacto: [[TELÉFONO]]`,
    instruccion_llm: 'Identifica el tipo de servicio e incluye la ley sectorial correcta. Si no hay número de cliente, omite esa línea. Si no hay teléfono, omite esa línea.',
  },

  // ── 10. DESAHUCIO / TÉRMINO DE ARRIENDO ─────────────────────────────────
  {
    id: 'desahucio-arrendamiento',
    keywords: ['desahucio', 'termino de arriendo', 'terminar arriendo', 'terminar contrato de arriendo', 'arriendo', 'arrendamiento', 'contrato de arriendo', 'arrendador', 'arrendatario', 'restituir', 'restitución', 'devolver propiedad'],
    titulo: 'Carta de desahucio / término de contrato de arrendamiento',
    tipo: 'carta',
    articulos: ['Art. 3 Ley 18.101 (desahucio con aviso previo de 2 meses)', 'Art. 10 Ley 18.101 (término por no pago)', 'Art. 1977 Código Civil (mora del arrendatario)'],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYÚSCULAS]
PRESENTE

[NOMBRE EN MAYÚSCULAS], RUT [RUT], en calidad de [[ARRENDADOR / ARRENDATARIO]] del inmueble ubicado en [[DIRECCIÓN DEL INMUEBLE]], por medio de la presente carta certificada procede al desahucio del referido contrato de arrendamiento.

I. ANTECEDENTES

[[DESCRIBIR: contrato verbal o escrito, fecha de inicio, monto del arriendo, causal de término]]

II. FUNDAMENTO LEGAL

[[SI ES ARRENDADOR]]: Conforme al artículo 3 de la Ley N° 18.101, el arrendador puede desahuciar el contrato de arrendamiento de inmuebles urbanos mediante aviso previo de dos meses. [[SI HAY MORA]]: El artículo 10 permite el término por no pago de dos o más períodos consecutivos de renta.

[[SI ES ARRENDATARIO]]: Conforme al artículo 3 de la Ley N° 18.101, el arrendatario puede poner término al contrato dando aviso con al menos dos meses de anticipación.

III. NOTIFICACIÓN

Por el presente instrumento, notifico formalmente el término del contrato de arrendamiento, fijando como fecha de restitución del inmueble el día [[FECHA DE TÉRMINO]].

AVISO LEGAL: La presente carta debe ser notificada por NOTARIO PUBLICO o JUDICIALMENTE para producir efectos legales conforme al Art. 3 de la Ley 18.101 sobre arrendamiento de predios urbanos. Sin dicha notificacion formal, este desahucio NO surte efectos.

Se solicita la entrega del inmueble en las mismas condiciones en que fue recibido, con todos sus servicios básicos al día.

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: 'Determina si es arrendador o arrendatario segun los hechos. Calcula la fecha de termino (2 meses desde hoy si es desahucio normal). Si hay deuda, incluir monto. IMPORTANTE: Para inmuebles urbanos bajo Ley 18.101, el desahucio debe ser notificado judicialmente o por notario para ser valido (Art. 3 inc. 2 Ley 18.101). Una simple carta sin notificacion formal NO produce efectos legales. Instruir al usuario que debe enviar esta carta por notario o solicitar notificacion judicial.',
  },

  // ── 11. SOLICITUD VISITAS / RELACIÓN DIRECTA (FAMILIA) ──────────────────
  {
    id: 'solicitud-visitas',
    keywords: ['visitas', 'tuición', 'tuicion', 'custodia', 'régimen', 'relación directa', 'padre', 'madre', 'hijo', 'menor'],
    titulo: 'Solicitud de régimen de visitas o relación directa y regular',
    tipo: 'judicial',
    articulos: ['Art. 229 Código Civil (derecho-deber de relación directa)', 'Art. 225 Código Civil (cuidado personal)', 'Art. 3 Ley 19.968 (interés superior del niño)'],
    esqueleto: `[CIUDAD], [FECHA]

EN LO PRINCIPAL: Solicita régimen de relación directa y regular.

SEÑOR JUEZ DEL JUZGADO DE FAMILIA DE [CIUDAD]
PRESENTE

[NOMBRE EN MAYÚSCULAS], RUT [RUT], domiciliado en [DIRECCIÓN], a US. respetuosamente digo:

I. ANTECEDENTES

[[DESCRIBIR: datos del menor (nombre, edad), situación actual (quién tiene el cuidado), motivo de la solicitud, propuesta de régimen de visitas]]

II. FUNDAMENTO LEGAL

El artículo 229 del Código Civil consagra el derecho-deber del padre o madre que no tenga el cuidado personal de mantener una relación directa y regular con sus hijos, para lo cual el juez debe establecer la modalidad que favorezca su pleno desarrollo.

El artículo 3 de la Ley N° 19.968 sobre Tribunales de Familia establece que el interés superior del niño es el principio rector en toda decisión que le afecte.

III. PETICIÓN

POR TANTO,

RUEGO A US.: Fijar un régimen de relación directa y regular que permita al solicitante mantener contacto regular con el menor [[NOMBRE DEL MENOR]], proponiéndose el siguiente régimen: [[PROPUESTA CONCRETA DE VISITAS]].

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: 'Rellena los datos del menor. Propone un régimen razonable si el cliente no especificó (fines de semana alternos, festivos, vacaciones). Adapta según si el solicitante es padre o madre.',
  },

  // ── 12. COBRO DE HONORARIOS PROFESIONALES ───────────────────────────────
  {
    id: 'cobro-honorarios',
    keywords: ['honorarios', 'honorario', 'servicios profesionales', 'boleta', 'pago pendiente', 'factura impaga', 'cobro'],
    titulo: 'Carta de cobro de honorarios profesionales',
    tipo: 'carta',
    articulos: ['Art. 2116 Código Civil (contrato de servicios)', 'Art. 2158 Código Civil (obligaciones del mandante)', 'Art. 1552 Código Civil (mora del deudor)'],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYÚSCULAS]
PRESENTE

[NOMBRE EN MAYÚSCULAS], RUT [RUT], en mi calidad de [[PROFESIÓN]], me dirijo a Ud. para requerir el pago de los honorarios profesionales adeudados.

I. ANTECEDENTES

[[DESCRIBIR: servicio prestado, período, monto adeudado, documentos que respaldan (boletas, contratos), gestiones de cobro previas]]

II. FUNDAMENTO LEGAL

El artículo 2158 del Código Civil establece la obligación del mandante de pagar la remuneración estipulada. Conforme al artículo 1552 del mismo cuerpo legal, el deudor se encuentra en mora desde el vencimiento del plazo pactado.

III. PETICIÓN

Requiero el pago de la suma de $[[MONTO]] en el plazo de 5 días hábiles desde la recepción de esta carta.

Vencido dicho plazo sin pago, ejerceré las acciones civiles y tributarias que correspondan, con costas.

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: 'Rellena la profesión, monto, período y descripción del servicio. Si no hay monto exacto, indica "a convenir según lo pactado". Ajusta el tono según urgencia.',
  },

  // ── 13. SOLICITUD INFORMACIÓN PÚBLICA (Ley de Transparencia) ────────────
  {
    id: 'solicitud-transparencia',
    keywords: ['transparencia', 'información pública', 'acceso información', 'CPLT', 'municipio', 'servicio público', 'organismo público'],
    titulo: 'Solicitud de acceso a información pública',
    tipo: 'administrativo',
    articulos: ['Art. 10 Ley 20.285 (derecho de acceso a información)', 'Art. 12 Ley 20.285 (requisitos de la solicitud)', 'Art. 14 Ley 20.285 (plazo de respuesta: 20 días hábiles)'],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYÚSCULAS]
JEFE DE SERVICIO / UNIDAD DE TRANSPARENCIA
PRESENTE

[NOMBRE EN MAYÚSCULAS], RUT [RUT], domiciliado en [DIRECCIÓN], correo electrónico [[EMAIL]], en virtud de lo dispuesto en la Ley N° 20.285 sobre Acceso a la Información Pública, solicita la siguiente información:

I. INFORMACIÓN SOLICITADA

[[DESCRIBIR CON PRECISIÓN: qué documentos, contratos, actas, datos, resoluciones o información se solicita, período, área]]

II. FUNDAMENTO

El artículo 10 de la Ley N° 20.285 reconoce el derecho de toda persona a solicitar y recibir información de los órganos de la Administración del Estado, dentro del plazo de 20 días hábiles establecido en el artículo 14.

III. FORMATO DE RESPUESTA

Solicito que la información sea entregada en formato [[DIGITAL/PAPEL]], al correo electrónico indicado o al domicilio señalado.

[NOMBRE]
RUT: [RUT]
Correo: [[EMAIL]]`,
    instruccion_llm: 'Sé muy específico en la información solicitada (documentos concretos, períodos exactos). Si no hay email, omite esa línea e indica solo dirección postal.',
  },



  // ── Demanda laboral por no pago de cotizaciones previsionales (SCRAPEADO) ──
  {
    id: 'demanda-laboral-por-no-pago-de-cotizacio',
    keywords: ["no pago de cotizaciones", "no pago cotizaciones", "cotizaciones impagas", "cotizaciones previsionales", "cotizaciones", "previsión", "AFP", "imposiciones"],
    titulo: "Demanda laboral por no pago de cotizaciones previsionales",
    tipo: 'judicial',
    articulos: ["Art. 162 inc. 5 Código del Trabajo (Ley Bustos: nulidad del despido por cotizaciones impagas)", "Art. 162 inc. 7 Código del Trabajo (obligación de pagar remuneraciones hasta convalidar despido)", "Art. 19 Ley 17.322 (acción judicial para cobro de cotizaciones)", "Art. 58 Código del Trabajo (descuento obligatorio de cotizaciones)"],
    esqueleto: `[CIUDAD], [FECHA]

EN LO PRINCIPAL: Demanda de nulidad del despido por cotizaciones impagas (Ley Bustos). PRIMER OTROSI: Cobro de cotizaciones previsionales. SEGUNDO OTROSI: Acompana documentos.

SEÑOR JUEZ DEL JUZGADO DE LETRAS DEL TRABAJO DE [CIUDAD]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. INDIVIDUALIZACION DE LAS PARTES

Demandante: [NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION].
Demandado (empleador): [[RAZON SOCIAL O NOMBRE DEL EMPLEADOR, RUT, DOMICILIO]].

II. RELACION LABORAL

Cargo: [[CARGO DESEMPENADO]].
Fecha de inicio: [[FECHA DE INICIO DE LA RELACION LABORAL]].
Fecha de despido: [[FECHA DEL DESPIDO]].
Remuneracion mensual: [[MONTO DE LA ULTIMA REMUNERACION BRUTA]].
AFP del trabajador: [[NOMBRE DE LA AFP]].
Isapre o Fonasa: [[ISAPRE (indicar cual) O FONASA]].

III. PERIODO DE COTIZACIONES IMPAGAS

Periodo impago: desde [[MES/ANO INICIO]] hasta [[MES/ANO TERMINO]].
Certificado de lagunas previsionales: [[INDICAR SI SE ACOMPANA CERTIFICADO DE LA AFP O AFC QUE ACREDITE LAS LAGUNAS]].
Monto estimado de cotizaciones adeudadas: [[MONTO APROXIMADO O INDICAR "segun certificado adjunto"]].

IV. NULIDAD DEL DESPIDO (LEY BUSTOS - Art. 162 inc. 5 CT)

El despido comunicado con fecha [[FECHA]] es NULO por cuanto el empleador no se encontraba al dia en el pago de cotizaciones previsionales al momento de despedir, conforme al Art. 162 inc. 5 del Codigo del Trabajo.

Efecto: el empleador debe seguir pagando las remuneraciones y demas prestaciones desde la fecha del despido hasta la convalidacion (pago integro de cotizaciones adeudadas).

V. DERECHO

Art. 162 inc. 5 CT: el despido no produce efecto si el empleador adeuda cotizaciones previsionales.
Art. 162 inc. 7 CT: obligacion de pagar remuneraciones hasta convalidar.
Art. 19 Ley 17.322: accion de cobro de cotizaciones previsionales.

POR TANTO,

RUEGO A US.: (1) declarar la nulidad del despido; (2) condenar al demandado al pago de todas las remuneraciones y prestaciones desde la fecha del despido hasta la convalidacion; (3) condenar al pago integro de las cotizaciones previsionales adeudadas con los reajustes e intereses legales.

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta la demanda de nulidad del despido por cotizaciones impagas (Ley Bustos). IMPORTANTE: (1) individualizar AFP/Isapre del trabajador; (2) detallar el periodo de cotizaciones impagas con meses exactos; (3) mencionar si se acompana certificado de lagunas previsionales de la AFP/AFC; (4) invocar Art. 162 inc. 5 CT para la nulidad; (5) solicitar remuneraciones desde el despido hasta la convalidacion. Si el trabajador NO fue despedido, la accion correcta es solo cobro de cotizaciones (Art. 19 Ley 17.322), no nulidad del despido.`,
  },

  // ── Oposición a cobro ejecutivo / demanda ejecutiva (SCRAPEADO) ──
  {
    id: 'oposici-n-a-cobro-ejecutivo-demanda-ejec',
    keywords: ["demanda ejecutiva", "cobranza judicial", "título ejecutivo", "oposición", "excepción"],
    titulo: "Oposición a cobro ejecutivo / demanda ejecutiva",
    tipo: 'judicial',
    articulos: ["Art. 464 CPC (excepciones a la ejecución)", "Art. 467 CPC (plazo para oponer excepciones: 4 días hábiles)", "Art. 2514 Código Civil (prescripción extintiva)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[oponer excepciones y solicitar rechazo de la demanda ejecutiva]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para oposición a demanda ejecutiva. Petición: oponer excepciones y solicitar rechazo de la demanda ejecutiva. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Recurso de amparo ante Corte de Apelaciones (SCRAPEADO) ──
  {
    id: 'recurso-de-amparo-ante-corte-de-apelacio',
    keywords: ["amparo", "habeas corpus", "privado de libertad", "detención", "arresto"],
    titulo: "Recurso de amparo ante Corte de Apelaciones",
    tipo: 'recurso',
    articulos: ["Art. 21 CPR (acción de amparo / habeas corpus)", "Art. 95 CPP (amparo ante juez de garantía)", "Auto Acordado Corte Suprema sobre recurso de amparo"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[libertad inmediata o legalización de la detención]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para recurso de amparo / habeas corpus. Petición: libertad inmediata o legalización de la detención. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Solicitud de mediación familiar obligatoria (SCRAPEADO) ──
  {
    id: 'solicitud-de-mediaci-n-familiar-obligato',
    keywords: ["mediación", "mediacion", "centro mediación", "acuerdo familiar", "tuición previa"],
    titulo: "Solicitud de mediación familiar obligatoria",
    tipo: 'administrativo',
    articulos: ["Art. 106 Ley 19.968 (mediación previa obligatoria en materias de familia)", "Art. 103 Ley 19.968 (materias que requieren mediación previa)", "Art. 111 Ley 19.968 (acta de mediación con fuerza ejecutiva)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

III. PETICION

[[inicio de proceso de mediación familiar]]

Es cuanto puedo informar.

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para mediación familiar (tuición, alimentos, visitas). Petición: inicio de proceso de mediación familiar. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Carta de notificación de término de contrato de trabajo (SCRAPEADO) ──
  {
    id: 'carta-de-notificaci-n-de-t-rmino-de-cont',
    keywords: ["carta de despido", "aviso despido", "término contrato trabajo", "causal despido"],
    titulo: "Carta de notificación de término de contrato de trabajo",
    tipo: 'carta',
    articulos: ["Art. 161 Código del Trabajo (necesidades de la empresa)", "Art. 162 Código del Trabajo (formalidades del despido)", "Art. 163 Código del Trabajo (indemnización por años de servicio)", "Art. 169 Código del Trabajo (plazo para impugnar el despido)"],
    esqueleto: `[CIUDAD], [FECHA]

SEÑOR(A)
[DESTINATARIO EN MAYUSCULAS]
PRESENTE

De conformidad con lo dispuesto en el articulo 162 del Codigo del Trabajo, notifico a usted el termino de su contrato de trabajo en los siguientes terminos:

I. DATOS DE LA RELACION LABORAL

Trabajador: [DESTINATARIO EN MAYUSCULAS]
RUT: [[RUT DEL TRABAJADOR]]
Cargo: [[CARGO]]
Fecha de ingreso: [[FECHA DE INICIO DE LA RELACION LABORAL]]

II. CAUSAL DE TERMINO Y HECHOS QUE LA CONFIGURAN

Se invoca la causal del articulo [[NUMERO DE ARTICULO Y NUMERAL]] del Codigo del Trabajo, esto es: [[DESCRIPCION DE LA CAUSAL LEGAL]].

Los hechos que configuran esta causal son los siguientes:
[[DESCRIBIR DETALLADAMENTE LOS HECHOS CONCRETOS QUE JUSTIFICAN LA CAUSAL]]

III. FECHA DE TERMINO

La relacion laboral terminara con fecha [[FECHA EFECTIVA DE TERMINO]].

IV. ESTADO DE COTIZACIONES PREVISIONALES

Se adjunta certificado de la respectiva AFP que acredita que las cotizaciones previsionales se encuentran al dia, conforme lo exige el articulo 162 inciso 5 del Codigo del Trabajo.

V. INDEMNIZACIONES OFRECIDAS

[[INDICAR SI SE OFRECEN INDEMNIZACIONES: indemnizacion por anos de servicio, indemnizacion sustitutiva del aviso previo, feriado proporcional, u otras. Si no corresponden, indicar el motivo.]]

VI. DERECHO A IMPUGNAR

Se informa que, conforme al articulo 169 del Codigo del Trabajo, tiene un plazo de 60 dias habiles contados desde la separacion para recurrir ante el Juzgado del Trabajo competente si estima que el despido es injustificado, indebido o improcedente.

Sin otro particular, saluda atentamente,

_____________________________
[NOMBRE EN MAYUSCULAS]
RUT: [RUT]
Representante del empleador`,
    instruccion_llm: `Redacta la carta de despido cumpliendo TODOS los requisitos del Art. 162 CT. OBLIGATORIO incluir: (1) causal legal precisa con numero de articulo y numeral; (2) hechos concretos que configuran la causal; (3) fecha efectiva de termino; (4) mencion de certificado de cotizaciones al dia; (5) indemnizaciones ofrecidas; (6) informar plazo de 60 dias habiles para impugnar. NO uses formato judicial (sin "EN LO PRINCIPAL", "RUEGO A US."). Este es un documento UNILATERAL del empleador al trabajador.`,
  },

  // ── Denuncia ante la Inspección del Trabajo (SCRAPEADO) ──
  {
    id: 'denuncia-ante-la-inspecci-n-del-trabajo',
    keywords: ["inspección del trabajo", "inspección laboral", "denuncia laboral", "DT", "dirección del trabajo"],
    titulo: "Denuncia ante la Inspección del Trabajo",
    tipo: 'administrativo',
    articulos: ["Art. 474 Código del Trabajo (fiscalización e infracciones)", "Art. 505 Código del Trabajo (facultades de fiscalización)", "Art. 506 Código del Trabajo (multas por infracción laboral)", "Art. 420 Código del Trabajo (competencia juzgados del trabajo)"],
    esqueleto: `[CIUDAD], [FECHA]

SEÑOR(A) INSPECTOR(A) DEL TRABAJO
INSPECCION DEL TRABAJO DE [[COMUNA / REGION]]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], vengo en interponer denuncia laboral en contra del empleador que individualizo:

I. INDIVIDUALIZACION DEL EMPLEADOR DENUNCIADO

Razon social: [[RAZON SOCIAL O NOMBRE DEL EMPLEADOR]].
RUT empresa: [[RUT DE LA EMPRESA]].
Direccion del establecimiento: [[DIRECCION DEL LUGAR DE TRABAJO]].
Representante legal (si se conoce): [[NOMBRE DEL REPRESENTANTE LEGAL]].

II. INDIVIDUALIZACION DEL DENUNCIANTE

Nombre: [NOMBRE EN MAYUSCULAS].
RUT: [RUT].
Cargo: [[CARGO DESEMPENADO]].
Fecha de ingreso: [[FECHA DE INICIO DE LA RELACION LABORAL]].
Remuneracion: [[MONTO DE LA REMUNERACION PACTADA]].

III. TIPO DE INFRACCION DENUNCIADA

[[INDICAR TIPO DE INFRACCION: no pago de horas extraordinarias, no pago de cotizaciones previsionales, despido irregular, condiciones inseguras de trabajo, no entrega de liquidaciones de sueldo, jornada laboral excesiva, acoso laboral, no otorgamiento de vacaciones, etc.]]

IV. PERIODO DE LA INFRACCION

Desde: [[FECHA INICIO DE LA INFRACCION]].
Hasta: [[FECHA TERMINO O "a la fecha" SI CONTINUA]].

V. DESCRIPCION DE LOS HECHOS

[[DESCRIBIR DETALLADAMENTE LOS HECHOS: que ocurrio, cuando, como afecta al trabajador o trabajadores]]

VI. TRABAJADORES AFECTADOS

[[INDICAR SI AFECTA SOLO AL DENUNCIANTE O A MAS TRABAJADORES. SI SON VARIOS, INDICAR CUANTOS APROXIMADAMENTE]]

VII. MEDIOS DE PRUEBA DISPONIBLES

[[LISTAR PRUEBAS: liquidaciones de sueldo, contrato de trabajo, correos electronicos, mensajes, fotografias, testigos (nombres), registros de asistencia, etc.]]

VIII. PETICION

Solicito a la Inspeccion del Trabajo:
(a) Citar al empleador a comparendo de conciliacion;
(b) Fiscalizar el establecimiento para verificar las infracciones denunciadas;
(c) Aplicar las multas que correspondan conforme al Art. 506 del Codigo del Trabajo.

Es cuanto puedo informar.

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta la denuncia ante la Inspeccion del Trabajo. IMPORTANTE: (1) individualizar al empleador con razon social, RUT y direccion; (2) especificar el tipo de infraccion laboral (horas extra impagas, cotizaciones, despido irregular, condiciones inseguras, etc.); (3) indicar periodo de la infraccion; (4) listar medios de prueba disponibles; (5) la denuncia se puede hacer de forma ANONIMA si el trabajador teme represalias. La Inspeccion del Trabajo fiscaliza y aplica multas (Art. 506 CT). Razona con los hechos especificos del cliente.`,
  },

  // ── Solicitud de nulidad de despido (SCRAPEADO) ──
  {
    id: 'solicitud-de-nulidad-de-despido',
    keywords: ["nulidad despido", "tutela laboral", "derechos fundamentales laborales", "acoso laboral", "discriminación laboral"],
    titulo: "Solicitud de nulidad de despido",
    tipo: 'judicial',
    articulos: ["Art. 485 Código del Trabajo (procedimiento de tutela laboral)", "Art. 489 Código del Trabajo (nulidad del despido y reincorporación o indemnización 6-11 meses)", "Art. 493 Código del Trabajo (regla de indicios: inversión de carga probatoria)", "Art. 19 N°16 CPR (libertad de trabajo sin discriminación)"],
    esqueleto: `[CIUDAD], [FECHA]

EN LO PRINCIPAL: Denuncia de tutela laboral por vulneracion de derechos fundamentales con ocasion del despido. PRIMER OTROSI: Solicita indemnizacion adicional. SEGUNDO OTROSI: Acompana documentos.

SEÑOR JUEZ DEL JUZGADO DE LETRAS DEL TRABAJO DE [CIUDAD]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. INDIVIDUALIZACION DE LAS PARTES

Denunciante: [NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION].
Denunciado (empleador): [[RAZON SOCIAL O NOMBRE DEL EMPLEADOR, RUT, DOMICILIO]].

II. RELACION LABORAL

Cargo: [[CARGO DESEMPENADO]].
Fecha de inicio: [[FECHA DE INICIO DE LA RELACION LABORAL]].
Fecha de despido: [[FECHA DEL DESPIDO]].
Causal invocada por el empleador: [[CAUSAL DE DESPIDO COMUNICADA: necesidades de la empresa, Art. 160 N°X, etc.]].
Remuneracion mensual: [[MONTO DE LA ULTIMA REMUNERACION]].

III. DERECHO FUNDAMENTAL VULNERADO

[[INDICAR EL DERECHO FUNDAMENTAL AFECTADO: dignidad (Art. 19 N°4 CPR), no discriminacion (Art. 19 N°2 y 16 CPR), intimidad (Art. 19 N°4 CPR), honra (Art. 19 N°4 CPR), libertad de expresion (Art. 19 N°12 CPR), libertad sindical (Art. 19 N°19 CPR), indemnidad (represalia por reclamar derechos)]].

IV. HECHOS CONSTITUTIVOS DE LA VULNERACION

[[DESCRIBIR DETALLADAMENTE LOS HECHOS: acoso laboral, discriminacion, represalia por denuncia, cambio unilateral de funciones, hostigamiento, etc.]]

V. INDICIOS DE LA VULNERACION (Art. 493 CT)

[[LISTAR LOS INDICIOS QUE PERMITEN PRESUMIR LA VULNERACION: correos electronicos, mensajes, testigos, coincidencia temporal entre reclamo y despido, cambios injustificados de condiciones laborales, etc.]]

Conforme al Art. 493 CT, presentados indicios suficientes, corresponde al empleador acreditar que su conducta obedecio a motivos razonables y proporcionados.

VI. PETICION ALTERNATIVA (Art. 489 CT)

Solicito a US. declare la nulidad del despido y ordene:
- Alternativa 1: REINCORPORACION al puesto de trabajo en las mismas condiciones, mas el pago de remuneraciones desde el despido hasta la reincorporacion; O
- Alternativa 2: INDEMNIZACION ADICIONAL de [[6 A 11]] meses de remuneracion (Art. 489 inc. 3 CT), ademas de las indemnizaciones por termino de contrato (anos de servicio y sustitutiva del aviso previo).

POR TANTO,

RUEGO A US.: (1) acoger la denuncia de tutela laboral; (2) declarar la vulneracion del derecho fundamental indicado; (3) ordenar la reincorporacion o, en subsidio, condenar al pago de indemnizacion adicional de [[NUMERO]] meses de remuneracion; (4) condenar en costas al demandado.

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta la denuncia de tutela laboral (Art. 485-489 CT). IMPORTANTE: (1) identificar con precision el derecho fundamental vulnerado; (2) detallar los INDICIOS de la vulneracion (Art. 493 CT invierte la carga de la prueba: basta que el trabajador presente indicios suficientes); (3) ofrecer peticion ALTERNATIVA: reincorporacion O indemnizacion adicional de 6 a 11 meses segun gravedad (Art. 489 CT); (4) la indemnizacion adicional es COMPATIBLE con la indemnizacion por anos de servicio. Razona con los hechos especificos del cliente.`,
  },

  // ── Autorización de salida del país de menor (SCRAPEADO) ──
  {
    id: 'autorizaci-n-de-salida-del-pa-s-de-menor',
    keywords: ["salida del pais de menor", "autorizacion de salida del pais", "salida del pais", "autorizacion salida pais", "salida pais menor", "autorizacion de viaje de menor", "viaje menor", "permiso notarial de viaje"],
    titulo: "Autorización de salida del país de menor",
    tipo: 'judicial',
    articulos: ["Art. 49 Ley 16.618 (autorización para salida de menores)", "Art. 225 Código Civil (cuidado personal del menor)", "Ley 20.680 (autorización de viaje al extranjero de menores)"],
    esqueleto: `[CIUDAD], [FECHA]

EN LO PRINCIPAL: Solicita autorizacion judicial de salida del pais de menor. OTROSI: Acompana documentos.

SEÑOR JUEZ DEL JUZGADO DE FAMILIA DE [CIUDAD]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. INDIVIDUALIZACION DEL MENOR Y SOLICITANTE

Solicitante: [NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION].
Relacion con el menor: [[PADRE / MADRE / ABUELO(A) / TUTOR]].
Menor: [[NOMBRE COMPLETO DEL MENOR, RUT, FECHA DE NACIMIENTO, EDAD]].
Padre/madre que no autoriza: [[NOMBRE COMPLETO, RUT, DOMICILIO PARA NOTIFICAR]].

II. ANTECEDENTES DEL VIAJE

Pais de destino: [[PAIS DE DESTINO]].
Fechas del viaje: desde [[FECHA DE SALIDA]] hasta [[FECHA DE REGRESO]].
Motivo del viaje: [[VACACIONES / TRATAMIENTO MEDICO / VISITA FAMILIAR / ESTUDIOS / OTRO (detallar)]].

III. HECHOS

[[EXPLICAR POR QUE EL OTRO PADRE/MADRE NO OTORGA LA AUTORIZACION: no se ubica, se niega sin motivo justificado, no tiene contacto con el menor, etc.]]

IV. DERECHO

Art. 49 Ley 16.618: para que un menor salga del pais se requiere autorizacion de ambos padres. Si uno de ellos se niega o no es habido, se puede solicitar autorizacion judicial.
Art. 225 CC: cuidado personal y facultades del padre/madre que tiene el cuidado.

POR TANTO,

RUEGO A US.: se sirva autorizar la salida del pais del menor [[NOMBRE DEL MENOR]] con destino a [[PAIS]], desde [[FECHA SALIDA]] hasta [[FECHA REGRESO]], en compania del solicitante.

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta la solicitud de autorizacion judicial de salida del pais para menor. IMPORTANTE: Si ambos padres estan de acuerdo, basta autorizacion notarial ante notario publico y NO se necesita escrito judicial. Solo usar este template si un padre se niega o no es habido. Debes: (1) individualizar al menor con nombre, RUT y edad; (2) indicar pais de destino, fechas y motivo del viaje; (3) explicar por que el otro padre/madre no autoriza. Razona con los hechos especificos del cliente.`,
  },

  // ── Reclamo por publicidad engañosa (SCRAPEADO) ──
  {
    id: 'reclamo-por-publicidad-enga-osa',
    keywords: ["publicidad engañosa", "cláusula abusiva", "contrato abusivo", "engaño", "información falsa"],
    titulo: "Reclamo por publicidad engañosa",
    tipo: 'carta',
    articulos: ["Art. 28 Ley 19.496 (publicidad engañosa)", "Art. 16 Ley 19.496 (cláusulas abusivas en contratos de adhesión)", "Art. 24 Ley 19.496 (sanciones al proveedor infractor)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

III. PETICION

[[rectificación de la publicidad y/o anulación de cláusula abusiva]]

Sin otro particular, saluda atentamente,

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para reclamo por publicidad engañosa o cláusulas abusivas. Petición: rectificación de la publicidad y/o anulación de cláusula abusiva. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Solicitud de regularización de título / herencia (SCRAPEADO) ──
  {
    id: 'solicitud-de-regularizaci-n-de-t-tulo-he',
    keywords: ["herencia", "posesión efectiva", "sucesión", "bienes hereditarios", "legatario"],
    titulo: "Solicitud de regularización de título / herencia",
    tipo: 'administrativo',
    articulos: ["Art. 951 Código Civil (sucesión por causa de muerte)", "Art. 955 Código Civil (sucesión testamentaria e intestada)", "Art. 688 Código Civil (inscripción de herencia en CBR)", "Ley 19.903 (posesión efectiva ante Registro Civil para sucesiones intestadas)"],
    esqueleto: `[CIUDAD], [FECHA]

SEÑOR(A) DIRECTOR(A)
SERVICIO DE REGISTRO CIVIL E IDENTIFICACION
[[OFICINA / REGION]]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], vengo en solicitar la tramitacion de posesion efectiva de la herencia quedada al fallecimiento de:

I. INDIVIDUALIZACION DEL CAUSANTE

Nombre completo: [[NOMBRE COMPLETO DEL FALLECIDO]].
RUT: [[RUT DEL CAUSANTE]].
Fecha de fallecimiento: [[FECHA DE DEFUNCION]].
Ultimo domicilio: [[DOMICILIO DEL CAUSANTE AL MOMENTO DEL FALLECIMIENTO]].
Certificado de defuncion: [[INDICAR SI SE ACOMPANA]].

II. INDIVIDUALIZACION DE LOS HEREDEROS

[[LISTAR TODOS LOS HEREDEROS CON: nombre completo, RUT, parentesco con el causante, domicilio]]

1. [[NOMBRE]], RUT [[RUT]], [[PARENTESCO]] (conyuge/hijo(a)/padre/madre/hermano(a)).
2. [[NOMBRE]], RUT [[RUT]], [[PARENTESCO]].
3. [[AGREGAR MAS SEGUN CORRESPONDA]].

III. INVENTARIO DE BIENES DEL CAUSANTE

Bienes inmuebles:
- [[DIRECCION DEL INMUEBLE, COMUNA, INSCRIPCION EN CBR (foja, numero, ano), ROL DE AVALUO]].

Bienes muebles:
- [[VEHICULOS (patente, marca, modelo), CUENTAS BANCARIAS, ACCIONES, FONDOS MUTUOS, OTROS]].

Deudas del causante (si las hay):
- [[INDICAR DEUDAS CONOCIDAS: creditos hipotecarios, deudas bancarias, etc.]].

IV. PETICION

Solicito se conceda la posesion efectiva de la herencia intestada quedada al fallecimiento de [[NOMBRE DEL CAUSANTE]], a favor de los herederos individualizados precedentemente.

Es cuanto puedo informar.

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta la solicitud de posesion efectiva / regularizacion de herencia. IMPORTANTE: (1) La posesion efectiva INTESTADA (sin testamento) se tramita GRATIS ante el Registro Civil desde 2004 (Ley 19.903), NO ante tribunal. (2) Solo se usa escrito JUDICIAL si la sucesion es TESTAMENTARIA (Art. 955 CC). (3) Incluir: certificado de defuncion, lista completa de herederos con RUT y parentesco, inventario de bienes del causante (inmuebles con inscripcion CBR, vehiculos, cuentas). (4) Si hay inmuebles, recordar que DESPUES de obtener la posesion efectiva se debe inscribir en el Conservador de Bienes Raices (Art. 688 CC). Razona con los hechos especificos del cliente.`,
  },

  // ── Carta de cobro prejudicial a deudor (SCRAPEADO) ──
  {
    id: 'carta-de-cobro-prejudicial-a-deudor',
    keywords: ["cobro prejudicial", "deudor", "mora", "pago", "última instancia", "antes de demandar"],
    titulo: "Carta de cobro prejudicial a deudor",
    tipo: 'carta',
    articulos: ["Art. 1551 Código Civil (estado de mora del deudor)", "Art. 1552 Código Civil (mora del deudor por plazo vencido)", "Art. 98 Código de Comercio (cobro mercantil)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

III. PETICION

[[pago de la deuda en plazo perentorio antes de acciones judiciales]]

Sin otro particular, saluda atentamente,

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para cobro prejudicial / última comunicación antes de demanda. Petición: pago de la deuda en plazo perentorio antes de acciones judiciales. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Oposición a cobranza de TAG prescrito (SCRAPEADO) ──
  // ── Recurso de apelación (Juzgado de Policía Local) (SCRAPEADO) ──
  {
    id: 'recurso-de-apelaci-n-juzgado-de-polic-a',
    keywords: ["apelación", "apelar", "corte apelaciones", "JPL", "policía local", "segunda instancia"],
    titulo: "Recurso de apelación (Juzgado de Policía Local)",
    tipo: 'recurso',
    articulos: ["Art. 22 Ley 18.287 (apelación de sentencias del JPL)", "Art. 23 Ley 18.287 (plazo: 5 días hábiles)", "Art. 186 CPC (efectos de la apelación)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[revocar la sentencia del JPL y dictar la que corresponde en derecho]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para recurso de apelación ante corte de apelaciones desde jpl. Petición: revocar la sentencia del JPL y dictar la que corresponde en derecho. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Demanda por despido injustificado (SCRAPEADO) ──
  {
    id: 'demanda-por-despido-injustificado',
    keywords: ["despido injustificado", "improcedente", "sin causa", "me echaron", "me despidieron", "causal injustificada"],
    titulo: "Demanda por despido injustificado",
    tipo: 'judicial',
    articulos: ["Art. 168 Código del Trabajo (despido injustificado y recargo indemnización)", "Art. 163 Código del Trabajo (indemnización por años de servicio)", "Art. 161 Código del Trabajo (causal necesidades de la empresa)", "Art. 162 Código del Trabajo (formalidades del despido y nulidad por cotizaciones)", "Art. 169 Código del Trabajo (plazo de 60 días hábiles para demandar)", "Art. 172 Código del Trabajo (base de cálculo de indemnizaciones)"],
    esqueleto: `[CIUDAD], [FECHA]

EN LO PRINCIPAL: Demanda por despido injustificado. PRIMER OTROSI: Acompana documentos.

SEÑOR JUEZ DEL JUZGADO DE LETRAS DEL TRABAJO DE [CIUDAD]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. RELACION LABORAL

Empleador demandado: [DESTINATARIO EN MAYUSCULAS], RUT [[RUT EMPLEADOR]], domiciliado en [[DOMICILIO EMPLEADOR]].
Cargo desempenado: [[CARGO]]
Fecha de inicio de la relacion laboral: [[FECHA DE INICIO]]
Ultima remuneracion mensual bruta: $[[MONTO REMUNERACION]]
Fecha de despido: [[FECHA DE DESPIDO]]

II. HECHOS DEL DESPIDO

[[DESCRIBIR: como fue comunicado el despido, que causal se invoco, circunstancias]]

Causal invocada por el empleador: [[CAUSAL INVOCADA, articulo y numeral]]

III. IMPROCEDENCIA DEL DESPIDO

[[EXPLICAR POR QUE EL DESPIDO ES INJUSTIFICADO: los hechos no configuran la causal, no se cumplen requisitos formales del Art. 162, etc.]]

IV. CALCULO DE INDEMNIZACIONES

Conforme al Art. 168 del Codigo del Trabajo, al declararse injustificado el despido, corresponden las siguientes indemnizaciones:

a) Indemnizacion sustitutiva del aviso previo (30 dias): $[[MONTO O CALCULO]]
b) Indemnizacion por anos de servicio (Art. 163 CT):
   [[ANOS TRABAJADOS]] anos x $[[ULTIMA REMUNERACION]] = $[[RESULTADO]]
c) Recargo legal Art. 168 CT: [[30%, 50% o 100% segun causal]] sobre la indemnizacion por anos de servicio = $[[MONTO RECARGO]]
d) Feriado proporcional (Art. 73 CT): $[[MONTO]]
e) Remuneraciones pendientes: $[[MONTO]]
[[SI HAY COTIZACIONES IMPAGAS]]:
f) Nulidad del despido Art. 162 inc. 5-7 CT: remuneraciones desde el despido hasta convalidacion.

TOTAL DEMANDADO: $[[SUMA TOTAL]]

V. FUNDAMENTO LEGAL

El articulo 168 del Codigo del Trabajo establece que si el despido es declarado injustificado, el juez ordenara el pago de la indemnizacion por anos de servicio con un recargo del 30% si la causal es del Art. 161, 50% si es del Art. 159 N°4-5-6, y 100% si es del Art. 160.

El articulo 172 establece que la base de calculo es la ultima remuneracion mensual, incluyendo toda cantidad percibida por la prestacion de servicios.

POR TANTO,

RUEGO A US.: Declare que el despido de que fui objeto es injustificado y condene al demandado al pago de: indemnizacion sustitutiva del aviso previo, indemnizacion por anos de servicio con el recargo legal del [[PORCENTAJE]]%, feriado proporcional, remuneraciones pendientes, cotizaciones previsionales adeudadas si las hubiere, con reajustes e intereses del Art. 63 CT, y costas de la causa.

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta la demanda por despido injustificado con TODAS las secciones obligatorias. CRITICO: incluir (1) datos completos de la relacion laboral; (2) causal invocada por el empleador; (3) razon por la que es injustificada; (4) calculo detallado de indemnizaciones (anos x remuneracion + recargo segun Art. 168). Si no hay datos de remuneracion, usar $_____ como marcador. El recargo es: 30% si la causal es Art. 161, 50% si es Art. 159 N4-6, 100% si es Art. 160. Plazo para demandar: 60 dias habiles desde la separacion (Art. 169 CT).`,
  },

  // ── Demanda tutela laboral por vulneración de derechos fundamentales (SCRAPEADO) ──
  {
    id: 'demanda-tutela-laboral-por-vulneraci-n-d',
    keywords: ["tutela laboral", "acoso laboral", "mobbing", "derechos fundamentales trabajo", "vulneración", "hostigamiento laboral"],
    titulo: "Demanda tutela laboral por vulneración de derechos fundamentales",
    tipo: 'judicial',
    articulos: ["Art. 485 Código del Trabajo (procedimiento de tutela laboral)", "Art. 487 Código del Trabajo (legitimación activa en tutela)", "Art. 19 N°1 CPR (integridad física y psíquica)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[declaración de vulneración de derechos fundamentales, indemnización adicional y cese de la conducta]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para tutela laboral / vulneración derechos fundamentales en el trabajo. Petición: declaración de vulneración de derechos fundamentales, indemnización adicional y cese de la conducta. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Demanda cobro de remuneraciones impagas (SCRAPEADO) ──
  {
    id: 'demanda-cobro-de-remuneraciones-impagas',
    keywords: ["sueldo impago", "remuneración impaga", "salario no pagado", "no me pagaron", "retención sueldo"],
    titulo: "Demanda cobro de remuneraciones impagas",
    tipo: 'judicial',
    articulos: ["Art. 54 Código del Trabajo (forma y oportunidad de pago de remuneraciones)", "Art. 55 Código del Trabajo (plazo de pago: mensual o quincenal)", "Art. 63 Código del Trabajo (reajuste IPC e intereses máximos convencionales)", "Art. 173 Código del Trabajo (mora en el pago)"],
    esqueleto: `[CIUDAD], [FECHA]

EN LO PRINCIPAL: Demanda de cobro de remuneraciones impagas. PRIMER OTROSI: Reajustes e intereses. SEGUNDO OTROSI: Acompana documentos.

SEÑOR JUEZ DEL JUZGADO DE LETRAS DEL TRABAJO DE [CIUDAD]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. INDIVIDUALIZACION DE LAS PARTES

Demandante: [NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION].
Demandado (empleador): [[RAZON SOCIAL O NOMBRE DEL EMPLEADOR, RUT, DOMICILIO]].

II. RELACION LABORAL

Cargo: [[CARGO DESEMPENADO]].
Fecha de inicio: [[FECHA DE INICIO DE LA RELACION LABORAL]].
Remuneracion mensual pactada: [[MONTO DE LA REMUNERACION BRUTA PACTADA EN EL CONTRATO]].
Tipo de contrato: [[INDEFINIDO / PLAZO FIJO / POR OBRA]].

III. PERIODO IMPAGO

Meses impagas: desde [[MES/ANO INICIO DEL IMPAGO]] hasta [[MES/ANO TERMINO DEL IMPAGO]].
Total de meses adeudados: [[NUMERO DE MESES]].

IV. CALCULO DEL MONTO ADEUDADO

Remuneracion mensual: $[[MONTO]]
Meses adeudados: [[NUMERO]]
Subtotal: $[[MONTO TOTAL]]
Reajuste IPC (Art. 63 CT): [[PORCENTAJE ESTIMADO O "segun calculo al momento del pago"]]
Intereses maximos convencionales (Art. 63 CT): [[PORCENTAJE O "segun tasa vigente"]]
TOTAL DEMANDADO: $[[MONTO TOTAL CON REAJUSTE E INTERESES, o "lo que se determine en juicio"]]

V. MEDIOS DE PRUEBA

[[INDICAR: liquidaciones de sueldo, contrato de trabajo, correos de reclamo, transferencias bancarias parciales, cartolas bancarias que muestren ausencia de depositos, etc.]]

VI. DERECHO

Art. 54 CT: la remuneracion se paga en dinero, en periodos iguales.
Art. 55 CT: el pago debe ser mensual o quincenal.
Art. 63 CT: las remuneraciones adeudadas se pagan reajustadas conforme al IPC, mas el interes maximo convencional.

POR TANTO,

RUEGO A US.: condenar al demandado al pago de las remuneraciones impagas por un total de $[[MONTO]], mas reajustes conforme al IPC e intereses maximos convencionales (Art. 63 CT), con costas.

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta la demanda de cobro de remuneraciones impagas. IMPORTANTE: (1) indicar el cargo y la remuneracion pactada; (2) especificar el periodo exacto de impago (desde-hasta); (3) realizar el calculo del monto adeudado; (4) mencionar si hay boletas, liquidaciones u otra prueba documental; (5) siempre pedir reajuste IPC e intereses maximos convencionales conforme al Art. 63 CT. Razona con los hechos especificos del cliente.`,
  },

  // ── Demanda cobro horas extraordinarias impagas (SCRAPEADO) ──
  {
    id: 'demanda-cobro-horas-extraordinarias-impa',
    keywords: ["horas extras", "sobretiempo", "horas extraordinarias", "jornada laboral excedida", "no pagaron horas extra"],
    titulo: "Demanda cobro horas extraordinarias impagas",
    tipo: 'judicial',
    articulos: ["Art. 31 Código del Trabajo (horas extraordinarias)", "Art. 32 Código del Trabajo (recargo del 50% sobre hora ordinaria)", "Art. 420 Código del Trabajo (competencia juzgados del trabajo para cobros laborales)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[cobro de horas extraordinarias con recargo legal del 50%]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para cobro de horas extras / sobretiempo no remunerado. Petición: cobro de horas extraordinarias con recargo legal del 50%. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Denuncia accidente del trabajo o enfermedad profesional (SCRAPEADO) ──
  {
    id: 'denuncia-accidente-del-trabajo-o-enferme',
    keywords: ["accidente trabajo", "accidente laboral", "enfermedad profesional", "mutualidad", "ACHS", "mutualidad rechazo", "fractura trabajo", "caida trabajo", "lesion trabajo"],
    titulo: "Denuncia accidente del trabajo o enfermedad profesional",
    tipo: 'administrativo',
    articulos: ["Art. 5 Ley 16.744 (concepto de accidente del trabajo)", "Art. 69 Ley 16.744 (responsabilidad del empleador: indemnización)", "Art. 57 Ley 16.744 (derecho a prestaciones médicas y económicas)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

III. PETICION

[[reconocimiento de accidente laboral y prestaciones médicas y pecuniarias]]

Es cuanto puedo informar.

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para accidente del trabajo / enfermedad profesional. Petición: reconocimiento de accidente laboral y prestaciones médicas y pecuniarias. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Solicitud licencia médica rechazada o reducida (COMPIN) (SCRAPEADO) ──
  {
    id: 'solicitud-licencia-m-dica-rechazada-o-re',
    keywords: ["licencia médica", "COMPIN", "licencia rechazada", "licencia reducida", "impugnar licencia"],
    titulo: "Solicitud licencia médica rechazada o reducida (COMPIN)",
    tipo: 'recurso',
    articulos: ["Art. 12 DFL 3/1984 (FONASA, tramitación licencias médicas)", "Art. 77 bis DL 3.500 (licencias médicas en sistema AFP)", "DL 2.763 Art. 8 (funciones COMPIN)", "DS 3/1984 Art. 42 (recurso de reposición ante COMPIN)"],
    esqueleto: `[CIUDAD], [FECHA]

SEÑOR(A) DIRECTOR(A)
COMISION DE MEDICINA PREVENTIVA E INVALIDEZ (COMPIN)
[[REGION / COMUNA]]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. IDENTIFICACION DE LA LICENCIA MEDICA

Numero de licencia medica: [[NUMERO DE LA LICENCIA MEDICA]].
Fecha de emision: [[FECHA DE EMISION DE LA LICENCIA]].
Periodo de reposo: desde [[FECHA INICIO]] hasta [[FECHA TERMINO]] ([[NUMERO]] dias).
Medico tratante: [[NOMBRE DEL MEDICO QUE OTORGO LA LICENCIA]].
Diagnostico: [[DIAGNOSTICO MEDICO (CIE-10 si se conoce)]].

II. RESOLUCION IMPUGNADA

Fecha de notificacion del rechazo/reduccion: [[FECHA EN QUE FUE NOTIFICADO]].
Tipo de resolucion: [[RECHAZO TOTAL / REDUCCION DE DIAS (de X a Y dias)]].
Motivo del rechazo segun COMPIN: [[MOTIVO INDICADO: reposo injustificado, diagnostico inconsistente, incapacidad no acreditada, etc.]].

III. FUNDAMENTOS DEL RECURSO

[[EXPLICAR POR QUE EL RECHAZO ES INJUSTIFICADO: gravedad del diagnostico, opinion del medico tratante, examenes medicos que respaldan la incapacidad, antecedentes clinicos previos, etc.]]

IV. PETICION

Solicito a US. reconsiderar la resolucion y:
(a) Aprobar la licencia medica N° [[NUMERO]] por el total de dias prescritos; y
(b) Ordenar el pago del subsidio por incapacidad laboral correspondiente al periodo de reposo.

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el recurso de reposicion ante COMPIN por rechazo o reduccion de licencia medica. IMPORTANTE: (1) el plazo para interponer este recurso es de 15 DIAS HABILES desde la notificacion del rechazo; (2) si paso ese plazo, se debe recurrir a la Superintendencia de Seguridad Social (SUSESO), no ante COMPIN; (3) indicar numero y fecha de la licencia, motivo del rechazo, y diagnostico del medico tratante; (4) argumentar por que el rechazo es injustificado con base en antecedentes medicos. Razona con los hechos especificos del cliente.`,
  },

  // ── Reclamo por fuero maternal / paternal (reintegro) (SCRAPEADO) ──
  {
    id: 'reclamo-por-fuero-maternal-paternal-rein',
    keywords: ["fuero maternal", "fuero paternal", "embarazo", "desafuero", "despido embarazada", "permiso postnatal", "postnatal"],
    titulo: "Reclamo por fuero maternal / paternal (reintegro)",
    tipo: 'judicial',
    articulos: ["Art. 174 Código del Trabajo (desafuero judicial requerido para despedir con fuero)", "Art. 201 Código del Trabajo (fuero maternal: desde embarazo hasta 1 año después del postnatal)", "Art. 194 Código del Trabajo (protección a la maternidad)", "Art. 163 bis Código del Trabajo (fuero en caso de adopción)"],
    esqueleto: `[CIUDAD], [FECHA]

EN LO PRINCIPAL: Demanda de reintegro por despido con fuero maternal/paternal. PRIMER OTROSI: Cobro de remuneraciones. SEGUNDO OTROSI: Acompana documentos.

SEÑOR JUEZ DEL JUZGADO DE LETRAS DEL TRABAJO DE [CIUDAD]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. INDIVIDUALIZACION DE LAS PARTES

Demandante: [NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION].
Demandado (empleador): [[RAZON SOCIAL O NOMBRE DEL EMPLEADOR, RUT, DOMICILIO]].

II. RELACION LABORAL

Cargo: [[CARGO DESEMPENADO]].
Fecha de inicio: [[FECHA DE INICIO DE LA RELACION LABORAL]].
Fecha de despido: [[FECHA DEL DESPIDO]].
Remuneracion mensual: [[MONTO DE LA ULTIMA REMUNERACION]].

III. FUERO MATERNAL/PATERNAL

Fecha de inicio del embarazo: [[FECHA APROXIMADA DE INICIO DEL EMBARAZO O FECHA DEL CERTIFICADO MEDICO]].
Fecha de nacimiento del hijo(a): [[FECHA DE NACIMIENTO, O "aun no nacido" SI ESTA EN GESTACION]].
Periodo de fuero (Art. 201 CT): desde [[FECHA INICIO DEL EMBARAZO]] hasta [[1 ANO DESPUES DEL TERMINO DEL POSTNATAL]].
El despido ocurrio DENTRO del periodo de fuero: SI.

IV. AUSENCIA DE DESAFUERO JUDICIAL

El empleador NO obtuvo autorizacion judicial previa de desafuero (Art. 174 CT) antes de proceder al despido. Por tanto, el despido es NULO y no produce efecto alguno.

V. HECHOS

[[DESCRIBIR COMO SE PRODUJO EL DESPIDO: si el empleador conocia el estado de embarazo, si se comunico formalmente, si se invoco alguna causal]]

VI. DERECHO

Art. 201 CT: la trabajadora goza de fuero desde el inicio del embarazo hasta un ano despues de expirado el descanso postnatal (o postnatal parental).
Art. 174 CT: el empleador NO puede despedir a un trabajador con fuero sin autorizacion judicial previa.
Efecto del despido sin desafuero: separacion NULA, derecho a reincorporacion inmediata y pago de todas las remuneraciones del periodo intermedio.

POR TANTO,

RUEGO A US.: (1) declarar NULO el despido por haberse efectuado sin autorizacion judicial de desafuero; (2) ordenar la reincorporacion inmediata de la demandante a sus funciones habituales; (3) condenar al demandado al pago de todas las remuneraciones y cotizaciones previsionales desde la fecha del despido hasta la efectiva reincorporacion.

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta la demanda de reintegro por despido con fuero maternal o paternal. IMPORTANTE: (1) indicar fecha de embarazo o nacimiento del hijo para acreditar el periodo de fuero; (2) el fuero dura desde el inicio del embarazo hasta 1 ano despues del termino del postnatal (Art. 201 CT); (3) el empleador DEBE obtener desafuero judicial PREVIO (Art. 174 CT) para despedir legalmente; (4) si no obtuvo desafuero, el despido es nulo y procede reincorporacion + pago de remuneraciones del periodo intermedio + cotizaciones. Razona con los hechos especificos del cliente.`,
  },

  // ── Demanda de alimentos para hijos mayores de edad (SCRAPEADO) ──
  {
    id: 'demanda-de-alimentos-para-hijos-mayores',
    keywords: ["alimentos hijo mayor", "pensión alimenticia mayor", "estudiando universitario", "alimentos estudios", "mayor de 18"],
    titulo: "Demanda de alimentos para hijos mayores de edad",
    tipo: 'judicial',
    articulos: ["Art. 332 Código Civil (extensión obligación alimentaria: hasta 28 años si estudia)", "Art. 321 Código Civil (quiénes tienen derecho a alimentos)", "Art. 55 Ley 14.908 (procedimiento cobro alimentos)"],
    esqueleto: `[CIUDAD], [FECHA]

EN LO PRINCIPAL: Demanda de alimentos para hijo mayor de edad. PRIMER OTROSI: Acompana documentos.

SEÑOR JUEZ DEL JUZGADO DE FAMILIA DE [CIUDAD]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. INDIVIDUALIZACION

Demandante (alimentario): [NOMBRE EN MAYUSCULAS], RUT [RUT], [[EDAD]] anos de edad, domiciliado en [DIRECCION].
Demandado: [[NOMBRE COMPLETO DEL DEMANDADO (padre/madre), RUT, DOMICILIO PARA NOTIFICAR]].

II. ACREDITACION DE ESTUDIOS (Art. 332 CC)

El articulo 332 del Codigo Civil establece que los alimentos se deben hasta que los hijos cumplan 21 anos, SALVO que esten estudiando una profesion u oficio, en cuyo caso la obligacion se extiende hasta los 28 anos.

El demandante actualmente cursa [[CARRERA O ESTUDIOS]] en [[INSTITUCION EDUCACIONAL]], en [[ANO/SEMESTRE]] de la carrera.

Se acompana como prueba:
- Certificado de matricula vigente ano [[ANO]]
- Certificado de alumno regular
- [[SI CORRESPONDE: concentracion de notas que acredita rendimiento academico]]

III. NECESIDADES ECONOMICAS VINCULADAS A ESTUDIOS

[[DESGLOSAR:
  - Arancel/matricula: $______
  - Materiales de estudio: $______
  - Transporte a la institucion: $______
  - Alimentacion: $______
  - Vivienda (si estudia fuera de su ciudad): $______
  - Salud: $______
  - TOTAL NECESIDADES MENSUALES: $______]]

IV. CAPACIDAD ECONOMICA DEL DEMANDADO

[[DESCRIBIR: ocupacion, ingresos conocidos o estimados, bienes]]

V. FUNDAMENTO LEGAL

El articulo 332 del Codigo Civil dispone que los alimentos que se deben por ley se entienden concedidos por toda la vida del alimentario siempre que se mantengan las circunstancias que legitimaron la demanda. Respecto de los hijos, esta obligacion subsiste hasta los 28 anos si estan estudiando una profesion u oficio.

El articulo 321 del Codigo Civil establece que se deben alimentos a los hijos.

POR TANTO,

RUEGO A US.: Fije pension de alimentos a favor del demandante por un monto de $[[MONTO SOLICITADO]] mensuales, atendido que se encuentra estudiando [[CARRERA]] y se cumplen los requisitos del Art. 332 del Codigo Civil.

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta la demanda de alimentos para hijo mayor de edad. CRITICO: Si el hijo mayor de 18 NO esta estudiando una profesion u oficio, NO tiene derecho a alimentos salvo incapacidad (Art. 332 CC). Verificar este requisito con el cliente. OBLIGATORIO incluir: (1) acreditacion de que el hijo esta estudiando (certificado de matricula o alumno regular); (2) institucion y carrera; (3) necesidades economicas vinculadas a los estudios. Sin prueba de estudios vigentes, la demanda sera rechazada.`,
  },

  // ── Demanda de cuidado personal / tuición de menores (SCRAPEADO) ──
  {
    id: 'demanda-de-cuidado-personal-tuici-n-de-m',
    keywords: ["tuición", "cuidado personal", "custodia", "hijo", "menor", "separación padres"],
    titulo: "Demanda de cuidado personal / tuición de menores",
    tipo: 'judicial',
    articulos: ["Art. 225 Código Civil (cuidado personal de los hijos)", "Art. 225-2 Código Civil (corresponsabilidad parental)", "Art. 225 bis Código Civil (inhabilitación del padre/madre)", "Art. 226 Código Civil (criterios para otorgar cuidado personal)", "Art. 16 Ley 19.968 (interés superior del niño en familia)"],
    esqueleto: `[CIUDAD], [FECHA]

EN LO PRINCIPAL: Demanda de cuidado personal. PRIMER OTROSI: Medida cautelar de cuidado provisorio. SEGUNDO OTROSI: Acompana documentos.

SEÑOR JUEZ DEL JUZGADO DE FAMILIA DE [CIUDAD]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. INDIVIDUALIZACION DE LAS PARTES Y DEL MENOR

Demandante: [NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION].
Demandado(a): [[NOMBRE COMPLETO DEL OTRO PADRE/MADRE, RUT, DOMICILIO PARA NOTIFICAR]].
Menor: [[NOMBRE COMPLETO DEL MENOR, RUT, FECHA DE NACIMIENTO, EDAD]].
Relacion con el menor: [[PADRE / MADRE / ABUELO(A) / OTRO FAMILIAR (indicar)]].

II. SITUACION ACTUAL DEL MENOR

[[DESCRIBIR CON QUIEN VIVE ACTUALMENTE EL MENOR, DESDE CUANDO, Y BAJO QUE CONDICIONES. SI HAY ACUERDO O RESOLUCION PREVIA SOBRE CUIDADO PERSONAL, INDICAR]].

III. HECHOS QUE FUNDAN LA DEMANDA

[[DESCRIBIR LAS RAZONES POR LAS QUE SE SOLICITA EL CAMBIO DE CUIDADO PERSONAL: inhabilidad del padre/madre actual (Art. 225 bis CC), maltrato, negligencia, abandono, consumo de drogas/alcohol, entorno perjudicial para el menor, etc.]]

IV. INTERES SUPERIOR DEL NINO

[[EXPLICAR POR QUE EL CAMBIO DE CUIDADO PERSONAL BENEFICIA AL MENOR: estabilidad emocional, vinculo afectivo, condiciones de vivienda, entorno educativo, red de apoyo familiar]]

V. PROPUESTA DE REGIMEN DE RELACION DIRECTA Y REGULAR

[[PROPONER REGIMEN DE VISITAS PARA EL PADRE/MADRE QUE NO TENDRA EL CUIDADO: dias, horarios, vacaciones, feriados]]

VI. DERECHO

Art. 225 CC: el cuidado personal corresponde a ambos padres o al que determine el juez en caso de vida separada.
Art. 225-2 CC: principio de corresponsabilidad parental.
Art. 225 bis CC: causales de inhabilitacion del padre/madre.
Art. 226 CC: criterios para otorgar cuidado personal.
Art. 16 Ley 19.968: interes superior del nino como principio rector.

POR TANTO,

RUEGO A US.: se sirva declarar que el cuidado personal del menor [[NOMBRE DEL MENOR]] corresponde al demandante, fijando un regimen de relacion directa y regular para el demandado(a).

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta la demanda de cuidado personal (tuicion). El principio rector es el INTERES SUPERIOR DEL NINO (Art. 16 Ley 19.968). Debes: (1) individualizar al menor con nombre, RUT y edad; (2) describir la situacion actual y con quien vive; (3) fundamentar la inhabilitacion del otro padre/madre segun Art. 225 bis CC si corresponde; (4) explicar por que el cambio favorece al menor; (5) proponer regimen de visitas para el padre que no tendra el cuidado. Siempre razona conforme a los hechos especificos del cliente.`,
  },

  // ── Demanda de divorcio por cese de convivencia (SCRAPEADO) ──
  {
    id: 'demanda-de-divorcio-por-cese-de-conviven',
    keywords: ["divorcio", "cese convivencia", "separada", "separado", "separación", "matrimonio", "terminar matrimonio", "años separados"],
    titulo: "Demanda de divorcio por cese de convivencia",
    tipo: 'judicial',
    articulos: ["Art. 55 Ley 19.947 LMC (divorcio por cese de convivencia: 3 años)", "Art. 56 Ley 19.947 LMC (efectos del divorcio)", "Art. 60 Ley 19.947 LMC (compensación económica en divorcio)", "Art. 2 Ley 19.947 LMC (principios: protección del cónyuge más débil)", "Art. 61 Ley 19.947 LMC (procedencia compensación económica)", "Art. 62 Ley 19.947 LMC (criterios para fijar compensación)"],
    esqueleto: `[CIUDAD], [FECHA]

EN LO PRINCIPAL: Demanda de divorcio por cese de convivencia. PRIMER OTROSI: Compensacion economica. SEGUNDO OTROSI: Acompana documentos.

SEÑOR JUEZ DEL JUZGADO DE FAMILIA DE [CIUDAD]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. INDIVIDUALIZACION DE LOS CONYUGES

Demandante: [NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION].
Demandado(a): [[NOMBRE COMPLETO DEL CONYUGE, RUT, DOMICILIO PARA NOTIFICAR]].
Fecha de matrimonio: [[FECHA DE CELEBRACION DEL MATRIMONIO]].
Regimen patrimonial: [[SOCIEDAD CONYUGAL / SEPARACION DE BIENES / PARTICIPACION EN LOS GANANCIALES]].

II. CESE DE CONVIVENCIA

Las partes cesaron su convivencia con fecha [[FECHA DE CESE DE CONVIVENCIA]], esto es, hace mas de 3 anos.

Medio de prueba del cese de convivencia (Art. 55 inc. 3 LMC):
[[INDICAR: escritura publica de cese de convivencia / acta ante Oficial de Registro Civil / transaccion aprobada judicialmente / otros medios de prueba: testigos, certificados, etc.]]

III. SITUACION DE HIJOS COMUNES

[[SI HAY HIJOS: indicar nombre, RUT y edad de cada hijo. Indicar con quien viven, regimen de alimentos y visitas vigente. SI NO HAY HIJOS: declarar que no existen hijos comunes.]]

IV. COMPENSACION ECONOMICA

[[SI CORRESPONDE: El conyuge demandante solicita compensacion economica conforme a los Arts. 61 y 62 LMC, por haberse dedicado al cuidado de los hijos o del hogar comun, no habiendo podido desarrollar actividad remunerada o habiendolo hecho en menor medida. SI NO SE SOLICITA: declarar que no se solicita o se reserva para la audiencia.]]

V. LIQUIDACION DE REGIMEN PATRIMONIAL

[[SI CORRESPONDE: solicitar liquidacion de sociedad conyugal o comunidad de bienes. SI ES SEPARACION DE BIENES: declarar que no existe regimen que liquidar.]]

VI. FUNDAMENTO LEGAL

El articulo 55 inciso 3 de la Ley 19.947 establece que el divorcio sera decretado por el juez si ambos conyuges lo solicitan de comun acuerdo acreditando cese de convivencia de al menos un ano, o si lo solicita uno de ellos acreditando cese de convivencia de al menos tres anos.

POR TANTO,

RUEGO A US.: Declare el divorcio por cese de convivencia superior a tres anos, ordene la subinscripcion de la sentencia al margen de la inscripcion matrimonial, y resuelva sobre compensacion economica y liquidacion del regimen patrimonial si correspondiere.

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta la demanda de divorcio unilateral por cese de convivencia de 3 anos. OBLIGATORIO incluir: (1) individualizacion completa de ambos conyuges con fecha de matrimonio y regimen patrimonial; (2) fecha de cese de convivencia y MEDIO DE PRUEBA (Art. 55 inc. 3 LMC: escritura publica, acta Registro Civil, o transaccion aprobada judicialmente); (3) situacion de hijos comunes; (4) mencion de compensacion economica (Arts. 61-62 LMC); (5) liquidacion de sociedad conyugal si corresponde.`,
  },

  // ── Demanda de divorcio de mutuo acuerdo (SCRAPEADO) ──
  {
    id: 'demanda-de-divorcio-de-mutuo-acuerdo',
    keywords: ["divorcio mutuo acuerdo", "divorcio de mutuo acuerdo", "divorcio de comun acuerdo", "divorcio amistoso", "divorcio de comun consentimiento"],
    titulo: "Demanda de divorcio de mutuo acuerdo",
    tipo: 'judicial',
    articulos: ["Art. 55 inc. 1 Ley 19.947 LMC (divorcio de mutuo acuerdo: 1 año cese convivencia)", "Art. 63 Ley 19.947 LMC (acuerdo completo y suficiente)", "Art. 21 Ley 19.947 LMC (acuerdo regulador de relaciones mutuas)", "Art. 27 Ley 19.947 LMC (contenido del acuerdo completo y suficiente)"],
    esqueleto: `[CIUDAD], [FECHA]

EN LO PRINCIPAL: Demanda conjunta de divorcio de mutuo acuerdo. PRIMER OTROSI: Acompana acuerdo completo y suficiente. SEGUNDO OTROSI: Acompana documentos.

SEÑOR JUEZ DEL JUZGADO DE FAMILIA DE [CIUDAD]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], y [[NOMBRE COMPLETO DEL OTRO CONYUGE]], RUT [[RUT]], domiciliado en [[DIRECCION]], a US. respetuosamente decimos:

I. INDIVIDUALIZACION DE LOS CONYUGES

Conyuge 1: [NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION].
Conyuge 2: [[NOMBRE COMPLETO, RUT, DOMICILIO]].
Fecha de matrimonio: [[FECHA DE CELEBRACION DEL MATRIMONIO]].
Regimen patrimonial: [[SOCIEDAD CONYUGAL / SEPARACION DE BIENES / PARTICIPACION EN LOS GANANCIALES]].

II. CESE DE CONVIVENCIA

Las partes cesaron su convivencia con fecha [[FECHA DE CESE DE CONVIVENCIA]], esto es, hace mas de 1 ano.

Medio de prueba del cese de convivencia:
[[INDICAR: escritura publica de cese de convivencia / acta ante Oficial de Registro Civil / transaccion aprobada judicialmente / otros medios]]

III. ACUERDO COMPLETO Y SUFICIENTE (Art. 27 LMC)

Conforme al articulo 27 de la Ley 19.947, ambos conyuges presentan acuerdo completo y suficiente que regula las siguientes materias:

a) ALIMENTOS entre los conyuges y respecto de los hijos:
[[INDICAR: monto, forma y periodicidad de los alimentos, o declarar que se renuncia mutuamente a ellos. Respecto de hijos: monto de pension alimenticia.]]

b) REGIMEN DE BIENES / LIQUIDACION:
[[INDICAR: como se liquida la sociedad conyugal o comunidad, o declarar que ya fue liquidada, o que el regimen es separacion de bienes.]]

c) CUIDADO PERSONAL DE LOS HIJOS:
[[SI HAY HIJOS MENORES: indicar con quien quedaran, o si sera cuidado compartido. SI NO HAY: declarar que no existen hijos menores.]]

d) RELACION DIRECTA Y REGULAR (visitas):
[[SI HAY HIJOS: indicar regimen propuesto (dias, horarios, vacaciones). SI NO HAY: no aplica.]]

e) COMPENSACION ECONOMICA:
[[INDICAR: monto acordado, forma de pago, o declarar que ambos renuncian.]]

IV. FUNDAMENTO LEGAL

El articulo 55 inciso 1 de la Ley 19.947 permite el divorcio de mutuo acuerdo cuando ambos conyuges lo solicitan conjuntamente, acreditando cese de convivencia durante un lapso mayor de un ano, y acompanando un acuerdo completo y suficiente que regule sus relaciones mutuas y las concernientes a sus hijos.

Sin el acuerdo completo y suficiente del Art. 27 LMC, el tribunal no puede decretar el divorcio de mutuo acuerdo.

POR TANTO,

RUEGO A US.: Declare el divorcio de mutuo acuerdo, apruebe el acuerdo completo y suficiente acompanado, y ordene la subinscripcion de la sentencia al margen de la inscripcion matrimonial.

[NOMBRE]
RUT: [RUT]

[[NOMBRE CONYUGE 2]]
RUT: [[RUT CONYUGE 2]]`,
    instruccion_llm: `Redacta la demanda conjunta de divorcio de mutuo acuerdo. CRITICO: Sin acuerdo completo y suficiente (Art. 27 LMC) el tribunal RECHAZA la demanda de plano. El acuerdo DEBE regular: (1) alimentos entre conyuges y para hijos; (2) regimen de bienes/liquidacion; (3) cuidado personal de hijos; (4) relacion directa y regular (visitas); (5) compensacion economica. Tambien debe acreditarse cese de convivencia de al menos 1 ano. Si el cliente no entrega todos los datos del acuerdo, dejar marcadores pero advertir que son OBLIGATORIOS.`,
  },

  // ── Denuncia por violencia intrafamiliar (SCRAPEADO) ──
  {
    id: 'denuncia-por-violencia-intrafamiliar',
    keywords: ["violencia intrafamiliar", "VIF", "maltrato", "agresión pareja", "violencia doméstica", "golpes pareja"],
    titulo: "Denuncia por violencia intrafamiliar",
    tipo: 'judicial',
    articulos: ["Art. 3 Ley 20.066 (violencia intrafamiliar: concepto y sanciones)", "Art. 7 Ley 20.066 (medidas cautelares en VIF)", "Art. 92 Ley 19.968 (competencia tribunal de familia en VIF)", "Art. 5 Ley 20.066 (definición de violencia intrafamiliar y sujetos protegidos)", "Art. 9 Ley 20.066 (medidas cautelares especiales)"],
    esqueleto: `[CIUDAD], [FECHA]

EN LO PRINCIPAL: Denuncia por violencia intrafamiliar. PRIMER OTROSI: Solicita medidas cautelares urgentes.

SEÑOR JUEZ DEL JUZGADO DE FAMILIA DE [CIUDAD]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. INDIVIDUALIZACION DEL DENUNCIANTE Y DEL AGRESOR

Denunciante: [NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION].
Denunciado(a) (agresor): [[NOMBRE COMPLETO DEL AGRESOR, RUT SI SE CONOCE, DOMICILIO]].

II. RELACION CON EL AGRESOR (Art. 5 Ley 20.066)

[[INDICAR VINCULO: conyuge, ex conyuge, conviviente, ex conviviente, padre/madre de hijo en comun, ascendiente, descendiente, etc. Este vinculo es REQUISITO para que proceda la VIF.]]

III. HECHOS CONSTITUTIVOS DE VIOLENCIA

[[DESCRIBIR CON PRECISION:
  - Fecha y hora de los hechos
  - Lugar donde ocurrieron
  - Descripcion detallada de la agresion (fisica, psicologica, economica, sexual)
  - Si hubo testigos: indicar nombres
  - Si hay lesiones: describir y senalar si existe constancia medica (constancia de Carabineros, urgencia hospital, SAPU)
  - Si es un patron reiterativo: describir episodios anteriores]]

IV. MEDIDAS CAUTELARES SOLICITADAS (Arts. 7 y 9 Ley 20.066)

Solicito a US. se sirva decretar las siguientes medidas cautelares de proteccion:
[[MARCAR LAS QUE CORRESPONDAN:
  a) Prohibicion de acercarse a la victima, su domicilio, lugar de trabajo o estudio
  b) Prohibicion de porte y tenencia de armas de fuego
  c) Abandono del hogar comun por parte del agresor
  d) Fijacion de alimentos provisorios
  e) Determinar regimen provisorio de cuidado personal y visitas de hijos
  f) Prohibicion de celebrar actos o contratos sobre bienes comunes
  g) Rondas periodicas de Carabineros al domicilio de la victima]]

V. PRUEBA QUE SE ACOMPANA

[[INDICAR: constancia de Carabineros, informe medico de lesiones, fotografias, mensajes de texto/WhatsApp, declaracion de testigos, denuncias anteriores, etc.]]

VI. FUNDAMENTO LEGAL

El articulo 5 de la Ley 20.066 define violencia intrafamiliar como todo maltrato que afecte la vida o la integridad fisica o psiquica de quien tenga la calidad de pariente en los terminos de dicha norma. El articulo 9 faculta al juez para decretar medidas cautelares de proteccion inmediata.

POR TANTO,

RUEGO A US.: Tenga por interpuesta denuncia por violencia intrafamiliar en contra de [[NOMBRE DEL AGRESOR]], decrete las medidas cautelares solicitadas, y en definitiva sancione al agresor conforme a la ley.

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta la denuncia por VIF. OBLIGATORIO incluir: (1) relacion con el agresor (Art. 5 Ley 20.066 - sin vinculo no procede VIF); (2) descripcion detallada de hechos con FECHA y LUGAR; (3) solicitud de medidas cautelares ESPECIFICAS del Art. 9 Ley 20.066 (prohibicion de acercarse, abandono del hogar, etc.); (4) mencion de pruebas si existen (constancias medicas, testigos). Si la victima menciona lesiones, recomendar que se haga constancia de lesiones en hospital o SAPU.`,
  },

  // ── Solicitud de régimen de relación directa y regular (visitas) (SCRAPEADO) ──
  {
    id: 'solicitud-de-r-gimen-de-relaci-n-directa',
    keywords: ["régimen visitas", "visitas hijo", "relación directa", "ver hijo", "padre no custodio"],
    titulo: "Solicitud de régimen de relación directa y regular (visitas)",
    tipo: 'judicial',
    articulos: ["Art. 229 Código Civil (derecho a mantener relación con los hijos)", "Art. 229 bis Código Civil (relación directa y regular: condiciones)", "Art. 48 Ley 16.618 (Ley de Menores, régimen de visitas)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[fijación de régimen de relación directa y regular con el menor]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para régimen de visitas / relación directa y regular padre no custodio. Petición: fijación de régimen de relación directa y regular con el menor. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Solicitud de alimentos provisorios urgentes (SCRAPEADO) ──
  {
    id: 'solicitud-de-alimentos-provisorios-urgen',
    keywords: ["alimentos provisorios", "pensión provisional", "urgente alimentos", "medida cautelar alimentos"],
    titulo: "Solicitud de alimentos provisorios urgentes",
    tipo: 'judicial',
    articulos: ["Art. 4 Ley 14.908 (alimentos provisorios desde primera presentación)", "Art. 5 Ley 14.908 (monto mínimo alimentos provisorios: 40% ingreso mínimo)", "Art. 327 Código Civil (obligación alimentaria y su extensión)"],
    esqueleto: `[CIUDAD], [FECHA]

EN LO PRINCIPAL: Solicita alimentos provisorios urgentes.

SEÑOR JUEZ DEL JUZGADO DE FAMILIA DE [CIUDAD]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. URGENCIA Y NECESIDADES INMEDIATAS

[[DESCRIBIR LA SITUACION DE URGENCIA: necesidades basicas insatisfechas del alimentario, falta de recursos para alimentacion, salud, educacion. Indicar por que se requiere fijacion inmediata sin esperar sentencia definitiva.]]

II. INDIVIDUALIZACION

Alimentario(s): [[NOMBRE COMPLETO DEL HIJO/A, RUT, FECHA DE NACIMIENTO Y EDAD]]
Demandado: [[NOMBRE COMPLETO DEL DEMANDADO, RUT, DOMICILIO PARA NOTIFICAR]]
Vinculo: [[RELACION DE PARENTESCO - adjuntar certificado de nacimiento como acreditacion sumaria]]

III. ACREDITACION SUMARIA DE LA OBLIGACION

Se acompana certificado de nacimiento que acredita la relacion de filiacion y por tanto la obligacion alimentaria del demandado conforme al Art. 321 del Codigo Civil.

IV. MONTO PROVISORIO SOLICITADO

Solicito se fijen alimentos provisorios por un monto de $[[MONTO SOLICITADO]], equivalente a [[PORCENTAJE]]% del ingreso minimo remuneracional.

Fundamento: El Art. 5 de la Ley 14.908 establece que el monto minimo de la pension alimenticia no podra ser inferior al 40% del ingreso minimo remuneracional por cada hijo, esto es, actualmente no inferior a $[[MONTO MINIMO LEGAL APROXIMADO]].

V. FUNDAMENTO LEGAL

El articulo 4 de la Ley 14.908 faculta al juez para fijar alimentos provisorios con el solo merito de la demanda, sin necesidad de audiencia previa. El articulo 5 establece el piso minimo del 40% del ingreso minimo remuneracional.

POR TANTO,

RUEGO A US.: Fije alimentos provisorios a favor de [[NOMBRE DEL ALIMENTARIO]] por un monto de $[[MONTO]], con el solo merito de la presente solicitud y los antecedentes acompanados, conforme al Art. 4 de la Ley 14.908.

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta la solicitud de alimentos provisorios urgentes. CRITICO: Los alimentos provisorios se decretan de plano con la sola presentacion (Art. 4 Ley 14.908) - incluir siempre el monto minimo legal (40% ingreso minimo remuneracional = aprox $180.000) como piso. Incluir: (1) urgencia y necesidades inmediatas; (2) acreditacion sumaria (certificado de nacimiento); (3) monto solicitado con referencia al minimo legal. Si el demandante no indica monto, usar el minimo legal como referencia.`,
  },

  // ── Demanda de cobro de dinero (SCRAPEADO) ──
  {
    id: 'demanda-de-cobro-de-dinero',
    keywords: ["cobro de dinero", "cobrar dinero", "cobro de pesos", "cobrar deuda", "me deben dinero", "me deben plata", "préstamo no pagado", "cobro judicial"],
    titulo: "Demanda de cobro de dinero",
    tipo: 'judicial',
    articulos: ["Art. 1437 Código Civil (fuentes de las obligaciones)", "Art. 1546 Código Civil (contratos deben ejecutarse de buena fe)", "Art. 548 CPC (procedimiento sumario para cobros)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[cobro de suma líquida adeudada con reajuste, intereses y costas]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para cobro judicial de deuda / suma de dinero adeudada. Petición: cobro de suma líquida adeudada con reajuste, intereses y costas. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Demanda de indemnización de perjuicios (SCRAPEADO) ──
  {
    id: 'demanda-de-indemnizaci-n-de-perjuicios',
    keywords: ["indemnización", "perjuicios", "daño", "responsabilidad civil", "daño moral", "incumplimiento contrato"],
    titulo: "Demanda de indemnización de perjuicios",
    tipo: 'judicial',
    articulos: ["Art. 1556 Código Civil (indemnización comprende daño emergente y lucro cesante)", "Art. 1557 Código Civil (mora del deudor como requisito)", "Art. 2314 Código Civil (responsabilidad extracontractual)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[indemnización de perjuicios por daño emergente, lucro cesante y daño moral]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para indemnización de perjuicios por incumplimiento contractual o daño. Petición: indemnización de perjuicios por daño emergente, lucro cesante y daño moral. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Cobro de cheque protestado (SCRAPEADO) ──
  {
    id: 'cobro-de-cheque-protestado',
    keywords: ["cheque protestado", "cheque sin fondos", "protesto cheque", "cobrar cheque"],
    titulo: "Cobro de cheque protestado",
    tipo: 'judicial',
    articulos: ["Art. 22 Ley 18.092 (acción ejecutiva del tenedor del cheque)", "Art. 434 N°4 CPC (cheque como título ejecutivo)", "Art. 69 Ley 18.092 (solidaridad en el cheque)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[embargo y pago del monto del cheque protestado con intereses y costas]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para demanda ejecutiva por cheque protestado. Petición: embargo y pago del monto del cheque protestado con intereses y costas. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Rescisión de contrato por incumplimiento (SCRAPEADO) ──
  {
    id: 'rescisi-n-de-contrato-por-incumplimiento',
    keywords: ["rescisión contrato", "resolución contrato", "incumplimiento", "terminar contrato", "nulidad contrato"],
    titulo: "Rescisión de contrato por incumplimiento",
    tipo: 'judicial',
    articulos: ["Art. 1489 Código Civil (condición resolutoria tácita por incumplimiento)", "Art. 1826 Código Civil (obligación de entrega del vendedor)", "Art. 1873 Código Civil (resolución compraventa por no pago del precio)", "Art. 1552 Código Civil (mora purga la mora)", "Art. 1681 Código Civil (nulidad por vicio del consentimiento)"],
    esqueleto: `[CIUDAD], [FECHA]

EN LO PRINCIPAL: Demanda de resolucion de contrato por incumplimiento. PRIMER OTROSI: Indemnizacion de perjuicios. SEGUNDO OTROSI: Acompana documentos.

SEÑOR JUEZ DEL JUZGADO DE LETRAS EN LO CIVIL DE [CIUDAD]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. INDIVIDUALIZACION DE LAS PARTES

Demandante: [NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION].
Demandado: [[NOMBRE COMPLETO O RAZON SOCIAL DEL DEMANDADO, RUT, DOMICILIO]].

II. EL CONTRATO

Tipo de contrato: [[COMPRAVENTA / ARRENDAMIENTO / PRESTACION DE SERVICIOS / OBRA / OTRO]].
Fecha de celebracion: [[FECHA DEL CONTRATO]].
Objeto: [[DESCRIBIR EL OBJETO DEL CONTRATO: que se obligo a hacer o entregar cada parte]].
Precio o contraprestacion: [[MONTO PACTADO Y FORMA DE PAGO]].

III. INCUMPLIMIENTO DEL DEMANDADO

[[DESCRIBIR DETALLADAMENTE EL INCUMPLIMIENTO: que obligacion no se cumplio, desde cuando, si hubo requerimiento previo de cumplimiento]]

IV. PERJUICIOS SUFRIDOS

[[DESCRIBIR LOS PERJUICIOS: dano emergente (gastos incurridos), lucro cesante (ganancias perdidas), dano moral si procede]]

V. DERECHO

Art. 1489 CC: en todo contrato bilateral va envuelta la condicion resolutoria tacita de no cumplirse por una de las partes lo pactado. El contratante diligente puede pedir la resolucion o el cumplimiento forzado, con indemnizacion de perjuicios.

POR TANTO,

RUEGO A US.: (1) declarar resuelto el contrato por incumplimiento del demandado; (2) condenar al demandado a la restitucion de [[LO PAGADO / LO ENTREGADO]]; (3) condenar al demandado al pago de indemnizacion de perjuicios por $[[MONTO]], con costas.

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta la demanda de resolucion o rescision de contrato por incumplimiento. IMPORTANTE - Distinguir correctamente: (1) RESOLUCION (Art. 1489 CC): procede por incumplimiento de obligaciones contractuales, con derecho a indemnizacion. Es la accion mas comun. (2) RESCISION o nulidad relativa (Art. 1681 CC): procede por vicio del consentimiento (error, fuerza, dolo), devuelve a las partes al estado anterior al contrato. Usar el termino correcto segun los hechos del cliente. Si es compraventa, considerar Art. 1826 CC (obligacion de entrega) o Art. 1873 CC (resolucion por no pago del precio). Razona con los hechos especificos del cliente.`,
  },

  // ── Solicitud de renegociación de deudas (SUPERIR / Ley 20.720) (SCRAPEADO) ──
  {
    id: 'solicitud-de-renegociaci-n-de-deudas-sup',
    keywords: ["renegociacion de deudas", "renegociacion deuda", "renegociacion", "quiebra personal", "SUPERIR", "insolvencia", "deudas impagables", "no puedo pagar mis deudas", "sobreendeudamiento", "concursal personal"],
    titulo: "Solicitud de renegociación de deudas (SUPERIR / Ley 20.720)",
    tipo: 'administrativo',
    articulos: ["Art. 260 Ley 20.720 (procedimiento de renegociación de persona natural)", "Art. 261 Ley 20.720 (requisitos para acceder a renegociación)", "Art. 264 Ley 20.720 (efectos del acuerdo de renegociación)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

III. PETICION

[[inicio de procedimiento de renegociación ante SUPERIR]]

Es cuanto puedo informar.

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para procedimiento concursal simplificado / renegociación persona natural. Petición: inicio de procedimiento de renegociación ante SUPERIR. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Oposición a embargo / recurso de amparo de bienes (SCRAPEADO) ──
  {
    id: 'oposici-n-a-embargo-recurso-de-amparo-de',
    keywords: ["oposición embargo", "bienes inembargables", "embargo ilegal", "recurso amparo bienes", "levantar embargo"],
    titulo: "Oposición a embargo / recurso de amparo de bienes",
    tipo: 'judicial',
    articulos: ["Art. 518 CPC (tercería de dominio o posesión sobre bienes embargados)", "Art. 445 CPC (bienes inembargables)", "Art. 519 CPC (efectos de la tercería)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[alzamiento del embargo sobre bienes inembargables o de propiedad de tercero]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para oposición a embargo indebido o sobre bienes inembargables. Petición: alzamiento del embargo sobre bienes inembargables o de propiedad de tercero. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Demanda terminación arriendo por no pago de renta (SCRAPEADO) ──
  {
    id: 'demanda-terminaci-n-arriendo-por-no-pago',
    keywords: ["desalojo", "desalojo por no pago", "demanda desalojo", "no pago arriendo", "no paga arriendo", "arrendatario moroso", "arriendo impago", "desahucio no pago"],
    titulo: "Demanda terminación arriendo por no pago de renta",
    tipo: 'judicial',
    articulos: ["Art. 10 Ley 18.101 (término anticipado por no pago de renta)", "Art. 1977 Código Civil (resolución arrendamiento por mora)", "Art. 611 CPC (procedimiento de arrendamiento en JPL)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[término del contrato de arriendo y pago de rentas adeudadas con costas]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para término de contrato de arriendo por mora en el pago. Petición: término del contrato de arriendo y pago de rentas adeudadas con costas. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Demanda cobro de rentas de arriendo impagas (SCRAPEADO) ──
  {
    id: 'demanda-cobro-de-rentas-de-arriendo-impa',
    keywords: ["cobrar arriendo", "rentas impagas", "arriendo adeudado", "cobro rentas"],
    titulo: "Demanda cobro de rentas de arriendo impagas",
    tipo: 'judicial',
    articulos: ["Art. 17 Ley 18.101 (cobro de rentas impagas)", "Art. 598 CPC (procedimiento de cobro de renta)", "Art. 1978 Código Civil (derecho del arrendador al pago de la renta)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[cobro ejecutivo de rentas de arriendo adeudadas con reajuste e intereses]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para cobro judicial de rentas de arriendo adeudadas. Petición: cobro ejecutivo de rentas de arriendo adeudadas con reajuste e intereses. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Demanda de devolución de garantía de arriendo (SCRAPEADO) ──
  {
    id: 'demanda-de-devoluci-n-de-garant-a-de-arr',
    keywords: ["devolucion de garantia de arriendo", "garantia de arriendo", "garantia del arriendo", "mes de garantia", "deposito de arriendo", "no devolvieron garantia", "no me devuelven la garantia"],
    titulo: "Demanda de devolución de garantía de arriendo",
    tipo: 'judicial',
    articulos: ["Art. 46 Ley 18.101 (devolución de garantía al término del arriendo)", "Art. 1942 Código Civil (obligaciones del arrendatario al restituir)", "Art. 548 CPC (procedimiento sumario para cobros menores)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[restitución de la garantía de arriendo con reajuste e intereses]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para cobro de garantía o mes de arriendo no devuelto al término. Petición: restitución de la garantía de arriendo con reajuste e intereses. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Reclamo ante CMF por cobros bancarios irregulares (SCRAPEADO) ──
  {
    id: 'reclamo-ante-cmf-por-cobros-bancarios-ir',
    keywords: ["banco", "cobro bancario", "CMF", "comisión abusiva", "cargo no autorizado", "tarjeta crédito"],
    titulo: "Reclamo ante CMF por cobros bancarios irregulares",
    tipo: 'carta',
    articulos: ["Art. 17 B Ley 19.496 (derechos del consumidor financiero)", "Art. 3 bis Ley 19.496 (derecho a retracto en servicios financieros)", "Art. 62 Ley 19.496 (competencia juzgado de policía local en consumo)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

III. PETICION

[[devolución de cobros indebidos y corrección de la cuenta]]

Sin otro particular, saluda atentamente,

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para reclamo contra banco por cobros indebidos o abusivos. Petición: devolución de cobros indebidos y corrección de la cuenta. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Reclamo ante Superintendencia de Salud por ISAPRE (SCRAPEADO) ──
  {
    id: 'reclamo-ante-superintendencia-de-salud-p',
    keywords: ["isapre", "superintendencia de salud", "rechazo isapre", "plan isapre", "cirugía isapre", "hospitalización isapre", "cobertura isapre", "preexistente isapre", "alza plan isapre"],
    titulo: "Reclamo ante Superintendencia de Salud por ISAPRE",
    tipo: 'carta',
    articulos: ["Art. 38 ter Ley 18.933 (tabla de factores de riesgo ISAPRE)", "Art. 197 DFL 1/2005 Salud (reclamos ante Superintendencia)", "Art. 24 bis Ley 18.933 (cobertura mínima garantizada GES)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

III. PETICION

[[reconsideración del rechazo y cobertura de la prestación médica]]

Sin otro particular, saluda atentamente,

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para reclamo contra isapre por rechazo de prestaciones o alza de plan. Petición: reconsideración del rechazo y cobertura de la prestación médica. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Reclamo ante SUBTEL por empresa de telecomunicaciones (SCRAPEADO) ──
  {
    id: 'reclamo-ante-subtel-por-empresa-de-telec',
    keywords: ["internet", "telefonía", "telecomunicaciones", "telecom", "empresa de telecomunicaciones", "SUBTEL", "movistar", "entel", "vtr", "claro", "empresa telefonía", "corte servicio"],
    titulo: "Reclamo ante SUBTEL por empresa de telecomunicaciones",
    tipo: 'carta',
    articulos: ["Art. 28 Ley 18.168 (obligación de calidad de servicios de telecomunicaciones)", "Art. 36 Ley 18.168 (sanciones por infracción a normas de telecomunicaciones)", "Art. 12 Ley 19.496 (derecho a información y servicio conforme a contrato)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

III. PETICION

[[reparación del servicio, cobro indebido devuelto y/o indemnización]]

Sin otro particular, saluda atentamente,

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para reclamo contra empresa de telefonía, internet o cable. Petición: reparación del servicio, cobro indebido devuelto y/o indemnización. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Reclamo por garantía legal de producto defectuoso (SCRAPEADO) ──
  {
    id: 'reclamo-por-garant-a-legal-de-producto-d',
    keywords: ["garantia legal", "garantia del producto", "producto defectuoso", "falla producto", "producto fallado", "reparación gratuita", "cambio producto", "producto con falla"],
    titulo: "Reclamo por garantía legal de producto defectuoso",
    tipo: 'carta',
    articulos: ["Art. 20 Ley 19.496 (garantía legal: reparación, cambio o devolución de dinero)", "Art. 21 Ley 19.496 (plazo de 3 meses para ejercer garantía)", "Art. 19 Ley 19.496 (obligación de entrega conforme a contrato)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

III. PETICION

[[reparación gratuita, reemplazo del producto o devolución del precio]]

Sin otro particular, saluda atentamente,

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para garantía legal por producto con fallas o defectos. Petición: reparación gratuita, reemplazo del producto o devolución del precio. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Solicitud de término de suscripción o servicio recurrente (SCRAPEADO) ──
  {
    id: 'solicitud-de-t-rmino-de-suscripci-n-o-se',
    keywords: ["cancelar suscripción", "término contrato", "dar de baja servicio", "retracto servicio", "no me dejan salir"],
    titulo: "Solicitud de término de suscripción o servicio recurrente",
    tipo: 'carta',
    articulos: ["Art. 3 bis Ley 19.496 (derecho a retracto en contratos de adhesión)", "Art. 16 G Ley 19.496 (prohibición de cláusulas que impidan término unilateral)", "Art. 12 Ley 19.496 (derecho a información sobre condiciones de término)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

III. PETICION

[[término inmediato de la suscripción y devolución de cargos prepagados]]

Sin otro particular, saluda atentamente,

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para término anticipado de contrato de suscripción o servicio continuo. Petición: término inmediato de la suscripción y devolución de cargos prepagados. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Recurso jerárquico contra resolución administrativa (SCRAPEADO) ──
  {
    id: 'recurso-jer-rquico-contra-resoluci-n-adm',
    keywords: ["recurso jerárquico", "impugnar resolución", "acto administrativo", "recurso administrativo", "apelación administrativa"],
    titulo: "Recurso jerárquico contra resolución administrativa",
    tipo: 'recurso',
    articulos: ["Art. 59 Ley 19.880 (recurso jerárquico: plazo 5 días hábiles)", "Art. 60 Ley 19.880 (resolución del recurso: 30 días hábiles)", "Art. 10 Ley 19.880 (principio de impugnabilidad de actos administrativos)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[revocación o modificación del acto administrativo impugnado]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para recurso jerárquico ante superior jerárquico por acto administrativo. Petición: revocación o modificación del acto administrativo impugnado. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Recurso de reposición ante organismo administrativo (SCRAPEADO) ──
  {
    id: 'recurso-de-reposici-n-ante-organismo-adm',
    keywords: ["reposición administrativa", "recurso reposición", "reconsideración", "impugnar acto municipio", "reclamar resolución"],
    titulo: "Recurso de reposición ante organismo administrativo",
    tipo: 'recurso',
    articulos: ["Art. 59 Ley 19.880 (recurso de reposición: plazo 5 días hábiles)", "Art. 61 Ley 19.880 (inexistencia de recursos no agota la vía administrativa)", "Art. 10 Ley 19.880 (principio de impugnabilidad)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[reconsideración y revocación de la resolución por los fundamentos expuestos]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para recurso de reposición contra acto administrativo ante mismo órgano. Petición: reconsideración y revocación de la resolución por los fundamentos expuestos. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Denuncia ante la Contraloría General de la República (SCRAPEADO) ──
  {
    id: 'denuncia-ante-la-contralor-a-general-de',
    keywords: ["contraloría", "denuncia funcionario público", "irregular", "corrupción", "mal uso fondos públicos"],
    titulo: "Denuncia ante la Contraloría General de la República",
    tipo: 'administrativo',
    articulos: ["Art. 6 Ley Orgánica CGR DFL 2.421/1964 (función de control de la CGR)", "Art. 98 CPR (atribuciones de la Contraloría General)", "Art. 238 Código Penal (malversación de caudales públicos)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

III. PETICION

[[investigación de las irregularidades denunciadas y sanción de los responsables]]

Es cuanto puedo informar.

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para denuncia de irregularidades o corrupción en órgano público. Petición: investigación de las irregularidades denunciadas y sanción de los responsables. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Reclamo catastro y avalúo fiscal ante SII (SCRAPEADO) ──
  {
    id: 'reclamo-catastro-y-aval-o-fiscal-ante-si',
    keywords: ["SII", "avalúo fiscal", "contribuciones", "impuesto territorial", "catastro SII", "revisión avalúo"],
    titulo: "Reclamo catastro y avalúo fiscal ante SII",
    tipo: 'recurso',
    articulos: ["Art. 149 Código Tributario (reclamación ante TTA)", "Art. 9 Ley 17.235 (plazo reclamación avalúo: 90 días)", "Art. 124 Código Tributario (procedimiento general de reclamaciones)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[corrección del avalúo fiscal y reducción de contribuciones]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para reclamación tributaria por avalúo fiscal de bien raíz o sii. Petición: corrección del avalúo fiscal y reducción de contribuciones. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Solicitud de pensión básica solidaria (IPS/FONASA) (SCRAPEADO) ──
  {
    id: 'solicitud-de-pensi-n-b-sica-solidaria-ip',
    keywords: ["pensión solidaria", "PBS", "pensión vejez", "IPS", "ChileAtiende", "pensión básica"],
    titulo: "Solicitud de pensión básica solidaria (IPS/FONASA)",
    tipo: 'administrativo',
    articulos: ["Art. 3 Ley 20.255 (requisitos pensión básica solidaria de vejez)", "Art. 4 Ley 20.255 (monto de la pensión básica solidaria)", "Art. 12 Ley 20.255 (sistema de pilares solidarios)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

III. PETICION

[[otorgamiento de pensión básica solidaria por cumplir los requisitos legales]]

Es cuanto puedo informar.

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para solicitud pensión básica solidaria de vejez o invalidez. Petición: otorgamiento de pensión básica solidaria por cumplir los requisitos legales. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Acción de no discriminación arbitraria (Ley Zamudio) (SCRAPEADO) ──
  {
    id: 'acci-n-de-no-discriminaci-n-arbitraria-l',
    keywords: ["discriminación", "Ley Zamudio", "ley 20609", "discriminación racial", "discriminación sexual", "trato diferenciado ilegal"],
    titulo: "Acción de no discriminación arbitraria (Ley Zamudio)",
    tipo: 'judicial',
    articulos: ["Art. 3 Ley 20.609 (acción de no discriminación arbitraria)", "Art. 5 Ley 20.609 (legitimación activa: cualquier persona discriminada)", "Art. 19 N°2 CPR (igualdad ante la ley y prohibición de discriminación arbitraria)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[declaración de acto discriminatorio, cese de la conducta e indemnización]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para denuncia de discriminación por raza, sexo, origen, religión u otra causa. Petición: declaración de acto discriminatorio, cese de la conducta e indemnización. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Denuncia por amenazas o acoso (Querella criminal) (SCRAPEADO) ──
  {
    id: 'denuncia-por-amenazas-o-acoso-querella-c',
    keywords: ["amenaza", "amenazas", "querella", "acoso", "intimidación", "delito penal"],
    titulo: "Denuncia por amenazas o acoso (Querella criminal)",
    tipo: 'judicial',
    articulos: ["Art. 296 Código Penal (amenazas de daño: pena reclusión menor)", "Art. 297 Código Penal (amenazas condicionales)", "Art. 261 CPP (requisitos de la querella)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[investigación penal, medidas cautelares y condena del imputado]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para querella criminal por amenazas, acoso o delitos menores. Petición: investigación penal, medidas cautelares y condena del imputado. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Reclamo por seguro no pagado o rechazado (SCRAPEADO) ──
  {
    id: 'reclamo-por-seguro-no-pagado-o-rechazado',
    keywords: ["seguro", "siniestro rechazado", "aseguradora", "CMF seguros", "póliza", "no pagaron seguro"],
    titulo: "Reclamo por seguro no pagado o rechazado",
    tipo: 'carta',
    articulos: ["Art. 542 Código de Comercio (obligación del asegurador de indemnizar siniestro)", "Art. 524 Código de Comercio (contrato de seguro)", "Art. 68 DFL 251/1931 (CMF: supervisión de compañías de seguros)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

III. PETICION

[[pago de la indemnización del siniestro conforme a la póliza contratada]]

Sin otro particular, saluda atentamente,

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para reclamo contra aseguradora por negativa de pago de siniestro. Petición: pago de la indemnización del siniestro conforme a la póliza contratada. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Solicitud de inscripción en registro civil / rectificación (SCRAPEADO) ──
  {
    id: 'solicitud-de-inscripci-n-en-registro-civ',
    keywords: ["registro civil", "rectificación acta", "cambio nombre", "error partida nacimiento", "inscripción"],
    titulo: "Solicitud de inscripción en registro civil / rectificación",
    tipo: 'judicial',
    articulos: ["Art. 17 Ley 4.808 (rectificación de inscripciones en el Registro Civil)", "Art. 45 Ley 17.344 (cambio de nombre y apellidos)", "Art. 1 Ley 4.808 (Registro Civil de Identificación)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[rectificación de la inscripción registral y emisión de nueva documentación]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para solicitud rectificación de acta o inscripción en registro civil. Petición: rectificación de la inscripción registral y emisión de nueva documentación. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Solicitud de alimentos entre cónyuges separados (SCRAPEADO) ──
  {
    id: 'solicitud-de-alimentos-entre-c-nyuges-se',
    keywords: ["alimentos cónyuge", "pensión separación", "manutención ex pareja", "alimentos esposo esposa"],
    titulo: "Solicitud de alimentos entre cónyuges separados",
    tipo: 'judicial',
    articulos: ["Art. 321 N°1 Código Civil (alimentos entre cónyuges)", "Art. 175 Código Civil (obligación alimentaria tras divorcio por culpa)", "Art. 3 Ley 14.908 (competencia tribunal familia para alimentos)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[fijación de pensión de alimentos entre cónyuges separados o divorciados]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para pensión de alimentos entre ex cónyuges o separados. Petición: fijación de pensión de alimentos entre cónyuges separados o divorciados. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Reclamo por servicio de agua o alcantarillado (SISS) (SCRAPEADO) ──
  {
    id: 'reclamo-por-servicio-de-agua-o-alcantari',
    keywords: ["agua", "empresa sanitaria", "SISS", "Aguas Andinas", "corte agua", "cobro agua", "alcantarillado"],
    titulo: "Reclamo por servicio de agua o alcantarillado (SISS)",
    tipo: 'carta',
    articulos: ["Art. 11 DFL 382/1988 (obligaciones de la empresa sanitaria)", "Art. 32 DFL 382/1988 (prohibición de corte sin notificación previa)", "Art. 10 bis Ley 19.496 (derecho a no ser cortado el servicio básico sin aviso)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

III. PETICION

[[reconexión del servicio y/o corrección de cobros indebidos]]

Sin otro particular, saluda atentamente,

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para reclamo contra empresa sanitaria por corte o cobro indebido de agua. Petición: reconexión del servicio y/o corrección de cobros indebidos. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Solicitud de pensión de sobrevivencia (AFP/IPS) (SCRAPEADO) ──
  {
    id: 'solicitud-de-pensi-n-de-sobrevivencia-af',
    keywords: ["pensión viudez", "sobrevivencia", "fallecimiento afiliado", "pensión orfandad", "pensión muerto"],
    titulo: "Solicitud de pensión de sobrevivencia (AFP/IPS)",
    tipo: 'administrativo',
    articulos: ["Art. 5 DL 3.500 (beneficiarios de pensión de sobrevivencia)", "Art. 6 DL 3.500 (pensión de viudez y orfandad)", "Art. 58 DL 3.500 (plazo para solicitar pensión de sobrevivencia)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

III. PETICION

[[otorgamiento de pensión de sobrevivencia por fallecimiento del causante]]

Es cuanto puedo informar.

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para pensión de viudez o orfandad tras fallecimiento del causante. Petición: otorgamiento de pensión de sobrevivencia por fallecimiento del causante. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Reclamo por multa de tránsito (Juzgado de Policía Local) (SCRAPEADO) ──
  {
    id: 'reclamo-por-multa-de-tr-nsito-juzgado-de',
    keywords: ["multa tránsito", "infracción tránsito", "parte carabineros", "recurso multa", "JPL tránsito"],
    titulo: "Reclamo por multa de tránsito (Juzgado de Policía Local)",
    tipo: 'recurso',
    articulos: ["Art. 20 Ley 18.287 (recurso de reposición ante JPL: plazo 5 días hábiles)", "Art. 171 Ley 18.290 (procedimiento infracciones de tránsito)", "Art. 7 Ley 18.287 (citación al denunciado)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[dejar sin efecto la infracción de tránsito por los fundamentos expuestos]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para recurso de reposición contra infracción de tránsito. Petición: dejar sin efecto la infracción de tránsito por los fundamentos expuestos. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Demanda de precario (recuperación de inmueble) (SCRAPEADO) ──
  {
    id: 'demanda-de-precario-recuperaci-n-de-inmu',
    keywords: ["precario", "ocupación sin título", "recuperar propiedad", "intruso propiedad", "ocupante sin contrato"],
    titulo: "Demanda de precario (recuperación de inmueble)",
    tipo: 'judicial',
    articulos: ["Art. 2195 Código Civil (precario: uso sin título ni contraprestación)", "Art. 680 N°6 CPC (juicio sumario para acciones de precario)", "Art. 700 Código Civil (posesión y propiedad)", "Art. 889 Código Civil (acción reivindicatoria)"],
    esqueleto: `[CIUDAD], [FECHA]

EN LO PRINCIPAL: Demanda de precario (Art. 2195 inc. 2 CC). OTROSI: Acompana documentos.

SEÑOR JUEZ DEL JUZGADO DE LETRAS EN LO CIVIL DE [CIUDAD]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. INDIVIDUALIZACION DE LAS PARTES

Demandante (propietario): [NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION].
Demandado (ocupante): [[NOMBRE COMPLETO DEL OCUPANTE, RUT SI SE CONOCE, DOMICILIO (el mismo inmueble ocupado)]].

II. ACREDITACION DEL DOMINIO

El demandante es dueno del inmueble segun consta en:
- Inscripcion de dominio: [[FOJA, NUMERO, ANO, CONSERVADOR DE BIENES RAICES DE (COMUNA)]].
- Rol de avaluo fiscal: [[ROL DE AVALUO DEL SII]].
- Titulo de adquisicion: [[COMPRAVENTA / HERENCIA / DONACION / ADJUDICACION - fecha y notaria]].

III. INDIVIDUALIZACION DEL INMUEBLE

Direccion: [[DIRECCION COMPLETA DEL INMUEBLE]].
Comuna: [[COMUNA]].
Superficie: [[METROS CUADRADOS APROXIMADOS]].
Deslindes: [[NORTE, SUR, ORIENTE, PONIENTE - si se conocen]].

IV. OCUPACION EN PRECARIO

El demandado ocupa el inmueble individualizado:
- Sin titulo alguno: [[NO EXISTE CONTRATO DE ARRIENDO, COMODATO NI NINGUN OTRO TITULO QUE JUSTIFIQUE LA OCUPACION]].
- Sin pago de contraprestacion: [[EL OCUPANTE NO PAGA RENTA NI CANON ALGUNO]].
- Desde aproximadamente: [[FECHA APROXIMADA DE INICIO DE LA OCUPACION]].

V. DERECHO

Art. 2195 inc. 2 CC: constituye precario la tenencia de una cosa ajena, sin previo contrato y por ignorancia o mera tolerancia del dueno.
Art. 680 N°6 CPC: la accion de precario se tramita en procedimiento sumario.

Requisitos de la accion: (1) dominio del demandante; (2) ocupacion del demandado; (3) ausencia de titulo que justifique la tenencia; (4) ausencia de contraprestacion.

POR TANTO,

RUEGO A US.: acoger la demanda de precario y ordenar la restitucion inmediata del inmueble ubicado en [[DIRECCION]], dentro del plazo de [[10 / 15 / 30]] dias, bajo apercibimiento de lanzamiento con auxilio de la fuerza publica, con costas.

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta la demanda de precario para recuperar un inmueble ocupado sin titulo. IMPORTANTE: (1) acreditar el dominio del demandante con inscripcion en el Conservador de Bienes Raices; (2) individualizar el inmueble (direccion, rol de avaluo); (3) individualizar al ocupante; (4) acreditar que la ocupacion es SIN titulo y SIN pago (Art. 2195 inc. 2 CC); (5) si el ocupante tiene CUALQUIER contrato (arriendo, comodato, promesa), la accion correcta NO es precario sino terminacion de arrendamiento o reivindicacion. Solicitar restitucion con plazo y apercibimiento de lanzamiento. Razona con los hechos especificos del cliente.`,
  },

  // ── Reclamo por Incumplimiento de Plazos en Portabilidad Financiera (SCRAPEADO) ──
  {
    id: 'reclamo-portabilidad-financiera',
    keywords: ["portabilidad financiera", "portabilidad", "traspaso bancario", "cierre de cuenta bancaria", "incumplimiento plazos portabilidad"],
    titulo: "Reclamo por Incumplimiento de Plazos en Portabilidad Financiera",
    tipo: 'administrativo',
    articulos: ["Ley de Portabilidad Financiera (Ley N° 21.236)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

III. PETICION

[[Se solicita al SERNAC que investigue el incumplimiento de plazos por parte de la institución financiera de origen y que adopte las medidas sancionatorias correspondientes.]]

Es cuanto puedo informar.

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Personaliza el reclamo con los datos del consumidor (nombre, RUT, dirección), la institución financiera de origen, la nueva institución, la fecha de solicitud de portabilidad, el plazo incumplido y los antecedentes específicos que no fueron remitidos.`,
  },

  // ── Reclamo por Incumplimiento de la Ley de Protección al Consumidor (SCRAPEADO) ──
  {
    id: 'reclamo-por-incumplimiento-ley-19496',
    keywords: ["ley 19496", "ley del consumidor", "ley de proteccion al consumidor"],
    titulo: "Reclamo por Incumplimiento de la Ley de Protección al Consumidor",
    tipo: 'judicial',
    articulos: ["Art. 1 Ley 19.496 (Ámbito de aplicación)", "Art. 3 Ley 19.496 (Derechos del consumidor)", "Art. 12 Ley 19.496 (Incumplimiento de oferta)", "Art. 23 Ley 19.496 (Infracciones)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[Se solicita al tribunal que declare el incumplimiento del proveedor y ordene la reparación, indemnización o cumplimiento forzado de la obligación, según corresponda.]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Personaliza el reclamo con los datos del consumidor (nombre, RUT, domicilio), del proveedor (nombre, RUT, dirección), descripción detallada del incumplimiento (fecha, producto/servicio, monto), y la petición concreta (reparación, indemnización, etc.). Incluye los artículos de la Ley 19.496 aplicables al caso.`,
  },

  // ── Solicitud de Pensión Alimenticia (SCRAPEADO) ──
  {
    id: 'solicitud-de-pension-alimenticia',
    keywords: ["pensión alimenticia", "abandono de familia", "ley 14908", "alimentos", "hijos", "cónyuge"],
    titulo: "Solicitud de Pensión Alimenticia",
    tipo: 'judicial',
    articulos: ["Art. 1 Ley 14.908 (obligación de prestar alimentos)", "Art. 3 Ley 14.908 (procedimiento judicial)", "Art. 7 Ley 14.908 (monto mínimo: 40% ingreso mínimo remuneracional por hijo)", "Art. 329 Código Civil (tasación de alimentos)", "Art. 330 Código Civil (alimentos congruos y necesarios)"],
    esqueleto: `[CIUDAD], [FECHA]

EN LO PRINCIPAL: Demanda de alimentos. PRIMER OTROSI: Alimentos provisorios.

SEÑOR JUEZ DEL JUZGADO DE FAMILIA DE [CIUDAD]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. INDIVIDUALIZACION DE LAS PARTES

Demandante (representante del alimentario): [NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION].
Alimentario(s): [[NOMBRE COMPLETO DEL HIJO/A, RUT, FECHA DE NACIMIENTO Y EDAD]]
Demandado: [[NOMBRE COMPLETO DEL DEMANDADO, RUT, DOMICILIO PARA NOTIFICAR]]

II. RELACION DE PARENTESCO

[[INDICAR VINCULO: padre/madre del menor. ACREDITAR CON: certificado de nacimiento que se acompana]]

III. NECESIDADES DEL ALIMENTARIO

[[DESGLOSAR NECESIDADES:
  - Alimentacion: $______
  - Educacion (colegio, utiles, uniforme): $______
  - Salud (Isapre/Fonasa, medicamentos): $______
  - Vestuario: $______
  - Vivienda (proporcion): $______
  - Recreacion y transporte: $______
  - TOTAL NECESIDADES MENSUALES: $______]]

IV. CAPACIDAD ECONOMICA DEL DEMANDADO

[[DESCRIBIR: ocupacion, lugar de trabajo, ingresos conocidos o estimados, bienes, nivel de vida. Si no se conocen ingresos exactos, solicitar oficios a SII, AFP, bancos.]]

V. FUNDAMENTO LEGAL

El articulo 321 del Codigo Civil establece la obligacion de prestar alimentos a los hijos. El articulo 329 del Codigo Civil dispone que los alimentos se tasan en proporcion a las necesidades del alimentario y las facultades del alimentante. El articulo 7 de la Ley 14.908 fija como minimo legal el 40% del ingreso minimo remuneracional por hijo.

POR TANTO,

RUEGO A US.: Se sirva fijar una pension de alimentos definitiva a favor de [[NOMBRE DEL ALIMENTARIO]] por un monto de $[[MONTO SOLICITADO]] mensuales, o en subsidio, no inferior al minimo legal del Art. 7 Ley 14.908.

PRIMER OTROSI: Solicito a US. se sirva fijar alimentos provisorios por el monto de $[[MONTO PROVISORIO]] desde la notificacion de la demanda, con el solo merito de los antecedentes acompanados.

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Personaliza el escrito con los nombres del solicitante y del demandado, monto solicitado, relacion familiar (hijos, conyuge), y antecedentes de ingresos del demandado. OBLIGATORIO: incluir individualizacion del alimentario (nombre, RUT, edad), relacion de parentesco, desglose de necesidades, y capacidad economica del demandado. El minimo legal es 40% del ingreso minimo remuneracional por hijo (Art. 7 Ley 14.908). Si no se conocen montos exactos, usar $_____ como marcador.`,
  },

  // ── Arrendamiento Urbano (SCRAPEADO) ──
  {
    id: 'arrendamiento-urbano',
    keywords: ["arrendamiento urbano", "ley 18.101", "renta", "juicio de arrendamiento"],
    titulo: "Arrendamiento Urbano",
    tipo: 'judicial',
    articulos: ["Art. 1 Ley 18.101 (Definición de arrendamiento urbano)", "Art. 2 Ley 18.101 (Plazo mínimo de arrendamiento)", "Art. 3 Ley 18.101 (Desahucio y terminación del contrato)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[Se solicita la terminación del contrato de arrendamiento, el desahucio del inmueble y/o el pago de rentas adeudadas.]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Personaliza el escrito con los datos del arrendador y arrendatario, dirección del inmueble, monto de la renta, plazo del contrato y causal de terminación aplicable según la Ley 18.101.`,
  },

  // ── Procedimiento ante Juzgados de Policía Local (JPL) (SCRAPEADO) ──
  {
    id: 'procedimiento-jpl',
    keywords: ["juzgado de policía local", "jpl", "procedimiento", "ley 18.287", "infracción", "multa", "reclamo judicial"],
    titulo: "Procedimiento ante Juzgados de Policía Local (JPL)",
    tipo: 'judicial',
    articulos: ["Art. 1 Ley 18.287 (Ámbito de aplicación)", "Art. 2 Ley 18.287 (Competencia)", "Art. 3 Ley 18.287 (Procedimiento)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[Se solicita al tribunal acoger el reclamo o absolver al infractor, según corresponda, con costas.]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Personalizar con los datos del reclamante o denunciante, identificación de la infracción (parte, citación), tribunal competente y fundamentos de hecho y derecho específicos del caso.`,
  },

  // ── Solicitud de Medidas de Protección para Menores (SCRAPEADO) ──
  {
    id: 'solicitud-medidas-proteccion-menores',
    keywords: ["medidas de protección", "menores", "tribunal de familia", "ley 19968", "niños", "niñas", "adolescentes", "vulneración de derechos"],
    titulo: "Solicitud de Medidas de Protección para Menores",
    tipo: 'judicial',
    articulos: ["Art. 1 Ley 19.968 (Creación de Tribunales de Familia)", "Art. 2 Ley 19.968 (Competencia en materias de familia)", "Art. 3 Ley 19.968 (Principios de actuación)", "Art. 4 Ley 19.968 (Medidas de protección para niños, niñas y adolescentes)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[Solicitud de medidas de protección para un menor de edad]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Personaliza el escrito con los datos del menor (nombre, edad, domicilio), los hechos que constituyen la vulneración de derechos, y las medidas de protección específicas solicitadas (ej. acogimiento familiar, intervención psicosocial, etc.). Incluye los artículos de la Ley 19.968 que fundamentan la petición.`,
  },

  // ── Solicitud de Procedimiento de Reorganización o Liquidación (Quiebra Personal) (SCRAPEADO) ──
  {
    id: 'solicitud-de-reorganizacion-o-liquidacion-personal',
    keywords: ["ley 20.720", "reorganización", "liquidación", "quiebra personal", "deudor", "insolvencia", "procedimiento concursal"],
    titulo: "Solicitud de Procedimiento de Reorganización o Liquidación (Quiebra Personal)",
    tipo: 'judicial',
    articulos: ["Art. 1 Ley 20.720 (Objeto y ámbito de aplicación)", "Art. 2 Ley 20.720 (Definiciones)", "Art. 3 Ley 20.720 (Principios del procedimiento)", "Art. 4 Ley 20.720 (Sujetos del procedimiento)", "Art. 5 Ley 20.720 (Inicio del procedimiento)", "Art. 6 Ley 20.720 (Requisitos de la solicitud)", "Art. 7 Ley 20.720 (Documentación acompañante)", "Art. 8 Ley 20.720 (Procedencia del procedimiento)", "Art. 9 Ley 20.720 (Efectos de la solicitud)", "Art. 10 Ley 20.720 (Resolución del tribunal)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[Se solicita al tribunal que declare el inicio del procedimiento de reorganización o liquidación, designe al veedor o liquidador, y ordene las medidas de publicidad y protección correspondientes.]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Personaliza la solicitud con los datos del deudor (nombre, RUT, domicilio), la opción elegida (reorganización o liquidación), la relación de deudas y bienes, y la documentación que se adjunta (certificados, balances, nómina de acreedores, etc.). Incluye los fundamentos de hecho y derecho basados en los artículos de la Ley 20.720.`,
  },

  // ── Acuerdo de Unión Civil (SCRAPEADO) ──
  {
    id: 'acuerdo-de-union-civil',
    keywords: ["acuerdo de union civil", "ley 20830", "union civil", "convivencia civil", "registro civil", "acuerdo"],
    titulo: "Acuerdo de Unión Civil",
    tipo: 'acuerdo',
    articulos: ["Art. 1 Ley 20.830 (define el acuerdo de unión civil)", "Art. 2 Ley 20.830 (requisitos para celebrar el acuerdo)", "Art. 3 Ley 20.830 (formalidades del acuerdo)", "Art. 4 Ley 20.830 (efectos del acuerdo)", "Art. 5 Ley 20.830 (causales de término del acuerdo)", "Art. 15 Ley 20.830 (régimen patrimonial: comunidad de bienes o separación total)"],
    esqueleto: `ACUERDO DE UNION CIVIL
(Ley 20.830)

DATOS DE LOS CONVIVIENTES CIVILES

Primer conviviente civil:
- Nombre completo: [[NOMBRE COMPLETO]].
- RUT: [[RUT]].
- Nacionalidad: [[NACIONALIDAD]].
- Estado civil: [[SOLTERO(A) / DIVORCIADO(A) / VIUDO(A)]].
- Profesion u ocupacion: [[PROFESION]].
- Domicilio: [[DOMICILIO COMPLETO]].

Segundo conviviente civil:
- Nombre completo: [[NOMBRE COMPLETO]].
- RUT: [[RUT]].
- Nacionalidad: [[NACIONALIDAD]].
- Estado civil: [[SOLTERO(A) / DIVORCIADO(A) / VIUDO(A)]].
- Profesion u ocupacion: [[PROFESION]].
- Domicilio: [[DOMICILIO COMPLETO]].

REGIMEN PATRIMONIAL (Art. 15 Ley 20.830)

Los convivientes civiles optan por el siguiente regimen patrimonial:
[[COMUNIDAD DE BIENES (por defecto si no se elige) / SEPARACION TOTAL DE BIENES (debe pactarse expresamente al momento de celebrar el acuerdo)]].

INFORMACION PARA LA CELEBRACION

Oficina del Registro Civil: [[OFICINA DEL REGISTRO CIVIL DONDE SE CELEBRARA]].
Fecha programada: [[FECHA DE LA CEREMONIA]].

NOTA INFORMATIVA:
- El Acuerdo de Union Civil se celebra ante un Oficial del Registro Civil (Art. 3 Ley 20.830).
- NO se celebra ante notario ni ante tribunal.
- Se requiere la presencia de dos testigos habiles y mayores de 18 anos.
- Los contrayentes deben ser mayores de edad, no tener vinculo matrimonial ni AUC vigente, y no ser parientes en los grados prohibidos (Art. 2 Ley 20.830).


_____________________________            _____________________________
[[NOMBRE PRIMER CONVIVIENTE]]           [[NOMBRE SEGUNDO CONVIVIENTE]]
Conviviente Civil                        Conviviente Civil`,
    instruccion_llm: `Personaliza el documento informativo para el Acuerdo de Union Civil con los datos de ambos convivientes civiles (nombre, RUT, nacionalidad, estado civil, profesion, domicilio). IMPORTANTE: (1) El AUC se celebra SOLO ante Oficial del Registro Civil, NO ante notario ni tribunal (Art. 3 Ley 20.830). (2) El regimen patrimonial es comunidad de bienes por defecto; si quieren separacion total de bienes, deben pactarlo EXPRESAMENTE al momento de la celebracion (Art. 15 Ley 20.830). (3) Se requieren 2 testigos habiles mayores de 18 anos. (4) Los contrayentes deben ser mayores de edad, sin matrimonio ni AUC vigente. Este documento es informativo para que los convivientes lleven sus datos completos al Registro Civil.`,
  },

  // ── Letra de Cambio y Pagaré (SCRAPEADO) ──
  {
    id: 'letra-de-cambio-y-pagare',
    keywords: ["letra de cambio", "pagaré", "ley 18.092", "título de crédito", "cobro ejecutivo", "cambio", "pagaré"],
    titulo: "Letra de Cambio y Pagaré",
    tipo: 'judicial',
    articulos: ["Art. 1 Ley 18.092 (Definición y requisitos de la letra de cambio)", "Art. 2 Ley 18.092 (Requisitos del pagaré)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[Se solicita al tribunal que ordene el pago de la deuda más intereses y costas, o en su defecto, se despache mandamiento de ejecución y embargo.]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Personalizar con los datos del acreedor, deudor, monto adeudado, fecha de vencimiento, y detalles del título de crédito (letra de cambio o pagaré). Incluir los artículos citados de la Ley 18.092.`,
  },

  // ── ALZAMIENTO DE EMBARGO SOBRE VEHÍCULO ─────────────────────────────────
  {
    id: 'alzamiento-embargo-vehiculo',
    keywords: ['alzamiento de embargo', 'alzar embargo', 'levantar embargo', 'alzamiento embargo', 'embargo vehiculo', 'embargo sobre vehiculo', 'embargo auto', 'cancelar embargo', 'embargo automovil'],
    titulo: 'Solicitud de alzamiento de embargo sobre vehículo',
    tipo: 'judicial',
    articulos: [
      'Art. 1567 N°1 del Código Civil (el pago efectivo extingue la obligación)',
      'Normas del juicio ejecutivo del Libro III del Código de Procedimiento Civil',
      'Ley 18.290 de Tránsito y Registro de Vehículos Motorizados (cancelación de la anotación de embargo)',
    ],
    entidad: 'el Juzgado de Letras en lo Civil competente',
    esqueleto: `[CIUDAD], [FECHA]

EN LO PRINCIPAL: Solicita alzamiento de embargo. OTROSÍ: Oficio al Registro de Vehículos Motorizados.

[DESTINATARIO EN MAYÚSCULAS]
PRESENTE

[NOMBRE EN MAYÚSCULAS], RUT [RUT], domiciliado en [DIRECCIÓN], en los autos sobre juicio ejecutivo [[CARÁTULA Y/O ROL DE LA CAUSA, si se conoce]], a US. respetuosamente digo:

I. ANTECEDENTES

Que sobre el vehículo de mi propiedad, [[INDIVIDUALIZAR VEHÍCULO: marca, modelo, año y placa patente]], se trabó embargo en la causa indicada. Que la obligación que originó dicho embargo se encuentra íntegramente extinguida mediante su pago, según [[ACREDITAR: comprobante de pago, fecha y monto]].

II. FUNDAMENTO LEGAL

Conforme al artículo 1567 N°1 del Código Civil, el pago efectivo extingue la obligación. Habiéndose extinguido la deuda que motivó la medida, no subsiste causa que justifique mantener el embargo sobre el vehículo, correspondiendo en derecho su alzamiento.

POR TANTO,

RUEGO A US.: Tener por solicitado el alzamiento del embargo trabado sobre el vehículo individualizado y disponer su efectividad.

OTROSÍ: Solicito a US. oficiar al Registro de Vehículos Motorizados del Servicio de Registro Civil e Identificación a fin de que cancele la anotación de embargo y/o prohibición que pesa sobre el vehículo señalado.

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: 'Documento judicial dirigido al Juzgado de Letras en lo Civil. Rellena la individualización del vehículo y la forma en que se extinguió la deuda con los datos del caso. Si falta el rol o la carátula de la causa, deja un espacio para completar. No inventes montos ni fechas no entregados.',
  },

  // ── DECLARACIÓN JURADA (simple / domicilio / ingresos / cargas) ──────────
  {
    id: 'declaracion-jurada',
    keywords: ['declaracion jurada', 'declaracion jurada simple', 'declaro bajo juramento', 'jurada de domicilio', 'jurada de ingresos', 'jurada de residencia', 'jurada de cargas familiares', 'declaracion simple'],
    titulo: 'Declaración jurada',
    tipo: 'administrativo',
    articulos: [
      'Declaración jurada otorgada ante Notario Público conforme al Código Orgánico de Tribunales',
    ],
    esqueleto: `DECLARACIÓN JURADA

[CIUDAD], [FECHA]

Yo, [NOMBRE EN MAYÚSCULAS], cédula nacional de identidad N° [RUT], domiciliado en [DIRECCIÓN], bajo juramento declaro lo siguiente:

[[DECLARAR: el o los hechos que se declaran bajo juramento — por ejemplo domicilio, ingresos mensuales, residencia, cargas familiares u otro hecho según el caso]]

Declaro que lo anterior es fiel expresión de la verdad y asumo la responsabilidad legal que corresponda en caso de falsedad.


_______________________________
[NOMBRE]
RUT: [RUT]

_______________________________
Testigo 1: _____________________
RUT: _____________________

_______________________________
Testigo 2: _____________________
RUT: _____________________

(Firma ante Notario Público)`,
    instruccion_llm: 'Documento de declaracion jurada simple. NO uses formato de escrito judicial (sin "EN LO PRINCIPAL", "RUEGO A US." ni "PRESENTE"). Rellena el hecho declarado exactamente con lo que indico el cliente, sin inventar montos, fechas ni datos no entregados. Si la declaracion es para un tramite ante servicio publico, banco o tribunal, verificar si requiere 2 testigos o solo firma ante notario. Por defecto incluir espacio para firma notarial. Si el usuario menciona que es para el Registro Civil, agregar testigos. Si es solo para tramite bancario simple, los testigos son opcionales.',
  },

  // ── CARTA DE RENUNCIA VOLUNTARIA ─────────────────────────────────────────
  {
    id: 'carta-renuncia',
    keywords: ['carta de renuncia', 'renuncia voluntaria', 'renunciar al trabajo', 'renuncia laboral', 'presento mi renuncia', 'quiero renunciar'],
    titulo: 'Carta de renuncia voluntaria',
    tipo: 'carta',
    articulos: ['Art. 159 N°2 del Código del Trabajo (terminación del contrato por renuncia del trabajador, con aviso de 30 días)'],
    esqueleto: `[CIUDAD], [FECHA]

SEÑORES
[DESTINATARIO]
PRESENTE

De mi consideración:

Por medio de la presente, yo, [NOMBRE EN MAYÚSCULAS], cédula de identidad N° [RUT], quien se desempeña como [[CARGO]], vengo en comunicar mi renuncia voluntaria al cargo que ocupo, a contar del [[FECHA DE TÉRMINO / último día de trabajo]], conforme al artículo 159 N°2 del Código del Trabajo.

[[SI CORRESPONDE: indicar si se otorga el aviso de 30 días o si la renuncia es de efecto inmediato]]

Agradezco la oportunidad de haber formado parte de la empresa y quedo a disposición para coordinar la entrega del cargo y la suscripción del finiquito correspondiente.

Saluda atentamente,


_____________________________
[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: 'Carta de renuncia voluntaria en formato carta (NO judicial: sin "EN LO PRINCIPAL" ni "RUEGO A US."). Rellena cargo y fecha de término con los datos del caso. No inventes motivos de renuncia si el cliente no los entregó.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MATCHING: encuentra el template más apropiado según materia y hechos
// ─────────────────────────────────────────────────────────────────────────────
export function findTemplate(materia: string | null, hechos: string | null): LegalTemplate | null {
  // Normaliza a minusculas y SIN tildes, para que "pagaré" matchee "pagare", etc.
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const matText = norm(materia ?? '');           // tipo de documento = señal mas fuerte
  const hechosText = norm(hechos ?? '');
  const fullText = `${matText} ${hechosText}`.trim();
  if (!fullText) return null;

  let bestMatch: LegalTemplate | null = null;
  let bestScore = 0;

  for (const template of TEMPLATES) {
    let score = 0;
    const seenKw = new Set<string>();
    for (const keyword of template.keywords) {
      const kw = norm(keyword);
      // Evita contar dos veces una keyword que normaliza igual (ej. "prescripción"
      // y "prescripcion" colapsan a lo mismo y antes inflaban el score.)
      if (seenKw.has(kw)) continue;
      seenKw.add(kw);
      // Word-boundary: la keyword no debe estar enterrada dentro de otra palabra
      // (evita que "IST" matchee "prestacion", "laboral" matchee "laborales", etc.)
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp('(?:^|\\s)' + escaped + '(?:\\s|$)');
      if (!regex.test(fullText)) continue;
      // Peso por ESPECIFICIDAD: una keyword mas larga es mas especifica y pesa
      // mas. Asi "finiquito" (9) le gana a una generica como "cobro" (5) o
      // "deuda" (5), que antes empataban y elegian la plantilla equivocada.
      let weight = kw.length;
      // Si la keyword aparece en el TIPO de documento (materia), pesa el triple:
      // el tipo es la señal mas confiable de que documento quiere el cliente.
      if (regex.test(matText)) weight *= 3;
      score += weight;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = template;
    }
  }

  // Umbral minimo: al menos una keyword de 3+ caracteres.
  // FIX: Si el tipo_documento empieza con "poder" → forzar template de poder
  if (bestMatch && /^poder/i.test(matText) && bestMatch.id !== 'poder-simple') {
    const poderTpl = TEMPLATES.find(t => t.id === 'poder-simple');
    if (poderTpl) return poderTpl;
  }
  return bestScore >= 3 ? bestMatch : null;
}


// ─────────────────────────────────────────────────────────────────────────────
// REQUISITOS: extrae del esqueleto la lista de antecedentes que el chat debe
// reunir para esta plantilla. Lee los marcadores [[...]] (datos que el redactor
// completa con los hechos del caso) y los limpia de directivas tipo "DESCRIBIR:".
// Sirve para que el chat pregunte EXACTAMENTE lo que la plantilla necesita.
// ─────────────────────────────────────────────────────────────────────────────
export function getTemplateRequirements(t: LegalTemplate): string[] {
  const reqs: string[] = [];
  const seen = new Set<string>();
  const blocks = t.esqueleto.match(/\[\[([^\]]+)\]\]/g) ?? [];
  for (const raw of blocks) {
    let inner = raw.slice(2, -2).trim();
    // Filtra items condicionales (SI CORRESPONDE): son opcionales, no se deben pedir
    if (/^SI\s+CORRESPONDE/i.test(inner)) continue;
    // Quita directivas iniciales (DESCRIBIR:, LISTAR ...:, etc.)
    inner = inner
      .replace(/^(DESCRIBIR|LISTAR[^:]*|DETALLAR|INDICAR|EXPLICAR|SE\s+SOLICITA)\s*[:\-]?\s*/i, '')
      .trim();
    // Ignora bloques que son texto de relleno largo (frases completas redactadas),
    // nos quedamos con descripciones de datos (hasta ~140 chars).
    if (!inner || inner.length > 140) continue;
    // Ignora bloques que son referencias legales (no son datos a pedir al cliente).
    if (/^(art[íi]culo|art\.\s|ley\s|inciso)/i.test(inner)) continue;
    const key = inner.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    reqs.push(inner);
  }
  return reqs;
}
