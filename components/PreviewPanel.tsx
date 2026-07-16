'use client';

interface PreviewPanelProps {
  title: string;
  preview: string;
  paid: boolean;
  onPayClick: () => void;
  paymentLoading: boolean;
  documentUrl: string | null;
}

export default function PreviewPanel({
  title, preview, paid, onPayClick, paymentLoading, documentUrl,
}: PreviewPanelProps) {

  const bodyStartIndex = findBodyStart(preview);
  const headText = bodyStartIndex > 0 ? preview.slice(0, bodyStartIndex) : '';
  const bodyText = bodyStartIndex > 0 ? preview.slice(bodyStartIndex) : preview;

  return (
    <div className="glass-panel rounded-2xl overflow-hidden flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#60a5fa]/15 bg-[#0d1426]/60">
        <div className="flex items-center gap-2">
          <span className="window-dot bg-[#ff5f57]" />
          <span className="window-dot bg-[#febc2e]" />
          <span className="window-dot bg-[#28c840]" />
          <span className="hud-label text-[#9ab0cc] ml-2">vista_previa.doc</span>
        </div>
        {preview && !paid && (
          <span className="hud-label text-yellow-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-400" /> BLOQUEADO
          </span>
        )}
        {preview && paid && (
          <span className="hud-label text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> DESBLOQUEADO
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto bg-white px-7 py-6" style={{ minHeight: '400px', maxHeight: '500px', position: 'relative' }}>
        {!preview ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-[#9ab0cc] text-sm text-center">
              Preview del documento legal<br />
              <span className="text-xs text-[#7a90aa]">Completa el formulario para ver el borrador en vivo.</span>
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Documento Premium */}
            <div className="prose prose-sm max-w-none" style={{ fontFamily: '"Times New Roman", Times, serif', color: '#1a1a1a' }}>
              {headText && (
                <div className="text-justify leading-relaxed">
                  {renderDocumentText(headText)}
                </div>
              )}

              {/* Cuerpo con blur (70% inferior) */}
              <div className={`relative ${!paid ? 'paywall-blur' : ''}`}>
                {renderDocumentText(bodyText)}
              </div>
            </div>

            {/* Overlay de pago (cuando no ha pagado y hay preview) */}
            {!paid && (
              <div className="paywall-overlay">
                <div className="paywall-card">
                  <div className="text-4xl mb-3">🔒</div>
                  <h3 className="text-white font-bold text-lg mb-2">Documento Bloqueado</h3>
                  <p className="text-gray-300 text-sm mb-4 text-center">
                    Tu escrito legal está listo para descarga.<br />
                    Paga para desbloquear el documento oficial.
                  </p>
                  <button
                    onClick={onPayClick}
                    disabled={paymentLoading}
                    className="bg-[#00d4ff] hover:bg-[#22ddff] disabled:bg-[#2a3550] disabled:text-[#7a90aa] text-[#05070f] font-bold py-3 px-8 rounded-xl text-sm transition shadow-[0_0_20px_rgba(0,212,255,0.4)]"
                  >
                    {paymentLoading ? 'Procesando...' : '💳 Desbloquear Documento'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Botón descarga cuando pagado */}
        {paid && documentUrl && (
          <div className="mt-4 text-center">
            <a
              href={documentUrl}
              download
              className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-xl text-sm transition"
            >
              ⬇️ Descargar Documento Word / PDF
            </a>
          </div>
        )}
      </div>

      <style jsx>{`
        .paywall-blur {
          filter: blur(6px);
          user-select: none;
          pointer-events: none;
          transition: filter 0.3s;
        }
        .paywall-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
          background: rgba(5, 7, 15, 0.5);
          backdrop-filter: blur(2px);
        }
        .paywall-card {
          background: rgba(13, 20, 38, 0.95);
          border: 1px solid rgba(0, 212, 255, 0.3);
          border-radius: 16px;
          padding: 24px 32px;
          max-width: 320px;
          text-align: center;
          box-shadow: 0 0 40px rgba(0, 212, 255, 0.2);
        }
      `}</style>
    </div>
  );
}

// Encontrar donde empieza el cuerpo (70% inferior)
function findBodyStart(preview: string): number {
  const lines = preview.split('\n');
  const totalChars = preview.length;
  // El 70% inferior empieza después del título y materia
  let found = 0;
  let count = 0;
  for (let i = 0; i < lines.length; i++) {
    count += lines[i].length + 1;
    if (count > totalChars * 0.25) {
      found = count;
      break;
    }
  }
  return found;
}

function renderDocumentText(text: string): React.ReactNode {
  return text.split('\n').map((line, i) => {
    if (!line.trim()) return <br key={i} />;
    if (line.startsWith('### ')) return <h3 key={i} className="text-base font-bold mt-4 mb-1">{line.slice(4)}</h3>;
    if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-bold mt-5 mb-2">{line.slice(3)}</h2>;
    if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-bold mt-6 mb-3">{line.slice(2)}</h1>;
    if (line.match(/^\d+\.\s/)) return <p key={i} className="text-sm leading-relaxed mb-1 ml-4">{line}</p>;
    if (line.startsWith('**')) return <p key={i} className="text-sm font-bold leading-relaxed mb-1">{line.replace(/\*\*/g, '')}</p>;
    return <p key={i} className="text-sm leading-relaxed mb-1">{line}</p>;
  });
}
