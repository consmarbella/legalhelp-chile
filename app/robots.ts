import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/pago/'],
      },
    ],
    sitemap: 'https://legalhelp.cl/sitemap.xml',
  };
}
