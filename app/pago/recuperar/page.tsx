'use client';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function RecuperarInner() {
  const params = useSearchParams();
  const [orderId, setOrderId] = useState(params.get('orderId') ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [document, setDocument] = useState<string | null>(null);

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim()) return;
    setLoading(true); setError(''); setDocument(null);
    try {
      const res = await fetch(`/api/recover?orderId=${encodeURIComponent(orderId.trim())}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error'); return; }
      setDocument(data.document);
      sessionStorage.setItem('lh_paid_order', JSON.stringify({ orderId: data.orderId, plan: data.plan, paidAt: data.paidAt }));
    } catch { setError('Error de conexión'); } finally { setLoading(false); }
  };

  const handleDownloadPdf = async () => { if (!document) return; const { downloadLegalPdf } = await import('@/lib/generatePdf'); downloadLegalPdf(document, `documento-recuperado-${orderId.slice(0,8)}`); };
  const handleDownloadWord = async () => { if (!document) return; const { downloadLegalDocx } = await import('@/lib/generateDocx'); await downloadLegalDocx(document, `documento-recuperado-${orderId.slice(0,8)}`); };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-[#0d1426]/80 border border-[#60a5fa]/20 rounded-2xl shadow-2xl max-w-md w-full p-8 backdrop-blur-sm">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">📄</div>
          <h1 className="text-xl font-bold text-white mb-1">Recuperar documento</h1>
          <p className="text-sm text-[#9ab0cc]">Ingresa tu número de orden para recuperar un documento ya pagado.</p>
        </div>
        {!document ? (
          <form onSubmit={handleRecover}>
            <input type="text" value={orderId} onChange={e => setOrderId(e.target.value)} placeholder="ID de orden (ej: a1b2c3d4-...)" autoFocus className="w-full bg-[#05070f] border border-[#60a5fa]/20 rounded-xl px-4 py-3 text-sm text-white placeholder-[#5a6c8a] focus:outline-none focus:border-[#00d4ff]/60 mb-3" />
            {error && <p className="text-red-400 text-xs mb-3 text-center">{error}</p>}
            <button type="submit" disabled={loading || !orderId.trim()} className="w-full bg-[#00d4ff] hover:bg-[#22ddff] disabled:bg-[#2a3550] disabled:text-[#7a90aa] text-[#05070f] font-semibold px-4 py-3 rounded-xl text-sm transition">{loading ? 'Buscando...' : 'Recuperar documento'}</button>
          </form>
        ) : (
          <div>
            <div className="bg-[#05070f] border border-[#60a5fa]/15 rounded-xl p-4 mb-4 max-h-60 overflow-y-auto">
              <pre className="text-xs text-[#c8ddf0] whitespace-pre-wrap font-mono leading-relaxed">{document.slice(0,500)}{document.length > 500 && '\n\n[...]'}</pre>
            </div>
            <div className="flex gap-3 mb-3">
              <button onClick={handleDownloadPdf} className="flex-1 bg-[#00d4ff] hover:bg-[#22ddff] text-[#05070f] font-semibold py-2.5 rounded-xl text-sm transition text-center">↓ PDF</button>
              <button onClick={handleDownloadWord} className="flex-1 bg-white border border-[#60a5fa]/30 text-[#0d1426] hover:bg-[#f0f4fa] font-semibold py-2.5 rounded-xl text-sm transition text-center">↓ Word</button>
            </div>
            <button onClick={() => { setDocument(null); setOrderId(''); setError(''); }} className="w-full text-center text-xs text-[#9ab0cc] hover:text-white py-2 transition">Recuperar otro documento</button>
          </div>
        )}
        <div className="mt-6 pt-4 border-t border-[#60a5fa]/10 text-center">
          <a href="/" className="text-xs text-[#60a5fa] hover:text-[#00d4ff] transition">← Volver al inicio</a>
        </div>
      </div>
    </div>
  );
}

export default function PagoRecuperar() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="flex gap-1.5">{[0,150,300].map(d => <span key={d} className="w-3 h-3 rounded-full bg-[#00d4ff] animate-bounce" style={{ animationDelay: `${d}ms` }} />)}</div></div>}>
      <RecuperarInner />
    </Suspense>
  );
}
