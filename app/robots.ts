import { MetadataRoute } from 'next';

/**
 * Única fuente de verdad para /robots.txt.
 * (Se eliminó public/robots.txt porque Next.js le da prioridad a esta ruta
 *  dinámica y el archivo estático quedaba ignorado → config muerta.)
 *
 * - Buscadores: indexan todo salvo /api/ y /pago/.
 * - Bots de IA de RECUPERACIÓN (allow): visibilidad en AI Overviews, ChatGPT,
 *   Perplexity, Claude.
 * - Bots de ENTRENAMIENTO (disallow): no se autoriza el uso para entrenamiento.
 *
 * Nota: NO se bloquea /_next/ — Google necesita el CSS/JS para renderizar.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/pago/'],
      },
      // Bots de IA permitidos (recuperación / respuestas con IA)
      {
        userAgent: ['GPTBot', 'OAI-SearchBot', 'PerplexityBot', 'ClaudeBot', 'Google-Extended'],
        allow: '/',
      },
      // Bots de entrenamiento bloqueados
      {
        userAgent: ['CCBot', 'Bytespider', 'meta-externalagent'],
        disallow: '/',
      },
    ],
    sitemap: 'https://legalhelp.cl/sitemap.xml',
    host: 'https://legalhelp.cl',
  };
}
