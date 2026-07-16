/**
 * tagTemplate.ts — Plantilla determinista de prescripción TAG (sin IA).
 * No usa LLM. Reemplazo directo de variables via template literal.
 * Es la plantilla definitiva "Lo Espejo" exacta para JPL.
 */

export interface TagFormData {
  patenteVehiculo: string;
  fechaMulta: string;        // DD/MM/AAAA
  causasYAnio: string;       // ej: "Rol 4520-2022"
  nombreCliente: string;
  rutCliente: string;        // formateado XX.XXX.XXX-X
  actividadCliente: string;  // ej: "empleado", "comerciante"
  direccionCliente: string;
  correoCliente: string;
  telefonoCliente: string;
  numeroJuzgado: string;     // ej: "1°", "2°", etc.
  juzgadoComuna: string;     // extraída del slug
}

const DEFAULT_DATA: TagFormData = {
  patenteVehiculo: 'BBBB12',
  fechaMulta: 'DD/MM/AAAA',
  causasYAnio: 'Rol 4520-2022',
  nombreCliente: '[Nombre Completo]',
  rutCliente: 'XX.XXX.XXX-X',
  actividadCliente: 'empleado',
  direccionCliente: '[Dirección completa]',
  correoCliente: '[correo@ejemplo.cl]',
  telefonoCliente: '[+56 9 1234 5678]',
  numeroJuzgado: '',
  juzgadoComuna: '',
};

/**
 * Genera el documento completo de prescripción TAG.
 * Template literal exacto — sin llamadas a IA.
 */
export function generateTagDocument(data: Partial<TagFormData>): string {
  const d: TagFormData = { ...DEFAULT_DATA, ...data };
  const fechaActual = new Date().toLocaleDateString('es-CL', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Santiago',
  });

  const juzgadoLine = d.juzgadoComuna
    ? `${d.numeroJuzgado || ''} JUZGADO POLICÍA LOCAL\n${d.juzgadoComuna}`
    : `${d.numeroJuzgado || ''} JUZGADO POLICÍA LOCAL`;

  return `PRESCRIPCIÓN PARTES TAG
EN LO PRINCIPAL: Alega prescripción de multa de tránsito. EN EL OTROSÍ: Acompaña documentos;

SJL ${juzgadoLine}

${d.nombreCliente}, ${d.actividadCliente}; domiciliado en ${d.direccionCliente}, en calidad de propietario del vehículo PPU ${d.patenteVehiculo} en causas números ${d.causasYAnio}, a SS con respeto digo:

Por medio de la presente, vengo en alegar prescripción de las multas impuestas al vehículo de mi propiedad PPU ${d.patenteVehiculo}, conforme lo establece el art. 24 de la Ley N° 18287 que establece el Procedimiento ante los Juzgados de Policía Local, por haber transcurrido más de tres años desde su anotación en el Registro de Multas No Pagadas.

POR TANTO: Ruego a SS tener por alegada la prescripción de las multas asociadas a la PPU ${d.patenteVehiculo} y acogerla a tramitación;

OTROSÍ: Solicito a SS tener por acompañado certificado de multas no pagadas del Registro Civil.

${fechaActual}

─────────────────────────────────────
${d.nombreCliente}
${d.rutCliente}
${d.direccionCliente}
${d.correoCliente} · ${d.telefonoCliente}

FIRMA`;
}

/**
 * Genera preview HTML de la hoja A4 con paywall blur.
 * 60% inferior difuminado hasta que se pague.
 */
export function generatePreviewHTML(data: Partial<TagFormData>, paid: boolean): {
  headText: string;
  bodyText: string;
  fullText: string;
} {
  const fullText = generateTagDocument(data);
  const lines = fullText.split('\n');
  const totalChars = fullText.length;
  const splitPoint = Math.floor(totalChars * 0.30); // 30% superior visible, 70% blur

  let headText = '';
  let bodyText = '';
  let accumulated = 0;

  for (let i = 0; i < lines.length; i++) {
    const lineLen = lines[i].length + 1;
    if (accumulated + lineLen <= splitPoint) {
      headText += lines[i] + '\n';
    } else if (headText.length > 0 && bodyText.length === 0) {
      // This is the first line to cross the boundary
      headText += lines[i];  // include it in head
      bodyText = lines.slice(i + 1).join('\n');
      break;
    } else {
      bodyText += lines[i] + '\n';
    }
    accumulated += lineLen;
  }

  if (!bodyText && headText) {
    // fallback: split at 30% of lines
    const lineSplit = Math.ceil(lines.length * 0.3);
    const headLines = lines.slice(0, lineSplit);
    bodyText = lines.slice(lineSplit).join('\n');
    headText = headLines.join('\n');
  }

  return { headText, bodyText, fullText };
}

/**
 * Obtiene el título del escrito según comuna.
 */
export function getTagDocumentTitle(comuna: string): string {
  return comuna
    ? `Escrito de Prescripción TAG · Juzgado de Policía Local de ${comuna}`
    : 'Escrito de Prescripción TAG (Art. 24 Ley 18.287)';
}
