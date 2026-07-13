#!/usr/bin/env node
/**
 * programar-publicacion.mjs
 * Publicación por goteo: asigna fechas `release` a las páginas recuperadas en
 * lotes de 20/día (las de mayor demanda GSC primero) para evitar un dump masivo.
 * Además agrega el hub nacional `poder-simple` (publicado de inmediato).
 *
 * Uso: node scripts/programar-publicacion.mjs [lote=20]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOTE = parseInt(process.argv[2], 10) || 20;
const HOY = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const masDias = (n) => { const d = new Date(HOY); d.setDate(d.getDate() + n); return iso(d); };

const paginas = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'paginas.json'), 'utf8'));
const clasif = JSON.parse(fs.readFileSync(path.join(ROOT, 'gsc-data', 'clasificacion-seo.json'), 'utf8'));

// Métricas GSC por slug (para priorizar)
const metrics = new Map();
for (const grupo of ['mantener', 'recuperar', 'matar']) {
  for (const r of clasif[grupo] || []) metrics.set(r.slug, { clics: r.clics || 0, impr: r.impr || 0 });
}

// Identificar las páginas RECUPERADAS por la firma del intro generado
const esRecuperada = (p) =>
  typeof p.intro === 'string' &&
  p.intro.includes('se tramita ante') &&
  p.intro.includes('Describe tu caso y genera en minutos');

const recuperadas = paginas.filter(esRecuperada);
recuperadas.sort((a, b) => {
  const ma = metrics.get(a.slug) || { clics: 0, impr: 0 };
  const mb = metrics.get(b.slug) || { clics: 0, impr: 0 };
  return mb.clics - ma.clics || mb.impr - ma.impr;
});

// Asignar release en lotes de LOTE/día (las mejores primero, desde HOY)
recuperadas.forEach((p, i) => { p.release = masDias(Math.floor(i / LOTE)); });

const ultimoDia = Math.floor((recuperadas.length - 1) / LOTE);
console.log(`📅 ${recuperadas.length} páginas recuperadas programadas en lotes de ${LOTE}/día:`);
for (let d = 0; d <= ultimoDia; d++) {
  const n = recuperadas.filter((p) => p.release === masDias(d)).length;
  console.log(`   ${masDias(d)} → ${n} páginas`);
}

// Hub nacional poder-simple (publicado HOY) — corrige el mayor error: NO existía
if (!paginas.some((p) => p.slug === 'poder-simple')) {
  paginas.push({
    slug: 'poder-simple',
    categoria: 'Poder simple',
    variable: null,
    ley: 'Artículos 2116 y siguientes del Código Civil (contrato de mandato). Para la mayoría de los trámites cotidianos el poder simple NO requiere notaría.',
    plazo: 'vigencia libre: rige hasta cumplir el encargo o ser revocado',
    entidad: 'la persona o institución correspondiente (es un documento privado y, para usos habituales, no requiere notaría)',
    direccion: 'Varía según domicilio',
    release: iso(HOY),
  });
  console.log('✅ Agregado hub nacional: poder-simple (publicado hoy)');
} else {
  console.log('ℹ️  poder-simple ya existía, no se duplica');
}

fs.writeFileSync(path.join(ROOT, 'data', 'paginas.json'), JSON.stringify(paginas, null, 2) + '\n');
console.log(`\npaginas.json: ${paginas.length} slugs. Publicadas HOY: ${paginas.filter((p) => !p.release || p.release <= iso(HOY)).length}.`);
