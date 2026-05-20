'use client';

import { useEffect, useRef, useState } from 'react';
import { downloadLegalPdf } from '@/lib/generatePdf';

type CaseData = Record<string, unknown>;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const DOC_TYPES = [
  { id: 'tag',            icon: '🚗', label: 'Prescripción TAG',       desc: 'Multas de tránsito y TAG',    price: '$13.990' },
  { id: 'finiquito',      icon: '📄', label: 'Finiquito Laboral',      desc: 'Disputas con empleador',      price: '$15.990' },
  { id: 'reclamo',        icon: '📮', label: 'Carta Reclamo',          desc: 'SERNAC y comercio',           price: '$14.990' },
  { id: 'poder',          icon: '🤝', label: 'Poder Simple',           desc: 'Mandatos y autorizaciones',   price: '$7.990'  },
  { id: 'familia',        icon: '👨‍👩‍👧', label: 'Derecho de Familia',    desc: 'Alimentos, tuición, visitas', price: '$16.990' },
  { id: 'arrendamiento',  icon: '🏠', label: 'Arrendamiento',          desc: 'Contratos y desalojos',       price: '$14.990' },
  { id: 'proteccion',     icon: '⚖️', label: 'Recurso de Protección',  desc: 'Derechos fundamentales',      price: '$19.990' },
  { id: 'otro',           icon: '📝', label: 'Otro documento',         desc: 'Cualquier escrito legal',     price: '$10.000' },
];

const EMPTY_CASE: CaseData = { ready: false };

// ── Renderizador de escrito judicial ─────────────────────────────────────────
function CourtDocument({ text }: { text: string }) {
  const lines = text.split('\n');
  let lineNum = 0;

  const rows = lines.map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return { key: i, empty: true, num: null, content: '', style: 'empty' };
    lineNum++;
    const num = lineNum;
    const isRecipient =
      /^se[ñn]or(a)?\s/i.test(trimmed) ||
      /^(excelent[ií]simo|ilustr[ií]simo)/i.test(trimmed);
    const isSectionHeader =
      /^(I{1,3}V?|IV|V?I{1,3})\.\s/i.test(trimmed) ||
      /^(POR TANTO|RUEGO A|SOLICITO A|PIDO A|A US\.)/i.test(trimmed) ||
      /^MATERIA:/i.test(trimmed);
    const isSignature =
      /^[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]/.test(trimmed) && i === lines.length - 1;
    const isRUT  = /^RUT:/i.test(trimmed);
    const isDate = /^santiago,/i.test(trimmed);
    let style = 'normal';
    if (isDate)               style = 'date';
    else if (isRecipient)     style = 'recipient';
    else if (isSectionHeader) style = 'header';
    else if (isSignature || isRUT) style = 'signature';
    return { key: i, empty: false, num, content: line, style };
  });

  return (
    <div style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '12px', lineHeight: '1.9', color: '#111', background: '#fff', padding: '0' }}>
      {rows.map(row => {
        if (row.empty) return (
          <div key={row.key} style={{ display: 'flex', minHeight: '1.9em' }}>
            <span style={{ width: '28px', minWidth: '28px', color: '#ccc', fontSize: '10px', textAlign: 'right', paddingRight: '8px', userSelect: 'none', lineHeight: '1.9' }} />
            <span style={{ flex: 1 }} />
          </div>
        );
        const styles: Record<string, React.CSSProperties> = {
          date:      { textAlign: 'right', paddingRight: '4px' },
          recipient: { textAlign: 'center', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '4px' },
          header:    { fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.03em', marginTop: '6px' },
          signature: { textAlign: 'center', marginTop: '32px' },
          normal:    { textAlign: 'justify' },
        };
        return (
          <div key={row.key} style={{ display: 'flex', alignItems: 'baseline' }}>
            <span style={{ width: '28px', minWidth: '28px', color: '#bbb', fontSize: '10px', textAlign: 'right', paddingRight: '8px', userSelect: 'none', lineHeight: '1.9', flexShrink: 0 }}>
              {row.num}
            </span>
            <span style={{ flex: 1, borderLeft: '1px solid #e8e2d8', paddingLeft: '10px', ...(styles[row.style] ?? styles.normal) }}>
              {row.content}
            </span>
          </div>
        );
      })}
      <div style={{ marginTop: '48px', paddingLeft: '38px' }}>
        <div style={{ display: 'inline-block', borderTop: '1px solid #333', width: '220px', textAlign: 'center', paddingTop: '4px', fontSize: '11px', color: '#333' }}>
          Firma del Solicitante
        </div>
      </div>
    </div>
  );
}

function todayChile() {
  return new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Santiago' });
}

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

  // When ready: show paywall
  useEffect(() => {
    if (caseData.ready && !paid && !showPaywall && !generatedDoc) setShowPaywall(true);
  }, [caseData.ready]);

  // After payment: generate
  useEffect(() => {
    if (paid && caseData.ready && !generatedDoc && !generating) handleGenerate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paid, caseData.ready]);

  // Restore session after MercadoPago return
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('paid') === '1') {
      const stored     = sessionStorage.getItem('lh_paid_order');
      const storedCase = sessionStorage.getItem('lh_case_data');
      const storedMsgs = sessionStorage.getItem('lh_messages');
      try {
        // Restaurar el estado real — NO forzar ready:true
        // Si estaba listo al pagar → ready queda true → handleGenerate dispara solo
        // Si no estaba listo → sigue la conversación con paid=true hasta que ready:true
        if (storedCase) setCaseData(JSON.parse(storedCase));
        if (storedMsgs) setMessages(JSON.parse(storedMsgs));
        setPaid(true);
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
      setMessages(prev => [...prev, { role: 'assistant', content: 'Problema al conectar. Intentá de nuevo.' }]);
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
      const res = await fetch('/api/generate-final', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(caseData),
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
                    : 'En línea · respondiendo tus consultas'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#faf9f7]">
            {messages.length === 0 && !loading && (
              <div className="h-full flex items-center justify-center">
                <p className="text-[#a09485] text-sm text-center" style={{ fontFamily: 'sans-serif' }}>
                  Contame qué necesitás resolver.<br />
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

            {!generatedDoc && !generating && (() => {
              const cd = caseData;
              const nombre      = cd.nombre      ? String(cd.nombre)      : null;
              const rut         = cd.rut         ? String(cd.rut)         : null;
              const direccion   = cd.direccion   ? String(cd.direccion)   : null;
              const destinatario = (cd.destinatario_inferido ?? cd.destinatario)
                ? String(cd.destinatario_inferido ?? cd.destinatario) : null;
              const tipoDoc = cd.tipo_documento ? String(cd.tipo_documento) : null;
              const hechos  = (cd.hechos ?? cd.contexto ?? cd.situacion ?? cd.motivo)
                ? String(cd.hechos ?? cd.contexto ?? cd.situacion ?? cd.motivo) : null;

              return (
                <div style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '13px', lineHeight: '2', color: '#111' }}>
                  <p style={{ textAlign: 'right', marginBottom: '16px', color: '#4a4030' }}>Santiago, {todayChile()}</p>
                  {tipoDoc && (
                    <p style={{ marginBottom: '12px', fontSize: '12px', color: '#555' }}>
                      <span style={{ fontWeight: 'bold' }}>EN LO PRINCIPAL:</span> {tipoDoc}.
                    </p>
                  )}
                  <p style={{ textAlign: 'center', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px', color: destinatario ? '#111' : '#ccc' }}>
                    {destinatario ?? 'SEÑOR(A) JUEZ(A) / INSTITUCIÓN'}
                  </p>
                  <p style={{ textAlign: 'center', marginBottom: '20px', color: '#555', fontSize: '12px' }}>PRESENTE</p>
                  <p style={{ textAlign: 'justify', marginBottom: '16px' }}>
                    <span style={{ color: nombre ? '#111' : '#ccc' }}>{nombre?.toUpperCase() ?? '[NOMBRE DEL SOLICITANTE]'}</span>
                    {', RUT '}
                    <span style={{ color: rut ? '#111' : '#ccc' }}>{rut ?? '[RUT]'}</span>
                    {', domiciliado en '}
                    <span style={{ color: direccion ? '#111' : '#ccc' }}>{direccion ?? '[domicilio]'}</span>
                    {', a US. respetuosamente digo:'}
                  </p>
                  <hr style={{ border: 'none', borderTop: '1px solid #e8e2d8', margin: '12px 0' }} />
                  <p style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em', marginBottom: '8px' }}>I. Antecedentes de hecho</p>
                  <p style={{ textAlign: 'justify', color: hechos ? '#111' : '#ccc', fontStyle: hechos ? 'normal' : 'italic', marginBottom: '16px' }}>
                    {hechos ?? 'Que… [se completará con los hechos que indique el solicitante]'}
                  </p>
                  <hr style={{ border: 'none', borderTop: '1px solid #e8e2d8', margin: '12px 0' }} />
                  <p style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em', marginBottom: '8px' }}>II. Fundamento legal</p>
                  <p style={{ textAlign: 'justify', color: '#ccc', fontStyle: 'italic', marginBottom: '16px' }}>[La ley aplicable será determinada por el asistente]</p>
                  <hr style={{ border: 'none', borderTop: '1px solid #e8e2d8', margin: '12px 0' }} />
                  <p style={{ marginBottom: '6px' }}><span style={{ fontWeight: 'bold' }}>POR TANTO,</span></p>
                  <p style={{ textAlign: 'justify', color: '#aaa', fontStyle: 'italic' }}>RUEGO A US.: [petición concreta — se generará al finalizar]</p>
                  {!caseData.ready && (
                    <div style={{ marginTop: '20px', padding: '10px 12px', border: '1px dashed #c9a84c', borderRadius: '8px', background: '#fdf9f0' }}>
                      <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#9a8054', fontFamily: 'sans-serif', marginBottom: '4px' }}>Completando información…</p>
                      <p style={{ fontSize: '11px', color: '#b09a6e', fontFamily: 'sans-serif' }}>
                        {[!nombre && 'nombre', !rut && 'RUT', !direccion && 'domicilio', !tipoDoc && 'tipo de documento']
                          .filter(Boolean).join(' · ') || 'Faltan algunos datos específicos del caso'}
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* PAYWALL MODAL */}
      {showPaywall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(11,31,58,0.75)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-[#0b1f3a] px-6 py-5">
              <div style={{ fontFamily: "'Arial Black', 'Arial', sans-serif", fontWeight: 900 }}>
                <span className="text-white text-lg">LEGAL</span>
                <span className="text-blue-400 text-lg">HELP</span>
              </div>
              <p className="text-[#a8b8cc] text-sm mt-1" style={{ fontFamily: 'sans-serif' }}>
                {caseData.ready ? 'Tu documento está listo para generarse' : 'Alcanzaste el límite de consultas gratuitas'}
              </p>
            </div>
            <div className="px-6 py-5" style={{ fontFamily: 'sans-serif' }}>
              {!!caseData.ready && !!caseData.tipo_documento && (
                <div className="mb-4 bg-[#f5f3ef] rounded-xl p-3 border border-[#e8e2d8]">
                  <p className="text-xs text-[#8a7f72] uppercase tracking-wider mb-1">Documento a generar</p>
                  <p className="text-[#0b1f3a] font-semibold text-sm capitalize">{String(caseData.tipo_documento)}</p>
                  {!!caseData.nombre && <p className="text-xs text-[#8a7f72] mt-0.5">Para: {String(caseData.nombre)}</p>}
                </div>
              )}
              <div className="space-y-3 mb-5">
                <button onClick={() => handlePayment('single')} disabled={paymentLoading}
                  className="w-full text-left border-2 border-[#c9a84c] rounded-xl p-4 hover:bg-[#fdf9f0] transition disabled:opacity-60">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-[#0b1f3a] text-base">Documento único</p>
                      <p className="text-xs text-[#8a7f72] mt-0.5">Genera y descarga este documento en PDF</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#c9a84c] font-bold text-xl">
                        {DOC_TYPES.find(d => d.id === selectedDoc)?.price ?? '$10.000'}
                      </p>
                      <p className="text-xs text-[#8a7f72]">pago único</p>
                    </div>
                  </div>
                </button>
              </div>
              {paymentLoading && (
                <div className="flex items-center justify-center gap-2 py-2 text-sm text-[#8a7f72]">
                  <span className="w-4 h-4 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
                  Redirigiendo a MercadoPago...
                </div>
              )}
              {/* Volver solo si el paywall se abrió antes de que el caso esté listo */}
              {!caseData.ready && (
                <button onClick={() => setShowPaywall(false)}
                  className="w-full text-center text-xs text-[#9a9185] hover:text-[#555] py-1 transition">
                  Volver
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
