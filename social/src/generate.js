import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOCIAL_DIR = join(__dirname, '..');
const CONTENT_DIR = join(SOCIAL_DIR, 'content');
const PUBLICIDAD_DIR = join(SOCIAL_DIR, 'publicidad');

// Ensure all output dirs exist
const PLATFORM_DIRS = {
  instagram: ['carruseles', 'reels'],
  facebook: [''],
  twitter: [''],
  tiktok: [''],
  todas: [''],
};
for (const [platform, subs] of Object.entries(PLATFORM_DIRS)) {
  for (const sub of subs) {
    const p = join(PUBLICIDAD_DIR, platform, sub);
    if (!existsSync(p)) mkdirSync(p, { recursive: true });
  }
}
if (!existsSync(join(PUBLICIDAD_DIR, 'historial'))) mkdirSync(join(PUBLICIDAD_DIR, 'historial'), { recursive: true });

const tips = JSON.parse(readFileSync(join(CONTENT_DIR, 'tips.json'), 'utf-8'));

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function today() { return new Date().toISOString().split('T')[0]; }
function now() { return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19); }

function saveToFile(platform, subfolder, filename, content) {
  const dir = subfolder ? join(PUBLICIDAD_DIR, platform, subfolder) : join(PUBLICIDAD_DIR, platform);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const path = join(dir, filename);
  writeFileSync(path, JSON.stringify(content, null, 2));
  return path;
}

// ── GENERATORS ──

function generateInstagramCarousel(tip) {
  const content = {
    id: `${today()}-${tip.id}`,
    fecha: today(),
    plataforma: 'Instagram',
    formato: 'Carrusel (3-5 slides)',
    tema: tip.title,
    caption: [
      tip.hook, '',
      tip.body, '',
      '👇 Dale like si te sirvio',
      '💬 Comenta si tenes dudas',
      '🔔 Seguinos para mas contenido legal', '',
      tip.cta, '',
      `#LegalHelpChile #${tip.category.replace(/ /g, '')} #DerechoChileno #Chile`,
    ].join('\n'),
    slides: [
      { slide: 1, tipo: 'Portada', texto: `"${tip.hook}"`, diseno: 'Fondo oscuro, texto grande dorado, logo LegalHelp arriba' },
      { slide: 2, tipo: 'Contenido', texto: tip.body, diseno: 'Bullet points con iconos de ley, fondo blanco' },
      { slide: 3, tipo: 'Dato legal', texto: `Base legal: referencias a la ley`, diseno: 'Estilo documento judicial' },
      { slide: 4, tipo: 'Beneficio', texto: 'Documento listo en minutos, sin abogado caro', diseno: 'Checklist visual' },
      { slide: 5, tipo: 'CTA', texto: tip.cta, diseno: 'Fondo dorado, texto oscuro, boton de accion' },
    ],
    hashtags: `#LegalHelpChile #${tip.category.replace(/ /g, '')} #DerechoChileno #Chile #Abogados`,
    mejor_horario: '12:00 - 14:00 hrs (lun-vie)',
  };
  const filepath = saveToFile('instagram', 'carruseles', `carrusel-${content.id}.json`, content);
  return { ...content, archivo: filepath };
}

function generateInstagramReel(tip) {
  const content = {
    id: `${today()}-${tip.id}`,
    fecha: today(),
    plataforma: 'Instagram Reels',
    formato: 'Video 15-60 seg',
    tema: tip.title,
    caption: `${tip.hook}\n\n${tip.cta}\n\n#LegalHelpChile #DerechoChileno #Chile`,
    script: [
      `[0:00 - 0:05] HOOK`,
      `  Texto en pantalla: "${tip.hook}"`,
      `  Audio: tono llamativo`,
      ``,
      `[0:05 - 0:35] DESARROLLO`,
      `  Texto: "${tip.body.slice(0, 100)}..."`,
      `  Audio: explicacion clara`,
      ``,
      `[0:35 - 0:45] CIERRE`,
      `  Texto: "${tip.cta}"`,
      `  Audio: llamado a la accion`,
    ].join('\n'),
    musica_sugerida: pick(['Sonido viral de justicia', 'Musica inspiradora', 'Beat tranquilo', 'Tension legal']),
    hashtags: '#LegalHelpChile #Chile #Derecho',
    mejor_horario: '19:00 - 21:00 hrs',
  };
  const filepath = saveToFile('instagram', 'reels', `reel-${content.id}.json`, content);
  return { ...content, archivo: filepath };
}

function generateFacebookPost(tip) {
  const content = {
    id: `${today()}-${tip.id}`,
    fecha: today(),
    plataforma: 'Facebook',
    formato: 'Post con imagen',
    tema: tip.title,
    post: [
      `📌 ${tip.title}`,
      '',
      tip.hook,
      '',
      tip.body,
      '',
      '👇',
      tip.cta,
      '',
      '💬 ¿Te paso algo similar? Comenta abajo.',
      '👍 Si te sirvio, comparti esta publicacion.',
      '',
      '#LegalHelpChile #DerechoChileno #Chile',
    ].join('\n'),
    imagen_sugerida: `Imagen relacionada con ${tip.category} (ej: documento legal, tribunal, contrato)`,
    hashtags: '#LegalHelpChile #DerechoChileno',
    mejor_horario: '12:00 - 15:00 hrs (mar-jue-sab)',
  };
  const filepath = saveToFile('facebook', '', `fb-${content.id}.json`, content);
  return { ...content, archivo: filepath };
}

function generateTwitterPost(tip) {
  const text = [
    tip.hook, '',
    tip.body.slice(0, 150), '',
    tip.cta, '',
    `#LegalHelpChile #Chile`,
  ].join('\n').slice(0, 280);

  const content = {
    id: `${today()}-${tip.id}`,
    fecha: today(),
    plataforma: 'Twitter / X',
    formato: 'Tweet',
    tema: tip.title,
    texto: text,
    hashtags: '#LegalHelpChile #Chile',
    mejor_horario: '08:00 - 10:00 / 18:00 - 20:00',
  };
  const filepath = saveToFile('twitter', '', `tweet-${content.id}.json`, content);
  return { ...content, archivo: filepath };
}

function generateTikTokScript(tip) {
  const content = {
    id: `${today()}-${tip.id}`,
    fecha: today(),
    plataforma: 'TikTok',
    formato: 'Video 30-60 seg',
    tema: tip.title,
    caption: `${tip.hook}\n\n${tip.cta}\n\n#LegalHelpChile #Chile`,
    script: [
      `--- VIDEO TikTok ---`,
      `Duracion: 45-60 seg`,
      ``,
      `[0:00 - 0:05] HOOK`,
      `  Texto: "${tip.hook}"`,
      ``,
      `[0:05 - 0:35] CUERPO`,
      `  "${tip.body}"`,
      ``,
      `[0:35 - 0:45] CIERRE`,
      `  Texto: "${tip.cta}"`,
      ``,
      `🎵 Musica: ${pick(['Trending', 'Inspiradora', 'Tranquila', 'Dramatica'])}`,
    ].join('\n'),
    hashtags: '#LegalHelpChile #Chile #Derecho',
    mejor_horario: '19:00 - 22:00 hrs',
  };
  const filepath = saveToFile('tiktok', '', `tiktok-${content.id}.json`, content);
  return { ...content, archivo: filepath };
}

// ── HTML PREVIEW ──

function generateHTMLPreview(allContent) {
  let html = `<!DOCTYPE html>
<html lang="es-CL"><head><meta charset="UTF-8">
<title>Publicidad LegalHelp - ${today()}</title>
<style>
  body { font-family: Arial; background: #1a1a1a; color: #eee; padding: 20px; max-width: 800px; margin: auto; }
  h1 { color: #C8A045; text-align: center; }
  .card { background: #2a2a2a; border-radius: 12px; padding: 16px; margin: 12px 0; border-left: 4px solid #C8A045; }
  .card h3 { color: #C8A045; margin: 0 0 8px 0; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin: 2px; }
  .ig { background: #E1306C; color: white; }
  .fb { background: #1877F2; color: white; }
  .tw { background: #1DA1F2; color: white; }
  .tk { background: #000; color: white; border: 1px solid #333; }
  pre { background: #333; padding: 10px; border-radius: 6px; overflow-x: auto; font-size: 12px; }
  .archivo { color: #888; font-size: 11px; }
</style></head><body>
<h1>📢 Publicidad LegalHelp Chile</h1>
<p style="text-align:center;color:#888;">Generado: ${now().slice(0,16)}</p>`;

  for (const item of allContent) {
    const tip = tips.find(t => t.id === item.tipId);
    if (!item.content) continue;
    const entries = Array.isArray(item.content) ? item.content : [item.content];

    for (const entry of entries) {
      if (!entry) continue;
      const plat = (entry.plataforma || '').toLowerCase();
      const cls = plat.includes('instagram') ? 'ig' : plat.includes('facebook') ? 'fb' : plat.includes('twitter') ? 'tw' : 'tk';

      html += `<div class="card">
        <h3><span class="badge ${cls}">${entry.plataforma || plat}</span> ${entry.tema || entry.titulo || ''}</h3>`;

      if (entry.caption) html += `<pre>${escapeHtml(entry.caption)}</pre>`;
      if (entry.post) html += `<pre>${escapeHtml(entry.post)}</pre>`;
      if (entry.texto) html += `<pre>${escapeHtml(entry.texto)}</pre>`;
      if (entry.script) html += `<pre>${escapeHtml(entry.script)}</pre>`;
      if (entry.slides) {
        html += `<details><summary>Ver slides (${entry.slides.length})</summary>`;
        for (const s of entry.slides) {
          html += `<p><b>Slide ${s.slide}:</b> ${s.texto} <i style="color:#888">(${s.diseno})</i></p>`;
        }
        html += `</details>`;
      }
      if (entry.mejor_horario) html += `<p class="archivo">🕐 Mejor horario: ${entry.mejor_horario}</p>`;
      if (entry.archivo) html += `<p class="archivo">📁 ${entry.archivo}</p>`;
      html += `</div>`;
    }
  }

  html += `</body></html>`;
  return html;
}

function escapeHtml(s) {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── MAIN CLI ──

if (process.argv[1]?.includes('generate.js')) {
  const platform = (process.argv[2] || 'todas').toLowerCase();
  const specificIndex = parseInt(process.argv[3]);
  const isNaN = x => x !== x;

  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log('║   LegalHelp Chile - Publicidad Auto  ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(` Fecha: ${today()}`);
  console.log(` Plataforma: ${platform}`);
  console.log('');

  const allContent = [];
  const tipsToUse = isNaN(specificIndex) ? tips : [tips[specificIndex]];

  for (const tip of tipsToUse) {
    if (!tip) continue;
    const content = { tipId: tip.id, content: [] };

    if (platform === 'todas' || platform === 'instagram') {
      content.content.push(generateInstagramCarousel(tip), generateInstagramReel(tip));
    }
    if (platform === 'todas' || platform === 'facebook') {
      content.content.push(generateFacebookPost(tip));
    }
    if (platform === 'todas' || platform === 'twitter') {
      content.content.push(generateTwitterPost(tip));
    }
    if (platform === 'todas' || platform === 'tiktok') {
      content.content.push(generateTikTokScript(tip));
    }

    allContent.push(content);
  }

  // Save HTML preview
  const html = generateHTMLPreview(allContent);
  const htmlFile = join(PUBLICIDAD_DIR, 'todas', `preview-${today()}.html`);
  writeFileSync(htmlFile, html);

  // Save master JSON
  const jsonFile = join(PUBLICIDAD_DIR, 'historial', `publicidad-${now()}.json`);
  writeFileSync(jsonFile, JSON.stringify(allContent, null, 2));

  // Summary
  let totalItems = 0;
  for (const c of allContent) {
    if (c.content) totalItems += c.content.length;
  }

  console.log('📦 Contenido generado:');
  console.log(`   ${tipsToUse.length} tema(s) legal(es)`);
  console.log(`   ${totalItems} pieza(s) publicitaria(s)`);
  console.log('');
  console.log('📁 Archivos guardados en:');
  console.log(`   social/publicidad/`);
  console.log(`   ├── instagram/carruseles/`);
  console.log(`   ├── instagram/reels/`);
  console.log(`   ├── facebook/`);
  console.log(`   ├── twitter/`);
  console.log(`   ├── tiktok/`);
  console.log(`   ├── todas/preview-${today()}.html`);
  console.log(`   └── historial/`);
  console.log('');
  console.log('✅ Listo! Abri el HTML en el navegador para ver todo.');
}
