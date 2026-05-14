import ChatGenerator from '@/components/ChatGenerator';
import paginas from '@/data/paginas.json';
import { notFound } from 'next/navigation';
import Link from 'next/link';

type Pagina = (typeof paginas)[number];

export async function generateStaticParams() {
  return paginas.map((p) => ({ slug: p.slug }));
}

const BASE_URL = 'https://legalhelp.cl';

// FAQ por categoría legal — para FAQPage JSON-LD (AI Overviews eligibility)
const FAQ_BY_CATEGORY: Record<string, { q: string; a: string }[]> = {
  'Prescripción de deuda TAG': [
    { q: '¿Qué es la prescripción de deuda TAG?', a: 'La prescripción extingue la obligación de pago de multas TAG cuando han transcurrido 3 años sin que se haya iniciado un cobro judicial, según el Art. 2515 del Código Civil chileno.' },
    { q: '¿Cuánto tarda en prescribir una deuda TAG?', a: 'La acción ejecutiva prescribe en 3 años desde la fecha del cobro. Pasado ese plazo, podés alegar la prescripción ante el tribunal civil competente.' },
    { q: '¿Puedo presentar la solicitud de prescripción sin abogado?', a: 'En Chile, para alegar prescripción ante tribunal se requiere patrocinio de abogado. LegalHelp genera el documento base que luego podés presentar con asistencia legal o a través de las Corporaciones de Asistencia Judicial.' },
    { q: '¿Qué información necesito para generar el documento?', a: 'Necesitás tu RUT, el número de infracción o documento de cobro TAG, la fecha de la multa y el nombre del juzgado civil de tu comuna.' },
  ],
  'Prescripción de deuda bancaria': [
    { q: '¿Cuándo prescribe una deuda bancaria en Chile?', a: 'La acción ejecutiva para cobrar una deuda bancaria prescribe a los 3 años (Art. 2515 CC) y la acción ordinaria a los 5 años desde que la deuda se hizo exigible.' },
    { q: '¿Qué pasa si el banco no ha demandado en 3 años?', a: 'Si transcurrieron 3 años sin acción judicial del banco, podés alegar la prescripción extintiva como excepción ante el tribunal o mediante demanda declarativa.' },
    { q: '¿La prescripción bancaria se aplica a todas las deudas?', a: 'Sí, aplica a deudas de tarjetas de crédito, créditos de consumo, líneas de crédito y otros productos bancarios, salvo hipotecas que tienen plazos distintos.' },
    { q: '¿Qué documento genera LegalHelp para prescripción bancaria?', a: 'LegalHelp genera el escrito de excepción de prescripción o la demanda declarativa de prescripción, personalizado con tus datos, el monto, banco y juzgado correspondiente.' },
  ],
  'Demanda de alimentos': [
    { q: '¿Quién puede demandar alimentos en Chile?', a: 'Los hijos menores de edad, hijos mayores con necesidades especiales, el cónyuge o conviviente civil que no puede mantenerse por sus propios medios, y ascendientes en situación de necesidad.' },
    { q: '¿Ante qué tribunal se presenta la demanda de alimentos?', a: 'La demanda se presenta ante el Juzgado de Familia del domicilio del demandante o del demandado, según elija quien demanda.' },
    { q: '¿Cuánto tiempo tarda el proceso de alimentos?', a: 'Una vez presentada la demanda, el tribunal puede fijar alimentos provisorios en días. El proceso completo suele durar entre 2 y 6 meses.' },
    { q: '¿Qué porcentaje del sueldo corresponde pagar en alimentos?', a: 'La ley no fija un porcentaje único. El tribunal evalúa las necesidades del alimentario y la capacidad económica del alimentante, pero habitualmente oscila entre el 25 % y el 40 % del ingreso.' },
  ],
  'Denuncia por despido injustificado': [
    { q: '¿Qué es el despido injustificado en Chile?', a: 'El despido injustificado ocurre cuando el empleador termina el contrato de trabajo sin una causa legal válida contemplada en el Art. 159, 160 o 161 del Código del Trabajo.' },
    { q: '¿Cuánto tiempo tengo para denunciar un despido injustificado?', a: 'El plazo para interponer la denuncia ante la Inspección del Trabajo o la demanda ante el Juzgado de Letras del Trabajo es de 60 días hábiles desde la fecha del despido.' },
    { q: '¿Qué indemnización corresponde por despido injustificado?', a: 'Corresponde indemnización por años de servicio (un mes de remuneración por año trabajado) más el 30 % de recargo en caso de despido injustificado declarado por tribunal.' },
    { q: '¿Puedo presentar la denuncia en la Inspección del Trabajo sin abogado?', a: 'Sí. La denuncia ante la Inspección del Trabajo no requiere abogado. LegalHelp genera el escrito de denuncia con todos los datos necesarios para presentarlo directamente.' },
  ],
  'Recurso de protección': [
    { q: '¿Qué es el recurso de protección?', a: 'Es una acción constitucional consagrada en el Art. 20 de la Constitución chilena que protege los derechos fundamentales ante actos u omisiones ilegales o arbitrarios que los vulneren.' },
    { q: '¿Cuánto tiempo tengo para interponer un recurso de protección?', a: 'El plazo es de 30 días corridos desde el acto u omisión, o desde que se tomó conocimiento del mismo, según el Auto Acordado de la Corte Suprema.' },
    { q: '¿Ante qué tribunal se presenta el recurso de protección?', a: 'Se presenta ante la Corte de Apelaciones del domicilio del afectado o del lugar donde ocurrió el acto que vulnera el derecho.' },
    { q: '¿Qué derechos protege el recurso de protección?', a: 'Protege derechos como la libertad personal, la igualdad ante la ley, el derecho a la vida, la propiedad, la libertad de trabajo y otros derechos del Art. 19 de la Constitución (excepto el Art. 19 N° 3 inciso 5° y N° 12).' },
  ],
  'Carta reclamo SERNAC': [
    { q: '¿Para qué sirve una carta reclamo al SERNAC?', a: 'La carta reclamo SERNAC notifica formalmente al proveedor que ha vulnerado tus derechos como consumidor y sirve como respaldo para escalar el reclamo a mediación o juicio si no hay respuesta.' },
    { q: '¿El SERNAC puede obligar al proveedor a responder?', a: 'SERNAC puede mediar entre el consumidor y la empresa. Si no hay acuerdo, puede interponer demanda colectiva o asesorarte para que presentes una demanda individual ante el Juzgado de Policía Local.' },
    { q: '¿Cuánto tiempo tiene la empresa para responder al SERNAC?', a: 'La empresa tiene un plazo de 10 días hábiles para responder al mediador del SERNAC una vez recibido el reclamo.' },
    { q: '¿Qué información debe contener la carta reclamo SERNAC?', a: 'La carta debe incluir tus datos, la empresa reclamada, descripción del hecho, fecha, número de transacción o contrato, y la solución que solicitas (reembolso, reposición, indemnización, etc.).' },
  ],
  'Demanda de desalojo por no pago': [
    { q: '¿Cuándo puedo demandar el desalojo por no pago de arriendo?', a: 'Podés demandar cuando el arrendatario tiene dos o más meses de arriendo impago, según la Ley 18.101 sobre arrendamiento de predios urbanos.' },
    { q: '¿Qué tribunal conoce la demanda de desalojo en Chile?', a: 'El Juzgado de Letras en lo Civil del lugar donde está ubicado el inmueble arrendado.' },
    { q: '¿Cuánto tarda un proceso de desalojo en Chile?', a: 'Con la reforma de la Ley 21.461 (Devuélveme Mi Casa), el proceso puede durar entre 2 y 6 meses, con audiencias concentradas para acelerarlo.' },
    { q: '¿Puedo pedir lanzamiento inmediato al demandar?', a: 'Podés solicitar una medida prejudicial de restitución anticipada si acreditás el no pago. El tribunal evaluará la solicitud antes de la audiencia principal.' },
  ],
  'Denuncia por no pago de cotizaciones': [
    { q: '¿Qué es el no pago de cotizaciones previsionales?', a: 'Ocurre cuando el empleador descuenta las cotizaciones del sueldo del trabajador pero no las entera (paga) en la AFP, Isapre o Fonasa dentro de los plazos legales.' },
    { q: '¿Dónde denuncio el no pago de cotizaciones?', a: 'Ante la Inspección del Trabajo correspondiente a tu lugar de trabajo o domicilio del empleador. También podés consultar en la AFP o Isapre afectada.' },
    { q: '¿Qué sanciones enfrenta el empleador que no paga cotizaciones?', a: 'El empleador puede recibir multas, reajustes e intereses sobre las sumas no pagadas. En casos graves puede ser sancionado penalmente por el delito de apropiación indebida.' },
    { q: '¿Puedo despedirme y reclamar indemnización por no pago de cotizaciones?', a: 'Sí. El Art. 162 del Código del Trabajo establece que si el empleador no ha pagado las cotizaciones al momento del despido, ese despido es nulo y el trabajador mantiene su derecho a indemnizaciones.' },
  ],
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = paginas.find((p: Pagina) => p.slug === slug);
  if (!data) return {};
  const pageTitle = `${data.categoria}${data.variable ? ` en ${data.variable}` : ''}`;
  return {
    title: pageTitle,
    description: `${pageTitle}: documento legal válido en minutos, redactado por IA. Base: ${data.ley}. Presentar ante: ${data.entidad} (${data.direccion}).`,
    alternates: {
      canonical: `${BASE_URL}/p/${slug}`,
    },
    openGraph: {
      title: pageTitle,
      description: `${pageTitle} — documento listo en minutos. Válido ante ${data.entidad}.`,
      url: `${BASE_URL}/p/${slug}`,
      siteName: 'LegalHelp Chile',
      locale: 'es_CL',
      type: 'website',
      images: [
        {
          url: `${BASE_URL}/og-image.png`,
          width: 1200,
          height: 630,
          alt: `LegalHelp Chile — ${pageTitle}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description: `${pageTitle} — documento listo en minutos. Válido ante ${data.entidad}.`,
      images: [`${BASE_URL}/og-image.png`],
    },
  };
}

export default async function PSELanding({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = paginas.find((p: Pagina) => p.slug === slug);
  if (!data) return notFound();

  const initialContext = `${data.categoria}${data.variable ? ` en ${data.variable}` : ''}`;

  // Same-category pages for internal linking
  const relacionadas = paginas.filter(
    (p) => p.categoria === data.categoria && p.slug !== data.slug
  );

  return (
    <div className="min-h-screen bg-[#f5f3ef]" style={{ fontFamily: 'sans-serif' }}>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "LegalHelp Chile", item: BASE_URL },
              { "@type": "ListItem", position: 2, name: data.categoria, item: `${BASE_URL}/#${data.categoria}` },
              { "@type": "ListItem", position: 3, name: data.variable, item: `${BASE_URL}/p/${slug}` },
            ],
          }),
        }}
      />
      {FAQ_BY_CATEGORY[data.categoria] && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: FAQ_BY_CATEGORY[data.categoria].map(({ q, a }) => ({
                "@type": "Question",
                name: q,
                acceptedAnswer: { "@type": "Answer", text: a },
              })),
            }),
          }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LegalService",
            name: `${data.categoria} en ${data.variable}`,
            description: `Servicio de generación de documentos legales para ${data.categoria.toLowerCase()} en ${data.variable}, Chile.`,
            provider: {
              "@type": "Organization",
              name: "LegalHelp Chile",
              url: BASE_URL,
            },
            areaServed: {
              "@type": "City",
              name: data.variable,
              address: {
                "@type": "PostalAddress",
                addressCountry: "CL",
              },
            },
            availableChannel: {
              "@type": "ServiceChannel",
              serviceUrl: `${BASE_URL}/p/${slug}`,
            },
          }),
        }}
      />

      {/* NAV */}
      <nav className="bg-[#0b1f3a] px-6 py-3 flex items-center justify-between">
        <Link href="/" className="text-white font-bold text-lg tracking-tight">
          ⚖️ LegalHelp Chile
        </Link>
        <span className="text-[#c9a84c] text-xs font-medium">🇨🇱 Documentos legales al instante</span>
      </nav>

      {/* HERO */}
      <div className="bg-[#0b1f3a] px-6 pt-10 pb-12 text-center">
        <h1 className="text-3xl font-bold text-white mb-3 leading-tight">
          {data.categoria}{data.variable ? ` en ${data.variable}` : ''}
        </h1>
        <p className="text-[#c9a84c] text-sm font-medium mb-4">
          {data.entidad}
        </p>
        <p className="text-[#a8bdd4] text-sm max-w-xl mx-auto">
          {data.variable
            ? `Si necesitás ${data.categoria.toLowerCase()} en ${data.variable}, presentá tu solicitud ante ${data.entidad} ubicado en ${data.direccion}.`
            : `${data.categoria}: presentá tu solicitud ante ${data.entidad} (${data.direccion}).`}
          {' '}Tenés un plazo de {data.plazo.toLowerCase()} según la {data.ley}.
          {' '}Describí tu caso y en minutos tenés tu documento listo para presentar.
        </p>

        {/* PILLS */}
        <div className="flex flex-wrap justify-center gap-2 mt-6">
          {[
            ...(data.variable ? [`📍 ${data.variable}`] : []),
            `⏱ Plazo: ${data.plazo}`,
            `🏛 ${data.entidad}`,
          ].map((pill) => (
            <span
              key={pill}
              className="bg-white/10 text-white text-xs px-3 py-1 rounded-full border border-white/20"
            >
              {pill}
            </span>
          ))}
        </div>

      </div>

      {/* CHAT SECTION */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-[#e8f0e9] px-6 py-3 border-b border-[#d0e0d1] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-[#2d6a4f] font-medium">
              Asistente Legal — {data.categoria}
            </span>
          </div>
          <ChatGenerator initialContext={initialContext} />
        </div>
      </div>

      {/* DISCLAIMER */}
      <div className="max-w-4xl mx-auto px-4 pb-4">
        <div className="bg-[#fef9ec] border border-[#f0d87a] rounded-xl px-5 py-3 flex gap-3 items-start">
          <span className="text-lg leading-tight mt-0.5">⚠️</span>
          <p className="text-xs text-[#7a6800] leading-relaxed">
            <strong>Aviso legal:</strong> El contenido generado por LegalHelp no constituye asesoría legal profesional ni reemplaza la orientación de un abogado habilitado. Se trata de un documento de apoyo informativo. Para casos complejos, consultá con un profesional jurídico o las Corporaciones de Asistencia Judicial.
          </p>
        </div>
      </div>

      {/* INFO BOX */}
      <div className="max-w-4xl mx-auto px-4 pb-8">
        <div className="bg-white rounded-2xl shadow-sm p-6 grid gap-4 md:grid-cols-3 text-center">
          <div>
            <div className="text-2xl mb-1">⚖️</div>
            <div className="font-semibold text-[#0b1f3a] text-sm mb-1">Base legal</div>
            <div className="text-xs text-[#8a7f72]">{data.ley}</div>
          </div>
          <div>
            <div className="text-2xl mb-1">🏛</div>
            <div className="font-semibold text-[#0b1f3a] text-sm mb-1">Dónde presentarlo</div>
            <div className="text-xs text-[#8a7f72]">{data.direccion}</div>
          </div>
          <div>
            <div className="text-2xl mb-1">⏱</div>
            <div className="font-semibold text-[#0b1f3a] text-sm mb-1">Plazo</div>
            <div className="text-xs text-[#8a7f72]">{data.plazo}</div>
          </div>
        </div>
      </div>

      {/* FAQ SECTION */}
      {FAQ_BY_CATEGORY[data.categoria] && (
        <div className="max-w-4xl mx-auto px-4 pb-8">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <p className="text-xs text-[#8a7f72] uppercase tracking-wider font-semibold mb-4">
              Preguntas frecuentes — {data.categoria}
            </p>
            <div className="divide-y divide-[#f0ebe3]">
              {FAQ_BY_CATEGORY[data.categoria].map(({ q, a }) => (
                <details key={q} className="py-3 group">
                  <summary className="cursor-pointer text-sm font-semibold text-[#0b1f3a] list-none flex justify-between items-start gap-2">
                    <span>{q}</span>
                    <span className="text-[#c9a84c] font-bold text-base mt-0.5 flex-shrink-0 group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <p className="mt-2 text-xs text-[#5a5245] leading-relaxed">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* RELATED CITIES */}
      {relacionadas.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 pb-8">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <p className="text-xs text-[#8a7f72] uppercase tracking-wider font-semibold mb-3">
              {data.categoria} en otras ciudades
            </p>
            <div className="flex flex-wrap gap-2">
              {relacionadas.map((r) => (
                <Link
                  key={r.slug}
                  href={`/p/${r.slug}`}
                  className="text-xs text-[#0b1f3a] bg-[#f5f3ef] hover:bg-[#e8e2d8] px-3 py-1.5 rounded-full transition-colors"
                >
                  {r.variable}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="border-t border-[#ddd8cc] bg-[#f5f3ef] py-6">
        <div className="max-w-4xl mx-auto px-6 flex flex-wrap justify-center gap-6 text-xs text-[#9a9185]">
          {['🔒 SSL Certificado', '🇨🇱 Válido en todo Chile', '⚖ Marco legal actualizado 2026'].map((t) => (
            <span key={t}>{t}</span>
          ))}
          <span>📧 contacto@legalhelp.cl</span>
        </div>
        <div className="text-center text-xs text-[#bbb0a4] mt-3">
          <Link href="/" className="hover:text-[#0b1f3a] transition-colors">
            ← Volver al inicio
          </Link>
        </div>
      </footer>

    </div>
  );
}
