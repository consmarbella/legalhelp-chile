// ─────────────────────────────────────────────────────────────────────────────
// Grounding desde data/paginas.json: dado un tipo de documento, devuelve el
// destinatario (entidad), la ley y el plazo CURADOS — para que el codigo fije
// el tribunal correcto en vez de confiar en lo que adivine el modelo.
// ─────────────────────────────────────────────────────────────────────────────
import paginas from '@/data/paginas.json';

export interface Grounding {
  categoria: string;
  entidad?: string;
  ley?: string;
  plazo?: string;
}

const STOP = new Set([
  'de', 'la', 'el', 'los', 'las', 'del', 'por', 'para', 'un', 'una', 'y', 'o', 'a',
  'ante', 'en', 'no', 'solicitud', 'escrito', 'carta', 'demanda', 'denuncia', 'recurso',
]);

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

const tokens = (s: string) => norm(s).split(' ').filter(t => t && !STOP.has(t));

// Categorias base (dedup, sin variantes por comuna)
const CATS: Grounding[] = [];
{
  const seen = new Set<string>();
  for (const p of paginas as Array<Record<string, unknown>>) {
    const cat = p.categoria as string | undefined;
    if (p.variable || !cat || seen.has(cat) || cat === 'Servicios legales') continue;
    seen.add(cat);
    CATS.push({
      categoria: cat,
      entidad: (p.entidad as string) || undefined,
      ley: (p.ley as string) || undefined,
      plazo: (p.plazo as string) || undefined,
    });
  }
}

/** Encuentra la categoria curada mas cercana a un tipo de documento libre. */
export function matchGrounding(tipo?: string | null): Grounding | null {
  if (!tipo) return null;
  const tt = tokens(tipo);
  if (!tt.length) return null;
  let best: Grounding | null = null;
  let bestScore = 0;
  for (const c of CATS) {
    const ct = tokens(c.categoria);
    if (!ct.length) continue;
    const overlap = ct.filter(t => tt.includes(t)).length;
    const score = overlap / ct.length; // fraccion de la categoria cubierta
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return bestScore >= 0.5 ? best : null;
}
