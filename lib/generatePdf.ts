/**
 * generatePdf.ts
 * Genera un PDF profesional de escrito judicial chileno usando jsPDF.
 * Fuente Times New Roman, márgenes judiciales, numeración de líneas.
 * Se ejecuta 100% en el cliente (browser).
 */

import { jsPDF } from 'jspdf';

// Márgenes en mm (formato carta chileno estándar)
const MARGIN_LEFT   = 25;
const MARGIN_RIGHT  = 20;
const MARGIN_TOP    = 25;
const MARGIN_BOTTOM = 20;
const PAGE_WIDTH    = 215.9; // carta
const PAGE_HEIGHT   = 279.4;
const TEXT_WIDTH    = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const FONT_SIZE     = 11;
const LINE_HEIGHT   = 7;    // mm entre líneas
const NUM_COL_W     = 10;   // ancho columna número de línea

function buildPdf(documentText: string) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  doc.setFont('times', 'normal');
  doc.setFontSize(FONT_SIZE);

  let y = MARGIN_TOP;
  let lineNum = 0;
  let pageNum = 1;

  const addPage = () => {
    doc.addPage();
    pageNum++;
    y = MARGIN_TOP;
    drawPageDecoration();
  };

  const checkPageBreak = (extraMm = 0) => {
    if (y + extraMm > PAGE_HEIGHT - MARGIN_BOTTOM) addPage();
  };

  const drawPageDecoration = () => {
    doc.setDrawColor(180, 160, 120);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_LEFT - 3, MARGIN_TOP - 5, MARGIN_LEFT - 3, PAGE_HEIGHT - MARGIN_BOTTOM + 5);

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`- ${pageNum} -`, PAGE_WIDTH / 2, PAGE_HEIGHT - 10, { align: 'center' });
    doc.setFontSize(FONT_SIZE);
    doc.setTextColor(0);
  };

  drawPageDecoration();

  const lines = documentText.split('\n');

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (!trimmed) {
      y += LINE_HEIGHT * 0.6;
      checkPageBreak();
      continue;
    }

    lineNum++;

    const isDate          = /^santiago,/i.test(trimmed);
    const isRecipient     = /^se[ñn]or(a)?[\s:]/i.test(trimmed) || /^(excelent|ilustr)/i.test(trimmed);
    const isPresente      = /^presente$/i.test(trimmed);
    const isSectionHeader = /^(I{1,3}V?|IV|V?I{1,3})\.\s/i.test(trimmed) ||
                            /^(POR TANTO|RUEGO A|EN LO PRINCIPAL)/i.test(trimmed);
    const isSignatureLine = lineNum > lines.length - 6 && /^[A-ZÁÉÍÓÚÑ]/.test(trimmed) && trimmed.length < 60;

    doc.setFontSize(7.5);
    doc.setTextColor(160);
    doc.setFont('times', 'normal');
    doc.text(String(lineNum), MARGIN_LEFT - 5, y, { align: 'right' });
    doc.setFontSize(FONT_SIZE);
    doc.setTextColor(0);

    const textX = MARGIN_LEFT + (NUM_COL_W * 0.1);
    const maxW  = TEXT_WIDTH - (NUM_COL_W * 0.1);

    if (isDate) {
      doc.setFont('times', 'normal');
      doc.text(trimmed, PAGE_WIDTH - MARGIN_RIGHT, y, { align: 'right' });
    } else if (isRecipient || isPresente) {
      doc.setFont('times', 'bold');
      doc.text(trimmed.toUpperCase(), PAGE_WIDTH / 2, y, { align: 'center' });
      doc.setFont('times', 'normal');
    } else if (isSectionHeader) {
      doc.setFont('times', 'bold');
      doc.setFontSize(FONT_SIZE);
      const wrapped = doc.splitTextToSize(trimmed.toUpperCase(), maxW);
      checkPageBreak(wrapped.length * LINE_HEIGHT);
      doc.text(wrapped, textX, y);
      y += (wrapped.length - 1) * LINE_HEIGHT;
      doc.setFont('times', 'normal');
    } else if (isSignatureLine) {
      doc.setFont('times', 'normal');
      doc.text(trimmed, PAGE_WIDTH / 2, y, { align: 'center' });
    } else {
      doc.setFont('times', 'normal');
      const wrapped = doc.splitTextToSize(trimmed, maxW);
      checkPageBreak(wrapped.length * LINE_HEIGHT);
      doc.text(wrapped, textX, y);
      y += (wrapped.length - 1) * LINE_HEIGHT;
    }

    y += LINE_HEIGHT;
    checkPageBreak();
  }

  return doc;
}

export function downloadLegalPdf(documentText: string, fileName: string = 'escrito-legal') {
  const doc = buildPdf(documentText);
  doc.save(`${fileName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}

export function getLegalPdfBase64(documentText: string): string {
  const doc = buildPdf(documentText);
  return btoa(doc.output());
}
