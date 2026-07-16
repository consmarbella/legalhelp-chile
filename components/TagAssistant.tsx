'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  TAG_STEPS,
  TagStepId,
  TagAssistantData,
  validarPatente,
  validarFechaMulta,
  validarRol,
  procesarRUT,
  extraerNombre,
} from '@/lib/tagAssistantLogic';

interface TagAssistantProps {
  data: TagAssistantData;
  onUpdate: (patch: Partial<TagAssistantData>) => void;
  comunaName: string;
  onGenerate: () => void;
  generating: boolean;
  paid: boolean;
}

const STEP_KEYS: TagStepId[] = ['patente', 'fecha', 'rol', 'identidad', 'actividad', 'direccion'];

export default function TagAssistant({
  data, onUpdate, comunaName, onGenerate, generating, paid,
}: TagAssistantProps) {
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState('');
  const [transitioning, setTransitioning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentStep = STEP_KEYS[data.step];
  const stepInfo = TAG_STEPS[data.step];
  const progress = ((data.step) / TAG_STEPS.length) * 100;

  // Focus input on step change
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [data.step]);

  const handleInputChange = useCallback((value: string) => {
    setInputValues(prev => ({ ...prev, [currentStep]: value }));
    setErrorMsg('');
  }, [currentStep]);

  const handleNext = useCallback(() => {
    const value = (inputValues[currentStep] || '').trim();
    let patch: Partial<TagAssistantData> = { step: data.step + 1 };

    switch (currentStep) {
      case 'patente': {
        const result = validarPatente(value);
        if (!result.valido) { setErrorMsg(result.error); return; }
        patch.patenteVehiculo = result.limpia;
        break;
      }
      case 'fecha': {
        const result = validarFechaMulta(value);
        if (!result.valido) { setErrorMsg(result.error); return; }
        patch.fechaMulta = value;
        break;
      }
      case 'rol': {
        const result = validarRol(value);
        if (!result.valido) { setErrorMsg(result.error); return; }
        patch.causasYAnio = result.limpio;
        break;
      }
      case 'identidad': {
        const rutResult = procesarRUT(value);
        if (!rutResult.valido) { setErrorMsg(rutResult.error); return; }
        const nombre = extraerNombre(value, rutResult.rutFormateado);
        if (!nombre) { setErrorMsg('Ingresa también tu nombre (ej: "Juan Pérez 13.829.012-3")'); return; }
        patch.nombreCliente = nombre;
        patch.rutCliente = rutResult.rutFormateado;
        break;
      }
      case 'actividad': {
        if (!value || value.length < 2) { setErrorMsg('Ingresa tu actividad, profesión u oficio'); return; }
        patch.actividadCliente = value;
        break;
      }
      case 'direccion': {
        if (!value || value.length < 5) { setErrorMsg('Ingresa tu dirección completa'); return; }
        patch.direccionCliente = value;
        // Extraer correo y teléfono si están en el string
        const emailMatch = value.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) patch.correoCliente = emailMatch[0];
        const phoneMatch = value.match(/(\+56\s?9\s?\d{4}\s?\d{4})/);
        if (phoneMatch) patch.telefonoCliente = phoneMatch[0];
        break;
      }
    }

    setTransitioning(true);
    setTimeout(() => {
      onUpdate(patch);
      setInputValues(prev => {
        const next = { ...prev };
        delete next[currentStep];
        return next;
      });
      setErrorMsg('');
      setTransitioning(false);
    }, 200);
  }, [currentStep, data.step, inputValues, onUpdate]);

  const handlePrevious = useCallback(() => {
    if (data.step <= 0) return;
    setTransitioning(true);
    setTimeout(() => {
      onUpdate({ step: data.step - 1 });
      setTransitioning(false);
    }, 200);
  }, [data.step, onUpdate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleNext();
    }
  }, [handleNext]);

  // Mostrar resumen de datos ingresados
  const renderStepIndicator = () => {
    const stepNames: Record<TagStepId, string> = {
      patente: 'Patente',
      fecha: 'Fecha',
      rol: 'Rol',
      identidad: 'Identidad',
      actividad: 'Actividad',
      direccion: 'Dirección',
    };

    return (
      <div className="flex flex-wrap gap-1.5 mb-3">
        {STEP_KEYS.map((s, i) => {
          const completed = i < data.step;
          const active = i === data.step;
          const fields: Record<TagStepId, string> = {
            patente: data.patenteVehiculo,
            fecha: data.fechaMulta,
            rol: data.causasYAnio,
            identidad: data.rutCliente,
            actividad: data.actividadCliente,
            direccion: data.direccionCliente.slice(0, 20),
          };
          return (
            <div
              key={s}
              className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-all ${
                active
                  ? 'bg-[#00d4ff]/20 text-cyan border border-[#00d4ff]/40'
                  : completed
                    ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-700/40'
                    : 'bg-[#0d1426]/60 text-[#5a6c8a] border border-[#60a5fa]/10'
              }`}
            >
              {completed ? '✓ ' : active ? '▸ ' : '○ '}
              {stepNames[s]}
              {completed && fields[s] ? `: ${fields[s]}` : ''}
            </div>
          );
        })}
      </div>
    );
  };

  // Título de la página
  const pageTitle = `Prescripción de Deuda TAG${comunaName ? ` · ${comunaName}` : ''}`;

  return (
    <div className="glass-panel rounded-2xl overflow-hidden flex flex-col h-full" style={{ minHeight: '500px' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#60a5fa]/15 bg-[#0d1426]/60">
        <div className="flex items-center gap-2">
          <span className="window-dot bg-[#ff5f57]" />
          <span className="window-dot bg-[#febc2e]" />
          <span className="window-dot bg-[#28c840]" />
          <span className="hud-label text-[#9ab0cc] ml-2">asistente_tag.exe</span>
        </div>
        {data.patenteVehiculo && (
          <span className="text-[10px] font-mono text-cyan bg-[#00d4ff]/10 px-2 py-0.5 rounded border border-[#00d4ff]/20">
            PPU {data.patenteVehiculo}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4" style={{ maxHeight: '520px' }}>
        {/* Progress bar */}
        <div className="w-full h-1 bg-[#1a2540] rounded-full mb-4 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#00d4ff] to-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step indicator */}
        {renderStepIndicator()}

        {/* Comuna badge */}
        {comunaName && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-[#00d4ff]/8 border border-[#00d4ff]/15 rounded-xl">
            <span className="text-lg">📍</span>
            <div>
              <p className="text-xs text-[#9ab0cc]">Juzgado competente</p>
              <p className="text-sm font-semibold text-white">Juzgado de Policía Local de {comunaName}</p>
            </div>
          </div>
        )}

        {/* Chat bubble / Step content */}
        <div className={`transition-all duration-200 ${transitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}>
          <div className="mb-4">
            <p className="text-[10px] font-mono text-[#9ab0cc] uppercase tracking-wider mb-1">
              {stepInfo.titulo}
            </p>
            <h3 className="text-lg font-bold text-white leading-tight">
              {stepInfo.pregunta}
            </h3>
            {stepInfo.subtitulo && (
              <p className="text-xs text-[#7a90aa] mt-1">{stepInfo.subtitulo}</p>
            )}
          </div>

          {/* Input */}
          <div className="mb-3">
            <input
              ref={inputRef}
              type="text"
              value={inputValues[currentStep] || ''}
              onChange={e => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={currentStep === 'identidad' ? 'Ej: Juan Pérez 13.829.012-3' : currentStep === 'fecha' ? 'DD/MM/AAAA' : currentStep === 'direccion' ? 'Calle, número, comuna, correo, teléfono' : 'Escribe aquí...'}
              className="w-full bg-[#05070f]/80 rounded-xl px-4 py-3.5 text-sm text-white placeholder-[#5a6c8a] border border-[#60a5fa]/20 focus:outline-none focus:border-[#00d4ff]/60 focus:shadow-[0_0_20px_rgba(0,212,255,0.15)] transition-all"
              disabled={paid}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {/* Error message (red alert) */}
          {errorMsg && (
            <div className="mb-3 px-3 py-2.5 bg-red-900/30 border border-red-500/40 rounded-xl">
              <p className="text-red-400 text-xs leading-relaxed">{errorMsg}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2">
            {data.step > 0 && (
              <button
                onClick={handlePrevious}
                className="px-4 py-2.5 rounded-xl text-xs font-medium border border-[#60a5fa]/20 text-[#9ab0cc] hover:bg-[#0d1426]/80 transition"
              >
                ← Anterior
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!inputValues[currentStep]?.trim()}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${
                inputValues[currentStep]?.trim()
                  ? 'bg-[#00d4ff] hover:bg-[#22ddff] text-[#05070f] shadow-[0_0_15px_rgba(0,212,255,0.3)]'
                  : 'bg-[#2a3550] text-[#7a90aa] cursor-not-allowed'
              }`}
            >
              {data.step < TAG_STEPS.length - 1 ? 'Siguiente →' : '✓ Listo'}
            </button>
          </div>
        </div>

        {/* Bottom: Generate button only if all steps completed */}
        {data.step >= TAG_STEPS.length && (
          <div className="mt-4 pt-4 border-t border-[#60a5fa]/15">
            <p className="text-xs text-emerald-400 mb-2 flex items-center gap-1.5">
              <span>✓</span> Todos los datos ingresados
            </p>
            <button
              onClick={onGenerate}
              disabled={generating || paid}
              className={`w-full font-bold py-3.5 px-4 rounded-xl text-sm transition ${
                paid
                  ? 'bg-emerald-600 text-white'
                  : generating
                    ? 'bg-[#2a3550] text-[#7a90aa]'
                    : 'bg-[#00d4ff] hover:bg-[#22ddff] text-[#05070f] shadow-[0_0_20px_rgba(0,212,255,0.4)]'
              }`}
            >
              {generating
                ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> Generando...</span>
                : paid
                  ? '✅ Documento Generado'
                  : '🚀 Generar Escrito de Prescripción TAG'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
