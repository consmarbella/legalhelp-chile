import { MetadataRoute } from 'next';
import paginas from '@/data/paginas.json';

const BASE_URL = 'https://legalhelp.cl';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date('2026-05-19');

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];

  // Categorías principales (hubs) → priority 0.9
  const hubs = paginas.filter(p => !p.variable);
  const hubRoutes: MetadataRoute.Sitemap = hubs.map((p) => ({
    url: `${BASE_URL}/p/${p.slug}`,
    lastModified,
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }));

  // Páginas de ciudad → priority 0.7
  const cityPages = paginas.filter(p => p.variable);
  const cityRoutes: MetadataRoute.Sitemap = cityPages.map((p) => ({
    url: `${BASE_URL}/p/${p.slug}`,
    lastModified,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...hubRoutes, ...cityRoutes];
}



