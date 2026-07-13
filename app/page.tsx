'use client';

import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { Message, DOC_TYPES } from '@/lib/constants';

// Lazy load: solo se descarga cuando el usuario abre el paywall
const PaywallModal = lazy(() => import('@/components/PaywallModal'));
const DevBypassModal = lazy(() => import('@/components/DevBypassModal'));

export default function Home() {
  const [messages, setMessages]         = useState<Message[]>([]);
  const [input, setInput]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [selectedDoc, setSelectedDoc]   = useState<string | null>(null);
  const [paid, setPaid]                 = useState(false);
  const [showPaywall, setShowPaywall]   = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showDevBypass, setShowDevBypass] = useState(false);

  // Texto crudo de Gemini para el panel de preview
  const [ultimoTextoCrudo, setUltimoTextoCrudo] = useState<string>('');

  const devClickCount = useRef(0);
  const devClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const text = input.trim();
    setInput('');
    const updatedHistory: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(updatedHistory);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: updatedHistory }),
      });
      if (!res.ok) throw new Error('Error en la respuesta del servidor');
      const data = await res.json();

      const botText = data.textoCrudo ?? '';
      setMessages(prev => [...prev, { role: 'assistant', content: botText }]);
      setUltimoTextoCrudo(botText);

      // Si Gemini activa el código [COBRAR], abrir pasarela de pago
      if (data.triggerPayment) {
        setShowPaywall(true);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Problema al conectar. Intenta de nuevo.' }]);
    } finally {
      setLoading(false);
    }
  };

  // Restore session after MercadoPago return
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('paid') === '1') {
      const stored = sessionStorage.getItem('lh_paid_order');
      const storedMsgs = sessionStorage.getItem('lh_messages');
      try {
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
        body: JSON.stringify({ plan, docId: selectedDoc }),
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        sessionStorage.setItem('lh_messages', JSON.stringify(messages));
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
        body: JSON.stringify({ plan, docId: selectedDoc }),
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
      {/* Estilos de glow */}
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

      {/* ── VENTANAS DEL SISTEMA (doble panel) ──────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* ASISTENTE JURÍDICO (CHAT) */}
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

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ minHeight: '400px', maxHeight: '500px' }}>
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
                  <div className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
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
              {ultimoTextoCrudo && (
                <span className="hud-label text-cyan flex items-center gap-1.5">
                  <span className="lg-status-dot" /> Activo
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto bg-[#f7f8fb] px-7 py-6 text-[#1a2230]" style={{ minHeight: '400px', maxHeight: '500px' }}>
              {ultimoTextoCrudo ? (
                <div className="prose prose-sm max-w-none prose-headings:text-[#0b1f3a] prose-p:text-[#1a2230] prose-strong:text-[#0b1f3a]">
                  {ultimoTextoCrudo.split('\n').map((line, i) => {
                    if (!line.trim()) return <br key={i} />;
                    // Renderizar encabezados simples
                    if (line.startsWith('### ')) return <h3 key={i} className="text-base font-bold mt-4 mb-1">{line.slice(4)}</h3>;
                    if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-bold mt-5 mb-2">{line.slice(3)}</h2>;
                    if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-bold mt-6 mb-3">{line.slice(2)}</h1>;
                    if (line.startsWith('- ')) return <li key={i} className="ml-4 text-sm">{line.slice(2)}</li>;
                    if (line.match(/^\d+\.\s/)) return <li key={i} className="ml-4 text-sm list-decimal">{line.replace(/^\d+\.\s/, '')}</li>;
                    return <p key={i} className="text-sm leading-relaxed mb-1">{line}</p>;
                  })}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-[#9ab0cc] text-sm text-center">
                    Aquí aparecerá el borrador<br />
                    <span className="text-xs text-[#7a90aa]">enviado por el asistente jurídico.</span>
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ── BOTÓN DE PAGO FUERA DEL CHAT ──────────────────────────── */}
        <div className="flex justify-center mt-8">
          <button
            onClick={() => setShowPaywall(true)}
            disabled={paid}
            className={`${
              paid
                ? 'bg-emerald-600 cursor-default'
                : 'bg-[#00d4ff] hover:bg-[#22ddff] hover:shadow-[0_0_30px_rgba(0,212,255,0.5)]'
            } text-[#05070f] font-bold py-3.5 px-8 rounded-xl text-base transition shadow-[0_0_15px_rgba(0,212,255,0.3)]`}
          >
            {paid ? '✅ Documento Pagado' : '💳 Pagar y Descargar Documento Oficial'}
          </button>
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
            docId={selectedDoc}
            onBypassed={handleDevBypassed}
            onClose={() => setShowDevBypass(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
