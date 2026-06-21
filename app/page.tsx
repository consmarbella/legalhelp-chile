'use client';

import { useEffect, useRef, useState } from 'react';
import { downloadLegalPdf } from '@/lib/generatePdf';
import { downloadLegalDocx } from '@/lib/generateDocx';
import { CaseData, Message, DOC_TYPES, EMPTY_CASE } from '@/lib/constants';
import CourtDocument from '@/components/CourtDocument';
import DocumentPreview from '@/components/DocumentPreview';
import PaywallModal from '@/components/PaywallModal';

export default function Home() {
  const [caseData, setCaseData]         = useState<CaseData>(EMPTY_CASE);
  const [messages, setMessages]         = useState<Message[]>([]);
  const [input, setInput]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [selectedDoc, setSelectedDoc]   = useState<string | null>(null);
  const [generatedDoc, setGeneratedDoc] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc]     = useState<string | null>(null);
  const [generating, setGenerating]     = useState(false);
  const [paid, setPaid]                 = useState(false);
  const [showPaywall, setShowPaywall]   = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // When ready: generate preview automatically — DO NOT auto-open paywall
  // User sees the blurred document first and clicks "Desbloquear" to pay
  useEffect(() => {
    if (caseData.ready && !paid && !previewDoc && !generating) {
      handleGeneratePreview();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseData.ready]);

  // After payment confirmed: generate full doc
  useEffect(() => {
    if (paid && caseData.ready && !generatedDoc && !generating) {
      handleGenerate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paid, caseData.ready]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const text = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, caseHistory: messages, currentCaseData: caseData }),
      });
      if (!res.ok) throw new Error();
      const data: CaseData = await res.json();
      setCaseData(prev => ({ ...prev, ...data }));
      setMessages(prev => [...prev, { role: 'assistant', content: String(data.response_message ?? '') }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Problema al conectar. Intenta de nuevo.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePreview = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/generate-final', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(caseData),
      });
      const data = await res.json();
      if (data.document) setPreviewDoc(data.document);
    } catch {
      console.error('Error generando preview');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      // Include orderId for server-side payment verification
      const storedOrder = sessionStorage.getItem('lh_paid_order');
      const orderId = storedOrder ? JSON.parse(storedOrder)?.orderId : undefined;

      const res = await fetch('/api/generate-final', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...caseData, ...(orderId ? { orderId } : {}) }),
      });
      const data = await res.json();
      if (data.document) setGeneratedDoc(data.document);
    } catch {
      console.error('Error generando documento');
    } finally {
      setGenerating(false);
    }
  };

  // Detectar retorno exitoso desde MercadoPago (?paid=1&orderId=xxx)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('paid') === '1') {
      const stored     = sessionStorage.getItem('lh_paid_order');
      const storedCase = sessionStorage.getItem('lh_case_data');
      const storedMsgs = sessionStorage.getItem('lh_messages');
      try {
        if (storedCase) {
          setCaseData(JSON.parse(storedCase));
        }
        if (storedMsgs) {
          setMessages(JSON.parse(storedMsgs));
        }
        // Only mark as paid if we have a valid order stored from the verification flow
        if (stored) {
          const orderData = JSON.parse(stored);
          if (orderData?.orderId && orderData?.paidAt) {
            setPaid(true);
          }
        }
        setShowPaywall(false);
        window.history.replaceState({}, '', '/');
      } catch { /* ignore */ }
    }
  }, []);

  // Iniciar pago real con MercadoPago
  const handlePayment = async (plan: 'single' | 'monthly') => {
    setPaymentLoading(true);
    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // El precio se resuelve en el servidor a partir de docId (no se envía el monto)
        body: JSON.stringify({ plan, caseData, docId: selectedDoc }),
      });
      const data = await res.json();

      if (data.checkoutUrl) {
        sessionStorage.setItem('lh_case_data', JSON.stringify(caseData));
        sessionStorage.setItem('lh_messages',  JSON.stringify(messages));
        sessionStorage.setItem('lh_pending_order', data.orderId);
        window.location.href = data.checkoutUrl;
      } else {
        console.error('No checkoutUrl:', data);
      }
    } catch (err) {
      console.error('Error iniciando pago:', err);
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleDownload = () => {
    if (!generatedDoc) return;
    const nombreStr = String(caseData.nombre ?? 'documento');
    const fileName = `escrito-legal-${nombreStr.replace(/\s+/g, '-').toLowerCase()}`;
    downloadLegalPdf(generatedDoc, fileName);
  };

  const handleDownloadWord = async () => {
    if (!generatedDoc) return;
    const nombreStr = String(caseData.nombre ?? 'documento');
    const fileName = `escrito-legal-${nombreStr.replace(/\s+/g, '-').toLowerCase()}`;
    await downloadLegalDocx(generatedDoc, fileName);
  };

  return (
    <div className="min-h-screen bg-[#f5f3ef]" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
      <link rel="canonical" href="https://legalhelp.cl" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            url: "https://legalhelp.cl",
            name: "LegalHelp Chile",
            description:
              "Documentos legales con inteligencia artificial para Chile",
            inLanguage: "es-CL",
            potentialAction: {
              "@type": "SearchAction",
              target: {
                "@type": "EntryPoint",
                urlTemplate:
                  "https://legalhelp.cl/p/{search_term_string}",
              },
              "query-input": "required name=search_term_string",
            },
          }),
        }}
      />

      {/* NAV */}
      <nav className="bg-[#0b1f3a] border-b border-[#c9a84c]/30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg width="38" height="44" viewBox="0 0 38 44" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="lgB" x1="0" y1="0" x2="38" y2="44" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#1a56db"/>
                  <stop offset="100%" stopColor="#60a5fa"/>
                </linearGradient>
              </defs>
              <path d="M2 2 L13 2 L13 26 L36 26 L36 34 Q19 44 2 36 Z" fill="url(#lgB)"/>
              <rect x="14" y="2" width="5" height="24" fill="white" rx="0.5"/>
              <rect x="27" y="2" width="5" height="24" fill="white" rx="0.5"/>
              <rect x="14" y="11" width="18" height="5" fill="white" rx="0.5"/>
            </svg>
            <div className="flex items-baseline" style={{ fontFamily: "'Arial Black', 'Arial', sans-serif", fontWeight: 900, letterSpacing: '-0.02em' }}>
              <span className="text-white text-2xl">LEGAL</span>
              <span className="text-blue-400 text-2xl">HELP</span>
            </div>
          </div>
          <div className="flex items-center gap-4" style={{ fontFamily: 'sans-serif' }}>
            <span className="text-[#c9a84c]/60 text-xs uppercase tracking-widest">Mi cuenta</span>
            <div className="w-px h-4 bg-[#c9a84c]/20" />
            <span className="text-[#c9a84c] text-xs font-semibold uppercase tracking-widest">Chile</span>
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-[#c9a84c] to-transparent opacity-60" />
      </nav>

      {/* HERO */}
      <div className="bg-[#0b1f3a] pt-12 pb-10">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-snug mb-3">
            Tu escrito legal,{' '}
            <span className="text-[#e05c3a]">redactado en minutos</span>
          </h1>
          <p className="text-[#a8b8cc] text-base leading-relaxed mb-6" style={{ fontFamily: 'sans-serif', fontWeight: 300 }}>
            Inteligencia artificial especializada en derecho chileno. Sin abogados caros, sin burocracia.
            Documentos listos para presentar.
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-xs" style={{ fontFamily: 'sans-serif' }}>
            {[paid ? '✅ Plan activo' : '🎁 Consulta gratuita',
              '🔒 Datos cifrados','📋 Formato judicial chileno'].map(b => (
              <span key={b} className="bg-white/5 border border-white/10 text-[#a8b8cc] px-3 py-1.5 rounded-full">{b}</span>
            ))}
          </div>
        </div>
      </div>

      {/* DOC TYPE SELECTOR */}
      <div className="bg-[#f5f3ef] border-b border-[#ddd8cc] py-5">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-center text-[#6b6355] text-xs uppercase tracking-widest mb-4" style={{ fontFamily: 'sans-serif' }}>
            Selecciona el tipo de documento
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {DOC_TYPES.map(doc => (
              <button key={doc.id} onClick={() => setSelectedDoc(doc.id)}
                className={`text-left rounded-xl border p-3 transition-all cursor-pointer ${selectedDoc === doc.id ? 'border-[#c9a84c] bg-[#c9a84c]/10 shadow-sm' : 'border-[#ddd8cc] bg-white hover:border-[#c9a84c]/50 hover:shadow-sm'}`}>
                <div className="text-2xl mb-1">{doc.icon}</div>
                <div className="font-semibold text-[#0b1f3a] text-sm leading-tight" style={{ fontFamily: 'sans-serif' }}>{doc.label}</div>
                <div className="text-[#8a7f72] text-xs mt-0.5" style={{ fontFamily: 'sans-serif' }}>{doc.desc}</div>
                <div className="text-[#c9a84c] font-bold text-xs mt-2" style={{ fontFamily: 'sans-serif' }}>{doc.price}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN TWO-PANEL */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[560px]">

          {/* LEFT: CHAT */}
          <div className="flex flex-col rounded-2xl overflow-hidden border border-[#ddd8cc] shadow-sm bg-white">
            <div className="bg-[#0b1f3a] px-5 py-3 flex items-center justify-between">
              <div>
                <span className="text-white font-semibold text-sm" style={{ fontFamily: 'sans-serif' }}>Asistente Jurídico</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-300 text-xs" style={{ fontFamily: 'sans-serif' }}>
                    {paid
                      ? 'Plan activo · documentos ilimitados'
                      : 'En línea · respondiendo tus consultas'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#faf9f7]">
              {messages.length === 0 && (
                <div className="h-full flex items-center justify-center">
                  <p className="text-[#a09485] text-sm text-center" style={{ fontFamily: 'sans-serif' }}>
                    Cuéntanos qué necesitas resolver.<br />
                    <span className="text-xs text-[#bbb0a4]">Te haré algunas preguntas para redactar tu documento.</span>
                  </p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === 'user' ? 'bg-[#0b1f3a] text-white rounded-br-sm' : 'bg-white border border-[#e4ddd5] text-[#2c2416] rounded-bl-sm shadow-sm'}`}
                    style={{ fontFamily: 'sans-serif' }}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-[#e4ddd5] rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                    <span className="flex gap-1">
                      {[0,150,300].map(d => (
                        <span key={d} className="w-1.5 h-1.5 rounded-full bg-[#c9a84c] animate-bounce" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="border-t border-[#ede8e1] bg-white px-3 py-3 flex gap-2">
              <input type="text" value={input} onChange={e => setInput(e.target.value)} disabled={loading}
                placeholder="¿En qué te podemos ayudar?..."
                className="flex-1 bg-[#f5f3ef] rounded-xl px-4 py-2.5 text-sm text-[#2c2416] placeholder-[#b0a899] border border-transparent focus:outline-none focus:border-[#c9a84c]/60 disabled:opacity-60"
                style={{ fontFamily: 'sans-serif' }} />
              <button type="submit" disabled={loading || !input.trim()}
                className="bg-[#0b1f3a] hover:bg-[#162e55] disabled:bg-[#ccc] text-white px-4 py-2.5 rounded-xl text-sm font-medium transition"
                style={{ fontFamily: 'sans-serif' }}>
                ➤ Enviar
              </button>
            </form>
          </div>

          {/* RIGHT: DOCUMENT PREVIEW */}
          <div className="flex flex-col rounded-2xl overflow-hidden border border-[#ddd8cc] shadow-sm">
            <div className="bg-[#0b1f3a] px-5 py-3 flex items-center justify-between">
              <div>
                <span className="text-white font-semibold text-sm" style={{ fontFamily: 'sans-serif' }}>Vista previa del documento</span>
                <div className="text-[#a8b8cc] text-xs mt-0.5" style={{ fontFamily: 'sans-serif' }}>
                  {generatedDoc ? 'Documento generado con IA' : previewDoc ? 'Tu escrito está listo — revísalo abajo' : generating ? 'Redactando tu escrito...' : 'Redactando en tiempo real…'}
                </div>
              </div>
              {!!caseData.ready && (
                <span className="bg-emerald-500 text-white text-xs px-2.5 py-1 rounded-full font-medium" style={{ fontFamily: 'sans-serif' }}>✓ Listo</span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto bg-white px-7 py-6">
              {/* Generating spinner */}
              {generating && (
                <div className="h-full flex flex-col items-center justify-center gap-3">
                  <div className="flex gap-1.5">
                    {[0,150,300].map(d => (
                      <span key={d} className="w-2 h-2 rounded-full bg-[#c9a84c] animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                  <p className="text-[#8a7f72] text-sm" style={{ fontFamily: 'sans-serif' }}>
                    {paid ? 'Preparando tu PDF...' : 'Redactando tu escrito legal...'}
                  </p>
                </div>
              )}

              {/* Full document after payment */}
              {generatedDoc && !generating && (
                <div>
                  <CourtDocument text={generatedDoc} />
                  <div className="mt-4 pt-4 border-t border-[#e8e2d8] flex gap-3">
                    <button onClick={handleDownload}
                      className="flex-1 bg-[#0b1f3a] hover:bg-[#162e55] text-white py-2.5 rounded-xl text-sm font-medium transition text-center"
                      style={{ fontFamily: 'sans-serif' }}>
                      ↓ Descargar PDF
                    </button>
                    <button onClick={handleDownloadWord}
                      className="flex-1 bg-white border border-[#0b1f3a] text-[#0b1f3a] hover:bg-[#f0f4fa] py-2.5 rounded-xl text-sm font-medium transition text-center"
                      style={{ fontFamily: 'sans-serif' }}>
                      ↓ Descargar Word
                    </button>
                    <button onClick={() => { setGeneratedDoc(null); handleGenerate(); }}
                      className="px-4 py-2.5 border border-[#ddd8cc] hover:border-[#c9a84c] rounded-xl text-sm text-[#6b6355] transition"
                      style={{ fontFamily: 'sans-serif' }}>
                      ↺ Regenerar
                    </button>
                  </div>
                </div>
              )}

              {/* Blurred preview before payment */}
              {previewDoc && !generatedDoc && !generating && (
                <div style={{ position: 'relative' }}>
                  <CourtDocument text={previewDoc} />
                  {/* Blur overlay at 40% */}
                  <div style={{
                    position: 'absolute',
                    top: '38%',
                    left: '-28px',
                    right: '-28px',
                    bottom: '-24px',
                    background: 'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.6) 15%, rgba(255,255,255,0.95) 40%)',
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '40px 20px 24px',
                  }}>
                    <div style={{
                      background: '#0b1f3a',
                      borderRadius: '14px',
                      padding: '18px 24px',
                      textAlign: 'center',
                      boxShadow: '0 8px 32px rgba(11,31,58,0.25)',
                      maxWidth: '280px',
                      width: '100%',
                    }}>
                      <div style={{ fontSize: '22px', marginBottom: '8px' }}>🔒</div>
                      <p style={{ fontFamily: 'sans-serif', fontSize: '14px', fontWeight: '700', color: '#fff', margin: '0 0 6px 0' }}>
                        Tu escrito está redactado
                      </p>
                      <p style={{ fontFamily: 'sans-serif', fontSize: '11px', color: '#a8b8cc', margin: '0 0 14px 0', lineHeight: '1.5' }}>
                        Revisa el inicio — el documento completo<br />
                        está listo para descargar en PDF.
                      </p>
                      <button
                        onClick={() => setShowPaywall(true)}
                        style={{
                          background: '#c9a84c',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '10px 20px',
                          fontFamily: 'sans-serif',
                          fontSize: '13px',
                          fontWeight: '700',
                          color: '#0b1f3a',
                          cursor: 'pointer',
                          width: '100%',
                        }}>
                        ↓ Desbloquear documento
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Progressive placeholder while chat is ongoing */}
              {!previewDoc && !generatedDoc && !generating && <DocumentPreview caseData={caseData} />}
            </div>
          </div>

        </div>
      </div>

      {/* GUÍAS POPULARES */}
      <div className="border-t border-[#ddd8cc] bg-[#f5f3ef] py-6" style={{ fontFamily: 'sans-serif' }}>
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-xs text-[#8a7f72] uppercase tracking-wider font-semibold mb-3">Guías legales populares</p>
          <div className="flex flex-wrap gap-2">
            {[
              { href: '/p/prescripcion-deuda-tag',      label: 'Prescripción de deuda TAG — Guía completa' },
              { href: '/p/prescripcion-deuda-bancaria',  label: 'Prescripción de deuda bancaria' },
              { href: '/p/demanda-alimentos',         label: 'Demanda de alimentos' },
              { href: '/p/carta-reclamo-sernac',         label: 'Carta reclamo SERNAC' },
              { href: '/p/denuncia-despido-injustificado', label: 'Denuncia por despido injustificado' },
              { href: '/p/recurso-proteccion',        label: 'Recurso de protección' },
              { href: '/p/finiquito-laboral',         label: 'Finiquito laboral' },
              { href: '/p/demanda-desalojo',          label: 'Demanda de desalojo' },
              { href: '/p/denuncia-no-pago-cotizaciones', label: 'Denuncia por no pago de cotizaciones' },
              { href: '/p/poder-simple',              label: 'Poder simple notarial' },
              { href: '/p/escrito-pension-alimenticia', label: 'Escrito pensión alimenticia' },
            ].map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="text-xs text-[#0b1f3a] bg-white hover:bg-[#e8e2d8] px-3 py-1.5 rounded-full border border-[#ddd8cc] transition-colors"
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-[#ddd8cc] bg-[#f5f3ef] py-4">
        <div className="max-w-4xl mx-auto px-6 flex flex-wrap justify-center gap-6 text-xs text-[#9a9185]" style={{ fontFamily: 'sans-serif' }}>
          {['🔒 SSL Certificado','🇨🇱 Válido en todo Chile','⚖ Marco legal actualizado 2026'].map(t => (
            <span key={t}>{t}</span>
          ))}
          <span>📧 contacto@legalhelp.cl</span>
        </div>
      </footer>

      {/* PAYWALL MODAL */}
      {showPaywall && (
        <PaywallModal
          caseData={caseData}
          selectedDoc={selectedDoc}
          paymentLoading={paymentLoading}
          onPayment={handlePayment}
          onClose={() => setShowPaywall(false)}
        />
      )}

    </div>
  );
}
