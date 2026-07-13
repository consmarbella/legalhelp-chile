'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function DashboardContent() {
  const searchParams = useSearchParams();
  const caseId = searchParams.get('caseId');

  const [status, setStatus] = useState<string>('pending');
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [errorLog, setErrorLog] = useState<string | null>(null);

  useEffect(() => {
    if (!caseId) return;

    let intervalId: NodeJS.Timeout;

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/cases/status?caseId=${caseId}`);
        const data = await res.json();
        
        if (data.status) {
          setStatus(data.status);
          if (data.status === 'completed') {
            setReceiptUrl(data.receiptUrl);
            clearInterval(intervalId);
          } else if (data.status === 'failed') {
            setErrorLog(data.errorLog);
            clearInterval(intervalId);
          }
        }
      } catch (err) {
        console.error('Error fetching status', err);
      }
    };

    // Hacer primer check inmediatamente
    checkStatus();
    
    // Polling cada 3 segundos
    intervalId = setInterval(checkStatus, 3000);

    return () => clearInterval(intervalId);
  }, [caseId]);

  if (!caseId) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center">
        <p className="text-[#a8b8cc]">No se especificó un caso válido.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white p-6 max-w-4xl mx-auto pt-20">
      <h1 className="text-3xl font-bold mb-8 text-[#00d4ff]">Dashboard de Tramitación</h1>
      
      <div className="bg-[#05070f]/50 border border-[#60a5fa]/20 rounded-2xl p-8 shadow-xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#101a30] flex items-center justify-center text-2xl border border-[#60a5fa]/30">
            {status === 'completed' ? '✅' : status === 'failed' ? '❌' : '⚙️'}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Estado del Escrito</h2>
            <p className="text-sm text-[#7a90aa] font-mono mt-1">ID: {caseId}</p>
          </div>
        </div>

        <div className="space-y-4">
          {status === 'pending' && (
            <div className="flex items-center gap-3 text-[#00d4ff] bg-[#00d4ff]/10 p-4 rounded-xl border border-[#00d4ff]/20">
              <span className="w-5 h-5 border-2 border-[#00d4ff]/30 border-t-[#00d4ff] rounded-full animate-spin" />
              <span>El Bot Maestro está ingresando tu documento en el Tribunal. Por favor espera...</span>
            </div>
          )}

          {status === 'completed' && receiptUrl && (
            <div className="bg-[#28c840]/10 border border-[#28c840]/30 rounded-xl p-6 text-center">
              <h3 className="text-[#28c840] font-bold text-lg mb-2">¡Tramitación Exitosa!</h3>
              <p className="text-sm text-[#c8ddf0] mb-6">Tu documento ha sido radicado oficialmente en el Poder Judicial.</p>
              <a 
                href={receiptUrl} 
                target="_blank" 
                rel="noreferrer"
                className="inline-block bg-[#28c840] hover:bg-[#22aa36] text-black px-6 py-3 rounded-xl font-bold transition shadow-[0_0_15px_rgba(40,200,64,0.3)]"
              >
                Ver Comprobante Oficial
              </a>
            </div>
          )}

          {status === 'failed' && (
            <div className="bg-[#ff5f57]/10 border border-[#ff5f57]/30 rounded-xl p-6">
              <h3 className="text-[#ff5f57] font-bold text-lg mb-2">Error en la Tramitación</h3>
              <p className="text-sm text-[#c8ddf0] mb-4">No pudimos procesar la presentación automáticamente.</p>
              {errorLog && (
                <div className="bg-[#05070f] rounded-lg p-3 text-xs text-[#ff5f57]/80 font-mono overflow-auto border border-[#ff5f57]/20">
                  {errorLog}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">Cargando...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
