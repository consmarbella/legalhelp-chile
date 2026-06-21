#!/usr/bin/env node
/**
 * clasificar-seo.mjs
 * -------------------------------------------------------------------------
 * Cruza los exports de Google Search Console (gsc-data/*.csv) con el set
 * actual de páginas (data/paginas.json) y clasifica cada URL según DEMANDA REAL,
 * para convertir el recorte "a ciegas" en uno quirúrgico basado en datos.
 *
 * Clasificación:
 *   MANTENER   → está en paginas.json (set actual) → se queda.
 *   RECUPERAR  → NO está en paginas.json pero rankeó con clics o demanda real
 *                (la quitaste y estaba funcionando) → candidata a volver.
 *   MATAR      → NO está en paginas.json y sin demanda (0-1 impresión en 3 meses)
 *                → relleno que gatilló el thin content; confirmar deindexación (410).
 *
 * Uso:  node scripts/clasificar-seo.mjs
 * Salida: gsc-data/clasificacion-seo.json  +  AUDITORIA-SEO-GSC.md  +  resumen en consola
 * -------------------------------------------------------------------------
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GSC_DIR = path.join(ROOT, 'gsc-data');

// ── Umbrales (ajustables) ────────────────────────────────────────────────
const IMPR_DEMANDA_REAL = 4;  // ≥4 impresiones en 3 meses = hay interés
const IMPR_RUIDO        = 1;  // ≤1 impresión = ruido / sin demanda

// ── Helpers ────────────────────────────────────────────────────────────────
function findCsv(substr) {
  const f = fs.readdirSync(GSC_DIR).find((n) => n.toLowerCase().includes(substr) && n.endsWith('.csv'));
  if (!f) throw new Error(`No encuentro CSV que contenga "${substr}" en ${GSC_DIR}`);
  return path.join(GSC_DIR, f);
}

function parseCsv(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    rows.push(cols);
  }
  return rows;
}

function slugOf(url) {
  const m = url.split('/p/');
  if (m.length < 2) return null;
  return m[1].replace(/\/$/, '').trim();
}

const num = (s) => parseInt(String(s).replace(/[^\d]/g, ''), 10) || 0;
const flt = (s) => parseFloat(String(s).replace(',', '.')) || 0;

// ── Cargar set actual de páginas ─────────────────────────────────────────────
const paginas = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'paginas.json'), 'utf8'));
const currentSlugs = new Set(paginas.map((p) => p.slug));

// Mapa categoria por slug del hub (para sugerir destino de recuperación)
const hubBaseSlugs = paginas.filter((p) => !p.variable).map((p) => p.slug);
function guessHub(slug) {
  // el hub más largo que sea prefijo del slug eliminado
  let best = null;
  for (const h of hubBaseSlugs) {
    if (slug.startsWith(h) && (!best || h.length > best.length)) best = h;
  }
  return best;
}

// ── Procesar GSC Páginas ─────────────────────────────────────────────────────
const pagRows = parseCsv(findCsv('gina')); // "Páginas principales,Clics,Impresiones,CTR,Posición"
const result = { mantener: [], recuperar: [], matar: [], no_p: [] };

for (const cols of pagRows) {
  const [url, clics, impr, , pos] = cols;
  const reg = { url, slug: slugOf(url), clics: num(clics), impr: num(impr), pos: flt(pos) };

  if (!reg.slug) { result.no_p.push(reg); continue; }

  if (currentSlugs.has(reg.slug)) {
    result.mantener.push(reg);
  } else if (reg.clics > 0 || reg.impr >= IMPR_DEMANDA_REAL) {
    reg.hubSugerido = guessHub(reg.slug);
    result.recuperar.push(reg);
  } else {
    result.matar.push(reg);
  }
}

// Ordenar por valor
const byValue = (a, b) => b.clics - a.clics || b.impr - a.impr;
result.recuperar.sort(byValue);
result.mantener.sort(byValue);
result.matar.sort((a, b) => b.impr - a.impr);

// ── Resumen ──────────────────────────────────────────────────────────────────
const sum = (arr, k) => arr.reduce((t, r) => t + r[k], 0);
const resumen = {
  generado: new Date().toISOString(),
  paginas_actuales_en_json: currentSlugs.size,
  urls_en_gsc: pagRows.length,
  mantener:  { urls: result.mantener.length,  clics: sum(result.mantener, 'clics'),  impr: sum(result.mantener, 'impr') },
  recuperar: { urls: result.recuperar.length, clics: sum(result.recuperar, 'clics'), impr: sum(result.recuperar, 'impr') },
  matar:     { urls: result.matar.length,     clics: sum(result.matar, 'clics'),     impr: sum(result.matar, 'impr') },
};

console.log('\n=== CLASIFICACIÓN SEO (basada en GSC) ===');
console.table({
  MANTENER:  resumen.mantener,
  RECUPERAR: resumen.recuperar,
  MATAR:     resumen.matar,
});
console.log('\nTOP 15 a RECUPERAR (rankeaban y las quitaste):');
for (const r of result.recuperar.slice(0, 15)) {
  console.log(`  pos ${r.pos.toFixed(1).padStart(5)} | clics ${r.clics} | impr ${String(r.impr).padStart(3)} | ${r.slug}  → hub: ${r.hubSugerido ?? '?'}`);
}

// ── Guardar artefactos ───────────────────────────────────────────────────────
fs.writeFileSync(path.join(GSC_DIR, 'clasificacion-seo.json'), JSON.stringify({ resumen, ...result }, null, 2));

const md = [];
md.push('# Auditoría SEO basada en Google Search Console\n');
md.push(`_Generado: ${resumen.generado} · Período del export: últimos 3 meses_\n`);
md.push('## Resumen\n');
md.push('| Clasificación | URLs | Clics | Impresiones | Acción |');
md.push('|---|---|---|---|---|');
md.push(`| **MANTENER** (en paginas.json) | ${resumen.mantener.urls} | ${resumen.mantener.clics} | ${resumen.mantener.impr} | Se quedan |`);
md.push(`| **RECUPERAR** (rankeaban, las quitaste) | ${resumen.recuperar.urls} | ${resumen.recuperar.clics} | ${resumen.recuperar.impr} | Volver a 200 + sitemap |`);
md.push(`| **MATAR** (sin demanda, relleno) | ${resumen.matar.urls} | ${resumen.matar.clics} | ${resumen.matar.impr} | Confirmar deindex (410/noindex) |`);
md.push('\n## Páginas a RECUPERAR (prioridad: rankeaban con clics/impresiones y fueron removidas)\n');
md.push('| Slug | Posición | Clics | Impresiones | Hub sugerido |');
md.push('|---|---|---|---|---|');
for (const r of result.recuperar.slice(0, 40)) {
  md.push(`| ${r.slug} | ${r.pos.toFixed(1)} | ${r.clics} | ${r.impr} | ${r.hubSugerido ?? '?'} |`);
}
md.push('\n## Demanda desperdiciada — páginas MANTENIDAS con impresiones pero posición > 10\n');
md.push('| Slug | Posición | Impresiones | Clics |');
md.push('|---|---|---|---|');
for (const r of result.mantener.filter((x) => x.pos > 10 && x.impr >= IMPR_DEMANDA_REAL).sort((a, b) => b.impr - a.impr).slice(0, 25)) {
  md.push(`| ${r.slug} | ${r.pos.toFixed(1)} | ${r.impr} | ${r.clics} |`);
}
fs.writeFileSync(path.join(ROOT, 'AUDITORIA-SEO-GSC.md'), md.join('\n') + '\n');

console.log('\n✅ Archivos generados:');
console.log('   - gsc-data/clasificacion-seo.json');
console.log('   - AUDITORIA-SEO-GSC.md');
