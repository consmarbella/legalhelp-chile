import { notFound, redirect } from 'next/navigation';
import ChatGenerator from '@/components/ChatGenerator';
import paginas from '@/data/paginas.json';
import hubGuides from '@/data/hub_guides.json';
import contenidoUnico from '@/data/contenido-unico.json';
import { isReleased } from '@/lib/release';
import Link from 'next/link';
import { LEYES, findLey } from '@/data/leyes';

type Pagina = (typeof paginas)[number] & { intro?: string; release?: string };
type ContenidoUnico = Record<string, {
  faqs: { q: string; a: string }[];
  paragraph: string;
  ciudad: string | null;
  categoria: string;
  noindex: boolean;
}>;

const HUBS = [
  'alzamiento-de-embargo-sobre-vehiculo',
  'carta-reclamo-sernac',
  'certificado-de-antecedentes-para-fines-especiales',
  'demanda-de-alimentos',
  'demanda-de-desalojo-por-no-pago',
  'denuncia-por-despido-injustificado',
  'denuncia-por-no-pago-de-cotizaciones',
  'eliminacion-de-antecedentes-penales',
  'limpieza-de-hoja-de-vida-del-conductor',
  'omision-de-antecedentes-por-violencia-intrafamiliar',
  'poder-simple-notarial',
  'prescripcion-de-deuda-tag',
  'prescripcion-de-deuda-bancaria',
  'prescripcion-de-multas-de-transito',
  'recurso-de-proteccion',
  'registro-nacional-de-deudores-de-pensiones-de-alimentos',
  'servicios-legales',
];

// Sin generateStaticParams — las páginas se renderizan on-demand (ISR)
// Esto evita timeouts de build con 3114+ páginas

const BASE_URL = 'https://legalhelp.cl';

// Clústeres temáticos para interlinking cruzado (topic clusters).
// Se enlazan SOLO los slugs que existan como página (se filtran en render).
const CLUSTERS: string[][] = [
  // Laboral
  ['denuncia-por-despido-injustificado', 'denuncia-por-no-pago-de-cotizaciones', 'carta-renuncia-laboral', 'carta-amonestacion-laboral'],
  // Deudas / prescripción
  ['prescripcion-de-deuda-tag', 'prescripcion-de-deuda-bancaria', 'carta-prescripcion-deuda-general', 'carta-cobranza-deuda', 'acuerdo-pago-deuda'],
  // Tránsito
  ['escrito-prescripcion-multa-transito', 'escrito-defensa-infraccion-transito', 'prescripcion-de-multas-de-transito', 'recurso-apelacion-juzgado-policia-local', 'limpieza-de-hoja-de-vida-del-conductor'],
  // Familia
  ['demanda-de-alimentos', 'registro-nacional-de-deudores-de-pensiones-de-alimentos', 'acuerdo-tuicion-compartida', 'solicitud-visitas-reguladas'],
  // Consumidor
  ['carta-reclamo-sernac', 'carta-reclamo-banco', 'carta-reclamo-aerolinea', 'carta-reclamo-telecomunicaciones', 'carta-reclamo-isapre'],
  // Arriendo
  ['demanda-de-desalojo-por-no-pago', 'contrato-arriendo-casa', 'contrato-arriendo-departamento', 'carta-cobro-arriendo-impago'],
  // Antecedentes
  ['certificado-de-antecedentes-para-fines-especiales', 'eliminacion-de-antecedentes-penales', 'omision-de-antecedentes-por-violencia-intrafamiliar'],
  // Convivencia / vecinos
  ['denuncia-ruidos-molestos-vecinos', 'denuncia-maltrato-animal'],
];

// FAQ por categoría legal — para FAQPage JSON-LD (AI Overviews eligibility)
const FAQ_BY_CATEGORY: Record<string, { q: string; a: string }[]> = {
  'Prescripción de deuda TAG': [
    { q: '¿Qué es la prescripción de deuda TAG?', a: 'La prescripción extingue la obligación de pago cuando ha transcurrido un plazo sin que se haya iniciado un cobro judicial. Para la deuda civil por uso de autopista (peaje TAG): prescribe en 5 años (acción ordinaria, Art. 2515 CC) o 3 años (acción ejecutiva). Se alega ante la concesionaria mediante carta, o como excepción ante el Juzgado de Letras en lo Civil si ya te demandaron. NOTA: las multas por circular SIN TAG son un trámite distinto y se tramitan ante el Juzgado de Policía Local.' },
    { q: '¿Cuánto tarda en prescribir una deuda TAG?', a: 'Deuda civil por uso de autopista (peaje): 5 años para la acción ordinaria o 3 años para la acción ejecutiva, contados desde la fecha de cada cobro sin interrupción judicial (Art. 2515 CC). Si la concesionaria no te demandó en ese plazo, puedes oponer la prescripción.' },
    { q: '¿Puedo presentar la solicitud de prescripción sin abogado?', a: 'En Chile, para alegar prescripción ante tribunal se requiere patrocinio de abogado. LegalHelp genera el documento base que luego puedes presentar con asistencia legal o a través de las Corporaciones de Asistencia Judicial.' },
    { q: '¿Qué información necesito para generar el documento?', a: 'Necesitas tu RUT, el documento de cobro TAG (o el detalle de la deuda), la fecha aproximada del último cobro y el nombre de la concesionaria (Autopista Central, Costanera Norte, Vespucio Norte, etc.).' },
  ],
  'Prescripción de deuda bancaria': [
    { q: '¿Cuándo prescribe una deuda bancaria en Chile?', a: 'La acción ejecutiva para cobrar una deuda bancaria prescribe a los 3 años (Art. 2515 CC) y la acción ordinaria a los 5 años desde que la deuda se hizo exigible.' },
    { q: '¿Qué pasa si el banco no ha demandado en 3 años?', a: 'Si transcurrieron 3 años sin acción judicial del banco, puedes alegar la prescripción extintiva como excepción ante el tribunal o mediante demanda declarativa.' },
    { q: '¿La prescripción bancaria se aplica a todas las deudas?', a: 'Sí, aplica a deudas de tarjetas de crédito, créditos de consumo, líneas de crédito y otros productos bancarios, salvo hipotecas que tienen plazos distintos.' },
    { q: '¿Qué documento genera LegalHelp para prescripción bancaria?', a: 'LegalHelp genera el escrito de excepción de prescripción o la demanda declarativa de prescripción, personalizado con tus datos, el monto, banco y juzgado correspondiente.' },
  ],
  'Demanda de alimentos': [
    { q: '¿Quién puede demandar alimentos en Chile?', a: 'Los hijos menores de edad, hijos mayores con necesidades especiales, el cónyuge o conviviente civil que no puede mantenerse por sus propios medios, y ascendientes en situación de necesidad.' },
    { q: '¿Ante qué tribunal se presenta la demanda de alimentos?', a: 'La demanda se presenta ante el Juzgado de Familia del domicilio del demandante o del demandado, según elija quien demanda.' },
    { q: '¿Cuánto tiempo tarda el proceso de alimentos?', a: 'Una vez presentada la demanda, el tribunal puede fijar alimentos provisorios en días. El proceso completo suele durar entre 2 y 6 meses.' },
    { q: '¿Qué porcentaje del sueldo corresponde pagar en alimentos?', a: 'La ley no fija un porcentaje único. El tribunal evalúa las necesidades del alimentario y la capacidad económica del alimentante, pero habitualmente oscila entre el 25 % y el 40 % del ingreso.' },
  ],
  'Denuncia por despido injustificado': [
    { q: '¿Qué es el despido injustificado en Chile?', a: 'El despido injustificado ocurre cuando el empleador termina el contrato de trabajo sin una causa legal válida contemplada en el Art. 159, 160 o 161 del Código del Trabajo.' },
    { q: '¿Cuánto tiempo tengo para denunciar un despido injustificado?', a: 'El plazo para interponer la denuncia ante la Inspección del Trabajo o la demanda ante el Juzgado de Letras del Trabajo es de 60 días hábiles desde la fecha del despido.' },
    { q: '¿Qué indemnización corresponde por despido injustificado?', a: 'Corresponde indemnización por años de servicio (un mes de remuneración por año trabajado) más el 30 % de recargo en caso de despido injustificado declarado por tribunal.' },
    { q: '¿Puedo presentar la denuncia en la Inspección del Trabajo sin abogado?', a: 'Sí. La denuncia ante la Inspección del Trabajo no requiere abogado. LegalHelp genera el escrito de denuncia con todos los datos necesarios para presentarlo directamente.' },
  ],
  'Recurso de protección': [
    { q: '¿Qué es el recurso de protección?', a: 'Es una acción constitucional consagrada en el Art. 20 de la Constitución chilena que protege los derechos fundamentales ante actos u omisiones ilegales o arbitrarios que los vulneren.' },
    { q: '¿Cuánto tiempo tengo para interponer un recurso de protección?', a: 'El plazo es de 30 días corridos desde el acto u omisión, o desde que se tomó conocimiento del mismo, según el Auto Acordado de la Corte Suprema.' },
    { q: '¿Ante qué tribunal se presenta el recurso de protección?', a: 'Se presenta ante la Corte de Apelaciones del domicilio del afectado o del lugar donde ocurrió el acto que vulnera el derecho.' },
    { q: '¿Qué derechos protege el recurso de protección?', a: 'Protege derechos como la libertad personal, la igualdad ante la ley, el derecho a la vida, la propiedad, la libertad de trabajo y otros derechos del Art. 19 de la Constitución (excepto el Art. 19 N° 3 inciso 5° y N° 12).' },
  ],
  'Carta reclamo SERNAC': [
    { q: '¿Para qué sirve una carta reclamo al SERNAC?', a: 'La carta reclamo SERNAC notifica formalmente al proveedor que ha vulnerado tus derechos como consumidor y sirve como respaldo para escalar el reclamo a mediación o juicio si no hay respuesta.' },
    { q: '¿El SERNAC puede obligar al proveedor a responder?', a: 'SERNAC puede mediar entre el consumidor y la empresa. Si no hay acuerdo, puede interponer demanda colectiva o asesorarte para que presentes una demanda individual ante el Juzgado de Policía Local.' },
    { q: '¿Cuánto tiempo tiene la empresa para responder al SERNAC?', a: 'La empresa tiene un plazo de 10 días hábiles para responder al mediador del SERNAC una vez recibido el reclamo.' },
    { q: '¿Qué información debe contener la carta reclamo SERNAC?', a: 'La carta debe incluir tus datos, la empresa reclamada, descripción del hecho, fecha, número de transacción o contrato, y la solución que solicitas (reembolso, reposición, indemnización, etc.).' },
  ],
  'Demanda de desalojo por no pago': [
    { q: '¿Cuándo puedo demandar el desalojo por no pago de arriendo?', a: 'Puedes demandar cuando el arrendatario tiene dos o más meses de arriendo impago, según la Ley 18.101 sobre arrendamiento de predios urbanos.' },
    { q: '¿Qué tribunal conoce la demanda de desalojo en Chile?', a: 'El Juzgado de Letras en lo Civil del lugar donde está ubicado el inmueble arrendado.' },
    { q: '¿Cuánto tarda un proceso de desalojo en Chile?', a: 'Con la reforma de la Ley 21.461 (Devuélveme Mi Casa), el proceso puede durar entre 2 y 6 meses, con audiencias concentradas para acelerarlo.' },
    { q: '¿Puedo pedir lanzamiento inmediato al demandar?', a: 'Puedes solicitar una medida prejudicial de restitución anticipada si acreditas el no pago. El tribunal evaluará la solicitud antes de la audiencia principal.' },
  ],
  'Denuncia por no pago de cotizaciones': [
    { q: '¿Qué es el no pago de cotizaciones previsionales?', a: 'Ocurre cuando el empleador descuenta las cotizaciones del sueldo del trabajador pero no las entera (paga) en la AFP, Isapre o Fonasa dentro de los plazos legales.' },
    { q: '¿Dónde denuncio el no pago de cotizaciones?', a: 'Ante la Inspección del Trabajo correspondiente a tu lugar de trabajo o domicilio del empleador. También puedes consultar en la AFP o Isapre afectada.' },
    { q: '¿Qué sanciones enfrenta el empleador que no paga cotizaciones?', a: 'El empleador puede recibir multas, reajustes e intereses sobre las sumas no pagadas. En casos graves puede ser sancionado penalmente por el delito de apropiación indebida.' },
    { q: '¿Puedo despedirme y reclamar indemnización por no pago de cotizaciones?', a: 'Sí. El Art. 162 del Código del Trabajo establece que si el empleador no ha pagado las cotizaciones al momento del despido, ese despido es nulo y el trabajador mantiene su derecho a indemnizaciones.' },
  ],

  // ── Cluster 1: Contratos laborales ──────────────────────────────────────
  'Contrato de trabajo indefinido': [
    { q: '¿Cuánto tiempo tiene el empleador para escriturar el contrato indefinido?', a: 'Según el Art. 9 del Código del Trabajo, el contrato debe escriturarse dentro de los 15 días hábiles desde el inicio de las labores. Si no lo hace, el trabajador puede denunciarlo a la Inspección del Trabajo.' },
    { q: '¿Qué cláusulas son obligatorias en un contrato indefinido?', a: 'Son cláusulas obligatorias: lugar y fecha del contrato, individualización de las partes, función o cargo, lugar de trabajo, monto y forma de remuneración, duración y distribución de jornada, y plazo del contrato.' },
    { q: '¿Puede el empleador modificar el contrato unilateralmente?', a: 'No. Toda modificación requiere acuerdo de ambas partes y debe escriturarse como anexo de contrato. La excepción es el ius variandi (Art. 12 CT) que permite cambios menores en función, horario o lugar, siempre que no afecten al trabajador.' },
    { q: '¿Qué diferencia hay entre contrato indefinido y a plazo fijo?', a: 'El contrato indefinido no tiene fecha de término y solo puede terminar por causales legales del Art. 159 o 161 CT con las indemnizaciones correspondientes. El contrato a plazo fijo termina en la fecha pactada sin indemnización de años de servicio.' },
  ],
  'Contrato de trabajo a plazo fijo': [
    { q: '¿Cuántas veces se puede renovar un contrato a plazo fijo antes de que se convierta en indefinido?', a: 'Según el Art. 159 N°4 CT, si el trabajador continúa prestando servicios tras la segunda renovación, el contrato se transforma en indefinido. También si la suma de los contratos supera 1 año (o 2 años para profesionales).' },
    { q: '¿Qué pasa si el contrato a plazo fijo vence y el trabajador sigue trabajando?', a: 'Si el trabajador sigue laborando con conocimiento del empleador tras el vencimiento del plazo, el contrato se convierte automáticamente en indefinido, con todos los derechos asociados.' },
    { q: '¿Hay indemnización por término de contrato a plazo fijo?', a: 'No corresponde indemnización por años de servicio cuando el contrato termina por vencimiento del plazo pactado. Sí corresponde si el empleador pone término anticipado sin causal justificada.' },
    { q: '¿Puede el trabajador renunciar antes de que venza el plazo?', a: 'Sí puede renunciar, pero debe avisar con 30 días de anticipación. Si no da aviso previo, el empleador podría descontar el equivalente a ese período de las liquidaciones pendientes.' },
  ],
  'Contrato de trabajo part-time': [
    { q: '¿Cuántas horas máximo puede trabajar un empleado part-time?', a: 'El Art. 40 bis del Código del Trabajo establece un máximo de 30 horas semanales para la jornada parcial. Si el trabajador labora habitualmente más horas, podría recalificarse como jornada completa.' },
    { q: '¿Los trabajadores part-time tienen derecho a feriado anual?', a: 'Sí. Todo trabajador con contrato vigente superior a 1 año tiene derecho a feriado proporcional a las horas trabajadas, sin importar si es jornada completa o parcial.' },
    { q: '¿Se pueden pactar horas extraordinarias en un contrato part-time?', a: 'Sí, pero las horas extra solo se pueden pactar cuando la jornada ordinaria sea inferior a 45 horas semanales. Para un part-time de 20 hrs, se puede pactar hasta 25 hrs más.' },
    { q: '¿Cómo se calcula la remuneración proporcional en jornada part-time?', a: 'La remuneración es proporcional a las horas trabajadas respecto de la jornada completa (45 hrs). Si el sueldo mínimo completo es $500.000 y trabajas 22.5 hrs, corresponde $250.000 mínimo.' },
  ],
  'Contrato de trabajo teletrabajo': [
    { q: '¿Qué obligaciones tiene el empleador bajo la Ley de Teletrabajo?', a: 'La Ley 21.220 obliga al empleador a proveer equipos, herramientas y materiales necesarios para el trabajo remoto, o compensar económicamente si el trabajador usa los propios. También debe respetar el derecho a desconexión de 12 horas continuas.' },
    { q: '¿El trabajador puede negarse a hacer teletrabajo?', a: 'El teletrabajo debe ser acordado por ambas partes. El empleador no puede imponer unilateralmente el cambio a modalidad remota; requiere anexo de contrato firmado por el trabajador.' },
    { q: '¿Cómo funciona el derecho a desconexión en teletrabajo?', a: 'El trabajador tiene derecho a al menos 12 horas continuas de desconexión. El empleador no puede contactar ni exigir respuesta fuera de la jornada pactada, salvo casos de fuerza mayor debidamente justificados.' },
    { q: '¿Se puede volver a trabajo presencial desde teletrabajo?', a: 'Sí. Si el acuerdo de teletrabajo lo permite, o por mutuo acuerdo entre empleador y trabajador, se puede volver a modalidad presencial. Debe quedar registrado en un nuevo anexo de contrato.' },
  ],
  'Contrato de trabajo por obra o faena': [
    { q: '¿Cuándo termina un contrato por obra o faena?', a: 'Termina cuando la obra o faena específica pactada concluye. El empleador debe dar aviso con 30 días de anticipación o pagar la indemnización sustitutiva del aviso. No hay indemnización por años de servicio al terminar la obra.' },
    { q: '¿Puede usarse el contrato por obra para reemplazar un contrato indefinido?', a: 'No. La jurisprudencia laboral y la Inspección del Trabajo rechazan el uso de contratos por obra para encubrir relaciones laborales permanentes. Si la faena es habitual y permanente, el contrato debe ser indefinido.' },
    { q: '¿Qué debe especificarse como "obra o faena" en el contrato?', a: 'Debe identificarse la obra con precisión: nombre del proyecto, ubicación, descripción específica del trabajo. Una descripción genérica como "trabajos de construcción" puede ser objetada por la Inspección del Trabajo.' },
    { q: '¿Tienen derecho a feriado los trabajadores por obra?', a: 'Sí, si la relación laboral dura más de 1 año. Si la obra termina antes, corresponde el feriado proporcional a los días trabajados en ese año.' },
  ],
  'Finiquito laboral': [
    { q: '¿Cuántos días tiene el empleador para pagar el finiquito?', a: 'El Art. 177 CT establece que el finiquito debe pagarse dentro de los 10 días hábiles desde el término del contrato. El incumplimiento genera una multa del 50% del monto adeudado más intereses.' },
    { q: '¿Puedo firmar el finiquito bajo protesta?', a: 'Sí. Puedes firmar el finiquito con la reserva "firmo bajo protesta" o "sin perjuicio de mis derechos", lo que te permite impugnarlo judicialmente dentro de los 60 días hábiles siguientes.' },
    { q: '¿Qué debe incluir un finiquito completo?', a: 'El finiquito debe incluir: indemnización por años de servicio (si aplica), indemnización sustitutiva del aviso previo, saldo de vacaciones proporcionales, remuneración del último mes y cualquier otro beneficio pactado en el contrato.' },
    { q: '¿Ante quién se ratifica el finiquito?', a: 'Debe ratificarse ante un ministro de fe: inspector del Trabajo, notario público, oficial del Registro Civil o presidente del sindicato al que pertenece el trabajador. Sin ratificación, el finiquito no libera al empleador.' },
  ],
  'Carta de renuncia laboral': [
    { q: '¿Cuántos días de anticipación necesito dar para renunciar?', a: 'La ley no exige un plazo mínimo para renunciar, pero el Art. 159 N°2 CT establece que si no se da aviso con 30 días de anticipación, el empleador puede descontar la remuneración de esos días del finiquito.' },
    { q: '¿Puedo renunciar y cobrar indemnización?', a: 'La renuncia voluntaria no da derecho a indemnización por años de servicio ni indemnización sustitutiva del aviso. Solo tienes derecho a las vacaciones proporcionales acumuladas y el sueldo del período trabajado.' },
    { q: '¿Qué pasa si el empleador no acepta mi renuncia?', a: 'El empleador no puede negarse a aceptar una renuncia voluntaria. Es un derecho del trabajador y no requiere aceptación del empleador. La carta debe entregarse con constancia de recepción (fecha y firma).' },
    { q: '¿Puedo retractar una carta de renuncia?', a: 'Puedes retractarla mientras no haya sido aceptada formalmente por el empleador. Una vez aceptada, necesitas el acuerdo del empleador para dejarla sin efecto.' },
  ],
  'Carta de amonestación laboral': [
    { q: '¿Cuánto tiempo tiene el empleador para amonestar al trabajador por una falta?', a: 'La amonestación debe aplicarse dentro de los 10 días hábiles desde que el empleador tomó conocimiento de la falta. Fuera de este plazo, puede ser cuestionada judicialmente.' },
    { q: '¿Cuántas amonestaciones se pueden dar antes de despedir?', a: 'La ley no fija un número específico. La acumulación de amonestaciones escritas puede configurar la causal de Art. 160 N°7 CT (incumplimiento grave de las obligaciones del contrato), que permite el despido sin indemnización.' },
    { q: '¿Puede el trabajador responder o impugnar una carta de amonestación?', a: 'Sí. El trabajador puede presentar descargos por escrito dentro de los 5 días hábiles siguientes. Si considera que la amonestación es injustificada, puede denunciarla a la Inspección del Trabajo.' },
    { q: '¿La amonestación verbal tiene el mismo valor que la escrita?', a: 'No. Para efectos probatorios y legales, solo la amonestación escrita y registrada en la hoja de vida del trabajador tiene valor ante un tribunal. La verbal no queda registrada ni puede usarse como antecedente de despido.' },
  ],
  'Anexo de contrato de trabajo (actualización de sueldo)': [
    { q: '¿Es obligatorio hacer un anexo cuando suben el sueldo?', a: 'Sí. El Art. 11 CT establece que toda modificación al contrato de trabajo debe quedar por escrito como anexo dentro de los 5 días hábiles desde el acuerdo. Sin anexo, el trabajador puede exigir el reconocimiento del nuevo sueldo.' },
    { q: '¿Qué pasa si el empleador sube el sueldo pero no hace el anexo?', a: 'El empleador puede ser denunciado a la Inspección del Trabajo. Además, si paga el sueldo mayor por más de 30 días sin objeción, ese monto puede considerarse como la remuneración real para efectos de finiquito.' },
    { q: '¿El anexo puede bajar el sueldo del trabajador?', a: 'Solo si el trabajador lo acepta expresamente y por escrito. Una rebaja unilateral de sueldo es ilegal y puede ser denunciada como infracción o dar lugar a despido indirecto (autodespido).' },
    { q: '¿Cuántas copias del anexo se deben firmar?', a: 'Al igual que el contrato original, se firman dos copias: una para el empleador y una para el trabajador. Ambas deben quedar firmadas por ambas partes.' },
  ],

  // ── Cluster 2: Arrendamiento ─────────────────────────────────────────────
  'Contrato de arriendo de casa': [
    { q: '¿Qué garantía puede pedir el arrendador al inicio del arriendo?', a: 'La Ley 18.101 no limita el monto de la garantía. La práctica habitual es 1 a 2 meses de renta. La garantía debe devolverse al término del contrato descontando daños, y el arrendador no puede retenerla sin justificación.' },
    { q: '¿Con cuánto tiempo debo avisar para poner término al contrato?', a: 'El desahucio debe notificarse con al menos 2 meses de anticipación (Art. 3° Ley 18.101). Para contratos de mes a mes, el aviso es de 1 mes. El plazo se cuenta desde que el arrendatario recibe la notificación.' },
    { q: '¿Puede el arrendador subir el arriendo en cualquier momento?', a: 'Solo puede reajustar el arriendo según lo pactado en el contrato o, en su defecto, cuando transcurra el plazo pactado. No puede aumentarlo unilateralmente durante la vigencia del contrato.' },
    { q: '¿Qué pasa si el arrendatario no paga y no se va?', a: 'El arrendador debe demandar el desalojo ante el Juzgado Civil. Con la Ley 21.461 (Devuélveme Mi Casa), el proceso se tramita de forma concentrada y puede obtener sentencia en menos de 6 meses.' },
  ],
  'Contrato de arriendo de departamento': [
    { q: '¿Puede el arrendador prohibir tener mascotas en el contrato?', a: 'Sí. La Ley 18.101 permite que las partes pacten libremente las condiciones del arriendo, incluyendo prohibición de mascotas. Sin embargo, si el reglamento de copropiedad las permite, la cláusula del contrato puede ser discutible.' },
    { q: '¿Quién paga los gastos comunes del departamento arrendado?', a: 'En general, el arrendatario paga los gastos comunes ordinarios mientras habita el inmueble. Los gastos extraordinarios (reparaciones mayores al edificio) suelen ser responsabilidad del propietario, salvo pacto en contrario.' },
    { q: '¿Puede el arrendatario subarrendar el departamento?', a: 'No, salvo que el contrato lo autorice expresamente. El subarriendo sin autorización es causal de término del contrato y puede fundamentar una demanda de desalojo.' },
    { q: '¿Qué inspecciones puede hacer el arrendador durante el arriendo?', a: 'Solo las necesarias con aviso previo razonable (al menos 24-48 horas). El arrendador no puede ingresar sin autorización del arrendatario; hacerlo puede configurar violación de morada.' },
  ],
  'Contrato de arriendo de local comercial': [
    { q: '¿La Ley 18.101 aplica igual a locales comerciales que a viviendas?', a: 'La Ley 18.101 aplica a locales comerciales con algunas diferencias. El plazo de desahucio para locales es de 2 meses, y el proceso de desalojo sigue el procedimiento del Código de Procedimiento Civil cuando el arriendo supera ciertos montos.' },
    { q: '¿Puede pactarse un arriendo variable ligado a las ventas del local?', a: 'Sí. Los contratos de arriendo de locales comerciales pueden incluir renta variable (porcentaje de ventas) además o en lugar de renta fija. Debe especificarse claramente el mecanismo de cálculo y auditoría.' },
    { q: '¿Qué pasa con las mejoras que el arrendatario hace en el local?', a: 'Salvo pacto en contrario, las mejoras quedan en beneficio del arrendador al término del contrato sin indemnización. Es crucial pactar en el contrato el destino de las inversiones realizadas en el local.' },
    { q: '¿Puede el arrendador prohibir el traspaso del local?', a: 'Sí. El contrato puede prohibir el traspaso del arriendo a terceros. Sin esta cláusula, el arrendatario podría traspasar el negocio con el contrato de arriendo incluido, lo que no siempre es deseable para el arrendador.' },
  ],
  'Contrato de subarriendo': [
    { q: '¿Cuándo es válido el subarriendo?', a: 'El subarriendo es válido solo cuando el contrato principal lo autoriza expresamente o el arrendador da su consentimiento por escrito. Sin autorización, el subarriendo es causal de desalojo del arrendatario original.' },
    { q: '¿El subarrendatario tiene derechos frente al arrendador original?', a: 'El subarrendatario no tiene vínculo directo con el arrendador original. Si el arrendatario no paga, el subarrendatario puede ser desalojado aunque esté al día con el arrendatario.' },
    { q: '¿Puede el subarriendo tener un precio mayor al arriendo original?', a: 'Jurídicamente sí, salvo pacto en contrario. Sin embargo, el arrendador puede prohibir expresamente que el subarriendo sea más caro que el arriendo original.' },
    { q: '¿Qué pasa si termina el contrato principal de arriendo?', a: 'Al terminar el contrato principal, el subarriendo también termina. El subarrendatario debe abandonar el inmueble aunque su contrato con el arrendatario esté vigente. Por eso es crucial que el subarrendatario conozca el plazo del arriendo principal.' },
  ],
  'Carta de término de contrato de arriendo': [
    { q: '¿Cómo debe notificarse el término del contrato de arriendo al arrendatario?', a: 'Debe notificarse por carta certificada o personalmente con 2 meses de anticipación. La carta debe indicar la fecha de término y solicitar la restitución del inmueble. Sin notificación formal, el plazo no comienza a correr.' },
    { q: '¿Qué pasa si el arrendatario no se va al vencer el contrato?', a: 'Si el arrendatario no restituye el inmueble, debes demandar el desalojo ante el Juzgado Civil. No puedes cortarle la luz o el agua ni cambiar las chapas: son acciones ilegales que pueden revertirse en tu contra.' },
    { q: '¿Puede el arrendador terminar el contrato antes del plazo?', a: 'Solo si existe una causal legal (no pago, subarriendo no autorizado, daños, etc.). Para terminar anticipadamente sin causal, debe indemnizar al arrendatario por los meses que restan del contrato.' },
    { q: '¿El arrendatario puede oponerse al término del contrato?', a: 'No puede oponerse si el plazo pactado venció y se dio aviso legal. Sí puede oponerse si el contrato es indefinido y considera que no se cumplieron los plazos de desahucio, lo que se resuelve ante el tribunal.' },
  ],
  'Carta de cobro de arriendo impago': [
    { q: '¿Cuántos meses de atraso justifican demandar el desalojo?', a: 'Basta con 1 mes de atraso para demandar. Sin embargo, la práctica habitual es esperar hasta 2 meses de mora para tener mayor respaldo probatorio. La Ley 21.461 facilita el desalojo acelerado desde el primer mes de incumplimiento.' },
    { q: '¿La carta de cobro interrumpe la prescripción del arriendo?', a: 'La carta extrajudicial no interrumpe la prescripción. Solo la demanda judicial interrumpe el plazo prescriptorio. Sin embargo, la carta sirve como prueba de que el arrendador realizó gestiones de cobro.' },
    { q: '¿Puede el arrendador retener la garantía por arriendo impago?', a: 'Sí. Al término del contrato, si hay arriendos impagos, el arrendador puede imputarlos a la garantía. Si la garantía no alcanza, puede demandar el saldo en el mismo proceso de desalojo.' },
    { q: '¿Qué información debe contener la carta de cobro de arriendo?', a: 'Debe detallar: meses adeudados, montos específicos por cada período, total de la deuda, plazo para pagar (5 a 10 días hábiles) y advertencia de acciones legales si no hay pago.' },
  ],

  // ── Cluster 3: Poderes y mandatos ────────────────────────────────────────
  'Poder simple': [
    { q: '¿El poder simple necesita notarización para ser válido?', a: 'No. El poder simple tiene validez legal con la firma del poderdante ante dos testigos mayores de edad. Sin embargo, algunos trámites específicos (registro de propiedades, bancos, Registro Civil) pueden exigir firma notarial.' },
    { q: '¿Cuánto tiempo tiene validez un poder simple?', a: 'El poder simple no tiene plazo de vencimiento legal salvo que se indique uno en el documento. Se puede revocar en cualquier momento notificando al mandatario. Para trámites bancarios, muchas instituciones exigen que tenga menos de 1 año.' },
    { q: '¿Puede el mandatario realizar cualquier acto con un poder simple?', a: 'Solo los actos expresamente señalados en el poder. El mandato especial limita las facultades del mandatario a lo indicado. Para vender propiedades o contraer obligaciones, se requiere poder especial con esa facultad.' },
    { q: '¿Cómo se revoca un poder simple?', a: 'Se revoca mediante comunicación escrita al mandatario. Es recomendable notificarla ante notario o dejarlo por escrito con constancia de recepción. Si el mandatario ya realizó actos antes de la revocación, estos son válidos frente a terceros de buena fe.' },
  ],
  'Poder notarial': [
    { q: '¿Cuál es la diferencia entre poder simple y poder notarial?', a: 'El poder notarial se otorga ante un Notario Público que da fe de la identidad y capacidad del poderdante, dándole mayor fuerza probatoria. Es exigido por bancos, conservadores de bienes raíces, Registro Civil y muchos servicios públicos.' },
    { q: '¿Puedo otorgar un poder notarial desde el extranjero?', a: 'Sí. Puede otorgarse ante un Notario del país donde te encuentras y luego apostillarlo según el Convenio de La Haya. Para países sin convenio, se requiere legalización consultar ante el cónsul chileno.' },
    { q: '¿Qué sucede si el poderdante fallece?', a: 'El poder notarial se extingue automáticamente con la muerte del poderdante. Los actos realizados por el mandatario antes de saber del fallecimiento son válidos frente a terceros de buena fe.' },
    { q: '¿Cuánto cuesta una escritura de poder notarial?', a: 'El arancel notarial es regulado por el Estado. Una escritura de poder simple notarial cuesta entre $20.000 y $50.000 dependiendo del número de copias y complejidad. El mandato para enajenar bienes raíces puede ser más costoso.' },
  ],
  'Poder para vender vehículo': [
    { q: '¿Es obligatorio el poder notarial para vender un auto en Chile?', a: 'Sí, si el dueño no puede concurrir personalmente al Registro Civil. El Art. 27 de la Ley 18.290 exige la firma del propietario o mandatario con poder notarial ante el oficial del Registro Civil.' },
    { q: '¿Qué datos debe incluir el poder para vender un vehículo?', a: 'Debe indicar: datos completos del mandante (RUT, nombre, domicilio), datos del vehículo (placa, VIN, marca, modelo, año), datos del mandatario y facultad expresa de vender, percibir el precio y firmar todos los documentos necesarios.' },
    { q: '¿Puede el mandatario vender el vehículo a sí mismo?', a: 'El mandatario no puede comprarse a sí mismo el vehículo que está encargado de vender, salvo autorización expresa del mandante en el mismo poder. Esta protección evita conflictos de interés.' },
    { q: '¿Tiene plazo el poder para vender vehículo?', a: 'La ley no fija un plazo, pero es recomendable indicar uno en el documento (ej: 3 a 6 meses). El Registro Civil podría objetar poderes muy antiguos sin fecha de vencimiento.' },
  ],
  'Poder para cobrar finiquito': [
    { q: '¿Puede cualquier persona cobrar el finiquito con un poder?', a: 'Sí. Cualquier persona mayor de edad con el poder correspondiente puede representar al trabajador ante la Inspección del Trabajo o el empleador para cobrar el finiquito y firmar todos los documentos relacionados.' },
    { q: '¿Necesita notarización el poder para cobrar finiquito?', a: 'La Inspección del Trabajo generalmente exige poder notarial para que un tercero firme el finiquito en representación del trabajador. Sin notarización, el inspector podría rechazar la representación.' },
    { q: '¿Puede el abogado cobrar el finiquito con un poder general?', a: 'No es recomendable usar un poder general; debe ser un poder especial que indique expresamente la facultad de cobrar el finiquito, recibir el pago y firmar todos los documentos derivados del término del contrato.' },
    { q: '¿Qué pasa si el empleador se niega a pagar el finiquito al mandatario?', a: 'El empleador está obligado a pagar si el mandatario presenta un poder válido. La negativa puede denunciarse a la Inspección del Trabajo, que puede multar al empleador y exigir el pago inmediato.' },
  ],
  'Poder para trámites bancarios': [
    { q: '¿Los bancos aceptan poder simple para hacer trámites?', a: 'La mayoría de los bancos exige poder notarial para representación en operaciones relevantes (retiros de dinero, solicitud de créditos, cierre de cuentas). Algunos aceptan poder simple para consultas, pero no para operaciones.' },
    { q: '¿Con qué antigüedad aceptan los bancos el poder notarial?', a: 'La mayoría de los bancos en Chile exige que el poder tenga menos de 1 año desde su fecha de otorgamiento. Algunos exigen menos de 6 meses. Verifica con tu banco antes de tramitar el poder.' },
    { q: '¿Puede el mandatario pedir un crédito en nombre del titular?', a: 'Solo si el poder incluye expresamente la facultad de contraer obligaciones y solicitar créditos. Un poder general sin esa especificación no es suficiente para operaciones de endeudamiento.' },
    { q: '¿Qué trámites bancarios se pueden hacer con poder notarial?', a: 'Con las facultades adecuadas: retiro de fondos, cierre de cuentas, solicitud de cartolas, autorización de pagos automáticos, solicitud de créditos, renovación de depósitos a plazo y operaciones de inversión.' },
  ],
  'Mandato especial': [
    { q: '¿Qué diferencia hay entre mandato especial y poder general?', a: 'El mandato especial autoriza al mandatario solo para actos determinados y específicos. El poder general permite actuar en todos los negocios del mandante. Para la mayoría de los trámites, el mandato especial es más seguro y recomendado.' },
    { q: '¿Puede el mandatario delegar el mandato especial en otra persona?', a: 'Solo si el mandante lo autorizó expresamente en el documento. Sin autorización de delegación, el mandatario no puede subdelegar sus facultades a un tercero.' },
    { q: '¿Cómo termina un mandato especial?', a: 'Termina cuando se cumple el acto para el cual fue otorgado, por revocación del mandante, por renuncia del mandatario, por muerte de cualquiera de las partes o por el plazo si se indicó uno.' },
    { q: '¿El mandato especial sirve para todos los trámites del SII?', a: 'Depende del trámite. Para representar ante el SII, se recomienda usar el sistema de representantes del portal web del SII, que es más eficiente. Para trámites específicos fuera del portal, puede requerirse mandato notarial.' },
  ],

  // ── Cluster 4: Prestación de servicios ──────────────────────────────────
  'Contrato de prestación de servicios a honorarios': [
    { q: '¿Cuál es la diferencia entre trabajar en honorarios y en relación laboral?', a: 'En honorarios no hay subordinación ni dependencia: el prestador organiza su tiempo y herramientas. Si hay horario fijo, exclusividad y fiscalización, podría recaracterizarse como relación laboral, con todos sus derechos.' },
    { q: '¿El prestador de servicios a honorarios tiene derecho a vacaciones?', a: 'No. Al no ser trabajador dependiente, no tiene derecho legal a vacaciones, feriado anual ni feriado progresivo. Solo puede acordar voluntariamente períodos de descanso con el contratante.' },
    { q: '¿Quién paga las cotizaciones en un contrato de honorarios?', a: 'El profesional a honorarios debe pagar sus propias cotizaciones previsionales (AFP) y de salud (Isapre/Fonasa). Desde la Ley 21.133, se obliga a los honorarios a cotizar desde el 2020 con alícuotas crecientes.' },
    { q: '¿Puede el contrato de honorarios convertirse en relación laboral?', a: 'Sí. Si la Inspección del Trabajo o un tribunal determina que existe subordinación, dependencia y habitualidad, puede declarar la existencia de un contrato de trabajo, con las indemnizaciones y beneficios que correspondan.' },
  ],
  'Contrato freelance': [
    { q: '¿Tiene validez legal un contrato freelance en Chile?', a: 'Sí. El Art. 1545 CC establece que todo contrato válidamente celebrado es ley para las partes. Un contrato freelance bien redactado tiene plena validez y puede hacerse cumplir ante los tribunales.' },
    { q: '¿Qué debe incluir un contrato freelance para proteger al contratista?', a: 'Debe incluir: descripción detallada del servicio, plazos de entrega, forma de pago y montos, propiedad intelectual del trabajo entregado, cláusula de confidencialidad, condiciones de término anticipado y jurisdicción.' },
    { q: '¿Cómo se cobra cuando el cliente no paga un proyecto freelance?', a: 'Primero, carta de cobro formal con plazo de 5 días. Luego, demanda ante el Juzgado Civil por incumplimiento de contrato. Si el monto es inferior a 10 UTM, puedes ir directamente al Juzgado de Policía Local sin abogado.' },
    { q: '¿Quién es dueño del trabajo creado en un proyecto freelance?', a: 'Salvo que el contrato diga lo contrario, el creador retiene los derechos de autor. Para transferir la propiedad intelectual al cliente, debe incluirse una cláusula expresa de cesión de derechos en el contrato.' },
  ],

  // ── Cluster 5: Compraventa ───────────────────────────────────────────────
  'Contrato de compraventa de vehículo': [
    { q: '¿Es obligatorio hacer el contrato de compraventa de vehículo ante notario?', a: 'No es obligatorio notarizarlo. El formulario oficial del Registro Civil (formulario SRCEI) es suficiente. Sin embargo, notarizar la compraventa agrega seguridad jurídica y facilita la transferencia.' },
    { q: '¿Cuánto tiempo tengo para transferir el vehículo en el Registro Civil?', a: 'El Art. 27 de la Ley 18.290 exige notificar al Registro Civil dentro de los 30 días hábiles desde la compraventa. Si no se hace, el comprador puede ser responsable de multas del vehículo aunque no sea el dueño registral.' },
    { q: '¿Qué pasa si compro un auto con multas o prenda?', a: 'El comprador asume el riesgo de comprar con cargas. Debes revisar el Registro de Vehículos Motorizados, el DICOM vehicular y el certificado de anotaciones del Registro Civil antes de firmar la compraventa.' },
    { q: '¿Puede el vendedor retractarse de la compraventa de un vehículo ya firmada?', a: 'No puede retractarse unilateralmente una vez firmado el contrato. Podría deberse a devolver el precio recibido más una indemnización. Si se firmó con arras, quien se retracta las pierde o debe devolverlas dobladas.' },
  ],
  'Contrato de compraventa de bien mueble': [
    { q: '¿Necesita notarización la compraventa de bienes muebles?', a: 'No. La compraventa de bienes muebles puede hacerse por documento privado. La tradición (entrega del bien) perfecciona la transferencia. Solo bienes como vehículos motorizados requieren inscripción en registros especiales.' },
    { q: '¿Cuándo se transfiere la propiedad de un bien mueble?', a: 'La propiedad se transfiere al momento de la entrega material del bien (tradición). El contrato genera la obligación de entregar, pero es la entrega la que transfiere el dominio.' },
    { q: '¿Qué garantías tiene el comprador de un bien mueble usado?', a: 'En compraventas entre particulares, la garantía legal de la Ley 19.496 no aplica. Sin embargo, el vendedor responde por vicios redhibitorios (defectos ocultos) que hagan inútil el bien según el Art. 1858 CC.' },
    { q: '¿Puede el comprador arrepentirse de la compraventa?', a: 'Solo si el contrato incluye una cláusula de retractación o se pactaron arras con ese efecto. Sin esa cláusula, el arrepentimiento da lugar a responsabilidad civil por incumplimiento de contrato.' },
  ],
  'Promesa de compraventa de inmueble': [
    { q: '¿Cuáles son los requisitos para que la promesa de compraventa sea válida?', a: 'El Art. 1554 CC exige que la promesa sea escrita, que el contrato prometido no sea nulo, que contenga un plazo o condición que fije la época de la celebración, y que especifique el contrato prometido con suficiente precisión.' },
    { q: '¿Qué pasa si el vendedor no quiere firmar la escritura de compraventa después de la promesa?', a: 'El comprador puede demandar el cumplimiento forzado del contrato o exigir la resolución con indemnización. Si se pactaron arras, el vendedor debe devolvérselas dobladas.' },
    { q: '¿Debe la promesa de compraventa inscribirse en el Conservador de Bienes Raíces?', a: 'La promesa en sí no se inscribe, pero sí puede anotarse una prohibición de enajenar el inmueble mientras dure la promesa. Esto protege al comprador de que el vendedor venda a un tercero.' },
    { q: '¿Cuánto dura la validez de una promesa de compraventa?', a: 'Depende del plazo pactado en el documento. Sin plazo expreso, la promesa puede caducar si ninguna de las partes exige el cumplimiento dentro de un plazo razonable. Lo recomendable es pactar un plazo máximo de 90 a 180 días.' },
  ],

  // ── Cluster 6: Juzgados de Policía Local ─────────────────────────────────
  'Escrito de defensa por infracción de tránsito': [
    { q: '¿Cuántos días tengo para apelar una multa de tránsito?', a: 'Tienes 5 días hábiles desde la notificación de la multa para presentar descargos ante el Juzgado de Policía Local. Vencido el plazo, la multa queda firme y debes pagarla para retirar el vehículo o renovar tu licencia.' },
    { q: '¿Necesito abogado para defenderme ante el Juzgado de Policía Local?', a: 'No es obligatorio para infracciones de tránsito. Puedes comparecer personalmente, presentar tu escrito de defensa y asistir a la audiencia. LegalHelp genera el escrito con los fundamentos jurídicos correctos.' },
    { q: '¿En qué casos es posible ganar la impugnación de una multa de tránsito?', a: 'Puedes ganar si: el parte contiene errores formales (fecha, lugar, datos del vehículo), el carabinero no comparece a la audiencia, hay prueba que contradice el parte (testigos, cámaras, GPS), o la infracción fue por emergencia justificada.' },
    { q: '¿Qué documentos llevar al Juzgado de Policía Local?', a: 'Cédula de identidad, licencia de conducir, padrón del vehículo, copia del parte de infracción, y cualquier prueba de descargo (fotos, testigos, registros de GPS o dashcam). El escrito de defensa debe presentarse por escrito.' },
  ],
  'Escrito de prescripción de multa de tránsito': [
    { q: '¿Cuánto tiempo tarda en prescribir una multa de tránsito no pagada?', a: 'Las multas de tránsito impuestas por el Juzgado de Policía Local prescriben en 3 años desde que quedaron ejecutoriadas (Art. 2521 CC). Si solo está en el parte pero sin sentencia judicial, el plazo puede ser diferente.' },
    { q: '¿Cómo puedo saber si mi multa ya prescribió?', a: 'Revisa la fecha de la infracción y si existe sentencia del Juzgado de Policía Local. Si pasaron más de 3 años desde la sentencia sin cobro ejecutivo, puedes alegar la prescripción ante el mismo juzgado.' },
    { q: '¿La prescripción se declara automáticamente o debo solicitarla?', a: 'Debes solicitarla expresamente ante el Juzgado de Policía Local que emitió la multa. La prescripción no opera de oficio; el juez la declara solo a petición de parte.' },
    { q: '¿Prescribir la multa afecta mi historial de manejo?', a: 'La prescripción extingue la obligación de pago pero no elimina el registro de la infracción de los sistemas del Registro Civil. El historial de infracciones es independiente de la deuda de la multa.' },
  ],
  'Recurso de apelación ante Juzgado de Policía Local': [
    { q: '¿Cuándo puedo apelar una sentencia del Juzgado de Policía Local?', a: 'Puedes apelar dentro de los 5 días hábiles siguientes a la notificación de la sentencia. El recurso se presenta ante el mismo Juzgado de Policía Local, que lo eleva al Juzgado de Letras para que lo resuelva.' },
    { q: '¿Suspende la apelación el pago de la multa?', a: 'En algunos casos sí. La apelación puede suspender la ejecución de la sentencia mientras se resuelve, especialmente si se acompaña de una boleta de garantía o depósito por el monto de la multa.' },
    { q: '¿Qué argumentos puedo usar en la apelación?', a: 'Los más frecuentes son: vicios de procedimiento en primera instancia, incorrecta aplicación de la ley, falta de valoración de pruebas presentadas, o errores en la determinación de la sanción.' },
    { q: '¿Cuánto tarda en resolverse una apelación de JPL?', a: 'El Juzgado de Letras debe resolver la apelación dentro de 15 días hábiles. En la práctica, puede tardar entre 1 y 3 meses dependiendo de la carga del tribunal.' },
  ],
  'Denuncia por ruidos molestos de vecinos': [
    { q: '¿Cuáles son los límites legales de ruido en zonas residenciales en Chile?', a: 'El DS 38/2011 del Ministerio del Medio Ambiente establece límites de 45 dB(A) entre 21:00-7:00 hrs y 55 dB(A) entre 7:00-21:00 hrs en zonas residenciales. Superar estos niveles es una infracción sancionable.' },
    { q: '¿Dónde denuncio los ruidos molestos de un vecino?', a: 'Puedes denunciar ante: Carabineros (para situaciones inmediatas), la municipalidad, o el Juzgado de Policía Local. Para ruido persistente de actividades comerciales, también puedes recurrir al SEREMI de Salud.' },
    { q: '¿Qué pruebas necesito para ganar una denuncia por ruidos molestos?', a: 'Lo más efectivo es una medición de ruido con sonómetro realizada por la municipalidad o un perito. También sirven: declaraciones de testigos, videos con registro de hora y fecha, y denuncias anteriores registradas en Carabineros.' },
    { q: '¿Qué sanciones puede aplicar el JPL por ruidos molestos?', a: 'El Juzgado de Policía Local puede aplicar multas de 1 a 5 UTM por infracción, y en casos reiterados puede ordenar el cese de la actividad ruidosa. Para actividades comerciales, puede sugerir el cierre del establecimiento.' },
  ],
  'Denuncia por maltrato animal': [
    { q: '¿Qué conductas constituyen maltrato animal en Chile?', a: 'La Ley 21.020 sanciona: golpear, herir, mutilar, causar sufrimiento innecesario, privar de alimento o agua, mantener en condiciones inadecuadas, y el abandono de mascotas. La ley incluye a perros, gatos y animales domésticos en general.' },
    { q: '¿Dónde y cómo denuncio el maltrato animal?', a: 'Puedes denunciar ante: Carabineros, el Juzgado de Policía Local de tu municipio, o la Fiscalía si el maltrato es grave (Art. 291 bis CP). LegalHelp genera el escrito de denuncia con todos los fundamentos legales.' },
    { q: '¿Cuáles son las sanciones por maltrato animal en Chile?', a: 'La Ley 21.020 establece multas de 10 a 30 UTM por maltrato. El Art. 291 bis CP para crueldad animal sanciona con presidio menor en su grado mínimo (61 a 540 días) y multa de 2 a 30 UTM.' },
    { q: '¿Puedo pedir el rescate del animal maltratado?', a: 'Sí. Puedes solicitar al Juzgado de Policía Local o a Carabineros el rescate inmediato del animal si existe riesgo para su vida. El animal puede quedar bajo custodia de la municipalidad o una organización protectora.' },
  ],
  'Escrito de impugnación de multa municipal': [
    { q: '¿Cuánto tiempo tengo para impugnar una multa de la municipalidad?', a: 'El plazo para recurrir es de 30 días desde la notificación de la multa. El recurso se presenta ante el alcalde o directamente ante el Juzgado de Policía Local según el tipo de infracción y el monto.' },
    { q: '¿En qué casos puedo impugnar una multa municipal?', a: 'Puedes impugnar si: la multa fue notificada incorrectamente, la causal es incorrecta, la actividad está regularizada, existe error en la identificación del infractor, o la sanción excede los límites legales.' },
    { q: '¿Necesito abogado para impugnar una multa municipal?', a: 'No es obligatorio para multas menores. Puedes presentar el recurso personalmente ante la municipalidad. Para multas superiores a 10 UTM o si la municipalidad recurre a tribunales, se recomienda asesoría legal.' },
    { q: '¿La impugnación suspende el pago de la multa municipal?', a: 'En general sí, mientras se tramita el recurso. Sin embargo, si el recurso es rechazado, la multa puede ser reajustada con los intereses del período. Verifica la posición de la municipalidad específica.' },
  ],

  // ── Cluster 7: Declaraciones juradas ────────────────────────────────────
  'Declaración jurada simple': [
    { q: '¿Una declaración jurada simple tiene valor legal sin notario?', a: 'Sí. La declaración jurada firmada tiene valor probatorio en Chile aunque no esté notarizada. Sin embargo, la notarización certifica la identidad del declarante, lo que la hace más robusta para trámites formales.' },
    { q: '¿Qué consecuencias tiene declarar falsamente en una declaración jurada?', a: 'El Art. 207 del Código Penal sanciona el perjurio con presidio menor en su grado mínimo a medio (61 a 3 años). Si se causa perjuicio a terceros, pueden sumarse acciones civiles de indemnización.' },
    { q: '¿Para qué trámites sirve una declaración jurada simple?', a: 'Sirve para: acreditar domicilio ante servicios básicos, justificar ingresos informales para arriendos, certificar condición de soltero/a, acreditar relación familiar, y apoyar trámites ante municipios o servicios públicos.' },
    { q: '¿Puede hacerse la declaración jurada en formato digital?', a: 'Algunos servicios del Estado aceptan declaraciones juradas digitales con firma electrónica avanzada. Para trámites privados, aún se prefiere la firma física. Verifica con la institución receptora.' },
  ],
  'Declaración jurada de domicilio': [
    { q: '¿Para qué sirve la declaración jurada de domicilio?', a: 'Se usa para: apertura de cuentas bancarias, inscripción en el registro electoral, trámites en el SII, subsidios habitacionales, matrícula escolar, y como respaldo ante la municipalidad o servicios públicos.' },
    { q: '¿La declaración jurada de domicilio reemplaza la boleta de servicios básicos?', a: 'Sí, en muchos casos. Bancos, municipios y servicios públicos la aceptan como alternativa cuando no existe boleta a nombre del solicitante (ej: persona que vive con familiar o en arriendo informal).' },
    { q: '¿Con qué frecuencia debo renovar la declaración jurada de domicilio?', a: 'Depende de la institución receptora. Muchas piden que tenga menos de 30 días de antigüedad. Los bancos pueden aceptar hasta 90 días. Verifica con la institución antes de tramitarla.' },
    { q: '¿Necesita testigos la declaración jurada de domicilio?', a: 'Para declaración simple: idealmente 2 testigos. Para declaración notarial: solo el notario certifica la identidad. La mayoría de los bancos exigen la versión notarizada para apertura de cuentas.' },
  ],
  'Declaración jurada de ingresos': [
    { q: '¿Para qué se usa la declaración jurada de ingresos en Chile?', a: 'Se exige para: postular a subsidios habitacionales (MINVU), acreditar ingresos ante el arrendador, obtener créditos con ingresos informales, beneficios sociales (Chile Solidario, IFE), y trámites ante el SII para trabajadores informales.' },
    { q: '¿Cómo acredita ingresos alguien que trabaja de manera informal?', a: 'La declaración jurada de ingresos firmada ante notario es el mecanismo legal para acreditar ingresos cuando no hay liquidaciones de sueldo ni boletas electrónicas. El declarante asume responsabilidad por la veracidad.' },
    { q: '¿Necesita ser notarial la declaración jurada de ingresos?', a: 'Depende del trámite. Los subsidios del MINVU y los créditos hipotecarios generalmente la exigen ante notario. Para arriendos privados, muchos arrendadores aceptan la firma simple o ante testigos.' },
    { q: '¿Puede el SII cuestionar una declaración jurada de ingresos?', a: 'Sí. Si el SII tiene información que contradice lo declarado (facturas, boletas, compras), puede iniciar una fiscalización. La declaración falsa ante el SII es sancionada por el Art. 97 N°4 del Código Tributario.' },
  ],
  'Declaración jurada de cargas familiares': [
    { q: '¿Quiénes se pueden inscribir como cargas familiares?', a: 'Según el DL 3.500: cónyuge o conviviente civil, hijos menores de 18 años (o hasta 24 si estudian), hijos con discapacidad (sin límite de edad), padres y suegros que el trabajador sustente, y nietos en ciertas condiciones.' },
    { q: '¿Cuándo debo actualizar la declaración jurada de cargas?', a: 'Debes actualizarla cuando cambien las cargas: nacimiento de hijo, matrimonio, divorcio, o cuando una carga supere la edad máxima. No hacerlo puede generar cobros retroactivos de la AFP o Isapre.' },
    { q: '¿Puedo inscribir como carga a mi conviviente de hecho?', a: 'Sí, si existe Acuerdo de Unión Civil (AUC) registrado en el Registro Civil. Sin AUC, el conviviente de hecho no puede inscribirse como carga familiar en el sistema previsional.' },
    { q: '¿Qué pasa si declaro cargas que no corresponden?', a: 'La AFP o Isapre puede cobrar retroactivamente las diferencias de cotización y aplicar multas. En casos graves, puede constituir fraude previsional sancionado penalmente.' },
  ],

  // ── Cluster 8: Reclamos específicos ────────────────────────────────────
  'Carta reclamo aerolínea': [
    { q: '¿Qué derechos tengo si me cancelan el vuelo en Chile?', a: 'La Ley 19.496 y el Código Aeronáutico protegen al pasajero: reembolso completo del pasaje o reubicación en otro vuelo, más compensación por gastos adicionales (hotel, traslado) si la cancelación es imputable a la aerolínea.' },
    { q: '¿Cuánto tiempo tengo para reclamar por un vuelo cancelado o con atraso?', a: 'Puedes reclamar dentro de los 6 meses desde el vuelo ante SERNAC o la Junta Aeronáutica Civil (JAC). La prescripción de la acción civil es de 4 años desde el hecho.' },
    { q: '¿Puede SERNAC obligar a la aerolínea a compensarme?', a: 'SERNAC puede mediar y en caso de no acuerdo puede interponer demanda colectiva. Para demanda individual, debes ir al Juzgado de Policía Local. Las aerolíneas internacionales también responden ante la JAC.' },
    { q: '¿Qué información debo incluir en el reclamo contra la aerolínea?', a: 'Número de vuelo, fecha, ruta, código de reserva, descripción del problema (cancelación, atraso, overbooking, pérdida de equipaje), gastos incurridos con comprobantes, y la compensación que solicitas.' },
  ],
  'Carta reclamo banco': [
    { q: '¿Qué es el SERNAC Financiero y cómo me protege?', a: 'La Ley 20.555 creó el SERNAC Financiero que obliga a los bancos a entregar información clara sobre productos, respetar las condiciones ofrecidas y permite que SERNAC intervenga en reclamos sobre tarjetas, créditos y cuentas.' },
    { q: '¿Puedo reclamar al banco por cobros que no autoricé?', a: 'Sí. Los cobros no autorizados en tarjetas o cuentas deben ser revertidos por el banco si se acredita que no fueron realizados por el titular. Tienes 90 días desde que aparece el cargo para reclamarlo.' },
    { q: '¿Dónde presento el reclamo si el banco no me responde?', a: 'Si el banco no resuelve en 10 días hábiles, puedes escalar a SERNAC (sernac.cl) o a la CMF (Comisión para el Mercado Financiero) en cmfchile.cl/reclamante. Ambas pueden exigir respuesta al banco.' },
    { q: '¿Puede el banco cobrarme por cerrar una cuenta corriente?', a: 'No. La Ley 20.448 prohíbe el cobro por cierre de cuenta corriente. Si el banco te cobró por esto, es una infracción reclamable ante SERNAC o la CMF.' },
  ],
  'Carta reclamo Isapre': [
    { q: '¿Qué derechos tengo si la Isapre me rechaza una prestación médica?', a: 'Tienes derecho a impugnar el rechazo ante la propia Isapre dentro de 5 días hábiles. Si persiste, puedes recurrir a la Superintendencia de Salud, que resuelve en un proceso de mediación o arbitraje.' },
    { q: '¿Puede la Isapre subir el precio del plan sin mi autorización?', a: 'No puede subirlo unilateralmente fuera del proceso anual de adecuación regulado por la Superintendencia. Si la Isapre sube el plan sin el proceso legal, puedes rechazarlo y mantener el precio anterior.' },
    { q: '¿Cuánto tiempo tiene la Isapre para responder mi reclamo?', a: 'La Isapre tiene 10 días hábiles para responder tu reclamo inicial. Si no responde o rechaza, puedes recurrir a la Superintendencia de Salud en un plazo de 6 meses desde el hecho.' },
    { q: '¿Para qué sirve la mediación ante la Superintendencia de Salud?', a: 'La mediación es gratuita y permite llegar a un acuerdo entre el afiliado y la Isapre con la ayuda de un mediador especializado. Si no hay acuerdo, el mediador puede emitir una recomendación que el juez puede considerar en el juicio posterior.' },
  ],
  'Carta reclamo empresa de telecomunicaciones': [
    { q: '¿Qué derechos tengo si la empresa de telefonía o internet no cumple el contrato?', a: 'La Ley 18.168 y la normativa SUBTEL garantizan velocidad mínima de internet, calidad de servicio y atención al cliente. Si no se cumplen, puedes reclamar ante SERNAC o la Subsecretaría de Telecomunicaciones (SUBTEL).' },
    { q: '¿Puede la empresa de telecomunicaciones cobrarme por un servicio que no pedí?', a: 'No. Los cargos por servicios no contratados son una infracción a la Ley del Consumidor. Tienes derecho a que te los reviertan y puedes reclamar ante SERNAC o la SUBTEL por prácticas abusivas.' },
    { q: '¿Cuánto tiempo tiene la empresa para resolver mi reclamo?', a: 'La empresa tiene 10 días hábiles para responder el reclamo. SUBTEL exige que las empresas de telecomunicaciones resuelvan las reclamaciones en ese plazo. Si no responden, SUBTEL puede multar a la empresa.' },
    { q: '¿Puedo cambiar de empresa de telecomunicaciones sin pagar multa?', a: 'La Ley 20.936 garantiza la portabilidad numérica sin costo. Además, si terminas el contrato por incumplimiento de la empresa (servicio deficiente), no puedes ser obligado a pagar la cláusula de término anticipado.' },
  ],
  'Carta reclamo seguro': [
    { q: '¿Cuánto tiempo tiene la aseguradora para responder a un siniestro?', a: 'La DFL 251 obliga a las aseguradoras a pronunciarse sobre la cobertura dentro de 10 días hábiles desde la denuncia del siniestro. Si no responden, se entiende que aceptan la cobertura.' },
    { q: '¿Qué hago si la aseguradora rechaza el pago de mi siniestro?', a: 'Primero reclama por escrito a la aseguradora. Si mantiene el rechazo, puedes recurrir a la CMF (Comisión para el Mercado Financiero) que tiene competencia regulatoria, o interponer demanda civil.' },
    { q: '¿En qué plazo prescribe la acción contra la aseguradora?', a: 'Las acciones derivadas del contrato de seguro prescriben en 4 años desde que la obligación se hizo exigible (Art. 27 DFL 251). Para seguro de vida, el plazo es también de 4 años desde el fallecimiento.' },
    { q: '¿Puede la aseguradora negarme el pago invocando causales no incluidas en la póliza?', a: 'No. La aseguradora solo puede rechazar el pago por causales expresamente establecidas en la póliza. Las exclusiones deben estar redactadas de forma clara y destacada. Una exclusión ambigua se interpreta en favor del asegurado.' },
  ],
  'Carta reclamo tienda retail': [
    { q: '¿Cuánto tiempo tengo para hacer válida la garantía en Chile?', a: 'La garantía legal mínima es de 3 meses para productos nuevos con falla. Si el producto tiene garantía extendida del fabricante o tienda (6, 12 o 24 meses), aplica ese plazo mayor.' },
    { q: '¿Qué puedo exigir si el producto que compré está defectuoso?', a: 'Según el Art. 20 de la Ley 19.496, tienes derecho a elegir entre: reparación gratuita del producto, reposición por uno igual, o devolución del precio. La tienda no puede negarte estas opciones dentro del plazo de garantía.' },
    { q: '¿Puedo devolver un producto que simplemente no me gustó?', a: 'No existe un derecho legal de retractación en compras presenciales. Sin embargo, si la compra fue online o por teléfono, tienes 10 días para retractarte. Muchas tiendas ofrecen política voluntaria de cambio, pero no están obligadas.' },
    { q: '¿Qué hago si la tienda no responde mi garantía?', a: 'Primero, carta formal de reclamo con plazo de respuesta (5 días hábiles). Si no responden, denuncia ante SERNAC o directamente al Juzgado de Policía Local. Para compras bajo 10 UTM (~$650.000), no necesitas abogado.' },
  ],

  // ── Cluster 9: Familia ────────────────────────────────────────────────────
  'Acuerdo de divorcio por mutuo acuerdo': [
    { q: '¿Cuánto tiempo de separación se requiere para divorciarse de mutuo acuerdo?', a: 'La Ley 19.947 exige al menos 1 año de cese de convivencia para el divorcio de mutuo acuerdo. Este año debe estar acreditado (acta de mediación, escritura pública, o demanda judicial de separación).' },
    { q: '¿Qué debe incluir el acuerdo regulador del divorcio?', a: 'El acuerdo regulador debe establecer: cuidado personal de los hijos, régimen de relación directa y regular (visitas), alimentos para los hijos y/o el cónyuge, y la forma de dividir los bienes comunes.' },
    { q: '¿Cuánto tarda el proceso de divorcio por mutuo acuerdo?', a: 'Una vez presentada la demanda con el acuerdo regulador, el tribunal cita a una audiencia preparatoria (2-4 semanas) y luego a una audiencia de juicio (1-3 meses después). El proceso completo puede durar entre 3 y 6 meses.' },
    { q: '¿Se requiere pasar por mediación antes del divorcio?', a: 'Sí. Para el divorcio con hijos menores, es obligatorio pasar por mediación previa. Si la mediación fracasa o no aplica, el tribunal puede prescindir de ella. La mediación es gratuita en el sistema público.' },
  ],
  'Convenio de regulación de divorcio': [
    { q: '¿Qué pasa si uno de los cónyuges incumple el convenio de divorcio?', a: 'El convenio aprobado por el tribunal tiene fuerza de sentencia. Si uno de los cónyuges incumple (no paga alimentos, no respeta visitas), el otro puede pedir apremios al tribunal: retención de sueldo, prohibición de salida del país.' },
    { q: '¿Puede modificarse el convenio de divorcio después de aprobado?', a: 'Sí, ante el mismo Juzgado de Familia, si han cambiado las circunstancias de manera significativa (ej: cambio en ingresos, cambio de domicilio, nuevas necesidades del hijo). Se llama "revisión de alimentos" o "revisión de cuidado personal".' },
    { q: '¿El convenio de divorcio debe incluir la división de bienes?', a: 'Si los cónyuges están en sociedad conyugal o participación en los gananciales, el convenio debe incluir la liquidación de la sociedad conyugal. Si estaban separados de bienes, no es necesario.' },
    { q: '¿Puede el convenio de divorcio incluir una pensión entre cónyuges?', a: 'Sí. La compensación económica (Art. 61 Ley 19.947) puede incluirse en el convenio para el cónyuge que dedicó tiempo al hogar y quedó en desventaja económica. El monto lo determinan las partes de común acuerdo.' },
  ],
  'Acuerdo de tuición compartida': [
    { q: '¿Qué es la tuición compartida en Chile?', a: 'La Ley 20.680 establece que el cuidado personal de los hijos corresponde a ambos padres por igual (coparentalidad). La tuición compartida implica que el hijo vive alternadamente con ambos padres según el acuerdo.' },
    { q: '¿Cómo se distribuye el tiempo del hijo en tuición compartida?', a: 'Las partes pueden acordar libremente la distribución: semanas alternadas, días alternados, o cualquier esquema que se adapte al interés superior del niño y la geografía familiar. El juez aprueba el acuerdo si protege al menor.' },
    { q: '¿Se pagan alimentos en tuición compartida?', a: 'Depende de los ingresos de cada padre. Si los ingresos son similares, puede no haber pensión. Si hay diferencia significativa, el de mayores ingresos puede pagar una pensión complementaria para equiparar el bienestar del hijo.' },
    { q: '¿Puede un padre rechazar la tuición compartida propuesta por el otro?', a: 'Sí puede oponerse, pero debe tener fundamentos. El tribunal evalúa siempre el interés superior del niño. Si un padre quiere tuición compartida y el otro se opone sin causa, el juez puede igualmente decretarla.' },
  ],
  'Solicitud de régimen de visitas': [
    { q: '¿Quién tiene derecho a solicitar un régimen de visitas?', a: 'Principalmente el padre o madre que no tiene el cuidado personal del hijo. También pueden solicitar visitas los abuelos, hermanos u otros parientes cercanos si demuestran que la relación beneficia al niño (Art. 229 bis CC).' },
    { q: '¿Qué pasa si el cuidador personal impide las visitas acordadas?', a: 'Es una infracción grave. El padre afectado puede pedir apremios al Juzgado de Familia: multas de hasta 1 UTM diaria, arresto nocturno del infractor, e incluso un cambio del cuidado personal si el incumplimiento es reiterado.' },
    { q: '¿Puede solicitarse visitas supervisadas?', a: 'Sí. Si existen antecedentes de violencia o riesgo para el niño, el tribunal puede decretar visitas supervisadas por un familiar, un funcionario del tribunal o en el Punto de Encuentro Familiar (PEF), que es un espacio neutral.' },
    { q: '¿Qué régimen de visitas es habitual en Chile?', a: 'El régimen más común es: fines de semana alternados (viernes o sábado a domingo), mitad de vacaciones de verano, semana Santa alternada, y días festivos alternados. Pero las partes pueden acordar cualquier esquema que convenga al niño.' },
  ],

  // ── Cluster 10: Deudas y cobros ───────────────────────────────────────────
  'Carta de cobranza de deuda': [
    { q: '¿Qué puede y qué no puede hacer una empresa de cobranza en Chile?', a: 'La Ley 20.974 prohíbe el hostigamiento: llamadas antes de las 8:00 o después de las 21:00, contacto con familiares o empleador del deudor, amenazas, visitas en horario no razonable y datos falsos sobre consecuencias del no pago.' },
    { q: '¿La carta de cobranza interrumpe el plazo de prescripción?', a: 'No. Solo la demanda judicial interrumpe la prescripción. La carta extrajudicial, aunque sirve como evidencia de gestiones de cobro, no interrumpe el plazo prescriptorio de la deuda.' },
    { q: '¿Puedo ignorar una carta de cobranza de una empresa externa?', a: 'Legalmente puedes no responder, pero conviene verificar si la deuda existe y si no ha prescrito antes de ignorarla. Si la deuda es legítima y no está prescrita, responder con un plan de pago puede evitar una demanda judicial.' },
    { q: '¿Qué información debe contener una carta de cobranza legal?', a: 'Debe incluir: identidad del acreedor y mandante, monto adeudado desglosado, plazo para pagar, datos de contacto para pago, y advertencia de acciones legales. No puede incluir amenazas ni información falsa.' },
  ],
  'Acuerdo de pago de deuda': [
    { q: '¿Tiene el acuerdo de pago de deuda fuerza ejecutiva?', a: 'Si el acuerdo está en escritura pública o es reconocido judicialmente, tiene fuerza ejecutiva (puedes demandar ejecutivamente si no se paga). Un acuerdo privado firmado solo permite demanda ordinaria.' },
    { q: '¿Qué pasa si el deudor incumple el acuerdo de pago?', a: 'Si hay cláusula de aceleración, todas las cuotas se hacen exigibles de inmediato. El acreedor puede demandar ejecutivamente el total adeudado. Si no hay cláusula, debe demandar cuota por cuota.' },
    { q: '¿El acuerdo de pago quita el deudor de DICOM?', a: 'El solo acuerdo no borra DICOM. Para salir de DICOM debes pagar la totalidad de la deuda. Una vez pagado, el acreedor tiene la obligación legal de informar el pago y el deudor puede exigir la eliminación del registro.' },
    { q: '¿Puede el acuerdo de pago incluir condonación parcial de la deuda?', a: 'Sí. Las partes pueden acordar libremente la quita de intereses, multas o incluso parte del capital. Esta negociación es común cuando la deuda lleva mucho tiempo impago y el acreedor prefiere recuperar parte en vez de nada.' },
  ],
  'Prescripción de deuda CAE': [
    { q: '¿Qué es el CAE y cuándo prescribe la deuda?', a: 'El Crédito con Aval del Estado (CAE) es un crédito estudiantil administrado por la Comisión Ingresa. La deuda prescribe a los 5 años desde que se hizo exigible (Art. 2515 CC, acción ordinaria). Si la TGR inició cobro ejecutivo, el plazo ejecutivo es de 3 años.' },
    { q: '¿Puedo liberarme del CAE por prescripción?', a: 'Sí, si han pasado más de 5 años desde que la cuota se hizo exigible sin que la Tesorería haya iniciado acción judicial. Sin embargo, si la TGR ya inició cobro judicial, debes alegar la prescripción como excepción dentro del juicio.' },
    { q: '¿Cómo sé si mi deuda CAE prescribe?', a: 'Revisa la fecha de exigibilidad de cada cuota en tu cuenta de Comisión Ingresa o en la TGR. Cuenta 5 años desde esa fecha. Si no hay notificación judicial en ese período, la cuota está prescrita.' },
    { q: '¿Qué pasa si no pago el CAE a la TGR?', a: 'La TGR puede iniciar un procedimiento ejecutivo de cobro. Si no alegas prescripción a tiempo, el tribunal puede ordenar embargo de bienes o retención de devolución de impuestos.' },
  ],
  'Solicitud de posesión efectiva': [
    { q: '¿Qué es la posesión efectiva y para qué sirve?', a: 'La posesión efectiva es el trámite legal que declara quiénes son los herederos de una persona fallecida y les permite disponer de sus bienes. Se regula en los Art. 877 y siguientes del Código Civil.' },
    { q: '¿Se puede hacer la posesión efectiva sin abogado?', a: 'Sí, para herencias sin testamento se puede tramitar directamente en el Registro Civil (posesión efectiva intestada). Si hay testamento o conflicto entre herederos, se requiere abogado y tramitación ante juzgado civil.' },
    { q: '¿Cuánto demora la posesión efectiva en Chile?', a: 'En el Registro Civil demora aproximadamente 15 a 45 días hábiles. Si es ante tribunal civil, puede demorar 3 a 8 meses dependiendo de la complejidad.' },
    { q: '¿Qué documentos necesito para la posesión efectiva?', a: 'Certificado de defunción, certificado de nacimiento del causante, certificados de nacimiento de todos los herederos, y certificado de matrimonio si corresponde. Todos se obtienen en el Registro Civil.' },
  ],
  'Solicitud de cambio de apellido': [
    { q: '¿Cuánto cuesta cambiarse el apellido en Chile?', a: 'El trámite judicial no tiene costo de ingreso, pero necesitas patrocinio de abogado. Los honorarios varían entre $200.000 y $600.000 CLP. También hay Corporaciones de Asistencia Judicial gratuitas para quienes no pueden pagar.' },
    { q: '¿Qué razones justifican un cambio de apellido en Chile?', a: 'La Ley 17.344 exige justa causa: nombres o apellidos ridículos, lesivos, extranjeros de difícil pronunciación, que generen confusión filiativa, o que hayan sido conocidos públicamente por otro nombre durante 5+ años.' },
    { q: '¿Cuánto demora el cambio de apellido?', a: 'El proceso judicial completo demora entre 2 y 6 meses. Incluye publicación en el Diario Oficial y en un diario regional, más la resolución del juez.' },
    { q: '¿Puedo cambiarme el apellido paterno?', a: 'Sí, se puede cambiar el apellido paterno, materno o ambos si existe justa causa. También se puede solicitar el cambio de orden de los apellidos o eliminar uno de ellos por razones fundadas.' },
  ],
  'Prescripción de deuda Tesorería': [
    { q: '¿Cuándo prescribe una deuda con la Tesorería General de la República?', a: 'Las acciones del Fisco para cobrar deudas tributarias prescriben en 3 años (Art. 200 Código Tributario). Las deudas no tributarias (multas municipales, TAG) prescriben en 5 años según el Art. 2515 CC.' },
    { q: '¿Qué deudas de la TGR prescriben?', a: 'Prescriben deudas de impuestos (IVA, renta), multas fiscales, derechos de aduana, contribuciones de bienes raíces, y deudas de crédito universitario (CAE, Fondo Solidario) que se cobran por la TGR.' },
    { q: '¿Cómo solicito la prescripción de una deuda de Tesorería?', a: 'Presentando un escrito de excepción de prescripción ante el Tribunal Tributario Aduanero (TTA) o ante el juzgado civil que conoce del cobro, según corresponda.' },
    { q: '¿La TGR puede embargarme por una deuda prescrita?', a: 'No. Si la deuda está prescrita, la TGR no puede embargar ni retener fondos. Sin embargo, debes alegar la prescripción formalmente; el tribunal no la declara de oficio.' },
  ],
  'Prescripción de deuda de alimentos': [
    { q: '¿Prescribe la deuda de pensión alimenticia en Chile?', a: 'Sí. Cada cuota de alimentos impaga prescribe individualmente a los 5 años desde que se hizo exigible (Art. 2515 CC). La prescripción debe alegarse ante el tribunal.' },
    { q: '¿El Registro de Deudores de Alimentos afecta la prescripción?', a: 'El registro no interrumpe la prescripción. La deuda sigue existiendo aunque esté en el registro. Solo una demanda judicial del alimentario interrumpe el plazo de prescripción.' },
    { q: '¿Cómo se calcula el plazo de prescripción de alimentos?', a: 'Se cuenta desde la fecha en que cada cuota de alimentos se hizo exigible y no fue pagada. Si en esos 5 años el acreedor inició acciones judiciales de cobro, la prescripción se interrumpe.' },
  ],
  'Solicitud de alzamiento de protesto bancario': [
    { q: '¿Qué es el protesto de un cheque y cómo afecta?', a: 'El protesto es el registro público de que un cheque fue presentado al banco y no fue pagado por falta de fondos, cuenta cerrada o firma disconforme. Aparece en DICOM, puede afectar el crédito y en algunos casos configura el delito de giro doloso de cheques.' },
    { q: '¿Cuánto tiempo tarda en eliminarse el protesto del DICOM?', a: 'El banco tiene 3 días hábiles para informar el alzamiento del protesto una vez que el librador paga. DICOM debe eliminar el registro dentro de 3 días hábiles de recibida la notificación del banco.' },
    { q: '¿Puede alzarse el protesto sin pagar si el cheque fue falsificado?', a: 'Sí. Si el cheque fue falsificado o adulterado, el librador puede solicitar el alzamiento presentando la denuncia ante Carabineros o Fiscalía. El banco debe alzar el protesto mientras se investiga.' },
    { q: '¿Qué documentos necesito para solicitar el alzamiento del protesto?', a: 'Necesitas: comprobante de pago de la deuda (liquidación bancaria, transferencia), RUT del librador, número de cheque y fecha, y los datos del banco. Algunos bancos exigen la carta entregada por el beneficiario del cheque.' },
  ],
  'Carta de prescripción de deuda general': [
    { q: '¿Cómo se interrumpe la prescripción de una deuda?', a: 'La prescripción se interrumpe por: demanda judicial notificada al deudor (interrupción civil), o reconocimiento expreso del deudor (interrupción natural). Un simple cobro extrajudicial o carta NO interrumpe la prescripción.' },
    { q: '¿Puede alegarse prescripción de deuda directamente al acreedor?', a: 'Puedes notificársela al acreedor mediante carta, pero la prescripción solo produce efectos plenos cuando es declarada por un tribunal. La carta sirve como advertencia y puede inducir al acreedor a desistir del cobro.' },
    { q: '¿La prescripción borra automáticamente el registro en DICOM?', a: 'No. Incluso si la deuda está prescrita, el registro en DICOM puede persistir. Para eliminar el dato de DICOM debes pagar la deuda o demostrar judicialmente la prescripción y notificarlo a la empresa de registro.' },
    { q: '¿Todas las deudas prescriben en el mismo plazo?', a: 'No. Los plazos varían: deuda civil ordinaria 5 años, ejecutiva 3 años, impuestos (SII) 3 o 6 años, cotizaciones laborales 5 años, deuda TAG civil 5 años, multas de tránsito 3 años. El plazo depende del tipo de acción y el origen de la deuda.' },
  ],
    'Denuncia por acoso laboral (Ley Karin)': [
      { q: '¿Qué es la Ley Karin en Chile?', a: 'La Ley 21.643 (Ley Karin) modifica el Código del Trabajo para prevenir, investigar y sancionar el acoso laboral, acoso sexual y violencia en el trabajo. Rige desde agosto de 2024. Exige que toda empresa cuente con un protocolo de prevención y un canal de denuncia.' },
      { q: '¿Cuánto tengo para denunciar acoso laboral?', a: 'Tienes 60 días hábiles desde el último hecho de acoso para denunciar ante la Inspección del Trabajo. Si el acoso es reiterado, el plazo se cuenta desde la última conducta denunciada.' },
      { q: '¿Dónde denuncio el acoso laboral en Chile?', a: 'Puedes denunciar ante la Inspección del Trabajo de tu comuna (denuncia administrativa) o ante los tribunales de justicia (denuncia judicial). La denuncia administrativa no requiere abogado.' },
      { q: '¿Qué sanciones contempla la Ley Karin?', a: 'Las sanciones van desde amonestaciones y multas para la empresa (hasta 150 UTM) hasta la posibilidad de autodespido indirecto del trabajador afectado con derecho a indemnización.' },
    ],
    'Pagaré': [
      { q: '¿Qué es un pagaré en Chile?', a: 'Un pagaré es un título de crédito por el cual una persona (suscriptor) se obliga a pagar a otra (beneficiario) una suma determinada de dinero en una fecha específica. Está regulado por el Código de Comercio.' },
      { q: '¿El pagaré tiene fuerza ejecutiva?', a: 'Sí. Si el pagaré está correctamente emitido (fecha, monto, nombre del beneficiario, firma) y no es pagado a su vencimiento, el beneficiario puede demandar ejecutivamente al deudor sin necesidad de un juicio declarativo previo.' },
      { q: '¿Necesito Notario para un pagaré?', a: 'No es obligatorio, pero es recomendable firmarlo ante Notario para darle mayor fuerza probatoria. Un pagaré con firma reconocida ante Notario es muy difícil de impugnar.' },
      { q: '¿Cuánto tiempo prescribe un pagaré?', a: 'La acción ejecutiva del pagaré prescribe en 3 años desde la fecha de vencimiento. La acción ordinaria prescribe en 5 años. Es importante cobrar antes de ese plazo.' },
    ],
    'Contrato de mutuo (préstamo de dinero)': [
      { q: '¿Qué es un contrato de mutuo en Chile?', a: 'El mutuo es un contrato por el cual una parte entrega dinero a otra, que se obliga a devolver otro tanto de la misma especie y calidad. Está regulado en el Art. 2196 y siguientes del Código Civil.' },
      { q: '¿El mutuo puede ser con o sin intereses?', a: 'Puede ser gratuito (sin intereses) o con intereses. Si hay intereses, deben pactarse expresamente por escrito. Si no se pactan, se presume gratuito (salvo que se trate de comerciantes). Los intereses no pueden superar el interés máximo convencional.' },
      { q: '¿Qué diferencia hay entre mutuo y pagaré?', a: 'El mutuo es el contrato que regula el préstamo. El pagaré es el título ejecutivo que facilita el cobro judicial. Se pueden usar juntos: un contrato de mutuo + un pagaré como respaldo ejecutivo.' },
      { q: '¿El mutuo debe firmarse ante Notario?', a: 'No es obligatorio, pero si el mutuo se firma en escritura pública o con firma reconocida ante Notario, el documento tiene mérito ejecutivo, lo que permite demandar ejecutivamente sin necesidad de juicio ordinario.' },
    ],
    'Solicitud de posesión efectiva (herencia)': [
      { q: '¿Qué es la posesión efectiva en Chile?', a: 'La posesión efectiva es el reconocimiento legal de los herederos de una persona fallecida. Otorga la calidad de heredero y permite disponer de los bienes del causante. Se tramita ante el Registro Civil cuando no hay testamento (intestada).' },
      { q: '¿Cuánto tiempo tengo para solicitar la posesión efectiva?', a: 'No hay plazo para solicitarla. Puedes pedirla en cualquier momento tras el fallecimiento. Sin embargo, es recomendable hacerlo pronto para evitar complicaciones con los bienes y deudas del causante.' },
      { q: '¿Qué documentos necesito para la posesión efectiva?', a: 'Certificado de defunción del causante, certificado de matrimonio o nacimiento que acredite el vínculo, cédula de identidad de los herederos y declaración de bienes del causante. Si hay testamento, se requiere su inscripción previa.' },
      { q: '¿La posesión efectiva incluye las deudas del fallecido?', a: 'Sí. Los herederos responden por las deudas del causante hasta el valor de los bienes heredados (beneficio de inventario). No se heredan deudas que superen el valor de los bienes recibidos.' },
    ],
    'Denuncia por estafa': [
      { q: '¿Qué tipos de estafa existen en Chile?', a: 'Las estafas más comunes incluyen: estafa por entrega de cosa mueble, por suscripción de documentos, por engaño contractual, estafa informática y las defraudaciones. Están tipificadas en los Arts. 467 a 473 del Código Penal.' },
      { q: '¿Dónde denuncio una estafa en Chile?', a: 'Debes denunciar ante la Fiscalía Local del domicilio del imputado o del lugar donde ocurrió el delito. La denuncia puede ser presencial o por escrito. También puedes hacerla en Carabineros o la PDI.' },
      { q: '¿Cuánto tiempo tengo para denunciar una estafa?', a: '5 años desde la perpetración del delito (acción penal pública). Si el monto es menor, puede ser falta y prescribe en 6 meses. Siempre es mejor denunciar lo antes posible.' },
      { q: '¿Puedo recuperar el dinero perdido en una estafa?', a: 'Sí, mediante la acción civil indemnizatoria dentro del proceso penal (querella con demanda civil). LegalHelp genera el escrito de denuncia y la solicitud de indemnización.' },
    ],
    'Demanda por accidente de tránsito': [
      { q: '¿Qué puedo reclamar en una demanda por accidente de tránsito?', a: 'Puedes reclamar indemnización por daños al vehículo, lesiones corporales (días de recuperación, secuelas), daño moral (dolor y sufrimiento), lucro cesante (pérdida de ingresos) y gastos médicos.' },
      { q: '¿Cuánto tengo para demandar por accidente de tránsito?', a: 'La acción ordinaria prescribe en 5 años desde el accidente. La acción ejecutiva prescribe en 3 años. Es recomendable iniciar acciones dentro del primer año para asegurar la disponibilidad de pruebas.' },
      { q: '¿Necesito abogado para demandar por accidente de tránsito?', a: 'Para demandar ante tribunales civiles se requiere patrocinio de abogado. LegalHelp genera la demanda base que luego tu abogado revisa y presenta.' },
      { q: '¿Qué tribunal ve las demandas por accidente de tránsito?', a: 'El Juzgado de Letras en lo Civil del domicilio del demandado o del lugar donde ocurrió el accidente. Si hay lesiones graves, puede ser competencia penal.' },
    ],
    'Carta de despido': [
      { q: '¿Qué debe incluir una carta de despido en Chile?', a: 'La carta de despido debe contener: fecha del despido, causal legal (Art. 159, 160 o 161 del Código del Trabajo), descripción detallada de los hechos que configuran la causal, y el monto del finiquito. Si la causal requiere aviso previo, debe acreditarse.' },
      { q: '¿Cuándo se considera despido injustificado?', a: 'Cuando la causal invocada no es real, no está acreditada, o no se ajusta a la ley. También cuando el empleador no paga las indemnizaciones legales o no entrega la carta de despido dentro del plazo.' },
      { q: '¿Puedo despedir a un trabajador sin previo aviso?', a: 'Depende de la causal. Art. 159 N°4 (vencimiento del plazo) no requiere aviso. Art. 160 (incumplimiento grave del trabajador) no requiere aviso. Art. 161 (necesidades de la empresa) requiere aviso con 30 días de anticipación.' },
      { q: '¿Qué documentos debo adjuntar a la carta de despido?', a: 'Debes adjuntar el finiquito (liquidación de pagos pendientes), certificado de cotizaciones previsionales al día, y la carta misma firmada por el empleador con copia al trabajador.' },
    ],
    'Constitución de Sociedad SpA': [
      { q: '¿Qué es una Sociedad por Acciones (SpA)?', a: 'La SpA es un tipo societario chileno que combina las ventajas de una sociedad anónima (limitación de responsabilidad) con la flexibilidad de una sociedad de responsabilidad limitada. Se puede constituir en 1 día por internet.' },
      { q: '¿Cómo se constituye una SpA en Chile?', a: 'Se constituye mediante escritura pública o mediante el formulario en línea del Registro de Empresas y Sociedades (eSCRV). La constitución en línea es más rápida y económica. Se requiere: nombre, RUT, capital, socios, objeto social.' },
      { q: '¿Cuánto cuesta constituir una SpA?', a: 'La constitución en línea a través de eSCRV no tiene costo. La publicación en el Diario Oficial cuesta aproximadamente $10.000 CLP. La constitución por escritura pública en Notaría puede costar entre $50.000 y $150.000 CLP.' },
      { q: '¿Cuánto tiempo dura la constitución de una SpA?', a: 'Por eSCRV: 1 día hábil. Por escritura pública: 3 a 5 días hábiles (incluyendo la publicación en el Diario Oficial y la inscripción en el Registro de Comercio).' },
    ],
    'Demanda por daño moral': [
      { q: '¿Qué es el daño moral en Chile?', a: 'Es el daño no patrimonial que afecta los sentimientos, la integridad física o psíquica, el honor, la privacidad o la calidad de vida de una persona. Se indemniza mediante una suma de dinero fijada prudencialmente por el tribunal.' },
      { q: '¿Cuánto se puede pedir por daño moral?', a: 'No hay montos fijos. El tribunal evalúa la gravedad del daño, la repercusión en la vida de la víctima, la capacidad económica del demandado y la repercusión pública del hecho. Los montos varían entre $1.000.000 y $100.000.000 CLP.' },
      { q: '¿Cuánto tiempo tengo para demandar por daño moral?', a: 'La acción prescribe en 5 años desde el hecho que causa el daño (acción ordinaria). En materia penal, el plazo puede ser distinto según el delito.' },
      { q: '¿Qué tribunal conoce las demandas por daño moral?', a: 'El Juzgado de Letras en lo Civil del domicilio del demandado o del lugar donde ocurrió el hecho dañoso. Si el daño deriva de un delito, se tramita en el Juzgado de Garantía.' },
    ],
    'Recurso de amparo': [
      { q: '¿Qué es el recurso de amparo?', a: 'Es una acción constitucional consagrada en el Art. 21 de la Constitución que protege la libertad personal y la seguridad individual ante cualquier privación de libertad ilegal o arbitraria. Cualquier persona puede interponerlo.' },
      { q: '¿Cuándo procede el recurso de amparo?', a: 'Procede cuando alguien es privado de libertad sin orden judicial, cuando la detención se prolonga más allá del plazo legal, o cuando las condiciones de la prisión son ilegales o arbitrarias.' },
      { q: '¿Ante qué tribunal se presenta el recurso de amparo?', a: 'Se presenta ante la Corte de Apelaciones del territorio donde ocurrió la privación de libertad. La Corte debe conocer y resolver de urgencia, incluso en días festivos.' },
      { q: '¿Necesito abogado para el recurso de amparo?', a: 'No. Cualquier persona puede interponer un recurso de amparo sin necesidad de abogado. Incluso puede ser presentado por un tercero a favor del detenido. LegalHelp genera el escrito que puedes presentar directamente.' },
    ],
    'Solicitud de mediación familiar': [
      { q: '¿Qué es la mediación familiar en Chile?', a: 'Es un proceso voluntario u obligatorio (según la materia) en el que un mediador certificado ayuda a las partes a llegar a un acuerdo sobre materias de familia: alimentos, tuición, régimen de visitas, etc. Está regulada por la Ley 19.968.' },
      { q: '¿En qué casos la mediación familiar es obligatoria?', a: 'Es obligatoria antes de iniciar un juicio en materias de: alimentos, tuición, cuidado personal, relación directa y regular (visitas), y otros asuntos de familia. Sin mediación previa, el tribunal no admite la demanda.' },
      { q: '¿Dónde se solicita la mediación familiar?', a: 'Se solicita en los Centros de Mediación de las Corporaciones de Asistencia Judicial, en mediadores privados certificados, o en las CAJ (Corporación de Asistencia Judicial). La mediación en CAJ es gratuita.' },
      { q: '¿Cuánto dura el proceso de mediación familiar?', a: 'El proceso de mediación dura entre 30 y 60 días aproximadamente. Si se llega a acuerdo, se firma un acta que tiene efecto de sentencia judicial. Si no hay acuerdo, se emite un certificado que permite iniciar el juicio.' },
    ],
    'Carta de recomendación laboral': [
      { q: '¿Qué debe incluir una carta de recomendación laboral?', a: 'Debe incluir: datos del empleador, datos del trabajador, cargo desempeñado, período de trabajo, funciones principales, habilidades destacadas, motivo de retiro (sin detalles negativos) y una recomendación expresa.' },
      { q: '¿La carta de recomendación es vinculante para el empleador?', a: 'No, el empleador no está obligado a emitirla. Sin embargo, su negativa puede ser considerada como mala fe en un juicio laboral. Es una muestra de buena práctica laboral.' },
      { q: '¿Qué no debe decir una carta de recomendación?', a: 'No debe incluir información negativa, crítica al desempeño, causas del despido, deudas pendientes, ni información confidencial del trabajador. Solo hechos objetivos y positivos.' },
    ],
    'Acuerdo de confidencialidad (NDA)': [
      { q: '¿Qué es un acuerdo de confidencialidad NDA?', a: 'Es un contrato mediante el cual una o ambas partes se obligan a no divulgar información confidencial compartida durante una relación comercial o laboral. Protege secretos comerciales, know-how, datos de clientes y estrategias de negocio.' },
      { q: '¿Cuánto dura la obligación de confidencialidad?', a: 'El plazo se pacta en el contrato. Puede ser por la duración de la relación comercial y extenderse 2 a 5 años después de terminada. Algunos NDAs son indefinidos para secretos comerciales críticos.' },
      { q: '¿Qué información no cubre un NDA?', a: 'No cubre: información que ya era pública antes del acuerdo, información que la parte receptora ya conocía antes del acuerdo (debe acreditarlo), información que se vuelve pública sin culpa de la parte receptora, y la información que debe divulgarse por ley u orden judicial.' },
    ],
  };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = paginas.find((p: Pagina) => p.slug === slug);
  if (!data) return {};
  const pageTitle = `${data.categoria}${data.variable ? ` en ${data.variable}` : ''}`;
  const isHub = !data.variable;

  // Meta descriptions más ricas y únicas según categoría
  const getRichDescription = (): string => {
    if (isHub) {
      // Descripciones únicas por categoría hub
      const hubDescs: Record<string, string> = {
        'Prescripción de deuda TAG': `Guía completa sobre prescripción de deuda TAG en Chile. Plazos de 3 a 5 años según Art. 2515 CC. Cómo solicitar la prescripción ante el Juzgado Civil. Documento listo en minutos.`,
        'Prescripción de deuda bancaria': `¿Tu deuda bancaria prescribió? Guía completa sobre prescripción de deudas bancarias en Chile. Plazos de 3 años (ejecutiva) y 5 años (ordinaria). Cómo alegar la prescripción.`,
        'Prescripción de multas de tránsito': `Guía completa sobre prescripción de multas de tránsito en Chile. Las multas prescriben a los 3 años según Art. 2521 CC. Cómo solicitar la prescripción ante el Juzgado de Policía Local.`,
        'Poder simple': `Guía completa sobre el poder simple en Chile. Sin notario, sin abogado. Válido con dos testigos. Cómo redactarlo y presentarlo. Descarga tu documento en minutos.`,
        'Poder notarial': `Guía completa sobre el poder notarial en Chile. Cuándo se necesita, costo, requisitos y cómo otorgarlo. Válido para trámites bancarios, Registro Civil y más.`,
        'Demanda de alimentos': `Guía completa sobre demanda de alimentos en Chile. Quiénes pueden demandar, plazos, montos y proceso ante el Juzgado de Familia. Documento listo en minutos.`,
        'Demanda de desalojo por no pago': `Guía completa sobre demanda de desalojo por no pago de arriendo en Chile. Ley 21.461 (Devuélveme Mi Casa). Proceso acelerado en 30 a 60 días.`,
        'Denuncia por despido injustificado': `Guía completa sobre denuncia por despido injustificado en Chile. Plazo de 60 días hábiles. Indemnizaciones y proceso ante la Inspección del Trabajo.`,
        'Recurso de protección': `Guía completa sobre el recurso de protección en Chile. Art. 20 Constitución. Plazo de 30 días. Cómo interponerlo ante la Corte de Apelaciones.`,
        'Carta reclamo SERNAC': `Guía completa sobre carta reclamo SERNAC en Chile. Cómo reclamar ante SERNAC, plazos, derechos del consumidor y modelo de carta. Gratuito.`,
        'Contrato de trabajo indefinido': `Guía completa sobre contrato de trabajo indefinido en Chile. Requisitos, cláusulas obligatorias, derechos del trabajador. Descarga tu contrato listo.`,
        'Contrato de trabajo a plazo fijo': `Guía completa sobre contrato a plazo fijo en Chile. Duración máxima, renovaciones, conversión a indefinido. Descarga tu contrato listo.`,
        'Contrato de arriendo de casa': `Guía completa sobre contrato de arriendo de casa en Chile. Ley 18.101. Garantía, plazos, derechos y obligaciones. Descarga tu contrato listo.`,
        'Contrato de arriendo de departamento': `Guía completa sobre contrato de arriendo de departamento en Chile. Gastos comunes, mascotas, subarriendo. Descarga tu contrato listo.`,
        'Finiquito laboral': `Guía completa sobre finiquito laboral en Chile. Plazos de pago, cálculo de indemnizaciones, cómo firmar bajo protesta. Descarga tu finiquito listo.`,
        'Carta de renuncia laboral': `Guía completa sobre carta de renuncia laboral en Chile. Sin aviso previo, sin indemnización. Cómo redactarla y presentarla. Descarga tu carta lista.`,
        'Certificado de antecedentes para fines especiales': `Guía completa sobre el certificado de antecedentes para fines especiales en Chile. Gratuito, inmediato. Dónde solicitarlo y para qué sirve.`,
        'Eliminación de antecedentes penales': `Guía completa sobre eliminación de antecedentes penales en Chile. DS 64. Plazos de 5 o 10 años. Cómo solicitarlo ante el Registro Civil.`,
        'Limpieza de hoja de vida del conductor': `Guía completa sobre limpieza de hoja de vida del conductor en Chile. Elimina infracciones del registro. Cómo solicitarlo ante el Registro Civil.`,
        'Registro Nacional de Deudores de Pensiones de Alimentos': `Guía completa sobre el Registro Nacional de Deudores de Pensiones de Alimentos en Chile. Ley 21.389. Cómo consultarlo y salir del registro.`,
        'Acuerdo de divorcio por mutuo acuerdo': `Guía completa sobre divorcio de mutuo acuerdo en Chile. Ley 19.947. Requisitos, plazos y proceso ante el Juzgado de Familia.`,
        'Contrato de compraventa de vehículo': `Guía completa sobre compraventa de vehículo en Chile. Ley 18.290. Transferencia en Registro Civil, multas, prendas. Descarga tu contrato listo.`,
        'Contrato de prestación de servicios a honorarios': `Guía completa sobre contrato a honorarios en Chile. Diferencias con relación laboral, cotizaciones, derechos. Descarga tu contrato listo.`,
        'Carta reclamo banco': `Guía completa sobre carta reclamo banco en Chile. SERNAC Financiero, cobros no autorizados, comisiones indebidas. Modelo de reclamo listo.`,
        'Carta reclamo Isapre': `Guía completa sobre carta reclamo Isapre en Chile. Rechazo de prestaciones, alza de planes. Reclama ante la Superintendencia de Salud.`,
        'Carta reclamo aerolínea': `Guía completa sobre carta reclamo aerolínea en Chile. Vuelos cancelados, atrasos, overbooking. Reclama ante SERNAC o JAC.`,
        'Carta reclamo seguro': `Guía completa sobre carta reclamo seguro en Chile. Siniestros rechazados, plazos de respuesta. Reclama ante la CMF.`,
        'Carta reclamo tienda retail': `Guía completa sobre carta reclamo tienda retail en Chile. Garantía legal, productos defectuosos. Reclama ante SERNAC.`,
        'Carta reclamo empresa de telecomunicaciones': `Guía completa sobre reclamo de telecomunicaciones en Chile. Internet, telefonía, TV cable. Reclama ante SERNAC o SUBTEL.`,
        'Denuncia por no pago de cotizaciones': `Guía completa sobre denuncia por no pago de cotizaciones en Chile. AFP, Isapre, Fonasa. Cómo denunciar ante la Inspección del Trabajo.`,
        'Denuncia por ruidos molestos de vecinos': `Guía completa sobre denuncia por ruidos molestos en Chile. Límites legales, cómo denunciar ante el JPL. Multas de 1 a 5 UTM.`,
        'Denuncia por maltrato animal': `Guía completa sobre denuncia por maltrato animal en Chile. Ley 21.020. Cómo denunciar ante Carabineros o JPL. Multas de 10 a 30 UTM.`,
        'Escrito de defensa por infracción de tránsito': `Guía completa sobre defensa de infracción de tránsito en Chile. Plazo de 5 días. Cómo impugnar multas ante el Juzgado de Policía Local.`,
        'Escrito de prescripción de multa de tránsito': `Guía completa sobre prescripción de multa de tránsito en Chile. 3 años según Art. 2521 CC. Cómo solicitar la prescripción ante el JPL.`,
        'Acuerdo de pago de deuda': `Guía completa sobre acuerdo de pago de deuda en Chile. Cómo negociar, cláusulas, fuerza ejecutiva. Descarga tu acuerdo listo.`,
        'Carta de cobranza de deuda': `Guía completa sobre carta de cobranza de deuda en Chile. Ley 20.974. Qué puede y no puede hacer una empresa de cobranza.`,
        'Declaración jurada simple': `Guía completa sobre declaración jurada simple en Chile. Valor legal, para qué sirve, cómo redactarla. Descarga tu declaración lista.`,
        'Declaración jurada de domicilio': `Guía completa sobre declaración jurada de domicilio en Chile. Para bancos, SII, municipios. Descarga tu declaración lista.`,
        'Declaración jurada de ingresos': `Guía completa sobre declaración jurada de ingresos en Chile. Para subsidios, arriendos, créditos. Descarga tu declaración lista.`,
      };
      return hubDescs[data.categoria] || `Guía completa sobre ${data.categoria} en Chile. Plazos, documentos necesarios y cómo presentarlo. Escrito listo en minutos.`;
    }

    // Para páginas ciudad: descripción más rica con datos locales
    const intro = (data as Pagina).intro;
    if (intro) {
      // Usar primeros 155 caracteres de la intro como descripción
      const shortIntro = intro.length > 155 ? intro.substring(0, 152) + '...' : intro;
      return shortIntro;
    }
    return `Documento legal para ${pageTitle}. Listo en minutos para presentar ante ${data.entidad} (${data.direccion}). Base legal: ${data.ley}.`;
  };

  const description = getRichDescription();

  // Verificar si esta página debe ser noindex (canibalización o aún no publicada por goteo)
  const cu = (contenidoUnico as ContenidoUnico)[slug];
  const shouldNoIndex = cu?.noindex === true || !isReleased((data as Pagina).release);

  return {
    title: isHub
      ? `${data.categoria} en Chile — Guía Completa`
      : `${pageTitle} — Documento Legal`,

    description,
    alternates: {
      canonical: `${BASE_URL}/p/${slug}`,
    },
    robots: shouldNoIndex ? {
      index: false,
      follow: true,
    } : undefined,
    openGraph: {
      title: isHub
        ? `${data.categoria} en Chile — Guía Completa | LegalHelp Chile`
        : `${pageTitle} — Documento Legal | LegalHelp Chile`,
      description: description.length > 200 ? description.substring(0, 197) + '...' : description,
      url: `${BASE_URL}/p/${slug}`,
      siteName: 'LegalHelp Chile',
      locale: 'es_CL',
      type: 'website',
      images: [
        {
          url: `${BASE_URL}/og-image.png`,
          width: 1200,
          height: 630,
          alt: `LegalHelp Chile — ${pageTitle}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: isHub
        ? `${data.categoria} en Chile — Guía Completa | LegalHelp Chile`
        : `${pageTitle} — Documento Legal | LegalHelp Chile`,
      description: description.length > 200 ? description.substring(0, 197) + '...' : description,
      images: [`${BASE_URL}/og-image.png`],
    },
    other: {
      'article:modified_time': '2026-05-01T00:00:00Z',
    },
  };
}

// ── Contenido guía para páginas hub (sin ciudad) ─────────────────────────────
const HUB_GUIDE: Record<string, { sections: { heading: string; body: string }[] }> = {
  'Prescripción de deuda TAG': {
    sections: [
      {
        heading: '¿Qué es la prescripción de deuda TAG?',
        body: 'La prescripción extintiva es un mecanismo legal consagrado en el Art. 2515 del Código Civil chileno que extingue la obligación de pago cuando ha transcurrido un plazo determinado sin que el acreedor haya ejercido acción judicial. Para deudas de autopistas de peaje (TAG), hay dos casos: (1) Deuda civil ordinaria por uso de autopista: prescribe en 5 años contados desde la fecha de cada cobro (acción ordinaria). (2) Multa por circular sin TAG emitida por Juzgado de Policía Local: prescribe en 3 años. Esto significa que si una concesionaria o autoridad no te ha demandado judicialmente dentro del plazo correspondiente, pierde el derecho a cobrarte.',
      },
      {
        heading: '¿A qué deudas TAG aplica la prescripción?',
        body: 'La prescripción aplica a los cobros de todas las autopistas urbanas e interurbanas de Chile que operan con sistema TAG o telepeaje: Autopista Central, Costanera Norte, Vespucio Sur, Vespucio Norte Express, Acceso Nororiente, Autopista del Sol, Ruta 68, Ruta 5 Norte y Sur, y demás vías concesionadas. Para deuda civil ordinaria: 5 años desde cada cobro. Para multas de tránsito por circular sin TAG: 3 años desde la infracción. Cada cobro individual genera su propio plazo de prescripción, por lo que es posible que parte de tu deuda esté prescrita y otra parte aún no.',
      },
      {
        heading: 'Paso a paso: cómo alegar la prescripción de deuda TAG',
        body: '1. Verifica la fecha de cada cobro TAG: busca el detalle en tu cuenta TAG o en la notificación de la concesionaria.\n2. Calcula si han pasado más de 3 años desde esa fecha sin notificación judicial: si es así, esa deuda está prescrita.\n3. Genera el escrito de excepción de prescripción con LegalHelp: el sistema redacta el documento con tus datos, el tribunal competente y la base legal.\n4. Presenta el escrito ante el Juzgado de Letras en lo Civil de tu comuna: puedes hacerlo en persona en el tribunal, de lunes a viernes.\n5. El tribunal notifica a la concesionaria y resuelve: en causas de menor cuantía, el proceso puede resolverse sin necesidad de audiencia.',
      },
      {
        heading: '¿Qué documentos necesitas para presentar la prescripción?',
        body: 'Para presentar la solicitud de prescripción de deuda TAG necesitas: (1) tu cédula de identidad vigente, (2) el número o detalle del cobro TAG (aparece en la notificación de la concesionaria o en tu cuenta TAG), (3) la fecha exacta del cobro (para acreditar que han pasado más de 3 años), y (4) el escrito de excepción de prescripción firmado. LegalHelp genera el escrito completo con todos estos datos una vez que describes tu caso.',
      },
      {
        heading: '¿Cuánto cuesta presentar la prescripción?',
        body: 'La presentación ante el tribunal civil no tiene costo en causas de menor cuantía (deudas bajo aproximadamente $700.000). Si necesitas patrocinio de abogado por la cuantía de la deuda, puedes acudir a las Corporaciones de Asistencia Judicial (CAJ) gratuitamente si tu ingreso es bajo. LegalHelp cobra solo por la generación del documento base, no por el trámite judicial.',
      },
      {
        heading: '¿Qué pasa si la deuda ya fue demandada judicialmente?',
        body: 'Si la concesionaria ya inició juicio ejecutivo antes de que pasaran los 3 años, la prescripción no opera automáticamente: debes alegarla como excepción dentro del juicio. En ese caso es importante actuar rápido porque los plazos procesales son estrictos. Si ya recibiste notificación judicial, genera el escrito de excepción de prescripción y preséntalo dentro del plazo que indica la resolución del tribunal (generalmente 4 días hábiles para oponer excepciones en juicio ejecutivo).',
      },
      {
        heading: 'Tabla: plazos de prescripción según tipo de deuda TAG',
        body: 'Deuda civil ordinaria por uso de autopista → prescripción: 5 años (Art. 2515 CC, acción ordinaria) | Acción ejecutiva de cobro → prescripción: 3 años (Art. 2515 CC) | Multa de tránsito por circular sin TAG → prescripción: 3 años (Juzgado de Policía Local) | Deuda reconocida o con pago parcial → el plazo se interrumpe y comienza de nuevo desde el último pago o reconocimiento.',
      },
      {
        heading: '¿Puedo alegar la prescripción sin abogado?',
        body: 'En causas de menor cuantía (hasta aproximadamente 500 UTM, es decir cerca de $35 millones en 2026) la ley permite actuar sin abogado ante los juzgados civiles. Sin embargo, si la concesionaria contesta el escrito o el tribunal requiere más antecedentes, puede ser conveniente contar con orientación legal. Las Corporaciones de Asistencia Judicial ofrecen asesoría gratuita en todo Chile para quienes no pueden costear un abogado privado.',
      },
    ],
  },
};

export default async function PSELanding({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Normalize: redirect URLs with special chars to avoid 500s
  if (/[^a-z0-9-]/.test(slug)) {
    const cleanSlug = slug.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const exists = paginas.find((p: Pagina) => p.slug === cleanSlug);
    if (exists) {
      redirect(`/p/${cleanSlug}`);
    }
    notFound();
  }
  const data = paginas.find((p: Pagina) => p.slug === slug);
  if (!data) return notFound();

  const initialContext = `${data.categoria}${data.variable ? ` en ${data.variable}` : ''}`;

  // Contenido único SSR (FAQ local + párrafo + noindex)
  const cu = (contenidoUnico as ContenidoUnico)[slug];

  // Same-category pages for internal linking (solo las ya publicadas por goteo)
  const relacionadas = paginas.filter(
    (p) => p.categoria === data.categoria && p.slug !== data.slug && isReleased((p as Pagina).release)
  );

  // ── Interlinking por clúster temático (cross-categoría) ───────────────────
  const validSet = new Set(paginas.filter((p) => isReleased((p as Pagina).release)).map((p) => p.slug));
  const hubByCat: Record<string, string> = {};
  const catBySlug: Record<string, string> = {};
  for (const p of paginas) {
    if (!p.variable) {
      if (!(p.categoria in hubByCat)) hubByCat[p.categoria] = p.slug;
      catBySlug[p.slug] = p.categoria;
    }
  }
  const currentHub = hubByCat[data.categoria];
  const cluster = CLUSTERS.find((c) => c.includes(currentHub)) || [];
  const guiasRelacionadas = cluster
    .filter((s) => s !== currentHub && validSet.has(s))
    .slice(0, 5);

  return (
    <div className="min-h-screen" style={{ fontFamily: 'sans-serif' }}>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "LegalHelp Chile", item: BASE_URL },
              { "@type": "ListItem", position: 2, name: data.categoria, item: `${BASE_URL}/#${data.categoria}` },
              { "@type": "ListItem", position: 3, name: data.variable || data.categoria, item: `${BASE_URL}/p/${slug}` },
            ],
          }),
        }}
      />
      {FAQ_BY_CATEGORY[data.categoria] && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: FAQ_BY_CATEGORY[data.categoria].map(({ q, a }) => ({
                "@type": "Question",
                name: q,
                acceptedAnswer: { "@type": "Answer", text: a },
              })),
            }),
          }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LegalService",
            name: data.categoria,
            description: data.variable ? `${data.categoria} en ${data.variable}, Chile` : `Guía completa sobre ${data.categoria} en Chile`,
            url: `${BASE_URL}/p/${slug}`,
            areaServed: {
              "@type": "Country",
              name: "Chile",
            },
            provider: {
              "@type": "Organization",
              name: "LegalHelp Chile",
              url: BASE_URL,
              contactPoint: {
                "@type": "ContactPoint",
                email: "contacto@legalhelp.cl",
              },
            },
          }),
        }}
      />

      {/* NAV */}
      {/* Nav viene del layout global */}

      {/* BREADCRUMBS (visibles + coinciden con el JSON-LD) */}
      <nav aria-label="Breadcrumb" className="bg-[#0b1f3a]/95 border-t border-white/10 px-6 py-2">
        <ol className="max-w-4xl mx-auto flex flex-wrap items-center gap-1 text-xs text-[#a8bdd4]">
          <li><Link href="/" className="hover:text-white">Inicio</Link></li>
          <li aria-hidden className="px-1">›</li>
          <li>
            {currentHub && currentHub !== slug
              ? <Link href={`/p/${currentHub}`} className="hover:text-white">{data.categoria}</Link>
              : <span className="text-white">{data.categoria}</span>}
          </li>
          {data.variable && (
            <>
              <li aria-hidden className="px-1">›</li>
              <li className="text-white">{data.variable}</li>
            </>
          )}
        </ol>
      </nav>

      {/* HERO */}
      <div className="bg-[#0b1f3a] px-6 pt-10 pb-12 text-center">
        <h1 className="text-3xl font-bold text-white mb-3 leading-tight">
          {data.categoria}{data.variable ? ` en ${data.variable}` : ''}
        </h1>
        <p className="text-[#c9a84c] text-sm font-medium mb-4">
          {data.entidad}
        </p>
        <p className="text-[#a8bdd4] text-sm max-w-xl mx-auto">
          {(() => {
            const generica = /^var[ií]a/i.test(String(data.direccion));
            if (data.variable) {
              return generica
                ? `Si necesitas ${data.categoria.toLowerCase()} en ${data.variable}, presenta tu solicitud ante ${data.entidad}.`
                : `Si necesitas ${data.categoria.toLowerCase()} en ${data.variable}, presenta tu solicitud ante ${data.entidad} ubicado en ${data.direccion}.`;
            }
            return generica
              ? `${data.categoria}: presenta tu solicitud ante ${data.entidad}.`
              : `${data.categoria}: presenta tu solicitud ante ${data.entidad} (${data.direccion}).`;
          })()}
          {' '}Tienes un plazo de {data.plazo.toLowerCase()} según la {data.ley}.
          {' '}Describe tu caso y en minutos tienes tu documento listo para presentar.
        </p>

        {/* PILLS */}
        <div className="flex flex-wrap justify-center gap-2 mt-6">
          {[
            ...(data.variable ? [`📍 ${data.variable}`] : []),
            `⏱ Plazo: ${data.plazo}`,
            `🏛 ${data.entidad}`,
          ].map((pill) => (
            <span
              key={pill}
              className="bg-white/10 text-white text-xs px-3 py-1 rounded-full border border-white/20"
            >
              {pill}
            </span>
          ))}
        </div>

      </div>

      {/* INTRO LOCAL — solo para páginas ciudad (variable no vacío) */}
      {data.variable && (data as Pagina).intro && (
        <div className="max-w-4xl mx-auto px-4 pt-6">
          <div className="bg-[#0d1426]/60 rounded-2xl border border-[#60a5fa]/15 shadow-sm px-6 py-4 border-l-4 border-[#c9a84c]">
            <p className="text-xs text-[#9ab0cc] uppercase tracking-wider font-semibold mb-2">
              Información local — {data.variable}
            </p>
            <p className="text-sm text-[#3a3330] leading-relaxed">
              {(data as Pagina).intro}
            </p>
          </div>
        </div>
      )}

      {/* CHAT SECTION */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-[#0d1426]/60 rounded-2xl border border-[#60a5fa]/15 shadow-lg overflow-hidden">
          <div className="bg-[#0d1426]/60 px-6 py-3 border-b border-[#d0e0d1] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-[#00d4ff] font-medium">
              Asistente Legal — {data.categoria}
            </span>
          </div>
          <ChatGenerator initialContext={initialContext} legalContext={data.ley} entidad={data.entidad} />
        </div>
      </div>

      {/* AUTORÍA Y FECHA */}
      <div className="max-w-4xl mx-auto px-4 pb-4">
        <div className="bg-[#0d1426]/60 rounded-xl border border-[#60a5fa]/15 px-5 py-3 border border-[#e8e2d8] text-center">
          <p className="text-xs text-[#9ab0cc] leading-relaxed">
            Contenido revisado por el equipo jurídico de LegalHelp Chile • Actualizado: mayo 2026
          </p>
        </div>
      </div>

      {/* DISCLAIMER */}
      <div className="max-w-4xl mx-auto px-4 pb-4">
        <div className="bg-[#1a1000]/60 border border-[#c9a84c]/30 rounded-xl px-5 py-3 flex gap-3 items-start">
          <span className="text-lg leading-tight mt-0.5">⚠️</span>
          <p className="text-xs text-[#c9a84c] leading-relaxed">
            <strong>Aviso legal:</strong> El contenido generado por LegalHelp no constituye asesoría legal profesional ni reemplaza la orientación de un abogado habilitado. Se trata de un documento de apoyo informativo. Para casos complejos, consultá con un profesional jurídico o las Corporaciones de Asistencia Judicial.
          </p>
        </div>
      </div>

      {/* CONTENIDO ÚNICO SSR — párrafo local para páginas ciudad */}
      {data.variable && cu?.paragraph && (
        <div className="max-w-4xl mx-auto px-4 pb-8">
          <div className="bg-[#0d1426]/60 rounded-2xl border border-[#60a5fa]/15 shadow-sm p-6">
            <p className="text-xs text-[#9ab0cc] uppercase tracking-wider font-semibold mb-3">
              Información útil — {data.variable}
            </p>
            <p className="text-sm text-[#3a3330] leading-relaxed">
              {cu.paragraph}
            </p>
          </div>
        </div>
      )}

      {/* FAQ LOCAL SSR — solo para páginas ciudad con FAQs generadas */}
      {data.variable && cu?.faqs && cu.faqs.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 pb-8">
          <div className="bg-[#0d1426]/60 rounded-2xl border border-[#60a5fa]/15 shadow-sm p-6">
            <p className="text-xs text-[#9ab0cc] uppercase tracking-wider font-semibold mb-4">
              Preguntas frecuentes sobre {data.categoria.toLowerCase()} en {data.variable}
            </p>
            <div className="divide-y divide-[#f0ebe3]">
              {cu.faqs.map(({ q, a }: { q: string; a: string }) => (
                <details key={q} className="py-3 group">
                  <summary className="cursor-pointer text-sm font-semibold text-white list-none flex justify-between items-start gap-2">
                    <span>{q}</span>
                    <span className="text-[#c9a84c] font-bold text-base mt-0.5 flex-shrink-0 group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <p className="mt-2 text-xs text-[#c8ddf0] leading-relaxed">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* INFO BOX */}
      <div className="max-w-4xl mx-auto px-4 pb-8">
        <div className="bg-[#0d1426]/60 rounded-2xl border border-[#60a5fa]/15 shadow-sm p-6 grid gap-4 md:grid-cols-3 text-center">
          <div>
            <div className="text-2xl mb-1">⚖️</div>
            <div className="font-semibold text-white text-sm mb-1">Base legal</div>
            <div className="text-xs text-[#9ab0cc]">
              {(() => {
                const leyInfo = findLey(data.ley);
                return leyInfo ? (
                  <a href={leyInfo.url} target="_blank" rel="noopener noreferrer" className="text-white underline hover:text-[#c9a84c] transition-colors">
                    {data.ley} ↗
                  </a>
                ) : data.ley;
              })()}
            </div>
          </div>
          <div>
            <div className="text-2xl mb-1">🏛</div>
            <div className="font-semibold text-white text-sm mb-1">Dónde presentarlo</div>
            <div className="text-xs text-[#9ab0cc]">{data.direccion}</div>
          </div>
          <div>
            <div className="text-2xl mb-1">⏱</div>
            <div className="font-semibold text-white text-sm mb-1">Plazo</div>
            <div className="text-xs text-[#9ab0cc]">{data.plazo}</div>
          </div>
        </div>
      </div>

      {/* FAQ SECTION */}
      {FAQ_BY_CATEGORY[data.categoria] && (
        <div className="max-w-4xl mx-auto px-4 pb-8">
          <div className="bg-[#0d1426]/60 rounded-2xl border border-[#60a5fa]/15 shadow-sm p-6">
            <p className="text-xs text-[#9ab0cc] uppercase tracking-wider font-semibold mb-4">
              Preguntas frecuentes — {data.categoria}
            </p>
            <div className="divide-y divide-[#f0ebe3]">
              {FAQ_BY_CATEGORY[data.categoria].map(({ q, a }) => (
                <details key={q} className="py-3 group">
                  <summary className="cursor-pointer text-sm font-semibold text-white list-none flex justify-between items-start gap-2">
                    <span>{q}</span>
                    <span className="text-[#c9a84c] font-bold text-base mt-0.5 flex-shrink-0 group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <p className="mt-2 text-xs text-[#c8ddf0] leading-relaxed">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* GUÍA COMPLETA — para hub pages y city pages */}
      {(hubGuides as Record<string, { sections: { heading: string; body: string }[] }>)[data.categoria] && (
        <div className="max-w-4xl mx-auto px-4 pb-8">
          <div className="bg-[#0d1426]/60 rounded-2xl border border-[#60a5fa]/15 shadow-sm p-6">
            <p className="text-xs text-[#9ab0cc] uppercase tracking-wider font-semibold mb-6">
              Guía completa — {data.categoria}{data.variable ? ` en ${data.variable}` : ''}
            </p>
            <div className="divide-y divide-[#f0ebe3] space-y-0">
              {(hubGuides as Record<string, { sections: { heading: string; body: string }[] }>)[data.categoria].sections.map(({ heading, body }) => (
                <div key={heading} className="py-5">
                  <h2 className="text-base font-bold text-white mb-2">{heading}</h2>
                  <div className="text-sm text-[#c8ddf0] leading-relaxed space-y-2">
                    {body.split('\n').map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* RELATED CITIES */}
      {relacionadas.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 pb-8">
          <div className="bg-[#0d1426]/60 rounded-2xl border border-[#60a5fa]/15 shadow-sm p-6">
            <p className="text-xs text-[#9ab0cc] uppercase tracking-wider font-semibold mb-3">
              {data.categoria} en otras ciudades
            </p>
            <div className="flex flex-wrap gap-2">
              {relacionadas.map((r) => (
                <Link
                  key={r.slug}
                  href={`/p/${r.slug}`}
                  className="text-xs text-white bg-[#f5f3ef] hover:bg-[#e8e2d8] px-3 py-1.5 rounded-full transition-colors"
                >
                  {r.variable}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* GUÍAS RELACIONADAS — interlinking por clúster temático (cross-categoría) */}
      {guiasRelacionadas.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 pb-8">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <p className="text-xs text-[#8a7f72] uppercase tracking-wider font-semibold mb-3">
              Guías relacionadas
            </p>
            <div className="flex flex-wrap gap-2">
              {guiasRelacionadas.map((s) => (
                <Link
                  key={s}
                  href={`/p/${s}`}
                  className="text-xs text-[#0b1f3a] bg-[#f5f3ef] hover:bg-[#e8e2d8] px-3 py-1.5 rounded-full border border-[#e8e2d8] transition-colors"
                >
                  {catBySlug[s] || s}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="border-t border-[#60a5fa]/15 py-6">
        <div className="max-w-4xl mx-auto px-6 flex flex-wrap justify-center gap-6 text-xs text-[#7a90aa]">
          {['🔒 SSL Certificado', '🇨🇱 Válido en todo Chile', '⚖ Marco legal actualizado 2026'].map((t) => (
            <span key={t}>{t}</span>
          ))}
          <span>📧 contacto@legalhelp.cl</span>
        </div>
        <div className="text-center text-xs text-[#bbb0a4] mt-3">
          <Link href="/" className="hover:text-white transition-colors">
            ← Volver al inicio
          </Link>
        </div>
      </footer>

    </div>
  );
}
