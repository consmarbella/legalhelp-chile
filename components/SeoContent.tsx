'use client';

import { ComunaInfo } from '@/lib/comunasUtils';

interface SeoContentProps {
  comuna: ComunaInfo | null;
  comunaName: string;
  interlinking: { comuna: string; slug: string; url: string }[];
}

export default function SeoContent({ comuna, comunaName, interlinking }: SeoContentProps) {
  // Oculto visualmente pero visible para Google / texto estático
  if (!comuna) return null;

  return (
    <section className="w-full mt-8 px-4 pb-8" aria-label="Información legal local">
      <div className="max-w-5xl mx-auto">
        <div className="glass-panel rounded-2xl p-6">
          {/* Título estático con palabra clave local */}
          <h2 className="text-lg font-bold text-white mb-4">
            Prescripción de Deuda TAG en {comunaName}
          </h2>

          {/* Directorio del Juzgado de Policía Local */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-[#0d1426]/60 rounded-xl p-4 border border-[#60a5fa]/10">
              <h3 className="text-xs font-semibold text-[#00d4ff] uppercase tracking-wider mb-2">
                Juzgado Competente
              </h3>
              <p className="text-sm text-white font-medium">{comuna.jpl}</p>
              <p className="text-xs text-[#9ab0cc] mt-1">{comuna.direccion}</p>
              <p className="text-xs text-[#7a90aa] mt-1">{comuna.horario}</p>
              <p className="text-xs text-[#7a90aa]">{comuna.telefono}</p>
            </div>

            <div className="bg-[#0d1426]/60 rounded-xl p-4 border border-[#60a5fa]/10">
              <h3 className="text-xs font-semibold text-[#00d4ff] uppercase tracking-wider mb-2">
                Autopistas TAG en {comunaName}
              </h3>
              <ul className="text-xs text-[#9ab0cc] space-y-1">
                {comuna.autopistas.map((a, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00d4ff]/60" />
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Texto legal estático para SEO */}
          <div className="prose prose-sm max-w-none" style={{ color: '#9ab0cc' }}>
            <p className="text-xs leading-relaxed">
              Las multas de tránsito por TAG prescriben en 3 años según el Art. 24 de la Ley 18.287,
              contados desde la anotación en el Registro Civil. Para que la multa se elimine del
              Registro de Multas No Pagadas (y puedas sacar tu permiso de circulación), debes presentar
              un escrito de prescripción ante el Juzgado de Policía Local de la comuna donde se cursó
              la infracción.
            </p>
            <p className="text-xs leading-relaxed mt-3">
              Si tu multa de autopista tiene más de 3 años sin cobro judicial en {comunaName},
              la prescripción puede extinguir la deuda. Las autopistas que generan más cobros
              en esta comuna son {comuna.autopistas.join(', ')}.{' '}
              El plazo es de 3 años contados desde que el cobro apareció en el sistema.
              Si en esos 3 años no recibiste notificación judicial, tu deuda está prescrita.
            </p>
          </div>

          {/* Interlinking: Malla de enlaces a comunas relacionadas */}
          {interlinking.length > 0 && (
            <div className="mt-6 pt-4 border-t border-[#60a5fa]/10">
              <h3 className="text-xs font-semibold text-[#00d4ff] uppercase tracking-wider mb-3">
                {comuna.sector === 'oriente'
                  ? 'Comunas del Sector Oriente'
                  : 'Comunas Relacionadas'}
              </h3>
              <div className="flex flex-wrap gap-2">
                {interlinking.map((link) => (
                  <a
                    key={link.slug}
                    href={link.url}
                    className="inline-block px-3 py-1.5 rounded-lg text-xs bg-[#0d1426]/60 border border-[#60a5fa]/15 text-[#9ab0cc] hover:border-[#00d4ff]/40 hover:text-white transition-all"
                  >
                    Prescripción TAG en {link.comuna}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
