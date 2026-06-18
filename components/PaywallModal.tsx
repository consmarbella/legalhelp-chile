'use client';

import React from 'react';
import { CaseData, DOC_TYPES } from '@/lib/constants';

interface PaywallModalProps {
  caseData: CaseData;
  selectedDoc: string | null;
  paymentLoading: boolean;
  onPayment: (plan: 'single' | 'monthly') => void;
  onClose: () => void;
}

export default function PaywallModal({ caseData, selectedDoc, paymentLoading, onPayment, onClose }: PaywallModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(11,31,58,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-[#0b1f3a] px-6 py-5">
          <div className="flex items-center gap-2">
            <svg width="22" height="26" viewBox="0 0 38 44" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="lgBm" x1="0" y1="0" x2="38" y2="44" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#1a56db"/>
                  <stop offset="100%" stopColor="#60a5fa"/>
                </linearGradient>
              </defs>
              <path d="M2 2 L13 2 L13 26 L36 26 L36 34 Q19 44 2 36 Z" fill="url(#lgBm)"/>
              <rect x="14" y="2" width="5" height="24" fill="white" rx="0.5"/>
              <rect x="27" y="2" width="5" height="24" fill="white" rx="0.5"/>
              <rect x="14" y="11" width="18" height="5" fill="white" rx="0.5"/>
            </svg>
            <div style={{ fontFamily: "'Arial Black', 'Arial', sans-serif", fontWeight: 900 }}>
              <span className="text-white text-lg">LEGAL</span>
              <span className="text-blue-400 text-lg">HELP</span>
            </div>
          </div>
          {caseData.ready ? (
            <p className="text-[#a8b8cc] text-sm mt-1" style={{ fontFamily: 'sans-serif' }}>
              Tu documento está listo para generarse
            </p>
          ) : (
            <p className="text-[#a8b8cc] text-sm mt-1" style={{ fontFamily: 'sans-serif' }}>
              Alcanzaste el límite de consultas gratuitas
            </p>
          )}
        </div>

        <div className="px-6 py-5" style={{ fontFamily: 'sans-serif' }}>
          {/* Doc summary if ready */}
          {!!caseData.ready && !!caseData.tipo_documento && (
            <div className="mb-4 bg-[#f5f3ef] rounded-xl p-3 border border-[#e8e2d8]">
              <p className="text-xs text-[#8a7f72] uppercase tracking-wider mb-1">Documento a generar</p>
              <p className="text-[#0b1f3a] font-semibold text-sm capitalize">{String(caseData.tipo_documento)}</p>
              {!!caseData.nombre && <p className="text-xs text-[#8a7f72] mt-0.5">Para: {String(caseData.nombre)}</p>}
            </div>
          )}

          {/* Plans */}
          <div className="space-y-3 mb-5">
            <button
              onClick={() => onPayment('single')}
              disabled={paymentLoading}
              className="w-full text-left border-2 border-[#c9a84c] rounded-xl p-4 hover:bg-[#fdf9f0] transition group disabled:opacity-60">
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
              <div className="mt-2 pt-2 border-t border-[#e8e2d8] flex items-center gap-2">
                <img src="https://www.webpay.cl/img/logo-webpay.png" alt="WebPay"
                  className="h-5 opacity-70" onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} />
                <span className="text-xs text-[#8a7f72]">Pago seguro con WebPay / Tarjeta</span>
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

          {/* Close button */}
          <button onClick={onClose}
            className="w-full text-center text-xs text-[#9a9185] hover:text-[#555] py-1 transition">
            {caseData.ready ? 'Cancelar' : 'Volver'}
          </button>
        </div>
      </div>
    </div>
  );
}
