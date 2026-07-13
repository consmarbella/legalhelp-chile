'use client';
import React, { useState } from 'react';

interface DevBypassModalProps {
  caseData: Record<string, unknown>;
  docId?: string | null;
  onBypassed: (orderId: string) => void;
  onClose: () => void;
}

export default function DevBypassModal({ caseData, docId, onBypassed, onClose }: DevBypassModalProps) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/dev/bypass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim(), caseData, docId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error'); return; }
      sessionStorage.setItem('lh_paid_order', JSON.stringify({ orderId: data.orderId, plan: 'single', paidAt: Date.now() }));
      onBypassed(data.orderId);
    } catch { setError('Error de conexión'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(3px)' }}>
      <div className="bg-[#0d1426] border border-[#60a5fa]/30 rounded-xl shadow-2xl w-full max-w-xs p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">🔑</span>
          <h2 className="text-white text-sm font-bold">Acceso Desarrollador</h2>
        </div>
        <form onSubmit={handleSubmit}>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Clave de desarrollador" autoFocus className="w-full bg-[#05070f] border border-[#60a5fa]/20 rounded-lg px-3 py-2 text-sm text-white placeholder-[#5a6c8a] focus:outline-none focus:border-[#00d4ff]/60 mb-3" />
          {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={loading || !password.trim()} className="flex-1 bg-[#00d4ff] hover:bg-[#22ddff] disabled:bg-[#2a3550] disabled:text-[#7a90aa] text-[#05070f] font-semibold px-3 py-2 rounded-lg text-xs transition">{loading ? 'Verificando...' : 'Entrar'}</button>
            <button type="button" onClick={onClose} className="px-3 py-2 border border-[#60a5fa]/20 text-[#9ab0cc] rounded-lg text-xs hover:border-[#60a5fa]/40 transition">Cancelar</button>
          </div>
        </form>
        <p className="text-[#5a6c8a] text-[10px] mt-3 text-center">Genera documentos sin pago para pruebas</p>
      </div>
    </div>
  );
}
