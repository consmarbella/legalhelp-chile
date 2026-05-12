/**
 * Posteador Automatico para Redes Sociales
 * Usa Playwright + Edge para publicar contenido generado
 * 
 * Uso:
 *   node scripts/postear-redes.js twitter    # Postea solo Twitter
 *   node scripts/postear-redes.js instagram  # Postea solo Instagram
 *   node scripts/postear-redes.js all        # Postea todas
 */

import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_DIR = join(__dirname, '..');
const SOCIAL_DIR = join(REPO_DIR, 'social');
const DESKTOP_DIR = 'C:\\Users\\matte\\OneDrive\\Escritorio\\legalhelp-pseo-contenido';
const SOCIALES_DIR = join(DESKTOP_DIR, 'sociales');
const SESSION_DIR = join(SOCIAL_DIR, 'session');

if (!existsSync(SESSION_DIR)) mkdirSync(SESSION_DIR, { recursive: true });

// Cargar credenciales
let env = {};
const envPath = join(SOCIAL_DIR, '.env');
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const [k, ...v] = line.split('=');
    if (k && v.length) env[k.trim()] = v.join('=').trim();
  }
}

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function loadSocialContent(platform) {
  const files = {
    twitter: 'tweets.json',
    instagram: 'instagram.json',
    facebook: 'facebook.json',
    tiktok: 'tiktok.json',
  };
  const file = join(SOCIALES_DIR, files[platform]);
  if (!existsSync(file)) {
    console.log(`  ⚠️  Archivo no encontrado: ${file}`);
    console.log(`  Primero ejecuta: node scripts/generar-contenido.js`);
    return [];
  }
  return JSON.parse(readFileSync(file, 'utf-8'));
}

// ── POSTEADORES ──

async function postearTwitter(contenido) {
  console.log('  🐦 Posteando a Twitter/X...');
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: false, channel: 'msedge' });
  const context = await browser.newContext({
    storageState: join(SESSION_DIR, 'twitter.json'),
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
  const page = await context.newPage();

  try {
    await page.goto('https://twitter.com/i/flow/login', { waitUntil: 'networkidle' });
    
    // Login if needed
    if (page.url().includes('login')) {
      const user = env.TWITTER_USER;
      const pass = env.TWITTER_PASS;
      if (!user || !pass) {
        console.log('  ⚠️  No hay credenciales de Twitter en .env');
        await browser.close();
        return;
      }
      await page.fill('input[autocomplete="username"]', user);
      await page.click('text=Siguiente');
      await page.waitForTimeout(2000);
      await page.fill('input[type="password"]', pass);
      await page.click('text=Iniciar sesion');
      await page.waitForTimeout(5000);
      console.log('  ✅ Login exitoso');
      await context.storageState({ path: join(SESSION_DIR, 'twitter.json') });
    }

    // Postear primer tweet
    const first = contenido[0];
    if (first) {
      await page.goto('https://twitter.com/compose/tweet', { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      await page.fill('[data-testid="tweetTextarea_0"]', first.tweet.slice(0, 280));
      await page.click('[data-testid="tweetButton"]');
      await page.waitForTimeout(3000);
      console.log(`  ✅ Tweet publicado: ${first.categoria} en ${first.variable}`);
    }
  } catch (err) {
    console.log(`  ❌ Error: ${err.message.slice(0, 100)}`);
  }

  await browser.close();
}

async function postearInstagram(contenido) {
  console.log('  📸 Posteando a Instagram...');
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: false, channel: 'msedge' });
  const context = await browser.newContext({
    storageState: join(SESSION_DIR, 'instagram.json'),
  });
  const page = await context.newPage();

  try {
    await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    if (page.url().includes('accounts/login') || page.url().includes('login')) {
      const user = env.INSTAGRAM_USER;
      const pass = env.INSTAGRAM_PASS;
      if (!user || !pass) {
        console.log('  ⚠️  No hay credenciales de Instagram en .env');
        await browser.close();
        return;
      }
      await page.fill('input[name="username"]', user);
      await page.fill('input[name="password"]', pass);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);
      console.log('  ✅ Login exitoso');
      await context.storageState({ path: join(SESSION_DIR, 'instagram.json') });
    }

    // Publicar caption (Instagram requiere imagen, mostrar instrucciones)
    console.log('');
    console.log('  ⚠️  Instagram requiere imagen + caption');
    console.log('  El caption generado esta listo abajo.');
    console.log('  Subi manualmente la imagen y usa este caption:');
    console.log('');
    console.log('  ─── CAPTION ───');
    console.log(contenido[0]?.caption.slice(0, 300) || '');

  } catch (err) {
    console.log(`  ❌ Error: ${err.message.slice(0, 100)}`);
  }

  await browser.close();
}

async function postearFacebook(contenido) {
  console.log('  📘 Posteando a Facebook...');
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: false, channel: 'msedge' });
  const context = await browser.newContext({
    storageState: join(SESSION_DIR, 'facebook.json'),
  });
  const page = await context.newPage();

  try {
    await page.goto('https://www.facebook.com/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    if (page.url().includes('login')) {
      const user = env.FACEBOOK_USER;
      const pass = env.FACEBOOK_PASS;
      if (!user || !pass) {
        console.log('  ⚠️  No hay credenciales de Facebook en .env');
        await browser.close();
        return;
      }
      await page.fill('input[name="email"]', user);
      await page.fill('input[name="pass"]', pass);
      await page.click('button[name="login"]');
      await page.waitForTimeout(5000);
      console.log('  ✅ Login exitoso');
      await context.storageState({ path: join(SESSION_DIR, 'facebook.json') });
    }

    // Mostrar post para copiar
    console.log('');
    console.log('  📝 Post generado. Pegalo en tu muro de Facebook:');
    console.log('');
    console.log('  ─── POST ───');
    console.log(contenido[0]?.post.slice(0, 500) || '');

  } catch (err) {
    console.log(`  ❌ Error: ${err.message.slice(0, 100)}`);
  }

  await browser.close();
}

async function postearTikTok(contenido) {
  console.log('  🎵 Preparando contenido para TikTok...');
  console.log('');
  console.log('  ⚠️  TikTok requiere video (no solo texto).');
  console.log('  El script del video esta listo. Grabalo y subilo manualmente.');
  console.log('');
  console.log('  ─── SCRIPT DEL VIDEO ───');
  console.log(contenido[0]?.script.slice(0, 400) || '');
  console.log('');
  console.log('  ─── CAPTION ───');
  console.log('  #LegalHelpChile #Chile #Derecho');
  console.log('');
}

// ── MAIN ──

const platform = process.argv[2] || 'all';
const count = parseInt(process.argv[3]) || 1;

console.log('');
console.log('╔══════════════════════════════════════╗');
console.log('║   LegalHelp - Social Auto Poster     ║');
console.log('╚══════════════════════════════════════╝');
console.log('');

const posterMap = {
  twitter: postearTwitter,
  instagram: postearInstagram,
  facebook: postearFacebook,
  tiktok: postearTikTok,
  all: async () => {
    await postearTwitter(await loadSocialContent('twitter'));
    console.log('');
    await postearInstagram(await loadSocialContent('instagram'));
    console.log('');
    await postearFacebook(await loadSocialContent('facebook'));
    console.log('');
    await postearTikTok(await loadSocialContent('tiktok'));
  }
};

const poster = posterMap[platform];
if (poster) {
  const contentFiles = {
    twitter: 'tweets.json',
    instagram: 'instagram.json',
    facebook: 'facebook.json',
    tiktok: 'tiktok.json',
  };

  if (platform === 'all') {
    poster();
  } else {
    const content = await loadSocialContent(platform);
    if (content.length > 0) {
      console.log(`📱 ${content.length} piezas cargadas`);
      console.log('');
      await poster(content.slice(0, count));
    }
  }
} else {
  console.log(`Plataforma no valida: ${platform}`);
  console.log('Usa: twitter, instagram, facebook, tiktok, all');
}

console.log('');
console.log('✅ Proceso completado');
