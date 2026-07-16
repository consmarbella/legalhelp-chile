'use client';

import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { createEmptyAssistant, TagAssistantData } from '@/lib/tagAssistantLogic';
import { generateTagDocument, generatePreviewHTML, TagFormData } from '@/lib/tagTemplate';
import TagAssistant from '@/components/TagAssistant';
import TagPreview from '@/components/TagPreview';
import SeoContent from '@/components/SeoContent';
import { ComunaInfo } from '@/lib/comunasUtils';

const PaywallModal = lazy(() => import('@/components/PaywallModal'));

interface TagPageClientProps {
  slug: string;
  comunaSlug: string;
  comunaName: string;
  jplDireccion: string;
  jplTelefono: string;
  jplHorario: string;
  comunaInfo: ComunaInfo | null;
  interlinking: { comuna: string; slug: string; url: string }[];
}

export default function TagPageClient({
  slug, comunaSlug, comunaName, jplDireccion, jplTelefono, jplHorario,
  comunaInfo, interlinking,
}: TagPageClientProps) {
  const [assistant, setAssistant] = useState<TagAssistantData>(() => createEmptyAssistant(comunaName));
  const [generating, setGenerating] = useState(false);
  const [paid, setPaid] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [showPaywall, setShowPaywall] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [headText, setHeadText] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [fullText, setFullText] = useState('');
  const [mounted, setMounted] = useState(false);

  const isTagHub = slug === 'prescripcion-deuda-tag';

  useEffect(() => { setMounted(true); }, []);

  // Auto-preview en vivo a medida que se completan datos
  useEffect(() => {
    if (assistant.step < 6) return;
    const { headText: h, bodyText: b, fullText: f } = generatePreviewHTML(assistant, paid);
    setHeadText(h);
    setBodyText(b);
    setFullText(f);
  }, [assistant, paid]);

  // Detectar bypass 4321
  useEffect(() => {
    if (couponCode === '4321' && !paid) {
      setPaid(true);
      setShowPaywall(false);
    }
  }, [couponCode, paid]);

  const handleAssistantUpdate = useCallback((patch: Partial<TagAssistantData>) => {
    setAssistant(prev => ({ ...prev, ...patch }));
  }, []);

  const handleGenerate = useCallback(async () => {
    if (assistant.step < 6) return;
    if (!paid && couponCode !== '4321') {
      setShowPaywall(true);
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docId: 'tag', data: assistant, plan: 'single' }),
      });
      const data = await res.json();
      if (data.documento) {
        setPaid(true);
        const { headText: h, bodyText: b, fullText: f } = generatePreviewHTML(assistant, true);
        setHeadText(h);
        setBodyText(b);
        setFullText(f);

        // Crear blob para descarga
        const blob = new Blob([data.documento], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        setDocumentUrl(url);
      }
    } catch (err) {
      console.error('Error generando documento TAG:', err);
    } finally {
      setGenerating(false);
    }
  }, [assistant, paid, couponCode]);

  const handlePayment = useCallback(async (plan: 'single' | 'monthly') => {
    setPaymentLoading(true);
    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, docId: 'tag' }),
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        sessionStorage.setItem('lh_tag_data', JSON.stringify(assistant));
        sessionStorage.setItem('lh_tag_slug', slug);
        window.location.href = data.checkoutUrl;
      }
    } catch (err) {
      console.error('Error al iniciar pago:', err);
    } finally {
      setPaymentLoading(false);
    }
  }, [assistant, slug]);

  const handleTestPayment = useCallback(async (plan: 'single' | 'monthly') => {
    setPaymentLoading(true);
    try {
      const res = await fetch('/api/payment/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, docId: 'tag' }),
      });
      const data = await res.json();
      if (data.orderId) {
        setPaid(true);
        setShowPaywall(false);
      }
    } catch (err) {
      console.error('Error en pago de prueba:', err);
    } finally {
      setPaymentLoading(false);
    }
  }, []);

  // Restore session after payment return
  useEffect(() => {
    if (typeof window === 'undefined' || !mounted) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('paid') === '1') {
      const storedData = sessionStorage.getItem('lh_tag_data');
      const storedSlug = sessionStorage.getItem('lh_tag_slug');
      if (storedData && storedSlug === slug) {
        setAssistant(JSON.parse(storedData));
        setPaid(true);
        window.history.replaceState({}, '', `/p/${slug}`);
        // Generar automáticamente
        setTimeout(() => handleGenerate(), 500);
      }
    }
  }, [mounted, slug, handleGenerate]);

  // Si es el hub TAG (sin comuna específica), mostrar landing simple
  if (isTagHub) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="glass-panel rounded-2xl p-8 max-w-lg mx-auto text-center">
          <div className="text-5xl mb-4">📄</div>
          <h1 className="text-2xl font-bold text-white mb-3">Prescripción de Deuda TAG</h1>
          <p className="text-sm text-[#9ab0cc] mb-6">
            Selecciona tu comuna en la página principal o usa los enlaces de navegación.
          </p>
          <a href="/" className="inline-block bg-[#00d4ff] hover:bg-[#22ddff] text-[#05070f] font-bold py-3 px-8 rounded-xl text-sm transition">
            ← Volver al inicio
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ paddingTop: '70px' }}>
      <link rel="canonical" href={`https://legalhelp.cl/p/${slug}`} />

      {/* HEADER */}
      <div className="max-w-5xl mx-auto px-4 pb-2">
        <div className="flex items-center gap-2 mb-3">
          <a href="/" className="text-[10px] font-mono text-[#7a90aa] hover:text-white transition-colors">
            ← Inicio
          </a>
          <span className="text-[10px] text-[#5a6c8a]">/</span>
          <span className="text-[10px] font-mono text-[#9ab0cc]">Prescripción TAG{comunaName ? ` · ${comunaName}` : ''}</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">
          Prescripción de Deuda TAG{comunaName ? <span> en <span className="text-cyan">{comunaName}</span></span> : ''}
        </h1>
        {comunaName && (
          <p className="text-xs text-[#7a90aa] mt-1">
            Juzgado de Policía Local de {comunaName} · Art. 24 Ley 18.287
          </p>
        )}
      </div>

      {/* SPLIT PANEL: ASSISTANT + PREVIEW */}
      <section className="max-w-5xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* LEFT: Asistente conversacional */}
          <div className="lg:col-span-2">
            <TagAssistant
              data={assistant}
              onUpdate={handleAssistantUpdate}
              comunaName={comunaName}
              onGenerate={handleGenerate}
              generating={generating}
              paid={paid}
            />
          </div>

          {/* RIGHT: Preview A4 con paywall */}
          <div className="lg:col-span-3">
            <TagPreview
              headText={headText}
              bodyText={bodyText}
              fullText={fullText}
              paid={paid}
              comunaName={comunaName}
              onPayClick={() => setShowPaywall(true)}
              paymentLoading={paymentLoading}
              couponCode={couponCode}
              onCouponChange={setCouponCode}
              documentUrl={documentUrl}
              generating={generating}
            />
          </div>
        </div>
      </section>

      {/* SEO CONTENT */}
      <SeoContent
        comuna={comunaInfo}
        comunaName={comunaName}
        interlinking={interlinking}
      />

      {/* PAYWALL MODAL */}
      {showPaywall && (
        <Suspense fallback={null}>
          <PaywallModal
            selectedDoc="tag"
            paymentLoading={paymentLoading}
            onPayment={handlePayment}
            onTestPayment={handleTestPayment}
            onClose={() => setShowPaywall(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
