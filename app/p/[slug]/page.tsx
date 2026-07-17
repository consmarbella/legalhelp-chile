// ─────────────────────────────────────────────────────────────────────────────
// Página SEO dinámica: /p/[slug]
// Sirve las páginas de paginas.json, con atención especial a TAG por comuna.
// ─────────────────────────────────────────────────────────────────────────────

import { Metadata } from 'next';
import pags from '@/data/paginas.json';
import { getComunaBySlug, extractComunaFromSlug, getInterlinkingForComuna, slugToComunaName } from '@/lib/comunasUtils';
import TagPageClient from './TagPageClient';

// ─── GENERATE STATIC PARAMS ─────────────────────────────────────────────────
export function generateStaticParams() {
  return pags.map((p) => ({ slug: p.slug }));
}

// ─── METADATA DINÁMICA ──────────────────────────────────────────────────────
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const extracted = extractComunaFromSlug(slug);

  // TAG por comuna
  if (extracted.esTAG && extracted.comunaName) {
    const comunaInfo = getComunaBySlug(extracted.comunaSlug);
    const autopistasStr = comunaInfo?.autopistas?.join(', ') || '';
    const jpl = comunaInfo?.jpl || `Juzgado de Policía Local de ${extracted.comunaName}`;

    return {
      title: `Prescripción de Deuda TAG en ${extracted.comunaName} – LegalHelp Chile`,
      description: `¿Tienes multas TAG sin pagar en ${extracted.comunaName}?${autopistasStr ? ` Autopistas: ${autopistasStr}.` : ''} Redactamos tu escrito de prescripción para el ${jpl}. Sin abogado.`,
      alternates: { canonical: `https://legalhelp.cl/p/${slug}` },
      openGraph: {
        title: `Prescripción TAG · ${extracted.comunaName}`,
        description: `Escrito de prescripción para multas TAG en ${extracted.comunaName}. Listo para presentar en ${jpl}.`,
        url: `https://legalhelp.cl/p/${slug}`,
      },
    };
  }

  // Página normal
  const pagina = pags.find((p) => p.slug === slug);
  if (pagina) {
    return {
      title: `${pagina.categoria} – LegalHelp Chile`,
      description: pagina.ley ? `Documento legal: ${pagina.categoria}. ${pagina.ley.substring(0, 160)}` : undefined,
      alternates: { canonical: `https://legalhelp.cl/p/${slug}` },
    };
  }

  return { title: 'LegalHelp Chile – Documentos legales' };
}

// ─── PAGE COMPONENT ─────────────────────────────────────────────────────────
import { redirect } from 'next/navigation';

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Intentar extraer comuna TAG
  const extracted = extractComunaFromSlug(slug);
  const comunaInfo = extracted.esTAG && extracted.comunaSlug
    ? getComunaBySlug(extracted.comunaSlug)
    : null;

  // Si no es TAG, redirigir al home por ahora (Piloto de 5 templates no tiene pSEO individual aún)
  if (!extracted.esTAG) {
    redirect('/');
  }

  return (
    <TagPageClient
      slug={slug}
      comunaSlug={extracted.esTAG ? extracted.comunaSlug : ''}
      comunaName={extracted.esTAG ? extracted.comunaName : ''}
      jplDireccion={comunaInfo?.direccion || ''}
      jplTelefono={comunaInfo?.telefono || ''}
      jplHorario={comunaInfo?.horario || ''}
      comunaInfo={JSON.parse(JSON.stringify(comunaInfo || null))}
      interlinking={extracted.esTAG ? getInterlinkingForComuna(extracted.comunaSlug) : []}
    />
  );
}
