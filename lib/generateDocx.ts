/**
 * generateDocx.ts
 * Genera un .docx editable de escrito judicial chileno usando la librería `docx`.
 * Replica el formato del PDF (lib/generatePdf.ts): Times New Roman, tamaño carta,
 * márgenes judiciales, fecha a la derecha, destinatario centrado en negrita,
 * encabezados de sección en negrita/mayúsculas, firma centrada y cuerpo justificado.
 * A diferencia del PDF, el Word queda EDITABLE para que el cliente ajuste lo que necesite.
 * Se ejecuta 100% en el cliente (browser).
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  convertInchesToTwip,
} from 'docx';

const FONT        = 'Times New Roman';
const FONT_SIZE   = 22; // half-points => 11pt
const LINE_HEIGHT = 360; // 1.5 líneas en "dxa" (240 = simple)

// Mismas reglas de clasificación de línea que generatePdf.ts / CourtDocument.tsx
function classifyLine(trimmed: string, isLastLines: boolean): 'date' | 'recipient' | 'header' | 'signature' | 'normal' {
  const isDate          = /^santiago,/i.test(trimmed);
  const isRecipient     = /^se[ñn]or(a)?[\s:]/i.test(trimmed) || /^(excelent|ilustr)/i.test(trimmed);
  const isPresente      = /^presente$/i.test(trimmed);
  const isSectionHeader = /^(I{1,3}V?|IV|V?I{1,3})\.\s/i.test(trimmed) ||
                          /^(POR TANTO|RUEGO A|EN LO PRINCIPAL)/i.test(trimmed);
  const isSignatureLine = isLastLines && /^[A-ZÁÉÍÓÚÑ]/.test(trimmed) && trimmed.length < 60;

  if (isDate) return 'date';
  if (isRecipient || isPresente) return 'recipient';
  if (isSectionHeader) return 'header';
  if (isSignatureLine) return 'signature';
  return 'normal';
}

export async function downloadLegalDocx(documentText: string, fileName: string = 'escrito-legal') {
  const lines = documentText.split('\n');
  const totalLines = lines.length;

  const paragraphs: Paragraph[] = lines.map((rawLine, idx) => {
    const trimmed = rawLine.trim();

    // Línea vacía → párrafo en blanco (mantiene el espaciado del documento)
    if (!trimmed) {
      return new Paragraph({
        children: [new TextRun({ text: '', font: FONT, size: FONT_SIZE })],
        spacing: { line: LINE_HEIGHT, after: 60 },
      });
    }

    const isLastLines = idx > totalLines - 6;
    const kind = classifyLine(trimmed, isLastLines);

    switch (kind) {
      case 'date':
        return new Paragraph({
          children: [new TextRun({ text: trimmed, font: FONT, size: FONT_SIZE })],
          alignment: AlignmentType.RIGHT,
          spacing: { line: LINE_HEIGHT, after: 120 },
        });

      case 'recipient':
        return new Paragraph({
          children: [new TextRun({ text: trimmed.toUpperCase(), font: FONT, size: FONT_SIZE, bold: true })],
          alignment: AlignmentType.CENTER,
          spacing: { line: LINE_HEIGHT, before: 80 },
        });

      case 'header':
        return new Paragraph({
          children: [new TextRun({ text: trimmed.toUpperCase(), font: FONT, size: FONT_SIZE, bold: true })],
          alignment: AlignmentType.LEFT,
          spacing: { line: LINE_HEIGHT, before: 160, after: 60 },
        });

      case 'signature':
        return new Paragraph({
          children: [new TextRun({ text: trimmed, font: FONT, size: FONT_SIZE })],
          alignment: AlignmentType.CENTER,
          spacing: { line: LINE_HEIGHT },
        });

      default:
        return new Paragraph({
          children: [new TextRun({ text: trimmed, font: FONT, size: FONT_SIZE })],
          alignment: AlignmentType.JUSTIFIED,
          spacing: { line: LINE_HEIGHT },
        });
    }
  });

  // Línea de firma al pie (equivalente al recuadro "Firma del Solicitante" del PDF/pantalla)
  paragraphs.push(
    new Paragraph({ children: [new TextRun({ text: '', font: FONT, size: FONT_SIZE })], spacing: { before: 480 } }),
    new Paragraph({
      children: [new TextRun({ text: '_____________________________', font: FONT, size: FONT_SIZE })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Firma del Solicitante', font: FONT, size: 20 })],
      alignment: AlignmentType.CENTER,
    }),
  );

  const doc = new Document({
    creator: 'LegalHelp Chile',
    title: fileName,
    sections: [
      {
        properties: {
          page: {
            size: {
              // Tamaño carta (8.5 x 11 pulgadas)
              width: convertInchesToTwip(8.5),
              height: convertInchesToTwip(11),
            },
            margin: {
              // Márgenes judiciales (mismos del PDF: L25/R20/T25/B20 mm aprox.)
              top: convertInchesToTwip(0.98),    // ~25mm
              bottom: convertInchesToTwip(0.79), // ~20mm
              left: convertInchesToTwip(0.98),   // ~25mm
              right: convertInchesToTwip(0.79),  // ~20mm
            },
          },
        },
        children: paragraphs,
      },
    ],
  });

  // Generar el blob y disparar la descarga en el navegador
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName.replace(/\s+/g, '-').toLowerCase()}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
