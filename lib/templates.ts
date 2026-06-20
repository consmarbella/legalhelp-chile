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
    keywords: ['tag', 'autopista', 'telepeaje', 'peaje', 'deuda tag', 'prescripcion tag', 'prescripcion'],
    titulo: 'Solicitud de prescripción de deuda TAG',
    tipo: 'carta',
    articulos: ['Art. 2514 Código Civil (prescripción extintiva ordinaria: 5 años)',
                'Art. 2515 Código Civil (plazo de prescripción acciones ordinarias)',
                'Art. 98 Ley 18.290 Ley de Tránsito'],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYÚSCULAS]
PRESENTE

[NOMBRE EN MAYÚSCULAS], RUT [RUT], domiciliado en [DIRECCIÓN], por medio del presente instrumento viene en oponer excepción de prescripción extintiva respecto de la deuda que se me atribuye.

I. ANTECEDENTES

[[DESCRIBIR: qué deuda se prescribe, monto aproximado si lo sabe, período al que corresponde]]

II. FUNDAMENTO LEGAL

De conformidad con lo dispuesto en el artículo 2514 del Código Civil, la acción ordinaria prescribe en el plazo de cinco años contados desde que la obligación se hizo exigible. En el presente caso, la deuda reclamada data de [[PERÍODO]] por lo que ha transcurrido en exceso el plazo legal de prescripción.

Asimismo, el artículo 2515 del mismo cuerpo legal establece que la prescripción extintiva puede ser alegada por el deudor como excepción en cualquier estado del juicio.

III. PETICIÓN

Por lo expuesto, solicito a Ud. declarar la prescripción extintiva de la deuda indicada y proceder a su eliminación del registro de deudas, absteniéndose de efectuar cobros o iniciar acciones judiciales al respecto.

Sin otro particular, saluda atentamente,

[NOMBRE]
RUT: [RUT]
Domicilio: [DIRECCIÓN]`,
    instruccion_llm: 'Rellena [[DESCRIBIR]] con los hechos específicos del caso. Rellena [[PERÍODO]] con el período de la deuda según los hechos. Si no hay fecha exacta, usa "hace más de cinco años". Mantén el resto del template intacto.',
  },

  // ── 2. PRESCRIPCIÓN DE DEUDA GENERAL (Banco, retail, etc.) ──────────────
  {
    id: 'prescripcion-deuda',
    keywords: ['prescripcion', 'prescripción', 'deuda', 'deuda prescrita', 'banco', 'retail', 'tienda', 'credito', 'morosidad', 'dicom'],
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

PRIMERO: El trabajador se desempeñó como [[CARGO]] para el empleador desde el [[FECHA DE INICIO]] hasta el [[FECHA DE TÉRMINO]], fecha en que la relación laboral terminó por la causal de [[CAUSAL DE TÉRMINO]].

SEGUNDO: El empleador paga en este acto al trabajador la suma total de [[MONTO TOTAL, si se conoce]], correspondiente a los siguientes conceptos: [[DETALLAR CONCEPTOS: remuneración pendiente, indemnización por años de servicio, indemnización sustitutiva del aviso previo y feriado proporcional, según corresponda]].

TERCERO: El trabajador declara recibir conforme las sumas señaladas y otorga al empleador el más amplio, completo y total finiquito, declarando que nada se le adeuda por concepto alguno derivado de la relación laboral ni de su término.

CUARTO: El presente finiquito se firma en señal de conformidad y deberá ratificarse ante Ministro de Fe (Notario Público o Inspección del Trabajo), conforme al artículo 177 del Código del Trabajo.


_____________________________            _____________________________
[NOMBRE]                                  [DESTINATARIO]
Trabajador — RUT [RUT]                    Empleador`,
    instruccion_llm: 'Documento BILATERAL de finiquito laboral (lo firman trabajador y empleador). NO uses formato de escrito judicial (sin "EN LO PRINCIPAL", "RUEGO A US." ni "PRESENTE"). Rellena cargo, fechas, causal y los conceptos pagados con los datos del caso; si no hay montos, deja espacios para completar. NO asumas que al trabajador se le adeuda algo: este es el finiquito de término normal, no una demanda ni un reclamo.',
  },
  // 4b. Cobro de finiquito: carta para RECLAMAR prestaciones NO pagadas.
  {
    id: 'finiquito-cobro',
    keywords: ['cobro de finiquito', 'reclamar finiquito', 'reclamo de finiquito', 'finiquito impago', 'no me pagaron el finiquito', 'no me han pagado el finiquito', 'me deben el finiquito', 'cobrar finiquito', 'finiquito no pagado'],
    titulo: 'Cobro de finiquito y prestaciones laborales',
    tipo: 'carta',
    articulos: ['Art. 162 Código del Trabajo (finiquito y cotizaciones previas)', 'Art. 163 Código del Trabajo (indemnización por años de servicio)', 'Art. 171 Código del Trabajo (despido indirecto)'],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYÚSCULAS]
PRESENTE

[NOMBRE EN MAYÚSCULAS], RUT [RUT], ex trabajador de esa empresa, por medio del presente instrumento requiero el pago íntegro de las prestaciones laborales adeudadas.

I. ANTECEDENTES

[[DESCRIBIR: cargo, fecha de inicio, fecha de término, causal de despido, si hay cotizaciones impagas, montos aproximados]]

II. FUNDAMENTO LEGAL

El artículo 162 del Código del Trabajo establece que el empleador solo puede poner término al contrato si acredita el pago de las cotizaciones previsionales. Si existen cotizaciones impagas, el despido es ineficaz y el empleador debe seguir pagando remuneraciones hasta regularizar.

El artículo 163 establece el derecho a indemnización por años de servicio equivalente a 30 días de la última remuneración mensual por cada año trabajado.

[[SI CORRESPONDE: artículo 171 para autodespido/despido indirecto]]

III. PETICIÓN

Solicito el pago en el plazo de 5 días hábiles de: [[LISTAR PRESTACIONES: finiquito, cotizaciones impagas, indemnización por años de servicio, feriado proporcional, etc.]]

De no recibir respuesta favorable, concurriré a la Inspección del Trabajo y/o presentaré demanda ante el Juzgado del Trabajo, solicitando además el recargo legal del 50% o 100% según corresponda.

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: 'Rellena los hechos laborales específicos. Calcula o estima las prestaciones según los datos disponibles. Incluye o excluye el Art. 171 según si el trabajador renunció por incumplimiento del empleador.',
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
    articulos: ['Art. 2116 Código Civil (contrato de mandato)', 'Art. 2132 Código Civil (mandato especial)', 'Art. 7 CPC (facultades del mandato judicial)'],
    esqueleto: `[CIUDAD], [FECHA]

PODER ESPECIAL

Yo, [NOMBRE EN MAYÚSCULAS], RUT [RUT], domiciliado en [DIRECCIÓN], por medio del presente instrumento otorgo poder especial a:

[DESTINATARIO EN MAYÚSCULAS], [[RUT DEL APODERADO]], domiciliado en [[DIRECCIÓN DEL APODERADO]],

para que en mi nombre y representación [[DESCRIBIR EL ACTO ESPECÍFICO PARA EL QUE SE OTORGA EL PODER]].

Las facultades que se otorgan incluyen: [[LISTAR FACULTADES ESPECÍFICAS]].

Este poder [[TIENE / NO TIENE]] facultad de delegar y se otorga [[CON / SIN]] responsabilidad solidaria.

El presente poder tendrá vigencia [[PERÍODO O "hasta que sea revocado expresamente"]].

Para constancia, firma el poderdante:

_________________________________
[NOMBRE]
RUT: [RUT]
Domicilio: [DIRECCIÓN]`,
    instruccion_llm: 'Rellena el acto específico, facultades y período. Si el poder es para cobrar, incluir facultad de recibir y dar recibo. Si es para juicio, incluir facultades del Art. 7 CPC. Ajusta según los hechos del caso.',
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

Se solicita la entrega del inmueble en las mismas condiciones en que fue recibido, con todos sus servicios básicos al día.

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: 'Determina si es arrendador o arrendatario según los hechos. Calcula la fecha de término (2 meses desde hoy si es desahucio normal). Si hay deuda, incluir monto.',
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
    articulos: ["Art. 162 Código del Trabajo (despido ineficaz por cotizaciones impagas)", "Art. 19 Ley 17.322 (acción judicial para cobro de cotizaciones)", "Art. 58 Código del Trabajo (descuento obligatorio de cotizaciones)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[cobro de cotizaciones y declaración de despido ineficaz]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para cobro de cotizaciones previsionales impagas. Petición: cobro de cotizaciones y declaración de despido ineficaz. Razona el caso con los hechos específicos del cliente.`,
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

POR TANTO,

RUEGO A US.: [[inicio de proceso de mediación familiar]]

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
    articulos: ["Art. 161 Código del Trabajo (necesidades de la empresa)", "Art. 162 Código del Trabajo (formalidades del despido)", "Art. 163 Código del Trabajo (indemnización por años de servicio)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[notificación formal de término de la relación laboral]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para notificación de despido / aviso de término de contrato. Petición: notificación formal de término de la relación laboral. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Denuncia ante la Inspección del Trabajo (SCRAPEADO) ──
  {
    id: 'denuncia-ante-la-inspecci-n-del-trabajo',
    keywords: ["inspección del trabajo", "inspección laboral", "denuncia laboral", "DT", "dirección del trabajo"],
    titulo: "Denuncia ante la Inspección del Trabajo",
    tipo: 'administrativo',
    articulos: ["Art. 474 Código del Trabajo (fiscalización e infracciones)", "Art. 505 Código del Trabajo (facultades de fiscalización)", "Art. 420 Código del Trabajo (competencia juzgados del trabajo)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[fiscalización del empleador y sanción de infracciones laborales]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para denuncia laboral ante inspección del trabajo. Petición: fiscalización del empleador y sanción de infracciones laborales. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Solicitud de nulidad de despido (SCRAPEADO) ──
  {
    id: 'solicitud-de-nulidad-de-despido',
    keywords: ["nulidad despido", "tutela laboral", "derechos fundamentales laborales", "acoso laboral", "discriminación laboral"],
    titulo: "Solicitud de nulidad de despido",
    tipo: 'judicial',
    articulos: ["Art. 485 Código del Trabajo (procedimiento de tutela laboral)", "Art. 489 Código del Trabajo (nulidad del despido y reincorporación)", "Art. 19 N°16 CPR (libertad de trabajo sin discriminación)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[declaración de nulidad del despido y reincorporación o indemnización especial]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para nulidad del despido (tutela laboral). Petición: declaración de nulidad del despido y reincorporación o indemnización especial. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Autorización de salida del país de menor (SCRAPEADO) ──
  {
    id: 'autorizaci-n-de-salida-del-pa-s-de-menor',
    keywords: ["salida del pais de menor", "autorizacion de salida del pais", "salida del pais", "autorizacion salida pais", "salida pais menor", "autorizacion de viaje de menor", "viaje menor", "permiso notarial de viaje"],
    titulo: "Autorización de salida del país de menor",
    tipo: 'judicial',
    articulos: ["Art. 49 Ley 16.618 (autorización para salida de menores)", "Art. 225 Código Civil (cuidado personal del menor)", "Ley 20.680 (autorización de viaje al extranjero de menores)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[autorización judicial para salida del país del menor]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para autorización judicial de salida del país para menor. Petición: autorización judicial para salida del país del menor. Razona el caso con los hechos específicos del cliente.`,
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

POR TANTO,

RUEGO A US.: [[rectificación de la publicidad y/o anulación de cláusula abusiva]]

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
    articulos: ["Art. 951 Código Civil (sucesión por causa de muerte)", "Art. 688 Código Civil (inscripción de herencia en CBR)", "Ley 20.659 (simplificación trámites posesión efectiva)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[tramitación de posesión efectiva y regularización de bienes hereditarios]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para posesión efectiva / herencia / regularización de propiedad. Petición: tramitación de posesión efectiva y regularización de bienes hereditarios. Razona el caso con los hechos específicos del cliente.`,
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

POR TANTO,

RUEGO A US.: [[pago de la deuda en plazo perentorio antes de acciones judiciales]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para cobro prejudicial / última comunicación antes de demanda. Petición: pago de la deuda en plazo perentorio antes de acciones judiciales. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Oposición a cobranza de TAG prescrito (SCRAPEADO) ──
  {
    id: 'oposici-n-a-cobranza-de-tag-prescrito',
    keywords: ["tag", "telepase", "prescripción tag", "cobro tag", "peaje"],
    titulo: "Oposición a cobranza de TAG prescrito",
    tipo: 'carta',
    articulos: ["Art. 2514 Código Civil (prescripción extintiva 5 años)", "Art. 98 Ley 18.290 Ley de Tránsito", "Art. 26 Ley 18.696 (operación de autopistas concesionadas)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[declaración de prescripción y archivo de la deuda TAG]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para prescripción de peaje tag / telepase. Petición: declaración de prescripción y archivo de la deuda TAG. Razona el caso con los hechos específicos del cliente.`,
  },

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
    articulos: ["Art. 168 Código del Trabajo (despido injustificado y recargo indemnización)", "Art. 163 Código del Trabajo (indemnización por años de servicio)", "Art. 161 Código del Trabajo (causal necesidades de la empresa)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[declaración de despido injustificado, indemnización sustitutiva con recargo del 30%]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para despido injustificado / improcedente. Petición: declaración de despido injustificado, indemnización sustitutiva con recargo del 30%. Razona el caso con los hechos específicos del cliente.`,
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
    articulos: ["Art. 54 Código del Trabajo (forma y oportunidad de pago de remuneraciones)", "Art. 55 Código del Trabajo (plazo de pago: mensual o quincenal)", "Art. 173 Código del Trabajo (mora en el pago)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[cobro de remuneraciones impagas con reajuste e intereses]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para cobro de sueldos, salarios o remuneraciones no pagadas. Petición: cobro de remuneraciones impagas con reajuste e intereses. Razona el caso con los hechos específicos del cliente.`,
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

POR TANTO,

RUEGO A US.: [[reconocimiento de accidente laboral y prestaciones médicas y pecuniarias]]

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
    articulos: ["Art. 12 DFL 3/1984 (FONASA, tramitación licencias médicas)", "Art. 77 bis DL 3.500 (licencias médicas en sistema AFP)", "DL 2.763 Art. 8 (funciones COMPIN)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[reconsideración del rechazo/reducción de la licencia médica y pago del subsidio]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para impugnación de rechazo o reducción de licencia médica. Petición: reconsideración del rechazo/reducción de la licencia médica y pago del subsidio. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Reclamo por fuero maternal / paternal (reintegro) (SCRAPEADO) ──
  {
    id: 'reclamo-por-fuero-maternal-paternal-rein',
    keywords: ["fuero maternal", "fuero paternal", "embarazo", "desafuero", "despido embarazada", "permiso postnatal", "postnatal"],
    titulo: "Reclamo por fuero maternal / paternal (reintegro)",
    tipo: 'judicial',
    articulos: ["Art. 174 Código del Trabajo (desafuero judicial requerido para despedir con fuero)", "Art. 201 Código del Trabajo (fuero maternal durante embarazo y un año post)", "Art. 194 Código del Trabajo (protección a la maternidad)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[reintegro inmediato y pago de remuneraciones durante período de fuero]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para fuero maternal o paternal: protección del despido durante permiso parental. Petición: reintegro inmediato y pago de remuneraciones durante período de fuero. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Demanda de alimentos para hijos mayores de edad (SCRAPEADO) ──
  {
    id: 'demanda-de-alimentos-para-hijos-mayores',
    keywords: ["alimentos hijo mayor", "pensión alimenticia mayor", "estudiando universitario", "alimentos estudios", "mayor de 18"],
    titulo: "Demanda de alimentos para hijos mayores de edad",
    tipo: 'judicial',
    articulos: ["Art. 332 Código Civil (extensión obligación alimentaria: hasta 28 años si estudia)", "Art. 321 Código Civil (quiénes tienen derecho a alimentos)", "Art. 55 Ley 14.908 (procedimiento cobro alimentos)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[fijación o aumento de pensión de alimentos para mayor de edad estudiante]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para alimentos mayores de edad / hijos estudiando. Petición: fijación o aumento de pensión de alimentos para mayor de edad estudiante. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Demanda de cuidado personal / tuición de menores (SCRAPEADO) ──
  {
    id: 'demanda-de-cuidado-personal-tuici-n-de-m',
    keywords: ["tuición", "cuidado personal", "custodia", "hijo", "menor", "separación padres"],
    titulo: "Demanda de cuidado personal / tuición de menores",
    tipo: 'judicial',
    articulos: ["Art. 225 Código Civil (cuidado personal de los hijos)", "Art. 226 Código Civil (criterios para otorgar cuidado personal)", "Art. 16 Ley 19.968 (interés superior del niño en familia)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[otorgamiento del cuidado personal exclusivo o compartido del menor]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para cuidado personal de hijos / tuición. Petición: otorgamiento del cuidado personal exclusivo o compartido del menor. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Demanda de divorcio por cese de convivencia (SCRAPEADO) ──
  {
    id: 'demanda-de-divorcio-por-cese-de-conviven',
    keywords: ["divorcio", "cese convivencia", "separada", "separado", "separación", "matrimonio", "terminar matrimonio", "años separados"],
    titulo: "Demanda de divorcio por cese de convivencia",
    tipo: 'judicial',
    articulos: ["Art. 55 Ley 19.947 LMC (divorcio por cese de convivencia: 3 años)", "Art. 56 Ley 19.947 LMC (efectos del divorcio)", "Art. 60 Ley 19.947 LMC (compensación económica en divorcio)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[declaración judicial de divorcio por cese de convivencia superior a 3 años]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para divorcio unilateral por cese de convivencia de 3 años. Petición: declaración judicial de divorcio por cese de convivencia superior a 3 años. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Demanda de divorcio de mutuo acuerdo (SCRAPEADO) ──
  {
    id: 'demanda-de-divorcio-de-mutuo-acuerdo',
    keywords: ["divorcio mutuo acuerdo", "divorcio de mutuo acuerdo", "divorcio de comun acuerdo", "divorcio amistoso", "divorcio de comun consentimiento"],
    titulo: "Demanda de divorcio de mutuo acuerdo",
    tipo: 'judicial',
    articulos: ["Art. 55 inc. 1 Ley 19.947 LMC (divorcio de mutuo acuerdo: 1 año cese convivencia)", "Art. 63 Ley 19.947 LMC (acuerdo completo y suficiente)", "Art. 21 Ley 19.947 LMC (acuerdo regulador de relaciones mutuas)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[declaración de divorcio de mutuo acuerdo con acuerdo regulador homologado]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para divorcio por mutuo acuerdo de los cónyuges. Petición: declaración de divorcio de mutuo acuerdo con acuerdo regulador homologado. Razona el caso con los hechos específicos del cliente.`,
  },

  // ── Denuncia por violencia intrafamiliar (SCRAPEADO) ──
  {
    id: 'denuncia-por-violencia-intrafamiliar',
    keywords: ["violencia intrafamiliar", "VIF", "maltrato", "agresión pareja", "violencia doméstica", "golpes pareja"],
    titulo: "Denuncia por violencia intrafamiliar",
    tipo: 'judicial',
    articulos: ["Art. 3 Ley 20.066 (violencia intrafamiliar: concepto y sanciones)", "Art. 7 Ley 20.066 (medidas cautelares en VIF)", "Art. 92 Ley 19.968 (competencia tribunal de familia en VIF)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[medidas cautelares de protección y sanción del agresor]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para denuncia violencia intrafamiliar ante juzgado de familia. Petición: medidas cautelares de protección y sanción del agresor. Razona el caso con los hechos específicos del cliente.`,
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
    articulos: ["Art. 4 Ley 14.908 (alimentos provisorios desde primera presentación)", "Art. 5 Ley 14.908 (monto mínimo alimentos provisorios)", "Art. 327 Código Civil (obligación alimentaria y su extensión)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[fijación de pensión de alimentos provisorios con carácter urgente]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para alimentos provisorios / medida cautelar pensión alimenticia. Petición: fijación de pensión de alimentos provisorios con carácter urgente. Razona el caso con los hechos específicos del cliente.`,
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
    articulos: ["Art. 1489 Código Civil (condición resolutoria tácita por incumplimiento)", "Art. 1873 Código Civil (resolución compraventa por no pago del precio)", "Art. 1552 Código Civil (mora purga la mora)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[resolución del contrato, restitución de lo pagado e indemnización de perjuicios]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para resolución o rescisión de contrato por incumplimiento de contraparte. Petición: resolución del contrato, restitución de lo pagado e indemnización de perjuicios. Razona el caso con los hechos específicos del cliente.`,
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

POR TANTO,

RUEGO A US.: [[inicio de procedimiento de renegociación ante SUPERIR]]

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

POR TANTO,

RUEGO A US.: [[devolución de cobros indebidos y corrección de la cuenta]]

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

POR TANTO,

RUEGO A US.: [[reconsideración del rechazo y cobertura de la prestación médica]]

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

POR TANTO,

RUEGO A US.: [[reparación del servicio, cobro indebido devuelto y/o indemnización]]

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

POR TANTO,

RUEGO A US.: [[reparación gratuita, reemplazo del producto o devolución del precio]]

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

POR TANTO,

RUEGO A US.: [[término inmediato de la suscripción y devolución de cargos prepagados]]

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

POR TANTO,

RUEGO A US.: [[investigación de las irregularidades denunciadas y sanción de los responsables]]

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

POR TANTO,

RUEGO A US.: [[otorgamiento de pensión básica solidaria por cumplir los requisitos legales]]

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

  // ── Carta de cobro de honorarios profesionales (SCRAPEADO) ──
  {
    id: 'carta-de-cobro-de-honorarios-profesional',
    keywords: ["honorarios", "cobrar honorarios", "servicios profesionales no pagados", "contrato servicios"],
    titulo: "Carta de cobro de honorarios profesionales",
    tipo: 'carta',
    articulos: ["Art. 1437 Código Civil (obligaciones de cuasicontrato de servicios)", "Art. 1456 Código Civil (consentimiento y objeto del contrato)", "Art. 2116 Código Civil (mandato / contrato de prestación de servicios)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[pago de honorarios dentro de plazo perentorio bajo apercibimiento de demanda]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para cobro extrajudicial de honorarios por servicios prestados. Petición: pago de honorarios dentro de plazo perentorio bajo apercibimiento de demanda. Razona el caso con los hechos específicos del cliente.`,
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

POR TANTO,

RUEGO A US.: [[pago de la indemnización del siniestro conforme a la póliza contratada]]

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

POR TANTO,

RUEGO A US.: [[reconexión del servicio y/o corrección de cobros indebidos]]

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

POR TANTO,

RUEGO A US.: [[otorgamiento de pensión de sobrevivencia por fallecimiento del causante]]

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
    articulos: ["Art. 2195 Código Civil (precario: uso sin título ni contraprestación)", "Art. 680 N°6 CPC (juicio sumario para acciones de precario)", "Art. 700 Código Civil (posesión y propiedad)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[restitución inmediata del inmueble ocupado en precario]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Redacta el escrito para demanda de precario para recuperar inmueble ocupado sin título. Petición: restitución inmediata del inmueble ocupado en precario. Razona el caso con los hechos específicos del cliente.`,
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

POR TANTO,

RUEGO A US.: [[Se solicita al SERNAC que investigue el incumplimiento de plazos por parte de la institución financiera de origen y que adopte las medidas sancionatorias correspondientes.]]

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
    articulos: ["Art. 1 Ley 14.908 (obligación de prestar alimentos)", "Art. 3 Ley 14.908 (procedimiento judicial)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[Se solicita al tribunal que fije una pensión alimenticia provisoria o definitiva a favor del alimentario.]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Personaliza el escrito con los nombres del solicitante y del demandado, monto solicitado, relación familiar (hijos, cónyuge), y antecedentes de ingresos del demandado.`,
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

  // ── Solicitud de Acceso a Información Pública (SCRAPEADO) ──
  {
    id: 'solicitud-acceso-informacion-publica',
    keywords: ["acceso", "información pública", "transparencia", "ley 20.285", "solicitud", "información"],
    titulo: "Solicitud de Acceso a Información Pública",
    tipo: 'administrativo',
    articulos: ["Art. 10 Ley 20.285 (Derecho de acceso a información pública)", "Art. 11 Ley 20.285 (Principios de transparencia)", "Art. 12 Ley 20.285 (Procedimiento de solicitud)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[Se solicita la entrega de información pública específica, detallando los antecedentes requeridos y el formato de entrega.]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Personaliza la solicitud con los datos del solicitante (nombre, RUT, domicilio), el órgano público al que se dirige, la descripción clara y precisa de la información solicitada, y el medio de notificación preferido. Incluye la referencia al artículo 10 y siguientes de la Ley 20.285.`,
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

  // ── Denuncia por Violencia Intrafamiliar (SCRAPEADO) ──
  {
    id: 'denuncia-violencia-intrafamiliar',
    keywords: ["violencia intrafamiliar", "denuncia", "ley 20.066", "maltrato", "familia"],
    titulo: "Denuncia por Violencia Intrafamiliar",
    tipo: 'judicial',
    articulos: ["Art. 1 Ley 20.066 (Definición de violencia intrafamiliar)", "Art. 5 Ley 20.066 (Medidas cautelares)", "Art. 6 Ley 20.066 (Denuncia)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[Se solicita acoger la denuncia y decretar medidas cautelares de protección a favor de la víctima.]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Personalizar con datos de la víctima, agresor, relación familiar, hechos concretos de violencia y medidas cautelares solicitadas.`,
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

  // ── Denuncia por Acto de Discriminación Arbitraria (Ley Zamudio) (SCRAPEADO) ──
  {
    id: 'denuncia-ley-zamudio',
    keywords: ["discriminación", "ley zamudio", "ley 20.609", "acto arbitrario", "derechos fundamentales", "juzgado de letras", "acción judicial"],
    titulo: "Denuncia por Acto de Discriminación Arbitraria (Ley Zamudio)",
    tipo: 'judicial',
    articulos: ["Art. 1 Ley 20.609 (definición de discriminación arbitraria)", "Art. 2 Ley 20.609 (actos de discriminación prohibidos)", "Art. 3 Ley 20.609 (acción de no discriminación arbitraria)", "Art. 4 Ley 20.609 (procedimiento judicial)", "Art. 5 Ley 20.609 (medidas cautelares)", "Art. 6 Ley 20.609 (indemnización de perjuicios)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[Que se declare la existencia de un acto de discriminación arbitraria, se ordene su cese, se adopten medidas cautelares y se condene al responsable a indemnizar los perjuicios causados.]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Personaliza el escrito con los datos del denunciante (nombre, RUT, domicilio), del denunciado (si se conoce), la descripción detallada del acto discriminatorio (fecha, lugar, hechos), los motivos de discriminación invocados (art. 2 Ley 20.609), las pruebas que se ofrecerán y la petición concreta de medidas cautelares y reparación.`,
  },

  // ── Acuerdo de Unión Civil (SCRAPEADO) ──
  {
    id: 'acuerdo-de-union-civil',
    keywords: ["acuerdo de union civil", "ley 20830", "union civil", "convivencia civil", "registro civil", "acuerdo"],
    titulo: "Acuerdo de Unión Civil",
    tipo: 'acuerdo',
    articulos: ["Art. 1 Ley 20.830 (define el acuerdo de unión civil)", "Art. 2 Ley 20.830 (requisitos para celebrar el acuerdo)", "Art. 3 Ley 20.830 (formalidades del acuerdo)", "Art. 4 Ley 20.830 (efectos del acuerdo)", "Art. 5 Ley 20.830 (causales de término del acuerdo)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[Solicitud de celebración de acuerdo de unión civil ante el Registro Civil]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Personaliza el acuerdo de unión civil con los nombres completos, cédulas de identidad, estado civil, nacionalidad, profesión y domicilio de los comparecientes, así como la fecha y lugar de celebración. Incluye las cláusulas sobre régimen de bienes, alimentos, compensación económica y disolución, según lo acordado por las partes.`,
  },

  // ── Solicitud de Acceso a Información Pública (SCRAPEADO) ──
  {
    id: 'solicitud-de-acceso-a-informacion-publica',
    keywords: ["acceso a información pública", "transparencia", "ley 19880", "procedimiento administrativo", "solicitud"],
    titulo: "Solicitud de Acceso a Información Pública",
    tipo: 'administrativo',
    articulos: ["Art. 10 Ley 19.880 (Principios del procedimiento administrativo)", "Art. 17 Ley 19.880 (Derecho de acceso a la información)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[Se solicita la entrega de información pública específica, indicando el órgano requerido y los datos solicitados.]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Personalizar con el nombre del solicitante, órgano al que se dirige, descripción detallada de la información requerida y fundamentos legales (Ley 19.880).`,
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

  // ── Denuncia ante la Contraloría General de la República (SCRAPEADO) ──
  {
    id: 'denuncia-contraloria',
    keywords: ["denuncia", "contraloría", "irregularidades", "administrativo", "municipal", "auditoría", "ciudadano"],
    titulo: "Denuncia ante la Contraloría General de la República",
    tipo: 'administrativo',
    articulos: ["Art. 1 Ley 10.336 (Organización y atribuciones de la Contraloría General de la República)", "Art. 6 Ley 18.695 (Ley Orgánica Constitucional de Municipalidades, control de legalidad)", "Art. 8 Ley 19.880 (Bases de los Procedimientos Administrativos, derecho a denunciar)"],
    esqueleto: `[CIUDAD], [FECHA]

[DESTINATARIO EN MAYUSCULAS]
PRESENTE

[NOMBRE EN MAYUSCULAS], RUT [RUT], domiciliado en [DIRECCION], a US. respetuosamente digo:

I. ANTECEDENTES DE HECHO

[[DESCRIBIR LOS HECHOS DEL CASO]]

II. FUNDAMENTO LEGAL

[[ARGUMENTO LEGAL SEGUN LOS ARTICULOS VERIFICADOS]]

POR TANTO,

RUEGO A US.: [[Se solicita a la Contraloría que investigue los hechos denunciados, adopte las medidas correctivas y sancione a los responsables si corresponde.]]

[NOMBRE]
RUT: [RUT]`,
    instruccion_llm: `Personaliza la denuncia con los datos del denunciante (nombre, RUT, domicilio), la descripción detallada de los hechos irregulares, la identificación del órgano o funcionario involucrado, y las pruebas o antecedentes que respalden la denuncia. Incluye referencias a la normativa aplicable según el caso.`,
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

(Firma ante Notario Público)`,
    instruccion_llm: 'Documento de declaración jurada simple. NO uses formato de escrito judicial (sin "EN LO PRINCIPAL", "RUEGO A US." ni "PRESENTE"). Rellena el hecho declarado exactamente con lo que indicó el cliente, sin inventar montos, fechas ni datos no entregados.',
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
    // Quita directivas iniciales (DESCRIBIR:, LISTAR ...:, SI CORRESPONDE:, etc.)
    inner = inner
      .replace(/^(DESCRIBIR|LISTAR[^:]*|DETALLAR|INDICAR|EXPLICAR|SE\s+SOLICITA|SI\s+CORRESPONDE)\s*[:\-]?\s*/i, '')
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
