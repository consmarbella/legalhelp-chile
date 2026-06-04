import { MetadataRoute } from 'next';
import paginas from '@/data/paginas.json';

const BASE_URL = 'https://legalhelp.cl';

const HUBS = [
  'alzamiento-de-embargo-sobre-vehiculo',
  'carta-reclamo-sernac',
  'certificado-de-antecedentes-para-fines-especiales',
  'demanda-de-alimentos',
  'demanda-de-desalojo-por-no-pago',
  'denuncia-por-despido-injustificado',
  'denuncia-por-no-pago-de-cotizaciones',
  'eliminacion-de-antecedentes-penales',
  'limpieza-de-hoja-de-vida-del-conductor',
  'omision-de-antecedentes-por-violencia-intrafamiliar',
  'poder-simple-notarial',
  'prescripcion-de-deuda-tag',
  'prescripcion-de-deuda-bancaria',
  'prescripcion-de-multas-de-transito',
  'recurso-de-proteccion',
  'registro-nacional-de-deudores-de-pensiones-de-alimentos',
  'servicios-legales',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const seen = new Set<string>();
  const pages: MetadataRoute.Sitemap = paginas
    .filter((p) => HUBS.includes(p.slug) && !seen.has(p.slug) && seen.add(p.slug))
    .map((p) => ({
      url: `${BASE_URL}/p/${p.slug}`,
      lastModified: new Date('2026-05-01'),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date('2026-05-01'),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    ...pages,
  ];
}
