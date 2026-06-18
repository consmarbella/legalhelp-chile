'use client';

import { useEffect, useRef, useState } from 'react';
import { downloadLegalPdf } from '@/lib/generatePdf';
import { CaseData, Message, DOC_TYPES, EMPTY_CASE, isLegallyUsefulCaseData } from '@/lib/constants';
import CourtDocument from '@/components/CourtDocument';
import DocumentPreview from '@/components/DocumentPreview';
import PaywallModal from '@/components/PaywallModal';

// ─────────────────────────────────────────────────────────────────────────────
interface ChatGeneratorProps {
  /** Pre-populated context sent as first user message (e.g. "Prescripción de deuda TAG en Pudahuel") */
  initialContext?: string;
}

export default function ChatGenerator({ initialContext }: ChatGeneratorProps) {
  const [caseData, setCaseData]       = useState<CaseData>(EMPTY_CASE);
  const [messages, setMessages]       = useState<Message[]>([]);
  const [input, setInput]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [generatedDoc, setGeneratedDoc] = useState<string | null>(null);
  const [generating, setGenerating]     = useState(false);
  const [paid, setPaid]                 = useState(false);
  const [showPaywall, setShowPaywall]   = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [contextSent, setContextSent]   = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Auto-send initialContext on first render
  useEffect(() => {
    if (initialContext && !contextSent) {
      setContextSent(true);
      sendMessage(initialContext);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContext]);

  // When ready AND legally useful: show paywall
  useEffect(() => {
    const shouldOpenPaywall =
      Boolean(caseData.ready) &&
      isLegallyUsefulCaseData(caseData) &&
      !paid &&
      !showPaywall &&
      !generatedDoc;

    if (shouldOpenPaywall) setShowPaywall(true);
  }, [caseData, paid, showPaywall, generatedDoc]);

  // After payment: generate (only if legally useful)
  useEffect(() => {
    if (
      paid &&
      caseData.ready &&
      isLegallyUsefulCaseData(caseData) &&
      !generatedDoc &&
      !generating
    ) handleGenerate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paid, caseData.ready, caseData, generatedDoc, generating]);

  // Restore session after MercadoPago return
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('paid') === '1') {
      const stored     = sessionStorage.getItem('lh_paid_order');
      const storedCase = sessionStorage.getItem('lh_case_data');
      const storedMsgs = sessionStorage.getItem('lh_messages');
      try {
        if (storedCase) setCaseData(JSON.parse(storedCase));
        if (storedMsgs) setMessages(JSON.parse(storedMsgs));
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

  const handleDownload = () => {
    if (!generatedDoc) return;
    const nombreStr = String(caseData.nombre ?? 'documento');
    downloadLegalPdf(generatedDoc, `escrito-legal-${nombreStr.replace(/\s+/g, '-').toLowerCase()}`);
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
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
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
                {generatedDoc ? 'Documento generado con IA' : 'Formato profesional · Redacción en tiempo real'}
              </div>
            </div>
            {!!caseData.ready && (
              <span className="bg-emerald-500 text-white text-xs px-2.5 py-1 rounded-full font-medium" style={{ fontFamily: 'sans-serif' }}>✓ Listo</span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto bg-white px-7 py-6">
            {generating && (
              <div className="h-full flex flex-col items-center justify-center gap-3">
                <div className="flex gap-1.5">
                  {[0, 150, 300].map(d => (
                    <span key={d} className="w-2 h-2 rounded-full bg-[#c9a84c] animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
                <p className="text-[#8a7f72] text-sm" style={{ fontFamily: 'sans-serif' }}>Redactando tu documento...</p>
              </div>
            )}

            {generatedDoc && !generating && (
              <div>
                <CourtDocument text={generatedDoc} />
                <div className="mt-4 pt-4 border-t border-[#e8e2d8] flex gap-3">
                  <button onClick={handleDownload}
                    className="flex-1 bg-[#0b1f3a] hover:bg-[#162e55] text-white py-2.5 rounded-xl text-sm font-medium transition text-center"
                    style={{ fontFamily: 'sans-serif' }}>
                    ↓ Descargar PDF
                  </button>
                  <button onClick={() => { setGeneratedDoc(null); handleGenerate(); }}
                    className="px-4 py-2.5 border border-[#ddd8cc] hover:border-[#c9a84c] rounded-xl text-sm text-[#6b6355] transition"
                    style={{ fontFamily: 'sans-serif' }}>
                    ↺ Regenerar
                  </button>
                </div>
              </div>
            )}

            {!generatedDoc && !generating && <DocumentPreview caseData={caseData} />}
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
          onClose={() => setShowPaywall(false)}
        />
      )}
    </>
  );
}
