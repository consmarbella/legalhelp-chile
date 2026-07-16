/**
 * comunasUtils.ts — Utilidades para acceder a las comunasData.json
 */
import comunasData from '@/data/comunasData.json';

export interface ComunaInfo {
  slug: string;
  comuna: string;
  jpl: string;
  direccion: string;
  horario: string;
  telefono: string;
  sector: string;
  autopistas: string[];
  regiones: string[];
  limite_con: string[];
}

/**
 * Busca una comuna por slug.
 */
export function getComunaBySlug(slug: string): ComunaInfo | undefined {
  return (comunasData as ComunaInfo[]).find(c => c.slug === slug);
}

/**
 * Obtiene todas las comunas TAG (para interlinking).
 */
export function getAllComunas(): ComunaInfo[] {
  return comunasData as ComunaInfo[];
}

/**
 * Capitaliza nombre de comuna desde slug.
 * Ej: "lo-barnechea" → "Lo Barnechea"
 */
export function slugToComunaName(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Extrae comuna del slug de una página.
 * Ej: "prescripcion-deuda-tag-lo-barnechea" → "lo-barnechea"
 * Si falla, retorna slug original.
 */
export function extractComunaFromSlug(slug: string): {
  comunaSlug: string;
  comunaName: string;
  esTAG: boolean;
} {
  // Matches: prescripcion-deuda-tag-{comuna}
  const tagMatch = slug.match(/^prescripcion-deuda-tag-(.+)$/);
  if (tagMatch) {
    const comunaSlug = tagMatch[1];
    return {
      comunaSlug,
      comunaName: slugToComunaName(comunaSlug),
      esTAG: true,
    };
  }

  // También match exacto: prescripcion-deuda-tag
  if (slug === 'prescripcion-deuda-tag') {
    return { comunaSlug: '', comunaName: '', esTAG: true };
  }

  return { comunaSlug: slug, comunaName: slugToComunaName(slug), esTAG: false };
}

/**
 * Obtiene enlaces de interlinking para una comuna dada.
 * - Si es sector "oriente": enlaza a Las Condes, Vitacura, Lo Barnechea, Providencia
 * - Si no: enlaza a comunas limítrofes que estén en comunasData
 */
export function getInterlinkingForComuna(comunaSlug: string): {
  comuna: string;
  slug: string;
  url: string;
}[] {
  const comuna = getComunaBySlug(comunaSlug);
  if (!comuna) return [];

  const enlaces: { comuna: string; slug: string; url: string }[] = [];

  // Sector Oriente: enlaces recíprocos
  if (comuna.sector === 'oriente') {
    const orienteSlugs = ['las-condes', 'vitacura', 'lo-barnechea', 'providencia'];
    for (const s of orienteSlugs) {
      if (s !== comunaSlug) {
        const c = getComunaBySlug(s);
        if (c) {
          enlaces.push({
            comuna: c.comuna,
            slug: s,
            url: `/p/prescripcion-deuda-tag-${s}`,
          });
        }
      }
    }
    return enlaces;
  }

  // Otros sectores: comunas limítrofes
  for (const s of comuna.limite_con) {
    const c = getComunaBySlug(s);
    if (c) {
      enlaces.push({
        comuna: c.comuna,
        slug: s,
        url: `/p/prescripcion-deuda-tag-${s}`,
      });
    }
  }

  return enlaces;
}
