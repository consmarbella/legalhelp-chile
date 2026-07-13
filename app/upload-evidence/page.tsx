'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Página de carga de evidencias para tramitación automatizada ($7.999).
 * 
 * Flujo:
 * 1. Usuario paga la tramitación ($7.999)
 * 2. Se le redirige aquí con orderId
 * 3. Debe subir Finiquito (PDF) y Certificado AFC (PDF)
 * 4. Los PDFs se guardan en Supabase Storage
 * 5. Playwright los usará para subirlos a la OJV
 */
export default function UploadEvidencePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') ?? '';

  const [finiquito, setFiniquito] = useState<File | null>(null);
  const [afc, setAfc] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finiquito || !afc) {
      setError('Debes subir ambos archivos: Finiquito y Certificado AFC.');
      return;
    }
    if (!orderId) {
      setError('Falta el ID de la orden. Vuelve a la página de pago.');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('finiquito', finiquito);
      formData.append('afc', afc);
      formData.append('orderId', orderId);

      const res = await fetch('/api/upload-evidence', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? 'Error al subir los archivos');
      }

      setSuccess(true);
      // Redirigir al dashboard después de 2 segundos
      setTimeout(() => router.push('/dashboard?upload=ok'), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }, [finiquito, afc, orderId, router]);

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-lg w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Sube tus documentos de respaldo
        </h1>
        <p className="text-gray-600 mb-6">
          Para completar la tramitación automatizada de tu caso, necesitamos que subas
          los siguientes documentos en formato PDF:
        </p>

        {success ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
            ✅ Archivos subidos correctamente. Tu caso será tramitado en las próximas horas.
            Redirigiendo al dashboard...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📄 Finiquito (PDF)
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setFiniquito(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Documento que acredita el término de la relación laboral
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📄 Certificado AFC (PDF)
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setAfc(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Certificado de cesantía emitido por la AFC
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                ❌ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={uploading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? 'Subiendo archivos...' : 'Subir documentos'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
