import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const tips = JSON.parse(
  readFileSync(join(__dirname, '..', 'content', 'tips.json'), 'utf-8')
);

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateTweet() {
  const tip = pickRandom(tips);
  const hashtags = ['#LegalHelpChile', '#DerechoChileno', '#AbogadosChile', '#Justicia'];
  const lines = [
    tip.hook,
    '',
    tip.body,
    '',
    tip.cta,
    '',
    pickRandom(hashtags) + ' ' + pickRandom(hashtags),
  ];
  return lines.join('\n').slice(0, 280);
}

export function generateInstagramCaption() {
  const tip = pickRandom(tips);
  return `${tip.hook}\n\n${tip.body}\n\n${tip.cta}\n\n#LegalHelpChile #DerechoChileno #${tip.category.replace(/\s/g, '')} #Chile #Abogados #Justicia`;
}

export function generateTikTokScript() {
  const tip = pickRandom(tips);
  return {
    hook: tip.hook,
    script: [
      `🎬 TEXTO EN PANTALLA: "${tip.hook}"`,
      '',
      '🎙️ VOZ: ' + tip.title + '. ' + tip.body,
      '',
      '📋 PUNTOS CLAVE:',
      ...tip.body.split('. ').filter(Boolean).map(p => `  → ${p.trim()}.`),
      '',
      '👆 TEXTO FINAL: ' + tip.cta,
    ].join('\n'),
    caption: generateInstagramCaption(),
    duration: '45-60 segundos',
  };
}

export function generateFacebookPost() {
  const tip = pickRandom(tips);
  const lines = [
    `📌 ${tip.title}`,
    '',
    tip.hook,
    '',
    tip.body,
    '',
    '👇',
    tip.cta,
    '',
    '💬 ¿Te pasó? Comentanos tu caso.',
    '❤️ Si te sirvió, compartí este post.',
  ];
  return lines.join('\n');
}

// ── CLI ──
if (process.argv[1]?.includes('generate.js')) {
  const type = process.argv[2] || 'tweet';
  const output = {
    tweet: generateTweet,
    instagram: generateInstagramCaption,
    tiktok: generateTikTokScript,
    facebook: generateFacebookPost,
  };
  console.log('─'.repeat(40));
  console.log(`📱 CONTENIDO GENERADO: ${type.toUpperCase()}\n`);
  console.log(output[type]());
  console.log('\n' + '─'.repeat(40));
}
