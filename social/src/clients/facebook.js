import 'dotenv/config';
import axios from 'axios';
import { generateFacebookPost } from '../generate.js';

const GRAPH_API = 'https://graph.facebook.com/v19.0';

export async function postToFacebook(message) {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  const pageId = process.env.META_PAGE_ID;

  if (!token || !pageId) {
    console.warn('⚠️ META_PAGE_ACCESS_TOKEN o META_PAGE_ID no configurados');
    return;
  }

  try {
    const res = await axios.post(`${GRAPH_API}/${pageId}/feed`, {
      message,
      access_token: token,
    });
    console.log(`✅ Publicado en Facebook: ${res.data.id}`);
    return res.data;
  } catch (err) {
    console.error('❌ Error publicando en Facebook:', err.response?.data || err.message);
    throw err;
  }
}

export async function postToInstagram(caption) {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  const pageId = process.env.META_PAGE_ID;

  if (!token || !pageId) {
    console.warn('⚠️ META credenciales no configuradas');
    return;
  }

  // Instagram requiere imagen primero, después caption
  // Este es el flujo para posts con imagen
  try {
    // Obtener Instagram Business Account ID
    const accountsRes = await axios.get(`${GRAPH_API}/${pageId}`, {
      params: {
        fields: 'instagram_business_account',
        access_token: token,
      },
    });

    const igId = accountsRes.data.instagram_business_account?.id;
    if (!igId) {
      console.warn('⚠️ No hay cuenta de Instagram vinculada a esta página');
      return;
    }

    console.log(`✅ Instagram listo para publicar (cuenta: ${igId})`);
    console.log('📝 Caption generado:');
    console.log(caption);
    console.log('');
    console.log('📸 Necesitás una imagen primero. Usá: postInstagramWithImage(igId, imageUrl, caption)');

    return { igId, caption };
  } catch (err) {
    console.error('❌ Error en Instagram:', err.response?.data || err.message);
  }
}

// ── CLI ──
if (process.argv[1]?.includes('facebook.js')) {
  const mode = process.argv[2] || 'facebook';
  const content = generateFacebookPost();

  console.log('📝 Contenido a publicar:');
  console.log(content);
  console.log('');

  if (mode === 'facebook') {
    postToFacebook(content);
  } else if (mode === 'instagram') {
    postToInstagram(content);
  }
}
