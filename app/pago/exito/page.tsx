'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function PagoExitoInner() {
  const params   = useSearchParams();
  const router   = useRouter();
  const orderId  = params.get('orderId');
  const [estado, setEstado] = useState<'verificando' | 'aprobado' | 'error'>('verificando');
  const [intentos, setIntentos] = useState(0);
  const MAX_INTENTOS = 20; // 20 × 3s = 60 segundos máximo
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!orderId) { setEstado('error'); return; }

    const verificar = async () => {
      try {
        const res  = await fetch(`/api/payment/status?orderId=${orderId}`);
        const data = await res.json();

        if (data.status === 'approved') {
          setEstado('aprobado');
          sessionStorage.setItem('lh_paid_order', JSON.stringify({
            orderId,
            plan: data.plan,
            paidAt: data.paidAt,
          }));
          setTimeout(() => router.push('/?paid=1&orderId=' + orderId), 1500);

        } else if (data.status === 'failed') {
          setEstado('error');

        } else if (intentos < MAX_INTENTOS) {
          setIntentos(i => i + 1);
          timerRef.current = setTimeout(verificar, 3000);
        } else {
          setEstado('error');
        }
      } catch {
        if (intentos < MAX_INTENTOS) {
          setIntentos(i => i + 1);
          timerRef.current = setTimeout(verificar, 3000);
        } else {
          setEstado('error');
        }
      }
    };

    verificar();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[#0b1f3a] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center" style={{ fontFamily: 'sans-serif' }}>

        {estado === 'verificando' && (
          <>
            <div className="flex justify-center gap-1.5 mb-4">
              {[0,150,300].map(d => (
                <span key={d} className="w-3 h-3 rounded-full bg-[#c9a84c] animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
            <h1 className="text-xl font-bold text-[#0b1f3a] mb-2">Verificando pago</h1>
            <p className="text-sm text-[#8a7f72]">Estamos confirmando tu pago con MercadoPago…</p>
            <p className="text-xs text-[#bbb0a4] mt-3">Esto puede tomar unos segundos</p>
          </>
        )}

        {estado === 'aprobado' && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-xl font-bold text-[#0b1f3a] mb-2">¡Pago confirmado!</h1>
            <p className="text-sm text-[#8a7f72]">Redirigiendo para generar tu documento…</p>
          </>
        )}

        {estado === 'error' && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h1 className="text-xl font-bold text-[#0b1f3a] mb-2">No pudimos confirmar</h1>
            <p className="text-sm text-[#8a7f72] mb-4">
              Si completaste el pago, contactanos con tu número de orden:<br />
              <code className="text-xs bg-[#f5f3ef] px-2 py-0.5 rounded mt-1 inline-block">{orderId}</code>
            </p>
            <button onClick={() => router.push('/')}
              className="bg-[#0b1f3a] text-white px-5 py-2.5 rounded-xl text-sm font-medium w-full">
              Volver al inicio
            </button>
          </>
        )}

      </div>
    </div>
  );
}

export default function PagoExito() {
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
      <PagoExitoInner />
    </Suspense>
  );
}
