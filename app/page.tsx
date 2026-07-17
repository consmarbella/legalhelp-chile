'use client';

import { useEffect, useState, lazy, Suspense } from 'react';
import { DOC_TYPES } from '@/lib/constants';
import { getFormForDoc, FormField } from '@/lib/formFields';
import { renderPreview } from '@/lib/previewEngine';
import { getTemplateTitle } from '@/lib/templates';
import FormPanel from '@/components/FormPanel';
import PreviewPanel from '@/components/PreviewPanel';
import TagAssistant from '@/components/TagAssistant';
import TagPreview from '@/components/TagPreview';
import SeoContent from '@/components/SeoContent';
import { createEmptyAssistant, TagAssistantData } from '@/lib/tagAssistantLogic';
import { generatePreviewHTML } from '@/lib/tagTemplate';

const PaywallModal = lazy(() => import('@/components/PaywallModal'));

export default function Home() {
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [couponCode, setCouponCode] = useState('');
  const [paid, setPaid] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState('');
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [docTitle, setDocTitle] = useState('');

  // ── TAG state ───────────────────────────────────────────────────────────
  const [assistant, setAssistant] = useState<TagAssistantData>(() => createEmptyAssistant(''));
  const [headText, setHeadText] = useState('');
  const [bodyText, setBodyText] = useState('');

  const isTagMode = selectedDoc === 'tag';
  const fields = isTagMode ? [] : (selectedDoc ? getFormForDoc(selectedDoc) : []);

  // Reset state al cambiar de documento
  useEffect(() => {
    setFormData({});
    setErrors({});
    setPreview('');
    setDocumentUrl(null);
    setPaid(false);
    setCouponCode('');
    setDocTitle('');

    // Reset TAG
    setAssistant(createEmptyAssistant(''));
    setHeadText('');
    setBodyText('');
  }, [selectedDoc]);

  // Live preview para TAG
  useEffect(() => {
    if (!isTagMode || assistant.step < 6) return;
    const { headText: h, bodyText: b } = generatePreviewHTML(assistant, paid);
    setHeadText(h);
    setBodyText(b);
  }, [assistant, paid, isTagMode]);

  // Documento normal: actualizar preview
  useEffect(() => {
    if (isTagMode) return;
    if (selectedDoc && Object.keys(formData).length > 0) {
      const hasSomeData = Object.values(formData).some(v => v.trim().length > 0);
      if (hasSomeData) {
        const rendered = renderPreview(selectedDoc, formData, paid);
        setPreview(rendered);
        setDocTitle(getTemplateTitle(selectedDoc));
      }
    } else if (!selectedDoc) {
      setPreview('');
      setDocTitle('');
    }
  }, [formData, selectedDoc, paid, isTagMode]);

  const handleFieldChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleAssistantUpdate = (patch: Partial<TagAssistantData>) => {
    setAssistant(prev => ({ ...prev, ...patch }));
  };

  const handleGenerate = async () => {
    if (isTagMode) {
      // TAG: si no pagado, mostrar paywall
      if (!paid) {
        setShowPaywall(true);
        return;
      }
      await generateDocument();
      return;
    }

    // Validar campos requeridos del formulario normal
    const newErrors: Record<string, string> = {};
    for (const field of fields) {
      if (!field.required) continue;
      const val = (formData[field.name] || '').trim();
      if (!val) {
        newErrors[field.name] = 'Campo requerido';
      }
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    if (!paid && couponCode !== '4321') {
      setShowPaywall(true);
      return;
    }

    await generateDocument();
  };

  const generateDocument = async () => {
    setGenerating(true);
    try {
      if (isTagMode && assistant.isBatch) {
        // Lógica para Batch ZIP TAG
        const res = await fetch('/api/generate-zip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            comunas: assistant.parsedComunas,
            rutSolicitante: assistant.rutCliente,
            nombreSolicitante: assistant.nombreCliente,
            patente: assistant.patenteVehiculo,
            domicilio: assistant.direccionCliente,
            correoElectronico: assistant.correoCliente
          }),
        });
        const data = await res.json();
        if (data.ok && data.dataUri) {
          setDocumentUrl(data.dataUri);
          setPaid(true);
          const { headText: h, bodyText: b } = generatePreviewHTML(assistant, true);
          setHeadText(h);
          setBodyText(b);
        }
      } else {
        // Lógica normal
        const body = isTagMode
          ? JSON.stringify({ docId: 'tag', data: assistant, plan: 'single' })
          : JSON.stringify({ docId: selectedDoc, data: formData, plan: 'single' });

        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        });
        const data = await res.json();
        if (data.documento) {
          setPreview(data.documento);
          setDocTitle(data.titulo || getTemplateTitle(selectedDoc || 'otro'));
          setPaid(true);

          if (isTagMode) {
            const { headText: h, bodyText: b } = generatePreviewHTML(assistant, true);
            setHeadText(h);
            setBodyText(b);
          }

          const blob = new Blob([data.documento], { type: 'text/markdown;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          setDocumentUrl(url);
        }
      }
    } catch (err) {
      console.error('Error generando documento:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handlePayment = async (plan: 'single' | 'monthly') => {
    setPaymentLoading(true);
    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, docId: selectedDoc }),
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        sessionStorage.setItem('lh_form_data', JSON.stringify(isTagMode ? assistant : formData));
        sessionStorage.setItem('lh_selected_doc', selectedDoc || '');
        window.location.href = data.checkoutUrl;
      }
    } catch (err) {
      console.error('Error al iniciar pago:', err);
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleTestPayment = async (plan: 'single' | 'monthly') => {
    setPaymentLoading(true);
    try {
      const res = await fetch('/api/payment/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, docId: selectedDoc }),
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
  };

  // Restore session after payment return
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('paid') === '1') {
      const storedData = sessionStorage.getItem('lh_form_data');
      const storedDoc = sessionStorage.getItem('lh_selected_doc');
      if (storedData && storedDoc) {
        if (storedDoc === 'tag') {
          setAssistant(JSON.parse(storedData));
        } else {
          setFormData(JSON.parse(storedData));
        }
        setSelectedDoc(storedDoc);
        setPaid(true);
        window.history.replaceState({}, '', '/');
        setTimeout(() => generateDocument(), 500);
      }
    }
  }, []);

  const statusText = paid
    ? 'DOCUMENTO ACTIVO · ESCRITO GENERADO'
    : 'SISTEMA EN LÍNEA · NÚCLEO OPERATIVO';

  return (
    <div className="min-h-screen text-white">
      <style dangerouslySetInnerHTML={{ __html: `
        .lg-glow-logo { filter: drop-shadow(0 0 14px rgba(0,212,255,0.8)) drop-shadow(0 0 35px rgba(0,212,255,0.4)); }
        .lg-glow-title { text-shadow: 0 0 25px rgba(255,255,255,0.6), 0 0 60px rgba(255,255,255,0.2); }
        .lg-glow-cyan { text-shadow: 0 0 30px rgba(0,212,255,0.7), 0 0 70px rgba(0,212,255,0.3); color: #00d4ff; }
        .lg-glow-status { text-shadow: 0 0 14px rgba(0,212,255,0.9), 0 0 35px rgba(0,212,255,0.5); color: #00d4ff; }
        .lg-glow-pill { border-color: rgba(0,212,255,0.5) !important; box-shadow: 0 0 24px rgba(0,212,255,0.4), inset 0 0 12px rgba(0,212,255,0.12); }
        .lg-glow-badge { border-color: rgba(0,212,255,0.4) !important; box-shadow: 0 0 16px rgba(0,212,255,0.3); text-shadow: 0 0 8px rgba(0,212,255,0.6); }
        .lg-glow-panel { border-color: rgba(96,165,250,0.3) !important; box-shadow: 0 0 0 1px rgba(5,7,15,0.4), 0 20px 60px -20px rgba(0,212,255,0.4), inset 0 1px 0 rgba(96,165,250,0.15); }
        .lg-glow-panel:hover { border-color: rgba(0,212,255,0.7) !important; box-shadow: 0 0 0 1px rgba(0,212,255,0.4), 0 0 45px -6px rgba(0,212,255,0.55), inset 0 1px 0 rgba(0,212,255,0.25); }
        .lg-glow-selected { border-color: rgba(0,212,255,0.9) !important; box-shadow: 0 0 0 1px rgba(0,212,255,0.6), 0 0 50px -4px rgba(0,212,255,0.6), inset 0 1px 0 rgba(0,212,255,0.3) !important; }
        .lg-status-dot { width:7px; height:7px; border-radius:9999px; background:#00d4ff; box-shadow: 0 0 14px 3px rgba(0,212,255,0.9), 0 0 30px 6px rgba(0,212,255,0.4); animation: lg-pulse 1.8s ease-in-out infinite; }
        @keyframes lg-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.8)} }
      `}} />
      <link rel="canonical" href="https://legalhelp.cl" />

      {/* ── HERO ────────────────────────────────────────────── */}
      <header className="pt-16 pb-12">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#00d4ff]/40 bg-[#00d4ff]/10 mb-6 lg-glow-pill">
            <span className="lg-status-dot" />
            <span className="hud-label text-cyan lg-glow-status">{statusText}</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold leading-[1.05] tracking-tight mb-5 lg-glow-title">
            Sistema de Redacción<br />
            <span className="text-cyan lg-glow-cyan">Legal Inteligente</span>
          </h1>
          <p className="text-white text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            Documentos judiciales chilenos. Completa el formulario y obtén tu
            escrito legal listo para presentar, con la ley correcta y formato profesional.
          </p>
        </div>
      </header>

      {/* ── SELECTOR DE MÓDULOS ─────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-4">
        <div className="flex items-center gap-3 mb-5">
          <span className="hud-label text-[#60a5fa]/70">Selecciona un módulo</span>
          <div className="flex-1 h-px bg-gradient-to-r from-[#60a5fa]/25 to-transparent" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {DOC_TYPES.map(doc => (
            <button
              key={doc.id}
              onClick={() => setSelectedDoc(doc.id)}
              className={`glass-panel glass-panel-hover ${selectedDoc === doc.id ? 'panel-selected' : ''} text-left rounded-xl p-4 transition-all cursor-pointer relative overflow-hidden`}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg mb-3 border border-[#60a5fa]/20 bg-[#00d4ff]/5">
                {doc.icon}
              </div>
              <div className="font-semibold text-white text-sm leading-tight">{doc.label}</div>
              <div className="text-[#9ab0cc] text-xs mt-1">{doc.desc}</div>
              <div className="text-cyan font-mono font-semibold text-xs mt-3">{doc.price}</div>
            </button>
          ))}
        </div>
      </section>

      {/* ── SPLIT PANEL: TAG vs FORM + PREVIEW ─────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* LEFT: TAG Assistant (cuando es TAG) o FORM (cuando es otro doc) */}
          <div className="lg:col-span-2">
            {isTagMode ? (
              <TagAssistant
                data={assistant}
                onUpdate={handleAssistantUpdate}
                comunaName=""
                onGenerate={handleGenerate}
                generating={generating}
                paid={paid}
              />
            ) : (
              <FormPanel
                fields={fields}
                data={formData}
                onChange={handleFieldChange}
                errors={errors}
                couponCode={couponCode}
                onCouponChange={setCouponCode}
                paid={paid}
                onGenerate={handleGenerate}
                loading={generating}
              />
            )}
          </div>

          {/* RIGHT: TAG Preview (cuando es TAG) o PREVIEW (cuando es otro doc) */}
          <div className="lg:col-span-3">
            {isTagMode ? (
              <TagPreview
                headText={headText}
                bodyText={bodyText}
                fullText={headText + '\n' + bodyText}
                paid={paid}
                comunaName=""
                onPayClick={() => setShowPaywall(true)}
                paymentLoading={paymentLoading}
                couponCode={couponCode}
                onCouponChange={setCouponCode}
                documentUrl={documentUrl}
                generating={generating}
              />
            ) : (
              <PreviewPanel
                title={docTitle}
                preview={preview}
                paid={paid}
                onPayClick={() => setShowPaywall(true)}
                paymentLoading={paymentLoading}
                documentUrl={documentUrl}
              />
            )}
          </div>
        </div>
      </section>

      {/* ── TAG SEO CONTENT (solo si es TAG) ─────────────────── */}
      {isTagMode && (
        <SeoContent
          comuna={null}
          comunaName=""
          interlinking={[]}
        />
      )}

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer className="border-t border-[#60a5fa]/15 py-5">
        <div className="max-w-4xl mx-auto px-6 flex flex-wrap justify-center gap-6 text-xs text-[#7a90aa]">
          {['🔒 SSL Certificado', '🇨🇱 Válido en todo Chile', '⚖ Marco legal 2026'].map(t => (
            <span key={t}>{t}</span>
          ))}
          <span>📧 contacto@legalhelp.cl</span>
        </div>
      </footer>

      {showPaywall && (
        <Suspense fallback={null}>
          <PaywallModal
            selectedDoc={selectedDoc}
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
