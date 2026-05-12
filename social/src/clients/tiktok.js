import 'dotenv/config';
import axios from 'axios';
import { generateTikTokScript } from '../generate.js';

export async function publishTikTokVideo() {
  const token = process.env.TIKTOK_ACCESS_TOKEN;
  if (!token) {
    console.warn('⚠️ TIKTOK_ACCESS_TOKEN no configurado');
    return;
  }

  try {
    // TikTok requiere subir video via API (limitado)
    // Este es un placeholder para cuando tengas el token
    const script = generateTikTokScript();
    console.log('📝 Script de TikTok generado:');
    console.log('');
    console.log('='.repeat(50));
    console.log(script.script);
    console.log('='.repeat(50));
    console.log('');
    console.log('📱 Caption:');
    console.log(script.caption);
    console.log('');
    console.log('⏱ Duración estimada:', script.duration);
    console.log('');
    console.log('⚠️ TikTok API requiere subir video manualmente o mediante partner aprobado.');
    console.log('📤 Usá este script para grabar el video y subilo manualmente.');

    return script;
  } catch (err) {
    console.error('❌ Error en TikTok:', err.message);
  }
}

// ── CLI ──
if (process.argv[1]?.includes('tiktok.js')) {
  publishTikTokVideo();
}
