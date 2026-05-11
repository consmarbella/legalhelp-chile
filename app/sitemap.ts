import { MetadataRoute } from 'next';
import paginas from '@/data/paginas.json';

const BASE_URL = 'https://legalhelp.cl';

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];

  const dynamicRoutes: MetadataRoute.Sitemap = paginas.map((p) => ({
    url: `${BASE_URL}/p/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...dynamicRoutes];
}
