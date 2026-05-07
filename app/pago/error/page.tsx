'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function PagoErrorInner() {
  const params  = useSearchParams();
  const router  = useRouter();
  const orderId = params.get('orderId');

  return (
    <div className="min-h-screen bg-[#0b1f3a] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center" style={{ fontFamily: 'sans-serif' }}>
        <div className="text-5xl mb-4">😔</div>
        <h1 className="text-xl font-bold text-[#0b1f3a] mb-2">Pago no completado</h1>
        <p className="text-sm text-[#8a7f72] mb-4">
          Tu pago no fue procesado. Podés intentarlo nuevamente — tus datos del caso siguen guardados.
        </p>
        {orderId && (
          <p className="text-xs text-[#bbb0a4] mb-4">Referencia: {orderId}</p>
        )}
        <button onClick={() => router.push('/')}
          className="bg-[#0b1f3a] text-white px-5 py-2.5 rounded-xl text-sm font-medium w-full">
          Volver e intentar de nuevo
        </button>
      </div>
    </div>
  );
}

export default function PagoError() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0b1f3a] flex items-center justify-center">
        <div className="flex gap-1.5">
          {[0,150,300].map(d => (
            <span key={d} className="w-3 h-3 rounded-full bg-[#c9a84c] animate-bounce" style={{ animationDelay: `${d}ms` }} />
          ))}
        </div>
      </div>
    }>
      <PagoErrorInner />
    </Suspense>
  );
}
