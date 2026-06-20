// ─────────────────────────────────────────────────────────────────────────────
// EVAL EN VIVO — calidad del PREVIEW/documento real (el "vendedor").
// Pega a la API de produccion (que tiene las API keys) y verifica que el
// documento generado: use los datos entregados, no deje placeholders de esos
// datos, no invente "SpA", y use el formato correcto segun el tipo.
//
// Uso:  node scripts/eval-live.mjs            (default https://legalhelp.cl)
//       BASE=https://preview-url node scripts/eval-live.mjs
// ─────────────────────────────────────────────────────────────────────────────
const BASE = process.env.BASE || 'https://legalhelp.cl';

const CASOS = [
  {
    nombre: 'Finiquito (estándar)',
    data: {
      tipo_documento: 'Finiquito',
      nombre: 'Alejandro Matteucci', rut: '13.829.012-3', direccion: 'Vitacura 7181, Vitacura',
      destinatario_inferido: 'Constructora Marbella',
      datos_recopilados: { cargo: 'operador', fecha_inicio: '13/01/2025', fecha_termino: '20/06/2025', motivo_termino: 'fin de obra', sueldo: '1000000' },
    },
    debe: { incluye: ['ALEJANDRO MATTEUCCI', 'Constructora Marbella'], noIncluye: ['SpA', '[NOMBRE]', '[RUT]', 'RUEGO A US'] },
  },
  {
    nombre: 'Alzamiento de embargo (judicial)',
    data: {
      tipo_documento: 'Alzamiento de embargo sobre vehículo',
      nombre: 'Maria Soto', rut: '15.222.333-4', direccion: 'Los Olmos 450, Maipú',
      destinatario_inferido: 'Juzgado de Letras en lo Civil de Santiago',
      datos_recopilados: { vehiculo: 'Toyota Yaris 2018 patente GHWX-12', deuda_pagada: 'pagué la deuda el 10/05/2026' },
    },
    debe: { incluye: ['MARIA SOTO', 'Toyota Yaris', 'embargo'], noIncluye: ['[NOMBRE]', '[RUT]'] },
  },
  {
    nombre: 'Reclamo SERNAC (carta, no judicial)',
    data: {
      tipo_documento: 'Reclamo ante SERNAC',
      nombre: 'Pedro Rojas', rut: '12.345.678-9', direccion: 'Av. Central 100, Ñuñoa',
      destinatario_inferido: 'SERNAC',
      datos_recopilados: { problema: 'compré un refrigerador y llegó con fallas, la tienda no responde' },
    },
    debe: { incluye: ['PEDRO ROJAS'], noIncluye: ['[NOMBRE]', '[RUT]', 'EN LO PRINCIPAL'] },
  },
  {
    nombre: 'Declaración jurada (no judicial)',
    data: {
      tipo_documento: 'Declaración jurada de domicilio',
      nombre: 'Ana Díaz', rut: '16.777.888-2', direccion: 'Pasaje Sur 23, La Florida',
      datos_recopilados: { declara: 'que vivo en Pasaje Sur 23, La Florida hace 5 años' },
    },
    debe: { incluye: ['ANA DÍAZ', 'DECLARACIÓN JURADA'], noIncluye: ['[NOMBRE]', 'RUEGO A US', 'EN LO PRINCIPAL'] },
  },
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function gen(data) {
  const res = await fetch(`${BASE}/api/generate-final`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  });
  const j = await res.json();
  return j.document || '';
}

async function main() {
  console.log(`\n=== EVAL EN VIVO (${BASE}) ===\n`);
  let fails = 0;
  for (const c of CASOS) {
    const doc = await gen(c.data);
    const problemas = [];
    if (!doc) problemas.push('NO se genero documento');
    for (const s of c.debe.incluye)   if (doc && !doc.includes(s)) problemas.push(`falta "${s}"`);
    for (const s of c.debe.noIncluye) if (doc && doc.includes(s))  problemas.push(`NO deberia contener "${s}"`);
    const ok = problemas.length === 0;
    if (!ok) fails++;
    console.log(`${ok ? '✅' : '❌'} ${c.nombre}`);
    if (!ok) problemas.forEach(p => console.log(`     - ${p}`));
    if (doc) console.log(`     primeras lineas: ${doc.split('\n').filter(Boolean).slice(0, 3).join(' / ').slice(0, 140)}`);
    await sleep(13000); // respeta rate limit (generate: 5/min)
  }
  console.log(`\nResultado: ${fails === 0 ? 'TODO OK' : fails + ' con problemas'}`);
  process.exit(fails === 0 ? 0 : 1);
}
main();
