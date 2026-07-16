import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  convertInchesToTwip,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from 'docx';

const FONT        = 'Times New Roman';
const FONT_SIZE   = 22; // half-points => 11pt
const LINE_HEIGHT = 360; // 1.5 líneas en "dxa" (240 = simple)

export async function generateDocxBackend(data: any): Promise<Buffer> {
  const {
    juzgado,
    rutSolicitante,
    nombreSolicitante,
    patente,
    domicilio,
    correoElectronico,
    multas,
  } = data;

  const fechaActual = new Date().toLocaleDateString('es-CL', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Santiago',
  });

  const paragraphs: (Paragraph | Table)[] = [];

  // Párrafo Fecha (Derecha)
  paragraphs.push(new Paragraph({
    children: [new TextRun({ text: fechaActual, font: FONT, size: FONT_SIZE })],
    alignment: AlignmentType.RIGHT,
    spacing: { line: LINE_HEIGHT, after: 120 },
  }));

  // Destinatario (SJL)
  paragraphs.push(new Paragraph({
    children: [new TextRun({ text: `SJL JUZGADO POLICÍA LOCAL\n${juzgado}`.toUpperCase(), font: FONT, size: FONT_SIZE, bold: true })],
    alignment: AlignmentType.CENTER,
    spacing: { line: LINE_HEIGHT, before: 80, after: 160 },
  }));

  // Identificación
  paragraphs.push(new Paragraph({
    children: [new TextRun({ text: `${nombreSolicitante}, RUN ${rutSolicitante}, domiciliado en ${domicilio}, en calidad de propietario del vehículo PPU ${patente}, a SS con respeto digo:`, font: FONT, size: FONT_SIZE })],
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: LINE_HEIGHT },
  }));

  // Petitorio Principal
  paragraphs.push(new Paragraph({
    children: [new TextRun({ text: `Por medio de la presente, vengo en alegar prescripción de las multas impuestas al vehículo de mi propiedad PPU ${patente}, conforme lo establece el art. 24 de la Ley N° 18287 que establece el Procedimiento ante los Juzgados de Policía Local, por haber transcurrido más de tres años desde su anotación en el Registro de Multas No Pagadas. El detalle de las multas cuya prescripción solicito es el siguiente:`, font: FONT, size: FONT_SIZE })],
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: LINE_HEIGHT, before: 120, after: 200 },
  }));

  // TABLA DE MULTAS DINÁMICA
  const tableRows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "ID Multa", font: FONT, size: FONT_SIZE, bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Rol", font: FONT, size: FONT_SIZE, bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Fecha Ingreso RMNP", font: FONT, size: FONT_SIZE, bold: true })] })] }),
      ],
    })
  ];

  for (const m of multas) {
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(m.id || m.fechaInfraccion || ''), font: FONT, size: FONT_SIZE })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(m.rol || 'Por determinar'), font: FONT, size: FONT_SIZE })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(m.fechaAnotacion || m.fecha_ingreso || ''), font: FONT, size: FONT_SIZE })] })] }),
        ],
      })
    );
  }

  const multasTable = new Table({
    rows: tableRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    },
  });
  
  paragraphs.push(multasTable);

  // Por Tanto
  paragraphs.push(new Paragraph({
    children: [new TextRun({ text: `POR TANTO: Ruego a SS tener por alegada la prescripción de las multas asociadas a la PPU ${patente} y acogerla a tramitación.`, font: FONT, size: FONT_SIZE, bold: true })],
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: LINE_HEIGHT, before: 200 },
  }));

  // Otrosí
  paragraphs.push(new Paragraph({
    children: [new TextRun({ text: `OTROSÍ: Solicito a SS tener por acompañado certificado de multas no pagadas del Registro Civil.`, font: FONT, size: FONT_SIZE })],
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: LINE_HEIGHT, before: 120 },
  }));

  // Firma
  paragraphs.push(
    new Paragraph({ children: [new TextRun({ text: '', font: FONT, size: FONT_SIZE })], spacing: { before: 480 } }),
    new Paragraph({
      children: [new TextRun({ text: '_____________________________', font: FONT, size: FONT_SIZE })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new TextRun({ text: nombreSolicitante, font: FONT, size: FONT_SIZE })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new TextRun({ text: `RUT: ${rutSolicitante}`, font: FONT, size: FONT_SIZE })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new TextRun({ text: correoElectronico, font: FONT, size: FONT_SIZE })],
      alignment: AlignmentType.CENTER,
    })
  );

  const doc = new Document({
    creator: 'LegalHelp Chile',
    title: `Escrito Prescripcion ${juzgado}`,
    sections: [
      {
        properties: {
          page: {
            size: {
              width: convertInchesToTwip(8.5),
              height: convertInchesToTwip(11),
            },
            margin: {
              top: convertInchesToTwip(0.98),
              bottom: convertInchesToTwip(0.79),
              left: convertInchesToTwip(0.98),
              right: convertInchesToTwip(0.79),
            },
          },
        },
        children: paragraphs,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
