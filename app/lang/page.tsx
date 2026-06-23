'use client';

import { useEffect, useRef, useState } from 'react';

interface Message { role: 'user' | 'assistant'; content: string; }

export default function LangPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<Record<string, unknown>>({});
  const [ready, setReady] = useState(false);
  const [document, setDocument] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Auto-generate when ready
  useEffect(() => {
    if (ready && !document && !generating) handleGenerate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setLoading(true);

    try {
      const res = await fetch('/api/lang/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, caseHistory: messages, currentState: state }),
      });
      const data = await res.json();
      setState(prev => ({ ...prev, ...data }));
      setMessages(prev => [...prev, { role: 'assistant', content: data.response_message || '' }]);
      if (data.ready) setReady(true);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error de conexión.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/lang/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datos: state.datos || state }),
      });
      const data = await res.json();
      if (data.document) setDocument(data.document);
    } catch { console.error('Error generando'); }
    finally { setGenerating(false); }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-white mb-1">LegalHelp <span className="text-[#00d4ff]">LangGraph</span></h1>
          <p className="text-sm text-[#9ab0cc]">Pipeline: Recopilador → Clasificador → Validador → Redactor → Filtro</p>
          <p className="text-xs text-[#5a6c8a] mt-1">Versión experimental con DeepSeek + 5 nodos especializados</p>
        </div>

        {/* Chat */}
        <div className="border border-[#60a5fa]/20 rounded-xl overflow-hidden bg-[#0d1426]/80 mb-4">
          <div className="h-[400px] overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-[#5a6c8a] text-sm text-center mt-20">Describe tu caso legal...</p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-xl px-4 py-2 text-sm ${
                  m.role === 'user' ? 'bg-[#00d4ff]/15 border border-[#00d4ff]/30 text-white' : 'bg-[#0d1426] border border-[#60a5fa]/15 text-[#c8ddf0]'
                }`}>{m.content}</div>
              </div>
            ))}
            {loading && <div className="text-[#00d4ff] text-sm animate-pulse">Pensando...</div>}
            <div ref={endRef} />
          </div>

          <form onSubmit={handleSend} className="border-t border-[#60a5fa]/15 p-3 flex gap-2">
            <input type="text" value={input} onChange={e => setInput(e.target.value)} disabled={loading || !!document}
              placeholder="Describe tu caso..." className="flex-1 bg-[#05070f] rounded-lg px-4 py-2 text-sm text-white placeholder-[#5a6c8a] border border-[#60a5fa]/15 focus:outline-none focus:border-[#00d4ff]/60" />
            <button type="submit" disabled={loading || !input.trim() || !!document}
              className="bg-[#00d4ff] hover:bg-[#22ddff] disabled:bg-[#2a3550] text-[#05070f] font-semibold px-4 py-2 rounded-lg text-sm transition">
              Enviar
            </button>
          </form>
        </div>

        {/* State debug */}
        <div className="border border-[#60a5fa]/10 rounded-lg p-3 mb-4 text-xs text-[#5a6c8a]">
          <strong className="text-[#9ab0cc]">Estado:</strong> ready={String(ready)} | datos={Object.keys((state as Record<string, unknown>).datos || state).length} campos
          {state.tipo_documento && <span> | tipo: {String(state.tipo_documento)}</span>}
        </div>

        {/* Document */}
        {generating && <p className="text-[#00d4ff] text-sm animate-pulse text-center">Generando documento (4 nodos)...</p>}
        {document && (
          <div className="border border-[#60a5fa]/20 rounded-xl p-6 bg-white text-black">
            <pre className="whitespace-pre-wrap font-serif text-sm leading-relaxed">{document}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
