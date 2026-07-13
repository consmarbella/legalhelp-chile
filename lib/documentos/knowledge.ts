/**
 * knowledge.ts — Base de conocimiento de 85 documentos legales chilenos.
 * 
 * Provee:
 * 1. Búsqueda por similitud de texto (fuzzy match por slug/título)
 * 2. Información legal específica (leyes, plazos, tribunal)
 * 3. Contenido completo para inyectar en prompts
 * 
 * DOBLE CONOCIMIENTO:
 * - El LLM ya sabe hacer documentos legales (conocimiento general)
 * - Este módulo agrega conocimiento ESPECÍFICO de Chile (leyes exactas, plazos, tribunales)
 */

import catalogoData from './catalogo.json';
import knowledgeBaseData from './knowledge-base.json';

interface CatalogoEntry {
  t: string;       // título
  l: string[];     // leyes
  p: string[];     // plazos
  tr: string | null; // tribunal
}

interface KBEntry {
  titulo: string;
  leyes: string[];
  articulos: string[];
  plazos: string[];
  tribunal: string[];
  contenido_resumido: string;
}

const catalogo = catalogoData as Record<string, CatalogoEntry>;
const knowledgeBase = knowledgeBaseData as Record<string, KBEntry>;

// ─── Búsqueda fuzzy por texto ────────────────────────────────────────────────
// Encuentra los documentos más relevantes dado un texto del usuario.
export function buscarDocumentos(texto: string, maxResults = 3): string[] {
  const palabras = texto.toLowerCase()
    .replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e')
    .replace(/[íìï]/g, 'i').replace(/[óòö]/g, 'o')
    .replace(/[úùü]/g, 'u').replace(/ñ/g, 'n')
    .split(/\s+/)
    .filter(p => p.length > 3);

  const scores: { slug: string; score: number }[] = [];

  for (const [slug, entry] of Object.entries(catalogo)) {
    const slugNorm = slug.replace(/-/g, ' ');
    const tituloNorm = (entry.t || '').toLowerCase()
      .replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e')
      .replace(/[íìï]/g, 'i').replace(/[óòö]/g, 'o')
      .replace(/[úùü]/g, 'u').replace(/ñ/g, 'n');

    let score = 0;
    for (const p of palabras) {
      if (slugNorm.includes(p)) score += 3;
      if (tituloNorm.includes(p)) score += 2;
    }

    // Bonus por keywords específicos
    if (texto.toLowerCase().includes('poder') && slug.includes('poder')) score += 5;
    if (texto.toLowerCase().includes('reclamo') && slug.includes('reclamo')) score += 5;
    if (texto.toLowerCase().includes('despido') && slug.includes('despido')) score += 5;
    if (texto.toLowerCase().includes('arriendo') && slug.includes('arriendo')) score += 5;
    if (texto.toLowerCase().includes('pension') && slug.includes('alimento')) score += 5;
    if (texto.toLowerCase().includes('alimento') && slug.includes('alimento')) score += 5;
    if (texto.toLowerCase().includes('prescripcion') && slug.includes('prescripcion')) score += 5;
    if (texto.toLowerCase().includes('finiquito') && slug.includes('finiquito')) score += 5;
    if (texto.toLowerCase().includes('contrato') && slug.includes('contrato')) score += 4;
    if (texto.toLowerCase().includes('demanda') && slug.includes('demanda')) score += 4;
    if (texto.toLowerCase().includes('recurso') && slug.includes('recurso')) score += 4;
    if (texto.toLowerCase().includes('denuncia') && slug.includes('denuncia')) score += 4;
    if (texto.toLowerCase().includes('declaracion') && slug.includes('declaracion')) score += 4;

    if (score > 0) scores.push({ slug, score });
  }

  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(s => s.slug);
}

// ─── Obtener conocimiento completo de un documento ───────────────────────────
export function getConocimiento(slug: string): KBEntry | null {
  return knowledgeBase[slug] || null;
}

// ─── Obtener info rápida del catálogo ────────────────────────────────────────
export function getCatalogo(slug: string): CatalogoEntry | null {
  return catalogo[slug] || null;
}

// ─── Generar contexto legal para inyectar en prompts ─────────────────────────
// Dado un texto del usuario, busca documentos relevantes y genera un bloque
// de conocimiento legal chileno para agregar al prompt.
export function generarContextoLegal(texto: string): string {
  const slugs = buscarDocumentos(texto, 3);
  if (slugs.length === 0) return '';

  const bloques: string[] = [];

  for (const slug of slugs) {
    const kb = knowledgeBase[slug];
    if (!kb) continue;

    let bloque = `═══ ${kb.titulo.toUpperCase()} ═══\n`;
    
    if (kb.leyes.length > 0) {
      bloque += `Leyes aplicables: ${kb.leyes.slice(0, 4).join('; ')}\n`;
    }
    if (kb.articulos.length > 0) {
      bloque += `Artículos: ${kb.articulos.slice(0, 4).join('; ')}\n`;
    }
    if (kb.plazos.length > 0) {
      bloque += `Plazos: ${kb.plazos.slice(0, 2).join('; ')}\n`;
    }
    if (kb.tribunal.length > 0) {
      bloque += `Tribunal/Institución: ${kb.tribunal.slice(0, 2).join('; ')}\n`;
    }

    bloques.push(bloque);
  }

  return bloques.join('\n');
}

// ─── Lista completa de tipos disponibles ─────────────────────────────────────
export function listarTipos(): string[] {
  return Object.keys(catalogo);
}

export function getTotalDocumentos(): number {
  return Object.keys(catalogo).length;
}
