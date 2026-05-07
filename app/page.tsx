'use client';

import { useEffect, useRef, useState } from 'react';
import { downloadLegalPdf } from '@/lib/generatePdf';

interface CaseData {
  response_message: string;
  materia: string | null;
  nombre: string | null;
  rut: string | null;
  direccion: string | null;
  destinatario: string | null;
  hechos: string | null;
  ley_citada: string | null;
  ready: boolean;
  campos_faltantes: string[];
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const DOC_TYPES = [
  { id: 'tag',       icon: '🚗', label: 'Prescripción TAG',    desc: 'Multas de tránsito y TAG',      price: '$13.990' },
  { id: 'finiquito', icon: '📄', label: 'Finiquito Laboral',   desc: 'Disputas con empleador',        price: '$15.990' },
  { id: 'reclamo',   icon: '📮', label: 'Carta Reclamo',       desc: 'SERNAC y comercio',             price: '$14.990' },
  { id: 'poder',     icon: '🤝', label: 'Poder Simple',        desc: 'Mandatos y autorizaciones',     price: '$7.990'  },
  { id: 'familia',   icon: '👨‍👩‍👧', label: 'Derecho de Familia', desc: 'Alimentos, tuición, visitas',   price: '$16.990' },
  { id: 'arrendamiento', icon: '🏠', label: 'Arrendamiento',   desc: 'Contratos y desalojos',         price: '$14.990' },
  { id: 'proteccion',icon: '⚖️', label: 'Recurso de Protección', desc: 'Derechos fundamentales',    price: '$19.990' },
  { id: 'otro',      icon: '📝', label: 'Otro documento',      desc: 'Cualquier escrito legal',       price: 'Consultar' },
];

const EMPTY_CASE: CaseData = {
  response_message: '', materia: null, nombre: null, rut: null,
  direccion: null, destinatario: null, hechos: null, ley_citada: null,
  ready: false, campos_faltantes: ['nombre','rut','direccion','destinatario','hechos'],
};

// ── Renderizador de escrito judicial ─────────────────────────────────────────
function CourtDocument({ text }: { text: string }) {
  const lines = text.split('\n');
  let lineNum = 0;

  const rows = lines.map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return { key: i, empty: true, num: null, content: '', style: 'empty' };

    lineNum++;
    const num = lineNum;

    // Detect line type
    const isRecipient =
      /^se[ñn]or(a)?\s/i.test(trimmed) ||
      /^(excelent[ií]simo|ilustr[ií]simo)/i.test(trimmed);
    const isSectionHeader =
      /^(I{1,3}V?|IV|V?I{1,3})\.\s/i.test(trimmed) ||      // I. II. III.
      /^(POR TANTO|RUEGO A|SOLICITO A|PIDO A|A US\.)/i.test(trimmed) ||
      /^MATERIA:/i.test(trimmed);
    const isSignature =
      /^[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]/.test(trimmed) &&
      i === lines.length - 1;
    const isRUT = /^RUT:/i.test(trimmed);
    const isDate = /^santiago,/i.test(trimmed);

    let style = 'normal';
    if (isDate)          style = 'date';
    else if (isRecipient)     style = 'recipient';
    else if (isSectionHeader) style = 'header';
    else if (isSignature || isRUT) style = 'signature';

    return { key: i, empty: false, num, content: line, style };
  });

  return (
    <div style={{
      fontFamily: '"Times New Roman", Times, serif',
      fontSize: '12px',
      lineHeight: '1.9',
      color: '#111',
      background: '#fff',
      padding: '0',
    }}>
      {rows.map(row => {
        if (row.empty) return (
          <div key={row.key} style={{ display: 'flex', minHeight: '1.9em' }}>
            <span style={{ width: '28px', minWidth: '28px', color: '#ccc', fontSize: '10px',
              textAlign: 'right', paddingRight: '8px', userSelect: 'none', lineHeight: '1.9' }} />
            <span style={{ flex: 1 }} />
          </div>
        );

        const styles: Record<string, React.CSSProperties> = {
          date:      { textAlign: 'right', paddingRight: '4px' },
          recipient: { textAlign: 'center', fontWeight: 'bold', textTransform: 'uppercase',
                       letterSpacing: '0.04em', marginTop: '4px' },
          header:    { fontWeight: 'bold', textTransform: 'uppercase',
                       letterSpacing: '0.03em', marginTop: '6px' },
          signature: { textAlign: 'center', marginTop: '32px' },
          normal:    { textAlign: 'justify' },
        };

        return (
          <div key={row.key} style={{ display: 'flex', alignItems: 'baseline' }}>
            <span style={{
              width: '28px', minWidth: '28px', color: '#bbb', fontSize: '10px',
              textAlign: 'right', paddingRight: '8px', userSelect: 'none',
              lineHeight: '1.9', flexShrink: 0,
            }}>
              {row.num}
            </span>
            <span style={{
              flex: 1,
              borderLeft: '1px solid #e8e2d8',
              paddingLeft: '10px',
              ...(styles[row.style] ?? styles.normal),
            }}>
              {row.content}
            </span>
          </div>
        );
      })}

      {/* Línea de firma */}
      <div style={{ marginTop: '48px', paddingLeft: '38px' }}>
        <div style={{ display: 'inline-block', borderTop: '1px solid #333',
          width: '220px', textAlign: 'center', paddingTop: '4px',
          fontSize: '11px', color: '#333' }}>
          Firma del Solicitante
        </div>
      </div>
    </div>
  );
}

function todayChile() {
  return new Date().toLocaleDateString('es-CL', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Santiago',
  });
}

export default function Home() {
  const [caseData, setCaseData]         = useState<CaseData>(EMPTY_CASE);
  const [messages, setMessages]         = useState<Message[]>([]);
  const [input, setInput]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [selectedDoc, setSelectedDoc]   = useState<string | null>(null);
  const [creditsLeft, setCreditsLeft]   = useState<number>(() => {
    if (typeof window === 'undefined') return 5;
    return parseInt(localStorage.getItem('lh_credits') ?? '5', 10);
  });
  const [generatedDoc, setGeneratedDoc] = useState<string | null>(null);
  const [generating, setGenerating]     = useState(false);
  const [paid, setPaid]                 = useState(false);
  const [showPaywall, setShowPaywall]   = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Persist credits to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lh_credits', String(creditsLeft));
    }
  }, [creditsLeft]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // When ready: show paywall (not generate directly)
  useEffect(() => {
    if (caseData.ready && !paid && !showPaywall && !generatedDoc) {
      setShowPaywall(true);
    }
  }, [caseData.ready]);

  // After payment confirmed: generate
  useEffect(() => {
    if (paid && caseData.ready && !generatedDoc && !generating) {
      handleGenerate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseData.ready]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    // Credits gate: if no credits and not paid, show paywall
    if (creditsLeft <= 0 && !paid) {
      setShowPaywall(true);
      return;
    }

    const text = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setLoading(true);

    // Decrement credits only for unpaid users
    if (!paid) setCreditsLeft(prev => Math.max(0, prev - 1));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, caseHistory: messages, currentCaseData: caseData }),
      });
      if (!res.ok) throw new Error();
      const data: CaseData = await res.json();
      setCaseData(prev => ({ ...prev, ...data }));
      setMessages(prev => [...prev, { role: 'assistant', content: data.response_message }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Problema al conectar. Intentá de nuevo.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(caseData),
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
      const stored = sessionStorage.getItem('lh_paid_order');
      if (stored) {
        try {
          const { plan } = JSON.parse(stored);
          setPaid(true);
          if (plan === 'monthly') setCreditsLeft(999);
          setShowPaywall(false);
          // Limpiar URL sin recargar
          window.history.replaceState({}, '', '/');
        } catch { /* ignore */ }
      }
    }
  }, []);

  // Iniciar pago real con MercadoPago
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
        // Guardar datos del caso en sessionStorage antes de redirigir
        sessionStorage.setItem('lh_case_data', JSON.stringify(caseData));
        // Redirigir a MercadoPago checkout
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
    const fileName = `escrito-legal-${caseData.nombre?.replace(/\s+/g, '-').toLowerCase() ?? 'documento'}`;
    downloadLegalPdf(generatedDoc, fileName);
  };

  const val = (v: string | null) => v ?? '[Pendiente]';

  return (
    <div className="min-h-screen bg-[#f5f3ef]" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>

      {/* NAV */}
      <nav className="bg-[#0b1f3a] border-b border-[#c9a84c]/30">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[#c9a84c] font-bold text-xl tracking-tight">⚖ Legalhelp</span>
            <span className="hidden sm:inline text-[#c9a84c]/50 text-xs ml-1 uppercase tracking-widest font-light" style={{ fontFamily: 'sans-serif' }}>Chile</span>
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
            {[`🎁 ${creditsLeft > 0 && !paid ? `${creditsLeft} consultas gratis restantes` : paid ? 'Plan activo' : 'Activá tu plan'}`,
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
                      : creditsLeft > 0
                        ? `En línea · ${creditsLeft} consulta${creditsLeft !== 1 ? 's' : ''} gratis restante${creditsLeft !== 1 ? 's' : ''}`
                        : 'Límite alcanzado · activá tu plan'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#faf9f7]">
              {messages.length === 0 && (
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
                  {generatedDoc ? 'Documento generado con IA' : 'Formato profesional · Redacción en tiempo real'}
                </div>
              </div>
              {caseData.ready && (
                <span className="bg-emerald-500 text-white text-xs px-2.5 py-1 rounded-full font-medium" style={{ fontFamily: 'sans-serif' }}>✓ Listo</span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto bg-white px-7 py-6">

              {/* ── Generated full document ── */}
              {generating && (
                <div className="h-full flex flex-col items-center justify-center gap-3">
                  <div className="flex gap-1.5">
                    {[0,150,300].map(d => (
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

              {/* ── Vista previa en tiempo real — formato escrito judicial ── */}
              {!generatedDoc && !generating && (
                <div style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '13px', lineHeight: '2', color: '#111' }}>

                  {/* Fecha — derecha */}
                  <p style={{ textAlign: 'right', marginBottom: '16px', color: '#4a4030' }}>
                    Santiago, {todayChile()}
                  </p>

                  {/* EN LO PRINCIPAL (materia como sumilla, si existe) */}
                  {caseData.materia && (
                    <p style={{ marginBottom: '12px', fontSize: '12px', color: '#555' }}>
                      <span style={{ fontWeight: 'bold' }}>EN LO PRINCIPAL:</span>{' '}
                      {caseData.materia}.
                    </p>
                  )}

                  {/* Destinatario — centrado, mayúsculas */}
                  <p style={{ textAlign: 'center', fontWeight: 'bold', textTransform: 'uppercase',
                    letterSpacing: '0.04em', marginBottom: '4px',
                    color: caseData.destinatario ? '#111' : '#ccc' }}>
                    {caseData.destinatario ?? 'SEÑOR(A) JUEZ(A) / INSTITUCIÓN'}
                  </p>
                  <p style={{ textAlign: 'center', marginBottom: '20px', color: '#555', fontSize: '12px' }}>
                    PRESENTE
                  </p>

                  {/* Compareciente */}
                  <p style={{ textAlign: 'justify', marginBottom: '16px' }}>
                    <span style={{ color: caseData.nombre ? '#111' : '#ccc' }}>
                      {caseData.nombre?.toUpperCase() ?? '[NOMBRE DEL SOLICITANTE]'}
                    </span>
                    {', RUT '}
                    <span style={{ color: caseData.rut ? '#111' : '#ccc' }}>
                      {caseData.rut ?? '[RUT]'}
                    </span>
                    {', domiciliado en '}
                    <span style={{ color: caseData.direccion ? '#111' : '#ccc' }}>
                      {caseData.direccion ?? '[domicilio]'}
                    </span>
                    {', a US. respetuosamente digo:'}
                  </p>

                  <hr style={{ border: 'none', borderTop: '1px solid #e8e2d8', margin: '12px 0' }} />

                  {/* Hechos */}
                  <p style={{ fontWeight: 'bold', textTransform: 'uppercase',
                    fontSize: '11px', letterSpacing: '0.05em', marginBottom: '8px' }}>
                    I. Antecedentes de hecho
                  </p>
                  <p style={{ textAlign: 'justify', color: caseData.hechos ? '#111' : '#ccc',
                    fontStyle: caseData.hechos ? 'normal' : 'italic', marginBottom: '16px' }}>
                    {caseData.hechos ?? 'Que… [se completará con los hechos que indique el solicitante]'}
                  </p>

                  <hr style={{ border: 'none', borderTop: '1px solid #e8e2d8', margin: '12px 0' }} />

                  {/* Fundamento legal placeholder */}
                  <p style={{ fontWeight: 'bold', textTransform: 'uppercase',
                    fontSize: '11px', letterSpacing: '0.05em', marginBottom: '8px' }}>
                    II. Fundamento legal
                  </p>
                  <p style={{ textAlign: 'justify', color: caseData.ley_citada ? '#111' : '#ccc',
                    fontStyle: caseData.ley_citada ? 'normal' : 'italic', marginBottom: '16px' }}>
                    {caseData.ley_citada ?? '[La ley aplicable será determinada por el asistente]'}
                  </p>

                  <hr style={{ border: 'none', borderTop: '1px solid #e8e2d8', margin: '12px 0' }} />

                  <p style={{ marginBottom: '6px' }}>
                    <span style={{ fontWeight: 'bold' }}>POR TANTO,</span>
                  </p>
                  <p style={{ textAlign: 'justify', color: '#aaa', fontStyle: 'italic' }}>
                    RUEGO A US.: [petición concreta — se generará al finalizar]
                  </p>

                  {/* Campos pendientes */}
                  {caseData.campos_faltantes.length > 0 && (
                    <div style={{ marginTop: '20px', padding: '10px 12px',
                      border: '1px dashed #c9a84c', borderRadius: '8px', background: '#fdf9f0' }}>
                      <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#9a8054',
                        fontFamily: 'sans-serif', marginBottom: '4px' }}>
                        Datos que faltan:
                      </p>
                      <p style={{ fontSize: '11px', color: '#b09a6e', fontFamily: 'sans-serif' }}>
                        {caseData.campos_faltantes.join(' · ')}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-[#ddd8cc] bg-[#f5f3ef] py-4">
        <div className="max-w-4xl mx-auto px-6 flex flex-wrap justify-center gap-6 text-xs text-[#9a9185]" style={{ fontFamily: 'sans-serif' }}>
          {['🔒 SSL Certificado','🇨🇱 Válido en todo Chile','⚖ Marco legal actualizado 2026'].map(t => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </footer>

      {/* ── PAYWALL MODAL ───────────────────────────────────────────────────── */}
      {showPaywall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(11,31,58,0.75)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

            {/* Header */}
            <div className="bg-[#0b1f3a] px-6 py-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[#c9a84c] text-xl">⚖</span>
                <span className="text-white font-bold text-lg" style={{ fontFamily: 'sans-serif' }}>Legalhelp</span>
              </div>
              {caseData.ready ? (
                <p className="text-[#a8b8cc] text-sm" style={{ fontFamily: 'sans-serif' }}>
                  Tu documento está listo para generarse
                </p>
              ) : (
                <p className="text-[#a8b8cc] text-sm" style={{ fontFamily: 'sans-serif' }}>
                  Alcanzaste el límite de consultas gratuitas
                </p>
              )}
            </div>

            <div className="px-6 py-5" style={{ fontFamily: 'sans-serif' }}>

              {/* Doc summary if ready */}
              {caseData.ready && caseData.materia && (
                <div className="mb-4 bg-[#f5f3ef] rounded-xl p-3 border border-[#e8e2d8]">
                  <p className="text-xs text-[#8a7f72] uppercase tracking-wider mb-1">Documento a generar</p>
                  <p className="text-[#0b1f3a] font-semibold text-sm capitalize">{caseData.materia}</p>
                  <p className="text-xs text-[#8a7f72] mt-0.5">Para: {caseData.nombre}</p>
                </div>
              )}

              {/* Plans */}
              <div className="space-y-3 mb-5">

                {/* Pay per doc */}
                <button
                  onClick={() => handlePayment('single')}
                  disabled={paymentLoading}
                  className="w-full text-left border-2 border-[#c9a84c] rounded-xl p-4 hover:bg-[#fdf9f0] transition group disabled:opacity-60">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-[#0b1f3a] text-base">Documento único</p>
                      <p className="text-xs text-[#8a7f72] mt-0.5">Genera y descarga este documento en PDF</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#c9a84c] font-bold text-xl">
                        {DOC_TYPES.find(d => d.id === selectedDoc)?.price ?? '$13.990'}
                      </p>
                      <p className="text-xs text-[#8a7f72]">pago único</p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-[#e8e2d8] flex items-center gap-2">
                    <img src="https://www.webpay.cl/img/logo-webpay.png" alt="WebPay"
                      className="h-5 opacity-70" onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} />
                    <span className="text-xs text-[#8a7f72]">Pago seguro con WebPay / Tarjeta</span>
                  </div>
                </button>

                {/* Monthly plan */}
                <button
                  onClick={() => handlePayment('monthly')}
                  disabled={paymentLoading}
                  className="w-full text-left border-2 border-[#0b1f3a] rounded-xl p-4 hover:bg-[#f0f3f8] transition relative disabled:opacity-60">
                  <div className="absolute -top-2.5 left-4 bg-[#e05c3a] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                    Más popular
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-[#0b1f3a] text-base">Plan mensual</p>
                      <p className="text-xs text-[#8a7f72] mt-0.5">Documentos ilimitados por 30 días</p>
                      <ul className="mt-1.5 space-y-0.5">
                        {['Todos los tipos de documento','Regeneraciones ilimitadas','Descarga en PDF'].map(f => (
                          <li key={f} className="text-xs text-[#555] flex items-center gap-1">
                            <span className="text-emerald-500">✓</span> {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-[#0b1f3a] font-bold text-xl">$19.990</p>
                      <p className="text-xs text-[#8a7f72]">por mes</p>
                    </div>
                  </div>
                </button>

              </div>

              {/* Loading state */}
              {paymentLoading && (
                <div className="flex items-center justify-center gap-2 py-2 text-sm text-[#8a7f72]">
                  <span className="w-4 h-4 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
                  Redirigiendo a MercadoPago...
                </div>
              )}

              {/* Credits info or close */}
              {creditsLeft > 0 && !caseData.ready && (
                <button onClick={() => setShowPaywall(false)}
                  className="w-full text-center text-xs text-[#9a9185] hover:text-[#555] py-1 transition">
                  Volver ({creditsLeft} consultas gratis restantes)
                </button>
              )}
              {caseData.ready && (
                <button onClick={() => setShowPaywall(false)}
                  className="w-full text-center text-xs text-[#9a9185] hover:text-[#555] py-1 transition">
                  Cancelar
                </button>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
