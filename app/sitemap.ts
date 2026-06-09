import { MetadataRoute } from 'next';
import paginas from '@/data/paginas.json';

export const dynamic = 'force-dynamic';

const BASE_URL = 'https://legalhelp.cl';

const HUBS = new Set([
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
  'denuncia-acoso-laboral',
  'pagare',
  'contrato-mutuo',
  'posecion-efectiva',
  'denuncia-estafa',
  'demanda-accidente-transito',
  'carta-despido',
  'constitucion-spa',
  'demanda-dano-moral',
  'recurso-amparo',
  'mediacion-familiar',
  'testamento',
  'carta-recomendacion-laboral',
  'acuerdo-confidencialidad',
]);

export default function sitemap(): MetadataRoute.Sitemap {
  const seen = new Set<string>();
  const lastMod = new Date('2026-06-09');

  const pages: MetadataRoute.Sitemap = paginas
    .filter((p) => !seen.has(p.slug) && seen.add(p.slug))
    .map((p) => ({
      url: `${BASE_URL}/p/${p.slug}`,
      lastModified: lastMod,
      changeFrequency: (HUBS.has(p.slug) ? 'weekly' : 'monthly') as 'weekly' | 'monthly',
      priority: HUBS.has(p.slug) ? 0.9 : 0.6,
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
