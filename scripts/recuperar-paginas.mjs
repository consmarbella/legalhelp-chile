#!/usr/bin/env node
/**
 * recuperar-paginas.mjs
 * -------------------------------------------------------------------------
 * Recupera las páginas-ciudad que RANKEABAN (clasificación "recuperar" de GSC)
 * y fueron removidas. Las vuelve a agregar a data/paginas.json para que sirvan
 * 200, entren al sitemap y sean indexables.
 *
 * Datos legales: se COPIAN del hub correspondiente (que usa redacción genérica
 * y correcta — "competente de tu domicilio" / "aplica en toda Chile"). NO se
 * inventan tribunales ni direcciones específicas por comuna (es producto legal).
 *
 * Uso: node scripts/recuperar-paginas.mjs
 * -------------------------------------------------------------------------
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Nombre propio de comuna (con acentos correctos)
const CIUDADES = {
  'antofagasta': 'Antofagasta', 'arica': 'Arica', 'calama': 'Calama', 'chillan': 'Chillán',
  'colina': 'Colina', 'coquimbo': 'Coquimbo', 'estacion-central': 'Estación Central',
  'iquique': 'Iquique', 'la-florida': 'La Florida', 'la-serena': 'La Serena',
  'las-condes': 'Las Condes', 'lo-barnechea': 'Lo Barnechea', 'los-angeles': 'Los Ángeles',
  'maipu': 'Maipú', 'nunoa': 'Ñuñoa', 'penalolen': 'Peñalolén', 'providencia': 'Providencia',
  'pudahuel': 'Pudahuel', 'puerto-montt': 'Puerto Montt', 'punta-arenas': 'Punta Arenas',
  'quilicura': 'Quilicura', 'quilpue': 'Quilpué', 'quinta-normal': 'Quinta Normal',
  'rancagua': 'Rancagua', 'san-bernardo': 'San Bernardo', 'san-miguel': 'San Miguel',
  'santiago-centro': 'Santiago Centro', 'talca': 'Talca', 'talcahuano': 'Talcahuano',
  'temuco': 'Temuco', 'valparaiso': 'Valparaíso', 'vina-del-mar': 'Viña del Mar',
};

function ciudadNombre(slugCiudad) {
  if (CIUDADES[slugCiudad]) return CIUDADES[slugCiudad];
  return slugCiudad.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

const paginas = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'paginas.json'), 'utf8'));
const clasif = JSON.parse(fs.readFileSync(path.join(ROOT, 'gsc-data', 'clasificacion-seo.json'), 'utf8'));
const bySlug = new Map(paginas.map((p) => [p.slug, p]));

let agregadas = 0;
const nuevas = [];

for (const r of clasif.recuperar) {
  const slug = r.slug;
  if (bySlug.has(slug)) continue;                 // ya existe
  const hub = r.hubSugerido && bySlug.get(r.hubSugerido);
  if (!hub) { console.warn(`  ⚠ sin hub válido, omito: ${slug}`); continue; }

  const ciudadSlug = slug.slice(r.hubSugerido.length + 1);
  const ciudad = ciudadNombre(ciudadSlug);
  const catLower = String(hub.categoria).toLowerCase();

  const entry = {
    slug,
    categoria: hub.categoria,
    variable: ciudad,
    ley: hub.ley,
    plazo: hub.plazo,
    entidad: hub.entidad,
    direccion: hub.direccion,
    // intro genérico y CORRECTO (la entidad ya es "competente de tu domicilio")
    intro: `En ${ciudad}, ${catLower} se tramita ante ${hub.entidad}. Describe tu caso y genera en minutos el documento listo para presentar, con la base legal aplicable (${hub.ley}).`,
  };
  nuevas.push(entry);
  bySlug.set(slug, entry);
  agregadas++;
}

const out = [...paginas, ...nuevas];
fs.writeFileSync(path.join(ROOT, 'data', 'paginas.json'), JSON.stringify(out, null, 2) + '\n');

console.log(`✅ Recuperadas ${agregadas} páginas. paginas.json: ${paginas.length} → ${out.length} slugs.`);
console.log('Ejemplos:');
for (const n of nuevas.slice(0, 6)) console.log(`   + ${n.slug}  (${n.variable})`);
