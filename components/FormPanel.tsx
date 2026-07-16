'use client';

import { FormField } from '@/lib/formFields';

interface FormPanelProps {
  fields: FormField[];
  data: Record<string, string>;
  onChange: (name: string, value: string) => void;
  errors: Record<string, string>;
  couponCode: string;
  onCouponChange: (code: string) => void;
  paid: boolean;
  onGenerate: () => void;
  loading: boolean;
}

export default function FormPanel({
  fields, data, onChange, errors,
  couponCode, onCouponChange, paid, onGenerate, loading,
}: FormPanelProps) {
  const allValid = fields.every(f => {
    if (!f.required) return true;
    return (data[f.name] || '').trim().length > 0;
  });
  const generateReady = allValid && !loading;

  return (
    <div className="glass-panel rounded-2xl overflow-hidden flex flex-col h-full" style={{ minHeight: '450px' }}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#60a5fa]/15 bg-[#0d1426]/60">
        <div className="flex items-center gap-2">
          <span className="window-dot bg-[#ff5f57]" />
          <span className="window-dot bg-[#febc2e]" />
          <span className="window-dot bg-[#28c840]" />
          <span className="hud-label text-[#9ab0cc] ml-2">formulario.exe</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ maxHeight: '500px' }}>
        {fields.length === 0 ? (
          <div className="h-full flex items-center justify-center py-16">
            <p className="text-[#9ab0cc] text-sm text-center">Selecciona un modulo para comenzar</p>
          </div>
        ) : (
          <>
            {fields.map(field => (
              <div key={field.name}>
                <label className="block text-xs text-[#9ab0cc] mb-1 font-medium">
                  {field.label}
                  {field.required && <span className="text-red-400 ml-0.5">*</span>}
                </label>

                {field.type === 'textarea' ? (
                  <textarea
                    value={data[field.name] || ''}
                    onChange={e => onChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    rows={3}
                    className="w-full bg-[#05070f]/70 rounded-xl px-3 py-2 text-sm text-white placeholder-[#5a6c8a] border border-[#60a5fa]/15 focus:outline-none focus:border-[#00d4ff]/60 resize-none"
                  />
                ) : field.type === 'select' ? (
                  <select
                    value={data[field.name] || ''}
                    onChange={e => onChange(field.name, e.target.value)}
                    className="w-full bg-[#05070f]/70 rounded-xl px-3 py-2.5 text-sm text-white border border-[#60a5fa]/15 focus:outline-none focus:border-[#00d4ff]/60 appearance-none"
                  >
                    <option value="">Seleccionar...</option>
                    {field.options?.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={data[field.name] || ''}
                    onChange={e => onChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full bg-[#05070f]/70 rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#5a6c8a] border border-[#60a5fa]/15 focus:outline-none focus:border-[#00d4ff]/60"
                  />
                )}

                {errors[field.name] && (
                  <p className="text-red-400 text-xs mt-1">{errors[field.name]}</p>
                )}
              </div>
            ))}

            {!paid && (
              <div className="pt-3 border-t border-[#60a5fa]/15">
                <label className="block text-xs text-[#9ab0cc] mb-1 font-medium">
                  Codigo de Descuento / Clave Admin
                </label>
                <input
                  type="text"
                  value={couponCode}
                  onChange={e => onCouponChange(e.target.value)}
                  placeholder="Ingresa codigo"
                  maxLength={10}
                  className="w-full bg-[#05070f]/70 rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#5a6c8a] border border-[#c9a84c]/50 focus:outline-none focus:border-[#c9a84c]"
                />
              </div>
            )}

            <button
              onClick={onGenerate}
              disabled={!generateReady}
              className={`w-full mt-3 font-bold py-3 px-4 rounded-xl text-sm transition ${
                paid
                  ? 'bg-emerald-600 text-white cursor-default'
                  : generateReady
                    ? 'bg-[#00d4ff] hover:bg-[#22ddff] text-[#05070f] shadow-[0_0_15px_rgba(0,212,255,0.3)]'
                    : 'bg-[#2a3550] text-[#7a90aa] cursor-not-allowed'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Generando...
                </span>
              ) : paid ? (
                'Documento Generado'
              ) : couponCode === '4321' ? (
                'Desbloquear y Generar (Admin)'
              ) : (
                'Generar e Ir al Pago'
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
