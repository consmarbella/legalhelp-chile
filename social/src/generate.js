import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(__dirname, '..', 'content');
const OUTPUT_DIR = join(__dirname, '..', 'output');

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

const tips = JSON.parse(readFileSync(join(CONTENT_DIR, 'tips.json'), 'utf-8'));

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function today() {
  return new Date().toISOString().split('T')[0];
}

// ── GENERATORS ──

function generateInstagramCarousel(tip) {
  const slides = [
    { type: 'portada', text: `"${tip.hook}"`, style: 'fondo oscuro, texto grande dorado, escala LegalHelp' },
    { type: 'contenido', text: tip.body, style: 'bullet points claros' },
    { type: 'dato_legal', text: `"${tip.cta}"`, style: 'CTA al final' },
  ];

  return {
    platform: 'instagram',
    format: 'carrusel (3-5 slides)',
    title: tip.title,
    caption: [
      tip.hook,
      '',
      tip.body,
      '',
      '👇 Dale like si te sirvió',
      '💬 Comenta si tenés dudas',
      '🔔 Seguinos para más contenido legal',
      '',
      tip.cta,
      '',
      `#LegalHelpChile #${tip.category.replace(/ /g, '')} #DerechoChileno #Chile #Abogados`,
    ].join('\n'),
    slides,
    hashtags: `#LegalHelpChile #${tip.category.replace(/ /g, '')} #DerechoChileno`,
    best_time: '12:00 - 14:00 hrs (lun-vie)',
  };
}

function generateInstagramReel(tip) {
  return {
    platform: 'instagram reels',
    format: 'video 15-60 seg',
    title: tip.title,
    script: [
      `🎬 INTRO (0-3s): Texto grande en pantalla: "${tip.hook}"`,
      `🎤 VOZ EN OFF: ${tip.title}`,
      `📋 CONTENIDO (3-30s): ${tip.body}`,
      `👆 CIERRE (30-45s): Texto: "${tip.cta}"`,
      '',
      '🎵 MUSICA SUGERIDA: Sonido viral de justicia/ley o musica tranquila de fondo',
    ].join('\n'),
    caption: `${tip.hook}\n\n${tip.cta}\n\n#LegalHelpChile #DerechoChileno #Chile`,
    duration: '45 seg',
    best_time: '19:00 - 21:00 hrs (lun-dom)',
  };
}

function generateTwitterPost(tip) {
  const lines = [
    tip.hook,
    '',
    tip.body,
    '',
    tip.cta,
    '',
    `#LegalHelpChile #${tip.category.replace(/[ ]/g, '')}`,
  ];
  return {
    platform: 'twitter / x',
    format: 'texto (max 280 chars)',
    title: tip.title,
    text: lines.join('\n').slice(0, 280),
    hashtags: `#LegalHelpChile #${tip.category.replace(/[ ]/g, '')}`,
    best_time: '08:00 - 10:00 / 18:00 - 20:00 (lun-vie)',
  };
}

function generateFacebookPost(tip) {
  return {
    platform: 'facebook',
    format: 'texto largo + imagen sugerida',
    title: tip.title,
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
      '💬 ¿Te pasó algo similar? Comenta abajo.',
      '👍 Si te sirvió, compartí esta publicación.',
      '',
      '#LegalHelpChile #DerechoChileno',
    ].join('\n'),
    image_suggestion: `Imagen relacionada con ${tip.category} (ej: documento legal, tribunal, contrato)`,
    best_time: '12:00 - 15:00 hrs (mar-jue-sab)',
  };
}

function generateTikTokScript(tip) {
  return {
    platform: 'tiktok',
    format: 'video 30-60 seg',
    title: tip.title,
    script: [
      `--- VIDEO SCRIPT ---`,
      ``,
      `⏱ DURACION: 45-60 segundos`,
      ``,
      `[0:00 - 0:05] HOOK`,
      `Texto en pantalla: "${tip.hook}"`,
      `Audio: tono llamativo, musica trending`,
      ``,
      `[0:05 - 0:35] DESARROLLO`,
      `Texto en pantalla: puntos clave`,
      `Audio: explicacion clara y rapida`,
      `"${tip.body}"`,
      ``,
      `[0:35 - 0:45] CIERRE`,
      `Texto en pantalla: "${tip.cta}"`,
      `Audio: llamado a la accion`,
      ``,
      `🎵 MUSICA: Trending audio - buscar "sonido viral justicia" o "${pick(['musica inspiradora', 'beat tranquilo', 'tension legal'])}"`,
    ].join('\n'),
    caption: `${tip.hook}\n\n${tip.cta}\n\n#LegalHelpChile #Chile #Legal #Derecho`,
    hashtags: '#LegalHelpChile #Chile #Derecho #Abogados',
    best_time: '19:00 - 22:00 hrs (todos los dias)',
  };
}

// ── MAIN CLI ──

const generators = {
  instagram: (tip) => ({
    carrusel: generateInstagramCarousel(tip),
    reel: generateInstagramReel(tip),
  }),
  facebook: (tip) => generateFacebookPost(tip),
  twitter: (tip) => generateTwitterPost(tip),
  tiktok: (tip) => generateTikTokScript(tip),
};

function generateAll(platform) {
  const results = [];
  for (const tip of tips) {
    if (platform && platform !== 'all') {
      const gen = generators[platform];
      if (gen) results.push({ tip: tip.id, platform, content: gen(tip) });
    } else {
      const entry = { tip: tip.id, platform: 'all', content: {} };
      for (const [p, g] of Object.entries(generators)) {
        entry.content[p] = g(tip);
      }
      results.push(entry);
    }
  }
  return results;
}

// ── CLI ──
if (process.argv[1]?.includes('generate.js')) {
  const platform = process.argv[2] || 'all';
  const specific = process.argv[3]; // optional tip index

  console.log('');
  console.log('⚖️  LegalHelp Chile - Generador de Contenido Social');
  console.log('==================================================');
  console.log(` Plataforma: ${platform}`);
  console.log(` Fecha: ${today()}`);
  console.log('');

  const results = generateAll(platform);
  const tipsToShow = specific ? [results[parseInt(specific)]] : results.slice(0, specific === 'all' ? results.length : 3);

  for (const result of tipsToShow) {
    if (!result) continue;
    console.log('──────────────────────────────────────────────');
    console.log(`📌 Tip: ${result.tip}`);
    console.log('');

    if (platform === 'all') {
      for (const [p, content] of Object.entries(result.content)) {
        console.log(` [${p.toUpperCase()}]`);
        if (content.text) console.log(`  ${content.text.slice(0, 200)}`);
        if (content.caption) console.log(`  Caption: ${content.caption.slice(0, 150)}...`);
        if (content.script) console.log(`  ${content.script.slice(0, 200)}...`);
        if (content.post) console.log(`  Post: ${content.post.slice(0, 200)}...`);
        console.log('');
      }
    } else {
      const content = result.content;
      console.log(JSON.stringify(content, null, 2).slice(0, 1000));
    }

    if (specific === 'all' || !specific) break;
  }

  // Save to file
  const filename = join(OUTPUT_DIR, `social-content-${today()}.json`);
  writeFileSync(filename, JSON.stringify(results, null, 2));
  console.log(`\n💾 Guardado en: ${filename}`);
  console.log('✅ Listo!');
}
