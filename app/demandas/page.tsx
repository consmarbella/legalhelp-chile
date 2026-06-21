'use client';

import { useEffect, useRef, useState } from 'react';
import { downloadLegalPdf } from '@/lib/generatePdf';
import CourtDocument from '@/components/CourtDocument';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface DemandaCaseData {
  response_message?: string;
  materia_detectada?: string | null;
  viable?: boolean | null;
  motivo_no_viable?: string | null;
  datos_recopilados?: Record<string, unknown>;
  datos_faltantes?: string[];
  ready?: boolean;
  derivar_abogado?: boolean;
}

export default function DemandasPage() {
  const [caseData, setCaseData] = useState<DemandaCaseData>({});
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedDoc, setGeneratedDoc] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [docMeta, setDocMeta] = useState<{ materia: string; tribunal: string; ticket: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cuando ready=true, generar el escrito
  useEffect(() => {
    if (caseData.ready && !generatedDoc && !generating) {
      handleGenerate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseData.ready]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const text = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setLoading(true);

    try {
      const res = await fetch('/api/demandas/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, caseHistory: messages, currentCaseData: caseData }),
      });
      if (!res.ok) throw new Error();
      const data: DemandaCaseData = await res.json();
      setCaseData(prev => ({ ...prev, ...data }));
      setMessages(prev => [...prev, { role: 'assistant', content: String(data.response_message ?? '') }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Problema al conectar. Intenta de nuevo.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/demandas/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(caseData),
      });
      const data = await res.json();
      if (data.document) {
        setGeneratedDoc(data.document);
        setDocMeta({ materia: data.materia, tribunal: data.tribunal, ticket: data.ticket });
      }
    } catch {
      console.error('Error generando demanda');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedDoc) return;
    const nombre = String((caseData.datos_recopilados as Record<string, unknown>)?.nombre ?? 'demanda');
    const fileName = `demanda-${nombre.replace(/\s+/g, '-').toLowerCase()}`;
    downloadLegalPdf(generatedDoc, fileName);
  };

  return (
    <div className="min-h-screen bg-[#05070f] text-[#e6f0fa]" style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* NAV */}
      <nav className="border-b border-[#60a5fa]/15">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-baseline tracking-tight font-bold text-xl">
              <span className="text-white">LEGAL</span>
              <span className="text-[#00d4ff]">HELP</span>
            </a>
            <span className="text-[#60a5fa]/50 text-xs ml-4">|</span>
            <span className="text-[#00d4ff] text-xs font-mono uppercase tracking-widest ml-2">Demandas</span>
          </div>
          <a href="/" className="text-xs text-[#60a5fa]/60 hover:text-[#00d4ff] transition">
            ← Documentos simples
          </a>
        </div>
      </nav>

      {/* HERO */}
      <header className="pt-10 pb-8 border-b border-[#60a5fa]/10">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#00d4ff]/25 bg-[#00d4ff]/5 mb-4">
            <span className="w-[7px] h-[7px] rounded-full bg-[#00d4ff] shadow-[0_0_10px_1px_rgba(0,212,255,0.8)] animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#00d4ff]">
              Módulo de demandas · Autorepresentación
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight tracking-tight mb-3">
            Demandas y escritos judiciales<br />
            <span className="text-[#00d4ff]">sin abogado</span>
          </h1>
          <p className="text-[#a8c0dc] text-sm max-w-xl mx-auto leading-relaxed">
            Para materias donde la ley chilena permite autorepresentación (JPL, recurso de protección,
            mínima cuantía). La IA analiza tu caso, verifica viabilidad y genera el escrito completo
            con jurisprudencia real.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {['⚖ Viabilidad verificada', '📚 Jurisprudencia real', '📄 Listo para el tribunal', '🔒 Derivamos si necesitas abogado'].map(b => (
              <span key={b} className="text-xs px-3 py-1.5 rounded-full border border-[#60a5fa]/20 bg-[#0d1426]/50 text-[#a8c0dc]">{b}</span>
            ))}
          </div>
        </div>
      </header>

      {/* MAIN */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[560px]">

          {/* CHAT */}
          <div className="rounded-2xl overflow-hidden flex flex-col border border-[#60a5fa]/18 bg-[rgba(13,20,38,0.55)] backdrop-blur-[14px]">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#60a5fa]/15 bg-[#0d1426]/60">
              <div className="flex items-center gap-2">
                <span className="w-[9px] h-[9px] rounded-full bg-[#ff5f57] inline-block" />
                <span className="w-[9px] h-[9px] rounded-full bg-[#febc2e] inline-block" />
                <span className="w-[9px] h-[9px] rounded-full bg-[#28c840] inline-block" />
                <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#7e93b5] ml-2">demandas_ai.exe</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-[7px] h-[7px] rounded-full bg-[#00d4ff] shadow-[0_0_10px_1px_rgba(0,212,255,0.8)] animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#00d4ff]">En línea</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.length === 0 && (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-[#7e93b5] text-sm mb-2">Cuéntame tu situación legal.</p>
                    <p className="text-[#5a6c8a] text-xs">
                      Verificaré si puedes presentar tu caso sin abogado,<br />
                      te pediré los antecedentes y redactaré el escrito.
                    </p>
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[#00d4ff]/15 border border-[#00d4ff]/30 text-white rounded-br-sm'
                      : 'bg-[#0d1426]/80 border border-[#60a5fa]/15 text-[#cfe0f2] rounded-bl-sm'
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
                        <span key={d} className="w-1.5 h-1.5 rounded-full bg-[#00d4ff] animate-bounce" style={{ animationDelay: `${d}ms` }} />
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
              <button type="submit" disabled={loading || !input.trim()}
                className="bg-[#00d4ff] hover:bg-[#22ddff] disabled:bg-[#2a3550] disabled:text-[#5a6c8a] text-[#05070f] font-semibold px-4 py-2.5 rounded-xl text-sm transition">
                Enviar ➤
              </button>
            </form>
          </div>

          {/* DOCUMENTO */}
          <div className="rounded-2xl overflow-hidden flex flex-col border border-[#60a5fa]/18 bg-[rgba(13,20,38,0.55)] backdrop-blur-[14px]">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#60a5fa]/15 bg-[#0d1426]/60">
              <div className="flex items-center gap-2">
                <span className="w-[9px] h-[9px] rounded-full bg-[#ff5f57] inline-block" />
                <span className="w-[9px] h-[9px] rounded-full bg-[#febc2e] inline-block" />
                <span className="w-[9px] h-[9px] rounded-full bg-[#28c840] inline-block" />
                <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#7e93b5] ml-2">escrito_judicial.doc</span>
              </div>
              {caseData.materia_detectada && (
                <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#00d4ff]">
                  {caseData.materia_detectada}
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
                  <p className="text-[#5a6c8a] text-sm">Redactando tu escrito judicial…</p>
                  <p className="text-[#8a9ab5] text-xs">Analizando jurisprudencia y fundamentando</p>
                </div>
              )}

              {generatedDoc && !generating && (
                <div>
                  {docMeta && (
                    <div className="mb-4 p-3 bg-[#eef4ff] border border-[#c0d4f0] rounded-lg text-xs text-[#3a5070]">
                      <strong>{docMeta.materia}</strong> · Tribunal: {docMeta.tribunal} · Valor: ${docMeta.ticket.toLocaleString('es-CL')}
                    </div>
                  )}
                  <CourtDocument text={generatedDoc} />
                  <div className="mt-4 pt-4 border-t border-[#e8e2d8] flex gap-3">
                    <button onClick={handleDownload}
                      className="flex-1 bg-[#05070f] hover:bg-[#101a30] text-white py-2.5 rounded-xl text-sm font-medium transition text-center">
                      ↓ Descargar PDF
                    </button>
                    <button onClick={() => { setGeneratedDoc(null); handleGenerate(); }}
                      className="px-4 py-2.5 border border-[#cdd6e4] hover:border-[#00aacc] rounded-xl text-sm text-[#5a6c8a] transition">
                      ↺ Regenerar
                    </button>
                  </div>
                </div>
              )}

              {!generatedDoc && !generating && (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
                  <div className="text-4xl">⚖️</div>
                  <p className="text-[#7e93b5] text-sm">Tu escrito judicial aparecerá aquí</p>
                  <p className="text-[#a0b0c5] text-xs max-w-xs">
                    Cuando el asistente termine de recopilar tus datos y verifique la viabilidad,
                    generará el escrito completo con la ley aplicable.
                  </p>
                  {caseData.viable === false && (
                    <div className="mt-3 p-3 bg-[#fff5f5] border border-[#ffcccc] rounded-lg text-xs text-[#a03030]">
                      ⚠️ {caseData.motivo_no_viable || 'Este caso requiere abogado. Te derivaremos a nuestra red.'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* DISCLAIMER */}
      <div className="max-w-4xl mx-auto px-6 py-4">
        <div className="bg-[#0d1426]/50 border border-[#60a5fa]/15 rounded-xl px-5 py-3 flex gap-3 items-start">
          <span className="text-lg leading-tight mt-0.5">⚠️</span>
          <p className="text-xs text-[#7e93b5] leading-relaxed">
            <strong>Aviso legal:</strong> Este módulo genera escritos para materias donde la ley chilena permite
            autorepresentación. NO constituye asesoría legal profesional. Para casos complejos o que requieran
            patrocinio de abogado, te derivaremos a un profesional de nuestra red. Verifica siempre los plazos
            con el tribunal correspondiente.
          </p>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-[#60a5fa]/15 py-5 mt-6">
        <div className="max-w-4xl mx-auto px-6 flex flex-wrap justify-center gap-6 text-xs text-[#5a6c8a]">
          <span>🔒 SSL Certificado</span>
          <span>🇨🇱 Válido en todo Chile</span>
          <span>⚖ Marco legal 2026</span>
          <span>📧 contacto@legalhelp.cl</span>
        </div>
      </footer>
    </div>
  );
}
