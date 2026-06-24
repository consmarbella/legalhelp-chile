'use client';

import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { CaseData, Message, DOC_TYPES, EMPTY_CASE } from '@/lib/constants';
import CourtDocument from '@/components/CourtDocument';
import DocumentPreview from '@/components/DocumentPreview';

// Lazy load: solo se descarga cuando el usuario abre el paywall o descarga
const PaywallModal = lazy(() => import('@/components/PaywallModal'));
const DevBypassModal = lazy(() => import('@/components/DevBypassModal'));

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
  const [showDevBypass, setShowDevBypass] = useState(false);
  const devClickCount = useRef(0);
  const devClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (caseData.ready && !paid && !previewDoc && !generating) {
      handleGeneratePreview();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseData.ready]);

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
        if (stored) {
          const orderData = JSON.parse(stored);
          if (orderData?.orderId && orderData?.paidAt) setPaid(true);
        }
        setShowPaywall(false);
        window.history.replaceState({}, '', '/');
      } catch { /* ignore */ }
    }
  }, []);

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

  const handleDownload = async () => {
    if (!generatedDoc) return;
    const { downloadLegalPdf } = await import('@/lib/generatePdf');
    const nombreStr = String(caseData.nombre ?? 'documento');
    const fileName = `escrito-legal-${nombreStr.replace(/\s+/g, '-').toLowerCase()}`;
    downloadLegalPdf(generatedDoc, fileName);
  };

  const handleDownloadWord = async () => {
    if (!generatedDoc) return;
    const { downloadLegalDocx } = await import('@/lib/generateDocx');
    const nombreStr = String(caseData.nombre ?? 'documento');
    const fileName = `escrito-legal-${nombreStr.replace(/\s+/g, '-').toLowerCase()}`;
    await downloadLegalDocx(generatedDoc, fileName);
  };

  const statusText = paid
    ? 'PLAN ACTIVO · DOCUMENTOS ILIMITADOS'
    : 'SISTEMA EN LÍNEA · NÚCLEO IA OPERATIVO';

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

  return (
    <div className="min-h-screen text-white">
      {/* Estilos de glow inyectados directamente - NO pasan por Tailwind purge */}
      <style dangerouslySetInnerHTML={{ __html: `
        .lg-glow-logo { filter: drop-shadow(0 0 14px rgba(0,212,255,0.8)) drop-shadow(0 0 35px rgba(0,212,255,0.4)); }
        .lg-glow-title { text-shadow: 0 0 25px rgba(255,255,255,0.6), 0 0 60px rgba(255,255,255,0.2); }
        .lg-glow-cyan { text-shadow: 0 0 30px rgba(0,212,255,0.7), 0 0 70px rgba(0,212,255,0.3); color: #00d4ff; }
        .lg-glow-status { text-shadow: 0 0 14px rgba(0,212,255,0.9), 0 0 35px rgba(0,212,255,0.5); color: #00d4ff; }
        .lg-glow-pill { border-color: rgba(0,212,255,0.5) !important; box-shadow: 0 0 24px rgba(0,212,255,0.4), inset 0 0 12px rgba(0,212,255,0.12); }
        .lg-glow-badge { border-color: rgba(0,212,255,0.4) !important; box-shadow: 0 0 16px rgba(0,212,255,0.3); text-shadow: 0 0 8px rgba(0,212,255,0.6); }
        .lg-glow-panel { border-color: rgba(96,165,250,0.3) !important; box-shadow: 0 0 0 1px rgba(5,7,15,0.4), 0 20px 60px -20px rgba(0,212,255,0.4), inset 0 1px 0 rgba(96,165,250,0.15); }
        .lg-glow-panel:hover { border-color: rgba(0,212,255,0.7) !important; box-shadow: 0 0 0 1px rgba(0,212,255,0.4), 0 0 45px -6px rgba(0,212,255,0.55), inset 0 1px 0 rgba(0,212,255,0.25); }
        .lg-glow-selected { border-color: rgba(0,212,255,0.9) !important; box-shadow: 0 0 0 1px rgba(0,212,255,0.6), 0 0 50px -4px rgba(0,212,255,0.6), inset 0 1px 0 rgba(0,212,255,0.3) !important; }
        .lg-status-dot { width:7px; height:7px; border-radius:9999px; background:#00d4ff; box-shadow: 0 0 14px 3px rgba(0,212,255,0.9), 0 0 30px 6px rgba(0,212,255,0.4); animation: lg-pulse 1.8s ease-in-out infinite; }
        @keyframes lg-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.8)} }
      `}} />
      <link rel="canonical" href="https://legalhelp.cl" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            url: "https://legalhelp.cl",
            name: "LegalHelp Chile",
            description: "Documentos legales con inteligencia artificial para Chile",
            inLanguage: "es-CL",
          }),
        }}
      />

      {/* Nav viene del layout global */}

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <header className="pt-16 pb-12">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#00d4ff]/40 bg-[#00d4ff]/10 mb-6 lg-glow-pill">
            <span className="lg-status-dot cursor-pointer" onClick={handleDevClick} />
            <span className="hud-label text-cyan lg-glow-status">{statusText}</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold leading-[1.05] tracking-tight mb-5 lg-glow-title">
            Sistema de Redacción<br />
            <span className="text-cyan lg-glow-cyan">Legal Inteligente</span>
          </h1>
          <p className="text-white text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            Documentos judiciales chilenos generados por inteligencia artificial,
            en tiempo real. Describe tu caso y el núcleo redacta el escrito exacto,
            con la ley correcta y formato listo para presentar.
          </p>
          <div className="flex flex-wrap justify-center gap-2.5 mt-7">
            {['✦ Consulta gratuita', '🔒 Datos cifrados', '⚖ Formato judicial chileno'].map(b => (
              <span key={b} className="text-xs px-3 py-1.5 rounded-full border border-[#00d4ff]/30 bg-[#00d4ff]/8 text-white lg-glow-badge">
                {b}
              </span>
            ))}
          </div>

          {/* CTA único */}
          <div className="flex justify-center mt-10">
            <div className="max-w-[300px] rounded-xl border-2 border-[#00d4ff]/60 bg-[#00d4ff]/10 p-5 text-center lg-glow-pill cursor-default">
              <div className="text-2xl mb-2">📄</div>
              <div className="text-white font-bold text-sm">Documentos Legales con IA</div>
              <div className="text-[#9ab0cc] text-xs mt-1">Cartas, poderes, finiquitos, reclamos, recursos y más</div>
              <div className="text-[#00d4ff] text-xs font-mono mt-2">Desde $7.990</div>
            </div>
          </div>
        </div>
      </header>

      {/* ── SELECTOR DE MÓDULOS (8 paneles) ─────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-4">
        <div className="flex items-center gap-3 mb-5">
          <span className="hud-label text-[#60a5fa]/70">Selecciona un módulo</span>
          <div className="flex-1 h-px bg-gradient-to-r from-[#60a5fa]/25 to-transparent" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {DOC_TYPES.map(doc => (
            <button
              key={doc.id}
              onClick={() => setSelectedDoc(doc.id)}
              className={`glass-panel glass-panel-hover ${selectedDoc === doc.id ? 'panel-selected' : ''} text-left rounded-xl p-4 transition-all cursor-pointer relative overflow-hidden`}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg mb-3 border border-[#60a5fa]/20 bg-[#00d4ff]/5">
                {doc.icon}
              </div>
              <div className="font-semibold text-white text-sm leading-tight">{doc.label}</div>
              <div className="text-[#9ab0cc] text-xs mt-1">{doc.desc}</div>
              <div className="text-cyan font-mono font-semibold text-xs mt-3">{doc.price}</div>
            </button>
          ))}
        </div>
      </section>

      {/* ── VENTANAS DEL SISTEMA OPERATIVO ──────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[560px]">

          {/* ASISTENTE JURÍDICO */}
          <div className="glass-panel rounded-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#60a5fa]/15 bg-[#0d1426]/60">
              <div className="flex items-center gap-2">
                <span className="window-dot bg-[#ff5f57]" />
                <span className="window-dot bg-[#febc2e]" />
                <span className="window-dot bg-[#28c840]" />
                <span className="hud-label text-[#9ab0cc] ml-2">asistente_juridico.exe</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="lg-status-dot" />
                <span className="hud-label text-cyan">{paid ? 'ILIMITADO' : 'EN LÍNEA'}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.length === 0 && (
                <div className="h-full flex items-center justify-center">
                  <p className="text-[#9ab0cc] text-sm text-center">
                    Cuéntanos qué necesitas resolver.<br />
                    <span className="text-xs text-[#7a90aa]">El núcleo te hará algunas preguntas para redactar tu documento.</span>
                  </p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[#00d4ff]/15 border border-[#00d4ff]/30 text-white rounded-br-sm'
                      : 'bg-[#0d1426]/80 border border-[#60a5fa]/15 text-white rounded-bl-sm'
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-[#0d1426]/80 border border-[#60a5fa]/15 rounded-2xl rounded-bl-sm px-4 py-3">
                    <span className="flex gap-1">
                      {[0, 150, 300].map(d => (
                        <span key={d} className="w-1.5 h-1.5 rounded-full bg-cyan animate-bounce" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="border-t border-[#60a5fa]/15 bg-[#0d1426]/60 px-3 py-3 flex gap-2">
              <input
                type="text" value={input} onChange={e => setInput(e.target.value)} disabled={loading}
                placeholder="Describe tu caso…"
                className="flex-1 bg-[#05070f]/70 rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#5a6c8a] border border-[#60a5fa]/15 focus:outline-none focus:border-[#00d4ff]/60 disabled:opacity-60"
              />
              <button
                type="submit" disabled={loading || !input.trim()}
                className="bg-[#00d4ff] hover:bg-[#22ddff] disabled:bg-[#2a3550] disabled:text-[#7a90aa] text-[#05070f] font-semibold px-4 py-2.5 rounded-xl text-sm transition"
              >
                Enviar ➤
              </button>
            </form>
          </div>

          {/* VISTA PREVIA DEL DOCUMENTO */}
          <div className="glass-panel rounded-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#60a5fa]/15 bg-[#0d1426]/60">
              <div className="flex items-center gap-2">
                <span className="window-dot bg-[#ff5f57]" />
                <span className="window-dot bg-[#febc2e]" />
                <span className="window-dot bg-[#28c840]" />
                <span className="hud-label text-[#9ab0cc] ml-2">vista_previa.doc</span>
              </div>
              {!!caseData.ready && (
                <span className="hud-label text-cyan flex items-center gap-1.5">
                  <span className="lg-status-dot" /> Listo
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto bg-[#f7f8fb] px-7 py-6 text-[#1a2230]">
              {generating && (
                <div className="h-full flex flex-col items-center justify-center gap-3">
                  <div className="flex gap-1.5">
                    {[0, 150, 300].map(d => (
                      <span key={d} className="w-2 h-2 rounded-full bg-[#00aacc] animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                  <p className="text-[#7a90aa] text-sm">
                    {paid ? 'Preparando tu PDF…' : 'Redactando tu escrito legal…'}
                  </p>
                </div>
              )}

              {generatedDoc && !generating && (
                <div>
                  <CourtDocument text={generatedDoc} />
                  <div className="mt-4 pt-4 border-t border-[#e8e2d8] flex gap-3">
                    <button onClick={handleDownload}
                      className="flex-1 bg-[#05070f] hover:bg-[#101a30] text-white py-2.5 rounded-xl text-sm font-medium transition text-center">
                      ↓ Descargar PDF
                    </button>
                    <button onClick={handleDownloadWord}
                      className="flex-1 bg-white border border-[#0b1f3a] text-[#0b1f3a] hover:bg-[#f0f4fa] py-2.5 rounded-xl text-sm font-medium transition text-center"
                      style={{ fontFamily: 'sans-serif' }}>
                      ↓ Descargar Word
                    </button>
                    <button onClick={() => { setGeneratedDoc(null); handleGenerate(); }}
                      className="px-4 py-2.5 border border-[#cdd6e4] hover:border-[#00aacc] rounded-xl text-sm text-[#7a90aa] transition">
                      ↺ Regenerar
                    </button>
                  </div>
                </div>
              )}

              {previewDoc && !generatedDoc && !generating && (
                <div style={{ position: 'relative' }}>
                  <CourtDocument text={previewDoc} />
                  <div style={{
                    position: 'absolute', top: '65%', left: '-28px', right: '-28px', bottom: '-24px',
                    background: 'linear-gradient(to bottom, transparent 0%, rgba(247,248,251,0.65) 15%, rgba(247,248,251,0.96) 40%)',
                    backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: '40px 20px 24px',
                  }}>
                    <div style={{
                      background: '#05070f', borderRadius: '14px', padding: '18px 24px', textAlign: 'center',
                      boxShadow: '0 8px 32px rgba(0,212,255,0.25)', maxWidth: '280px', width: '100%',
                      border: '1px solid rgba(0,212,255,0.4)',
                    }}>
                      <div style={{ fontSize: '22px', marginBottom: '8px' }}>🔒</div>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', margin: '0 0 6px 0' }}>
                        Tu escrito está redactado
                      </p>
                      <p style={{ fontSize: '11px', color: '#a8c0dc', margin: '0 0 14px 0', lineHeight: '1.5' }}>
                        Revisa el inicio — el documento completo<br />está listo para descargar.
                      </p>
                      <button
                        onClick={() => setShowPaywall(true)}
                        style={{
                          background: '#00d4ff', border: 'none', borderRadius: '8px', padding: '10px 20px',
                          fontSize: '13px', fontWeight: 700, color: '#05070f', cursor: 'pointer', width: '100%',
                        }}>
                        ↓ Desbloquear documento
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!previewDoc && !generatedDoc && !generating && <DocumentPreview caseData={caseData} />}
            </div>
          </div>

        </div>
      </section>

      {/* ── GUÍAS POPULARES ─────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="hud-label text-[#60a5fa]/70">Guías legales populares</span>
          <div className="flex-1 h-px bg-gradient-to-r from-[#60a5fa]/25 to-transparent" />
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { href: '/p/prescripcion-deuda-tag', label: 'Prescripción de deuda TAG' },
            { href: '/p/prescripcion-deuda-bancaria', label: 'Prescripción de deuda bancaria' },
            { href: '/p/demanda-alimentos', label: 'Demanda de alimentos' },
            { href: '/p/carta-reclamo-sernac', label: 'Carta reclamo SERNAC' },
            { href: '/p/denuncia-despido-injustificado', label: 'Denuncia por despido injustificado' },
            { href: '/p/recurso-proteccion', label: 'Recurso de protección' },
            { href: '/p/finiquito-laboral', label: 'Finiquito laboral' },
            { href: '/p/demanda-desalojo', label: 'Demanda de desalojo' },
            { href: '/p/poder-simple', label: 'Poder simple' },
          ].map(({ href, label }) => (
            <a key={href} href={href}
              className="text-xs text-[#c8ddf0] bg-[#0d1426]/50 hover:bg-[#0d1426] hover:text-cyan px-3 py-1.5 rounded-full border border-[#60a5fa]/15 transition-colors">
              {label}
            </a>
          ))}
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer className="border-t border-[#60a5fa]/15 py-5">
        <div className="max-w-4xl mx-auto px-6 flex flex-wrap justify-center gap-6 text-xs text-[#7a90aa]">
          {['🔒 SSL Certificado', '🇨🇱 Válido en todo Chile', '⚖ Marco legal 2026'].map(t => (
            <span key={t}>{t}</span>
          ))}
          <span>📧 contacto@legalhelp.cl</span>
        </div>
      </footer>

      {showPaywall && (
        <Suspense fallback={null}>
          <PaywallModal
            caseData={caseData}
            selectedDoc={selectedDoc}
            paymentLoading={paymentLoading}
            onPayment={handlePayment}
            onTestPayment={handleTestPayment}
            onClose={() => setShowPaywall(false)}
          />
        </Suspense>
      )}

      {showDevBypass && (
        <Suspense fallback={null}>
          <DevBypassModal
            caseData={caseData}
            docId={selectedDoc}
            onBypassed={handleDevBypassed}
            onClose={() => setShowDevBypass(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
