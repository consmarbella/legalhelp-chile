import 'dotenv/config';
import { generateTweet, generateInstagramCaption, generateTikTokScript, generateFacebookPost } from './generate.js';
import { postTweet } from './clients/twitter.js';

const MODE = process.argv[2] || 'all';

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log('║   LegalHelp Chile - Social Automator ║');
  console.log('╚══════════════════════════════════════╝');
  console.log('');

  if (MODE === 'tweet' || MODE === 'all') {
    const tweet = generateTweet();
    console.log('───── TWITTER ─────');
    console.log(tweet);

    if (process.env.TWITTER_API_KEY) {
      try {
        await postTweet(tweet);
      } catch (e) {
        console.error('Error en Twitter:', e.message);
      }
    } else {
      console.log('⚠️ TWITTER_API_KEY no configurada. Solo se muestra el contenido.\n');
    }
  }

  if (MODE === 'facebook' || MODE === 'all') {
    console.log('───── FACEBOOK ─────');
    const fb = generateFacebookPost();
    console.log(fb);

    if (!process.env.META_PAGE_ACCESS_TOKEN) {
      console.log('⚠️ META_PAGE_ACCESS_TOKEN no configurada.\n');
    }
  }

  if (MODE === 'instagram' || MODE === 'all') {
    console.log('───── INSTAGRAM ─────');
    const ig = generateInstagramCaption();
    console.log(ig);

    if (!process.env.META_PAGE_ACCESS_TOKEN) {
      console.log('⚠️ META_PAGE_ACCESS_TOKEN no configurada.\n');
    }
  }

  if (MODE === 'tiktok' || MODE === 'all') {
    console.log('───── TIKTOK ─────');
    const tt = generateTikTokScript();
    console.log(tt.script);
    console.log('');
    console.log('Caption:', tt.caption);
    console.log('Duración:', tt.duration);
  }

  console.log('');
  console.log('✅ Contenido generado correctamente');
}

main();
