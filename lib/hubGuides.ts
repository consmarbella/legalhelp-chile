/**
 * hubGuides.ts — Carga data/hub_guides.json y provee guías dinámicas
 * para tipos de documento sin template hardcodeado.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

interface GuideSection {
  heading: string;
  body: string;
}

interface GuideEntry {
  sections: GuideSection[];
}

let _guides: Record<string, GuideEntry> | null = null;

function loadGuides(): Record<string, GuideEntry> {
  if (_guides) return _guides;
  try {
    const path = join(process.cwd(), 'data', 'hub_guides.json');
    const raw = readFileSync(path, 'utf-8');
    _guides = JSON.parse(raw);
    console.log(`[hubGuides] Cargadas ${Object.keys(_guides).length} guías`);
  } catch (e) {
    console.error('[hubGuides] Error cargando hub_guides.json:', e);
    _guides = {};
  }
  return _guides!;
}

/**
 * Busca una guía en hub_guides.json que coincida con el tipo de documento.
 * Coincidencia por: nombre exacto, inclusión parcial, o palabras clave.
 */
export function findGuide(tipoDocumento: string): GuideEntry | null {
  const guides = loadGuides();
  const tipoNorm = tipoDocumento.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 1. Coincidencia exacta
  for (const [name, guide] of Object.entries(guides)) {
    const nameNorm = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (nameNorm === tipoNorm) return guide;
  }

  // 2. Coincidencia parcial (el nombre del tipo contiene parte del guide o viceversa)
  for (const [name, guide] of Object.entries(guides)) {
    const nameNorm = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (nameNorm.includes(tipoNorm) || tipoNorm.includes(nameNorm)) return guide;
  }

  // 3. Coincidencia por palabras clave significativas
  const palabrasTipo = tipoNorm.split(/\s+/).filter(w => w.length > 3);
  let bestMatch: { guide: GuideEntry; score: number } | null = null;

  for (const [name, guide] of Object.entries(guides)) {
    const nameNorm = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    let score = 0;
    for (const palabra of palabrasTipo) {
      if (nameNorm.includes(palabra)) score += 1;
    }
    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { guide, score };
    }
  }

  return bestMatch ? bestMatch.guide : null;
}

/**
 * Extrae el marco legal de una guía (sección "Base legal" o "Artículos")
 */
export function extractLegalFramework(guide: GuideEntry): string {
  const legalSections = guide.sections.filter(s =>
    /base legal|art.culo|fundamento|ley|norma|disposiciones/i.test(s.heading)
  );
  return legalSections.map(s => s.body).join('\n\n');
}

/**
 * Extrae los requisitos/documentos necesarios de una guía
 */
export function extractRequirements(guide: GuideEntry): string[] {
  const docsSection = guide.sections.find(s =>
    /documentos necesitas|requisitos|qu. documentos/i.test(s.heading)
  );
  if (!docsSection) return [];

  return docsSection.body
    .split('\n')
    .map(l => l.replace(/^[•\-\*]\s*/, '').trim())
    .filter(l => l.length > 5);
}

/**
 * Construye un prompt de contexto para el LLM basado en la guía
 */
export function buildGuidePrompt(tipo: string, guide: GuideEntry): string {
  const legalBase = extractLegalFramework(guide);
  const docs = extractRequirements(guide);

  let prompt = `DOCUMENTO: ${tipo}\n\n`;

  if (legalBase) {
    prompt += `MARCO LEGAL DE REFERENCIA:\n${legalBase}\n\n`;
  }

  if (docs.length > 0) {
    prompt += `DOCUMENTOS NECESARIOS SEGÚN LA GUÍA:\n${docs.map((d, i) => `${i + 1}. ${d}`).join('\n')}\n\n`;
  }

  // Agregar secciones descriptivas como contexto
  const descSection = guide.sections.find(s =>
    /qu. es/i.test(s.heading)
  );
  if (descSection) {
    prompt += `DESCRIPCIÓN:\n${descSection.body.slice(0, 300)}\n\n`;
  }

  const stepsSection = guide.sections.find(s =>
    /paso a paso|c.mo presentar/i.test(s.heading)
  );
  if (stepsSection) {
    prompt += `PROCEDIMIENTO:\n${stepsSection.body.slice(0, 300)}\n\n`;
  }

  return prompt;
}
