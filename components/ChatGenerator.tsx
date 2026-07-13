'use client';

import { useEffect, useRef, useState } from 'react';
import { downloadLegalPdf } from '@/lib/generatePdf';
import { CaseData, Message, DOC_TYPES, EMPTY_CASE } from '@/lib/constants';
import CourtDocument from '@/components/CourtDocument';
import DocumentPreview from '@/components/DocumentPreview';
import PaywallModal from '@/components/PaywallModal';
import DevBypassModal from '@/components/DevBypassModal';
import LastMileModal from '@/components/LastMileModal';

// ─────────────────────────────────────────────────────────────────────────────
interface ChatGeneratorProps {
  /** Pre-populated context sent as first user message (e.g. "Prescripción de deuda TAG en Pudahuel") */
  initialContext?: string;
  /** Document type id selected externally (e.g. homepage selector) for pricing */
  selectedDoc?: string | null;
  /** Marco legal curado de la página (data.ley) — grounding para la generación */
  legalContext?: string;
  /** Autoridad/destinatario curado de la página (data.entidad) */
  entidad?: string;
}

export default function ChatGenerator({ initialContext, selectedDoc: externalSelectedDoc, legalContext, entidad }: ChatGeneratorProps) {
  const [caseData, setCaseData]       = useState<CaseData>(EMPTY_CASE);
  const [messages, setMessages]       = useState<Message[]>([]);
  const [input, setInput]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [internalSelectedDoc, setSelectedDoc] = useState<string | null>(null);
  const selectedDoc = externalSelectedDoc ?? internalSelectedDoc;
  const [generatedDoc, setGeneratedDoc] = useState<string | null>(null);   // full doc (after payment)
  const [previewDoc, setPreviewDoc]     = useState<string | null>(null);   // partial preview (before payment)
  const [generating, setGenerating]     = useState(false);
  const [paid, setPaid]                 = useState(false);
  const [showPaywall, setShowPaywall]   = useState(false);
  const [showLastMile, setShowLastMile] = useState(false);
  const [lastMileLoading, setLastMileLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showDevBypass, setShowDevBypass] = useState(false);
  const devClickCount = useRef(0);
  const devClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [contextSent, setContextSent]   = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Auto-send initialContext on first render
  useEffect(() => {
    if (initialContext && !contextSent) {
      setTimeout(() => setContextSent(true), 0);
      setTimeout(() => sendMessage(initialContext), 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContext]);

  // When ready: generate preview doc automatically (before payment)
  // DO NOT auto-open paywall — let the user see the blurred preview first
  // and decide to pay by clicking "Desbloquear documento" in the preview
  useEffect(() => {
    if (caseData.ready && !paid && !previewDoc && !generating) {
      handleGeneratePreview();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseData.ready]);

  // After payment: generate full doc for download
  useEffect(() => {
    if (
      paid &&
      caseData.ready &&
      !generatedDoc &&
      !generating
    ) handleGenerate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paid, caseData.ready, generatedDoc, generating]);

  // Restore session after MercadoPago return
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('paid') === '1') {
      const stored     = sessionStorage.getItem('lh_paid_order');
      const storedCase = sessionStorage.getItem('lh_case_data');
      const storedMsgs = sessionStorage.getItem('lh_messages');
      try {
        if (storedCase) setTimeout(() => setCaseData(JSON.parse(storedCase)), 0);
        if (storedMsgs) setTimeout(() => setMessages(JSON.parse(storedMsgs)), 0);
        // Only mark as paid if we have a valid order stored from the verification flow
        if (stored) {
          const orderData = JSON.parse(stored);
          if (orderData?.orderId && orderData?.paidAt) {
            setPaid(true);
          }
        }
        setShowPaywall(false);
        window.history.replaceState({}, '', window.location.pathname);
      } catch { /* ignore */ }
    }
  }, []);

  async function sendMessage(text: string) {
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
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput('');
    await sendMessage(text);
  };

  const handleGeneratePreview = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/generate-final', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...caseData, ley_referencia: legalContext, entidad_referencia: entidad }),
      });
      const data = await res.json();
      if (data.document) setPreviewDoc(data.document);
    } catch { console.error('Error generando preview'); }
    finally { setGenerating(false); }
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
        body: JSON.stringify({ ...caseData, ley_referencia: legalContext, entidad_referencia: entidad, ...(orderId ? { orderId } : {}) }),
      });
      const data = await res.json();
      if (data.document) setGeneratedDoc(data.document);
    } catch { console.error('Error generando documento'); }
    finally { setGenerating(false); }
  };

  const handlePayment = async (plan: 'single' | 'monthly') => {
    setPaymentLoading(true);
    try {
      const selectedDocData = DOC_TYPES.find(d => d.id === selectedDoc);
      const docPrice = selectedDocData?.price
        ? parseInt(selectedDocData.price.replace(/\D/g, ''), 10) || undefined
        : undefined;
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, caseData, docPrice }),
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        sessionStorage.setItem('lh_case_data', JSON.stringify(caseData));
        sessionStorage.setItem('lh_messages',  JSON.stringify(messages));
        sessionStorage.setItem('lh_pending_order', data.orderId);
        window.location.href = data.checkoutUrl;
      }
    } catch (err) { console.error('Error iniciando pago:', err); }
    finally { setPaymentLoading(false); }
  };

  const handleTestPayment = async (plan: 'single' | 'monthly') => {
    setPaymentLoading(true);
    try {
      const res = await fetch('/api/payment/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, caseData, docId: selectedDoc }),
      });
      const data = await res.json();
      if (data.orderId) {
        sessionStorage.setItem('lh_paid_order', JSON.stringify({ orderId: data.orderId, plan, paidAt: Date.now() }));
        setPaid(true);
        setShowPaywall(false);
      }
    } catch (err) { console.error('Error en pago de prueba:', err); }
    finally { setPaymentLoading(false); }
  };

  const handleDownload = () => {
    if (!generatedDoc) return;
    const nombreStr = String(caseData.nombre ?? 'documento');
    downloadLegalPdf(generatedDoc, `escrito-legal-${nombreStr.replace(/\s+/g, '-').toLowerCase()}`);
  };

  const handleDownloadWord = async () => {
    if (!generatedDoc) return;
    const { downloadLegalDocx } = await import('@/lib/generateDocx');
    const nombreStr = String(caseData.nombre ?? 'documento');
    await downloadLegalDocx(generatedDoc, `escrito-legal-${nombreStr.replace(/\s+/g, '-').toLowerCase()}`);
  };

  const handleDevClick = () => {
    devClickCount.current += 1;
    if (devClickTimer.current) clearTimeout(devClickTimer.current);
    if (devClickCount.current >= 3) {
      devClickCount.current = 0;
      setShowDevBypass(true);
    } else {
      devClickTimer.current = setTimeout(() => { devClickCount.current = 0; }, 800);
    }
  };

  const handleDevBypassed = (orderId: string) => {
    setShowDevBypass(false);
    setPaid(true);
    void orderId;
  };

  const handleLastMileConfirm = async (email: string, pass: string, rut: string, claveUnica: string) => {
    setLastMileLoading(true);
    try {
      const res = await fetch('/api/demandas/tramitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email, pass, rut, claveUnica,
          pdfBase64: 'BASE_64_PLACEHOLDER', // Idealmente enviamos el documento generado
          routingData: { system_target: 'PJUD', portal_url: '', target_code: '123' },
          caseId: 'temp-case-id-123'
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowLastMile(false);
        alert(data.message || 'Demanda enviada correctamente');
      } else {
        alert(data.error || 'Error enviando demanda');
      }
    } catch (err) {
      console.error(err);
      alert('Error de red');
    } finally {
      setLastMileLoading(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[560px]">

        {/* CHAT */}
        <div className="flex flex-col rounded-2xl overflow-hidden border border-[#ddd8cc] shadow-sm bg-white">
          <div className="bg-[#0b1f3a] px-5 py-3 flex items-center justify-between">
            <div>
              <span className="text-white font-semibold text-sm" style={{ fontFamily: 'sans-serif' }}>Asistente Jurídico</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse cursor-pointer" onClick={handleDevClick} />
                <span className="text-emerald-300 text-xs" style={{ fontFamily: 'sans-serif' }}>
                  {paid
                    ? 'Plan activo · documentos ilimitados'
                    : caseData.ready
                      ? 'Listo para generar tu documento'
                      : 'En línea · respondiendo consultas'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#faf9f7]">
            {messages.length === 0 && !loading && (
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
                    {[0, 150, 300].map(d => (
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

        {/* DOCUMENT PREVIEW */}
        <div className="flex flex-col rounded-2xl overflow-hidden border border-[#ddd8cc] shadow-sm">
          <div className="bg-[#0b1f3a] px-5 py-3 flex items-center justify-between">
            <div>
              <span className="text-white font-semibold text-sm" style={{ fontFamily: 'sans-serif' }}>Vista previa del documento</span>
              <div className="text-[#a8b8cc] text-xs mt-0.5" style={{ fontFamily: 'sans-serif' }}>
                {generatedDoc ? 'Documento generado con IA' : previewDoc ? '✅ Tu escrito está listo — revísalo abajo' : generating ? '✍️ Redactando tu escrito...' : 'Redactando en tiempo real…'}
              </div>
            </div>
            {!!caseData.ready && (
              <span className="bg-emerald-500 text-white text-xs px-2.5 py-1 rounded-full font-medium" style={{ fontFamily: 'sans-serif' }}>✓ Listo</span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto bg-white px-7 py-6">

            {/* Loading: generating preview or final doc */}
            {generating && (
              <div className="h-full flex flex-col items-center justify-center gap-3">
                <div className="flex gap-1.5">
                  {[0, 150, 300].map(d => (
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
                <div className="mt-3">
                  <button onClick={() => setShowLastMile(true)}
                    className="w-full bg-[#00d4ff] hover:bg-[#22ddff] text-[#05070f] py-2.5 rounded-xl text-sm font-bold transition shadow-[0_0_15px_rgba(0,212,255,0.4)] text-center"
                    style={{ fontFamily: 'sans-serif' }}>
                    ⚡ Subir al PJUD (+$7.999)
                  </button>
                </div>
              </div>
            )}

            {/* Blurred preview before payment */}
            {previewDoc && !generatedDoc && !generating && (
              <div style={{ position: 'relative' }}>
                {/* Full document text — visible & blurred */}
                <CourtDocument text={previewDoc} />

                {/* Blur overlay starting at 40% */}
                <div style={{
                  position: 'absolute',
                  top: '65%',
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
                    {/* Secret Admin Bypass Trigger */}
                    <button onClick={() => setShowDevBypass(true)} className="absolute bottom-4 right-4 text-2xl opacity-10 hover:opacity-100" title="Admin Bypass">
                      🔒
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

      {/* PAYWALL MODAL */}
      {showPaywall && (
        <PaywallModal
          caseData={caseData}
          selectedDoc={selectedDoc}
          paymentLoading={paymentLoading}
          onPayment={handlePayment}
          onTestPayment={handleTestPayment}
          onClose={() => setShowPaywall(false)}
        />
      )}

      {showDevBypass && (
        <DevBypassModal caseData={caseData} docId={selectedDoc} onBypassed={handleDevBypassed} onClose={() => setShowDevBypass(false)} />
      )}

      {showLastMile && (
        <LastMileModal
          caseData={caseData}
          onClose={() => setShowLastMile(false)}
          onConfirm={handleLastMileConfirm}
          loading={lastMileLoading}
        />
      )}
    </>
  );
}
