'use client';

import { useState } from 'react';

interface LastMileModalProps {
  caseData: any; // We'll pass the routing data from here if it's available
  onClose: () => void;
  onConfirm: (email: string, pass: string, rut: string, claveUnica: string) => Promise<void>;
  loading: boolean;
}

export default function LastMileModal({ caseData, onClose, onConfirm, loading }: LastMileModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rut, setRut] = useState('');
  const [claveUnica, setClaveUnica] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !rut || !claveUnica) return;
    await onConfirm(email, password, rut, claveUnica);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#05070f]/90 backdrop-blur-md"
        onClick={!loading ? onClose : undefined}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-[#0d1426] border border-[#00d4ff]/40 rounded-2xl shadow-[0_0_50px_-12px_rgba(0,212,255,0.4)] overflow-hidden">
        {/* Glow Header */}
        <div className="px-6 py-5 border-b border-[#00d4ff]/20 bg-[#00d4ff]/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00d4ff] to-transparent opacity-50" />
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-[#00d4ff]">⚡</span> Tramitación Automática
          </h2>
          <p className="text-sm text-[#7a90aa] mt-1">
            Nuestro bot radicará este escrito directamente en el tribunal por ti.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          
          <div className="bg-[#101a30] rounded-xl p-4 border border-[#00d4ff]/20 mb-6">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-[#00d4ff]">🛡️</div>
              <div>
                <h4 className="text-sm font-semibold text-white mb-1">Protocolo de Volatilidad Activo</h4>
                <p className="text-xs text-[#7a90aa] leading-relaxed">
                  Tus credenciales viajan encriptadas de extremo a extremo, se usan una única vez en memoria para el login oficial y <strong>se destruyen inmediatamente</strong>. No guardamos tu ClaveÚnica.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-[#05070f]/50 p-4 rounded-xl border border-[#00d4ff]/10 mb-2">
              <h4 className="text-xs font-bold text-[#00d4ff] uppercase tracking-wider mb-3">1. Tu Cuenta LegalHelp</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#c8ddf0] mb-1">Email</label>
                  <input
                    type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="w-full bg-[#05070f]/80 border border-[#60a5fa]/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#00d4ff]/60 transition-colors text-sm"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#c8ddf0] mb-1">Contraseña</label>
                  <input
                    type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#05070f]/80 border border-[#60a5fa]/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#00d4ff]/60 transition-colors text-sm"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#05070f]/50 p-4 rounded-xl border border-[#00d4ff]/10">
              <h4 className="text-xs font-bold text-[#00d4ff] uppercase tracking-wider mb-3">2. Credenciales del Tribunal</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#c8ddf0] mb-1">RUT</label>
                  <input
                    type="text" required value={rut} onChange={(e) => setRut(e.target.value)}
                    placeholder="12.345.678-9"
                    className="w-full bg-[#05070f]/80 border border-[#60a5fa]/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#00d4ff]/60 transition-colors text-sm"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#c8ddf0] mb-1">ClaveÚnica</label>
                  <input
                    type="password" required value={claveUnica} onChange={(e) => setClaveUnica(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#05070f]/80 border border-[#60a5fa]/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#00d4ff]/60 transition-colors text-sm"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-[#60a5fa]/20 text-[#9ab0cc] hover:bg-[#60a5fa]/10 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !rut || !claveUnica || !email || !password}
              className="flex-[2] bg-[#00d4ff] hover:bg-[#22ddff] text-[#05070f] px-4 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,212,255,0.3)] flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-[#05070f]/30 border-t-[#05070f] rounded-full animate-spin" />
                  Procesando...
                </>
              ) : (
                'Pagar $7.999 y Enviar al Poder Judicial'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
