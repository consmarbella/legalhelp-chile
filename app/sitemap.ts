import { MetadataRoute } from 'next';
import paginas from '@/data/paginas.json';

export const dynamic = 'force-dynamic';

const BASE_URL = 'https://legalhelp.cl';

// Map categories to sitemap groups
const SILOS: Record<string, string[]> = {
  'transito': ['Alzamiento de embargo', 'Prescripción de deuda TAG', 'Prescripción de multas', 'Demanda por accidente de tránsito', 'Escrito de defensa por infracción', 'Escrito de prescripción de multa', 'Limpieza de hoja de vida'],
  'laboral': ['Denuncia por despido injustificado', 'Denuncia por no pago de cotizaciones', 'Finiquito laboral', 'Carta de despido', 'Denuncia por acoso laboral', 'Carta de renuncia laboral', 'Carta de amonestación laboral', 'Anexo de contrato de trabajo', 'Contrato de trabajo'],
  'familia': ['Demanda de alimentos', 'Acuerdo de divorcio', 'Convenio de regulación de divorcio', 'Acuerdo de tuición', 'Solicitud de régimen de visitas', 'Mediación familiar', 'Solicitud de posesión efectiva', 'Registro Nacional de Deudores de Pensiones'],
  'civil': ['Prescripción de deuda bancaria', 'Pagaré', 'Contrato de mutuo', 'Demanda de desalojo', 'Demanda por daño moral', 'Recurso de protección', 'Recurso de amparo', 'Acuerdo de pago de deuda', 'Carta de prescripción de deuda general', 'Carta de cobranza de deuda', 'Carta de cobro de arriendo', 'Solicitud de alzamiento de protesto', 'Escrito de impugnación de multa', 'Omisión de antecedentes', 'Eliminación de antecedentes', 'Certificado de antecedentes', 'Alzamiento de embargo'],
  'contratos': ['Contrato de arriendo', 'Poder', 'Mandato', 'Constitución de Sociedad SpA', 'Acuerdo de confidencialidad', 'Promesa de compraventa', 'Contrato de compraventa', 'Testamento', 'Declaración jurada', 'Carta de recomendación laboral', 'Carta de término de contrato'],
  'consumidor': ['Carta reclamo SERNAC', 'Carta reclamo Isapre', 'Carta reclamo aerolínea', 'Carta reclamo banco', 'Carta reclamo telecomunicaciones', 'Carta reclamo seguro', 'Carta reclamo retail', 'Denuncia por estafa', 'Recurso de apelación'],
};

// Map slug → category name
const CATEGORY_MAP: Record<string, string> = {};
for (const p of paginas) {
  CATEGORY_MAP[p.slug] = p.categoria;
}

// Find which silo a page belongs to
function findSilo(slug: string): string | null {
  const cat = CATEGORY_MAP[slug]?.toLowerCase() ?? '';
  for (const [silo, keywords] of Object.entries(SILOS)) {
    for (const kw of keywords) {
      if (cat.includes(kw.toLowerCase())) return silo;
    }
  }
  return null;
}

// Generate sitemap IDs for the index
export async function generateSitemaps() {
  return Object.keys(SILOS).map((id) => ({ id }));
}

// Serve each category sitemap
export default function sitemap({ id }: { id: string }): MetadataRoute.Sitemap {
  const lastMod = new Date('2026-06-09');
  const siloKeywords = SILOS[id] ?? [];
  
  const pages: MetadataRoute.Sitemap = paginas
    .filter((p) => {
      const cat = p.categoria.toLowerCase();
      return siloKeywords.some((kw) => cat.includes(kw.toLowerCase()));
    })
    .map((p) => ({
      url: `${BASE_URL}/p/${p.slug}`,
      lastModified: lastMod,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    }));

  return pages;
}
