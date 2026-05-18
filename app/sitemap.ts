import { MetadataRoute } from 'next';
import paginas from '@/data/paginas.json';

const BASE_URL = 'https://legalhelp.cl';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date('2026-05-01');

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];

  const dynamicRoutes: MetadataRoute.Sitemap = paginas.map((p) => ({
    url: `${BASE_URL}/p/${p.slug}`,
    lastModified,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...dynamicRoutes];
}
