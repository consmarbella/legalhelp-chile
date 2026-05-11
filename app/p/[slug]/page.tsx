import ChatGenerator from '@/components/ChatGenerator';
import paginas from '@/data/paginas.json';
import { notFound } from 'next/navigation';
import Link from 'next/link';

type Pagina = (typeof paginas)[number];

export async function generateStaticParams() {
  return paginas.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = paginas.find((p: Pagina) => p.slug === slug);
  if (!data) return {};
  return {
    title: `${data.categoria} en ${data.variable} | LegalHelp Chile`,
    description: `Redactá tu ${data.categoria.toLowerCase()} en ${data.variable} en minutos. Documento legal válido, redactado por IA con base en la ${data.ley}. ${data.entidad}.`,
  };
}

export default async function PSELanding({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = paginas.find((p: Pagina) => p.slug === slug);
  if (!data) return notFound();

  const initialContext = `${data.categoria} en ${data.variable}`;

  return (
    <div className="min-h-screen bg-[#f5f3ef]" style={{ fontFamily: 'sans-serif' }}>

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
          {data.categoria} en {data.variable}
        </h1>
        <p className="text-[#c9a84c] text-sm font-medium mb-4">
          {data.entidad}
        </p>
        <p className="text-[#a8bdd4] text-sm max-w-xl mx-auto">
          Describí tu caso y en minutos tenés tu documento listo para presentar.
          Válido según la {data.ley}.
        </p>

        {/* PILLS */}
        <div className="flex flex-wrap justify-center gap-2 mt-6">
          {[
            `📍 ${data.variable}`,
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
