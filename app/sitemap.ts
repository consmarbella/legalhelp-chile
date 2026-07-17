import { MetadataRoute } from 'next';
import paginas from '@/data/paginas.json';
import { isReleased } from '@/lib/release';

export const dynamic = 'force-dynamic';

const BASE_URL = 'https://legalhelp.cl';

export default function sitemap(): MetadataRoute.Sitemap {
  const seen = new Set<string>();
  const lastMod = new Date('2026-06-09');

  const pages: MetadataRoute.Sitemap = paginas
    .filter((p) => !seen.has(p.slug) && seen.add(p.slug))
    // Solo indexar las de TAG por ahora (Piloto de 5 templates no tiene páginas pSEO estáticas individuales aún)
    .filter((p) => p.slug.startsWith('prescripcion-multas-tag-'))
    // Goteo: solo páginas ya publicadas (release pasada o sin release)
    .filter((p) => isReleased((p as { release?: string }).release))
    .map((p) => ({
      url: `${BASE_URL}/p/${p.slug}`,
      lastModified: lastMod,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    }));

  return [
    {
      url: BASE_URL,
      lastModified: lastMod,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    ...pages,
  ];
}
