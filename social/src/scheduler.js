import cron from 'node-cron';
import { generateTweet, generateFacebookPost, generateInstagramCaption, generateTikTokScript } from './generate.js';
import { postTweet } from './clients/twitter.js';

console.log('⏰ LegalHelp Scheduler iniciado');
console.log('');

const schedule = {
  twitter: '0 10 * * 1,3,5',    // Lun, Mie, Vie a las 10:00
  facebook: '0 12 * * 2,4',     // Mar, Jue a las 12:00
  instagram: '0 14 * * 6',      // Sáb a las 14:00
  tiktok: '0 16 * * 1',         // Lun a las 16:00
};

// Twitter
if (process.env.TWITTER_API_KEY) {
  cron.schedule(schedule.twitter, async () => {
    console.log(`[${new Date().toISOString()}] Publicando tweet...`);
    try {
      const tweet = generateTweet();
      await postTweet(tweet);
    } catch (err) {
      console.error('Error en tweet programado:', err.message);
    }
  });
  console.log(`🐦 Twitter: ${schedule.twitter}`);
} else {
  console.log('🐦 Twitter: desactivado (sin API key)`);
}

// Facebook
if (process.env.META_PAGE_ACCESS_TOKEN) {
  cron.schedule(schedule.facebook, () => {
    console.log(`[${new Date().toISOString()}] Contenido Facebook generado:`);
    console.log(generateFacebookPost());
    console.log('');
  });
  console.log(`📘 Facebook: ${schedule.facebook}`);
} else {
  console.log('📘 Facebook: desactivado (sin token)`);
}

// Instagram
if (process.env.META_PAGE_ACCESS_TOKEN) {
  cron.schedule(schedule.instagram, () => {
    console.log(`[${new Date().toISOString()}] Contenido Instagram generado:`);
    console.log(generateInstagramCaption());
    console.log('');
  });
  console.log(`📸 Instagram: ${schedule.instagram}`);
} else {
  console.log('📸 Instagram: desactivado (sin token)`);
}

// TikTok
cron.schedule(schedule.tiktok, () => {
  console.log(`[${new Date().toISOString()}] Script TikTok generado:`);
  const script = generateTikTokScript();
  console.log(script.script);
  console.log('');
});

console.log('');
console.log('✅ Scheduler corriendo. Presioná Ctrl+C para detener.');
