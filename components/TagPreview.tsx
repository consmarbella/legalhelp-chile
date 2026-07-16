'use client';

import { useState } from 'react';

interface TagPreviewProps {
  headText: string;
  bodyText: string;
  fullText: string;
  paid: boolean;
  comunaName: string;
  onPayClick: () => void;
  paymentLoading: boolean;
  couponCode: string;
  onCouponChange: (code: string) => void;
  documentUrl: string | null;
  generating: boolean;
  isBatch?: boolean;
  totalCobro?: number;
  totalMultas?: number;
}

export default function TagPreview({
  headText, bodyText, fullText, paid, comunaName,
  onPayClick, paymentLoading, couponCode, onCouponChange,
  documentUrl, generating, isBatch, totalCobro, totalMultas
}: TagPreviewProps) {
  const isBypassed = couponCode === '4321';
  const isUnlocked = paid || isBypassed;
  
  const formattedPrice = totalCobro ? totalCobro.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }) : '$15.990';

  return (
    <div className="glass-panel rounded-2xl overflow-hidden flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#60a5fa]/15 bg-[#0d1426]/60">
        <div className="flex items-center gap-2">
          <span className="window-dot bg-[#ff5f57]" />
          <span className="window-dot bg-[#febc2e]" />
          <span className="window-dot bg-[#28c840]" />
          <span className="hud-label text-[#9ab0cc] ml-2">escrito_prescr_tag.doc</span>
        </div>
        {fullText && !paid && (
          <span className={`hud-label flex items-center gap-1.5 ${isBypassed ? 'text-emerald-400' : 'text-yellow-400'}`}>
            <span className={`w-2 h-2 rounded-full ${isBypassed ? 'bg-emerald-400' : 'bg-yellow-400'}`} />
            {isBypassed ? 'BYPASS ADMIN' : 'BLOQUEADO'}
          </span>
        )}
        {fullText && paid && (
          <span className="hud-label text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> DESBLOQUEADO
          </span>
        )}
      </div>

      <div
        className="flex-1 overflow-y-auto bg-white px-8 py-7"
        style={{ minHeight: '450px', maxHeight: '540px', position: 'relative' }}
      >
        {!fullText ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-[#9ab0cc] text-sm text-center">
              Preview del Escrito de Prescripción TAG
              <br />
              <span className="text-xs text-[#7a90aa]">
                Completa los pasos del asistente para ver el documento en vivo.
              </span>
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Documento A4 */}
            <div className="max-w-[210mm] mx-auto" style={{ fontFamily: '"Times New Roman", Times, Georgia, serif' }}>
              {/* Encabezado visible siempre */}
              <div className="text-justify leading-relaxed" style={{ color: '#1a1a1a', fontSize: '12pt' }}>
                {renderDocumentText(headText)}
              </div>

              {/* Cuerpo con blur condicional */}
              <div
                className={`relative ${!isUnlocked ? 'paywall-blur-body' : ''}`}
                style={{ color: '#1a1a1a', fontSize: '12pt' }}
              >
                {renderDocumentText(bodyText)}
              </div>
            </div>

            {/* Paywall overlay */}
            {!isUnlocked && (
              <div className="paywall-overlay">
                <div className="paywall-card">
                  <div className="text-4xl mb-3">📄</div>
                  <h3 className="text-white font-bold text-lg mb-2">
                    Escrito de Defensa Listo para Descarga
                  </h3>
                  <p className="text-gray-300 text-sm mb-3 text-center leading-relaxed">
                    {isBatch ? (
                      <>Hemos redactado los documentos formales de prescripción para <strong className="text-white">{totalMultas || 0} multas</strong> en <strong className="text-white">{comunaName || 'varias comunas'}</strong>.</>
                    ) : (
                      <>Hemos redactado el documento formal de prescripción optimizado para el <strong className="text-white">Juzgado de Policía Local de {comunaName || 'tu comuna'}</strong>.</>
                    )}
                  </p>
                  <div className="text-3xl font-bold text-[#00d4ff] mb-4">
                    {formattedPrice}
                    <span className="text-xs text-gray-400 block font-normal">{isBatch ? 'Pago único · Múltiples Juzgados' : 'Pago único · Sin suscripción'}</span>
                  </div>
                  <button
                    onClick={onPayClick}
                    disabled={paymentLoading || generating}
                    className="w-full bg-[#00d4ff] hover:bg-[#22ddff] disabled:bg-[#2a3550] disabled:text-[#7a90aa] text-[#05070f] font-bold py-3.5 px-8 rounded-xl text-sm transition shadow-[0_0_25px_rgba(0,212,255,0.4)]"
                  >
                    {paymentLoading ? 'Procesando...' : generating ? 'Generando...' : '💳 Desbloquear Descarga Oficial'}
                  </button>

                  {/* Bypass code input (hidden under paywall) */}
                  <div className="mt-4 pt-3 border-t border-white/10">
                    <label className="text-[10px] text-gray-500 block mb-1">¿Tienes un código?</label>
                    <input
                      type="text"
                      value={couponCode}
                      onChange={e => onCouponChange(e.target.value)}
                      placeholder="Ingresa código de descuento"
                      maxLength={10}
                      className="w-full bg-[#05070f]/60 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 border border-[#c9a84c]/40 focus:outline-none focus:border-[#c9a84c] text-center"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Botones de descarga - solo si desbloqueado */}
        {isUnlocked && fullText && (
          <div className="mt-5 text-center flex flex-col gap-2">
            <a
              href={documentUrl || '#'}
              download={documentUrl ? (isBatch ? 'escritos-prescripcion-tag.zip' : 'escrito-prescripcion-tag.docx') : undefined}
              className={`inline-block font-bold py-3 px-8 rounded-xl text-sm transition ${
                documentUrl
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-[#2a3550] text-[#7a90aa] cursor-not-allowed'
              }`}
            >
              ⬇️ Descargar Documento{isBatch ? 's (.zip)' : ' (.docx)'}
            </a>
            {!documentUrl && (
              <p className="text-xs text-[#7a90aa]">
                Haz clic en "Generar" para habilitar la descarga
              </p>
            )}
          </div>
        )}

        {isBypassed && fullText && (
          <div className="mt-3 px-3 py-2 bg-yellow-900/30 border border-yellow-500/30 rounded-xl text-center">
            <p className="text-yellow-400 text-[10px] font-mono">
              ⚠ MODO ADMIN: Bypass activado · Código 4321
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        .paywall-blur-body {
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
          background: rgba(5, 7, 15, 0.6);
          backdrop-filter: blur(3px);
        }
        .paywall-card {
          background: rgba(13, 20, 38, 0.96);
          border: 1px solid rgba(0, 212, 255, 0.3);
          border-radius: 16px;
          padding: 28px 24px;
          max-width: 340px;
          width: 90%;
          text-align: center;
          box-shadow: 0 0 50px rgba(0, 212, 255, 0.2);
        }
      `}</style>
    </div>
  );
}

function renderDocumentText(text: string): React.ReactNode {
  return text.split('\n').map((line, i) => {
    if (!line.trim()) return <br key={i} />;
    return (
      <p key={i} className="text-justify leading-relaxed mb-1">
        {line}
      </p>
    );
  });
}
