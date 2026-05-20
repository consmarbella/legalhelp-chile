import { MetadataRoute } from 'next';
import paginas from '@/data/paginas.json';

const BASE_URL = 'https://legalhelp.cl';

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = paginas.map((p) => ({
    url: `${BASE_URL}/p/${p.slug}`,
    lastModified: new Date('2026-05-01'),
    changeFrequency: 'weekly' as const,
    priority: p.variable ? 0.7 : 0.9,
  }));

  // Páginas estáticas principales
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date('2026-05-01'),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
  ];

  return [...staticPages, ...pages];
}
