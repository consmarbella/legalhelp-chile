'use client';

import React from 'react';
import { CaseData, todayChile } from '@/lib/constants';
import { findTemplate, type LegalTemplate } from '@/lib/templates';

interface DocumentPreviewProps {
  caseData: CaseData;
}

// ─── Helpers de datos ────────────────────────────────────────────────────────
function pick(cd: CaseData, dr: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = (cd as Record<string, unknown>)[k] ?? dr[k];
    if (v && typeof v === 'string' && v.trim().length > 1) return v.trim();
  }
  return null;
}

function getHechos(cd: CaseData, dr: Record<string, unknown>): string | null {
  return pick(cd, dr, ['hechos', 'detalle_caso', 'contexto', 'situacion', 'motivo', 'descripcion']);
}

// Busca la plantilla que corresponde al caso (la misma lógica que usa la generación).
function matchTemplate(cd: CaseData, dr: Record<string, unknown>): LegalTemplate | null {
  const tipo = cd.tipo_documento ? String(cd.tipo_documento) : null;
  const hechos = getHechos(cd, dr) ?? '';
  return findTemplate(tipo, `${tipo ?? ''} ${hechos}`);
}

// ─── Rellena el esqueleto de la plantilla con los datos recopilados ──────────
// Los datos faltantes quedan como marcadores [entre corchetes] para que se vean
// "pendientes" (en gris) en el render. Así la vista previa coincide con el tipo
// de documento real y con lo que el cliente va entregando.
function fillSkeleton(cd: CaseData, dr: Record<string, unknown>, t: LegalTemplate): string {
  const nombre = pick(cd, dr, ['nombre', 'nombre_completo', 'nombre_trabajador', 'trabajador', 'arrendatario', 'solicitante', 'compareciente']);
  const rut = pick(cd, dr, ['rut', 'rut_trabajador', 'rut_solicitante']);
  const direccion = pick(cd, dr, ['direccion', 'domicilio', 'domicilio_trabajador']);
  const destinatario = pick(cd, dr, ['destinatario_inferido', 'destinatario', 'empleador', 'tribunal', 'institucion']) ?? t.entidad ?? null;
  const hechos = getHechos(cd, dr);

  const NOMBRE = nombre ? nombre.toUpperCase() : '[tu nombre]';
  const nombreSig = nombre ?? '[tu nombre]';
  const RUT = rut ?? '[tu RUT]';
  const DIR = direccion ?? '[tu domicilio]';
  const DEST = destinatario ? destinatario.toUpperCase() : '[destinatario]';

  let firstBlock = true;
  const text = t.esqueleto
    // Bloques [[...]] = lo que el redactor completa con los hechos del caso.
    .replace(/\[\[[^\]]*\]\]/g, () => {
      if (firstBlock && hechos) { firstBlock = false; return hechos; }
      firstBlock = false;
      return '[se completará con tus antecedentes]';
    })
    // Marcadores simples [...] = datos de identificación.
    .replace(/\[CIUDAD[^\]]*\]/gi, 'Santiago')
    .replace(/\[FECHA[^\]]*\]/gi, todayChile())
    .replace(/\[DESTINATARIO[^\]]*\]/gi, DEST)
    .replace(/\[NOMBRE EN MAY[ÚU]SCULAS\]/gi, NOMBRE)
    .replace(/\[NOMBRE\]/gi, nombreSig)
    .replace(/\[RUT\]/gi, RUT)
    .replace(/\[DIRECCI[ÓO]N\]/gi, DIR)
    .replace(/\[DOMICILIO\]/gi, DIR);

  return text;
}

// ─── Fallback neutral cuando NO hay plantilla ────────────────────────────────
// No inventa formato judicial ni texto legal: solo muestra los datos reunidos.
function buildNeutralPreview(cd: CaseData, dr: Record<string, unknown>): string {
  const tipo = cd.tipo_documento ? String(cd.tipo_documento) : 'Documento legal';
  const nombre = pick(cd, dr, ['nombre', 'nombre_completo', 'solicitante']) ?? '[tu nombre]';
  const rut = pick(cd, dr, ['rut']) ?? '[tu RUT]';
  const direccion = pick(cd, dr, ['direccion', 'domicilio']) ?? '[tu domicilio]';
  const destinatario = pick(cd, dr, ['destinatario_inferido', 'destinatario', 'tribunal', 'institucion']) ?? '[destinatario]';
  const hechos = getHechos(cd, dr) ?? '[se completará con tus antecedentes]';

  return `Santiago, ${todayChile()}

${tipo.toUpperCase()}

Compareciente: ${nombre}, RUT ${rut}, domiciliado en ${direccion}.
Dirigido a: ${destinatario}.

Antecedentes del caso:
${hechos}

[El documento completo, con la estructura y los fundamentos legales que correspondan, se redactará al finalizar.]`;
}

function buildPreviewText(caseData: CaseData): string {
  const cd = caseData;
  const dr = (cd.datos_recopilados ?? {}) as Record<string, unknown>;
  const t = matchTemplate(cd, dr);
  return t ? fillSkeleton(cd, dr, t) : buildNeutralPreview(cd, dr);
}

// ─── Render ──────────────────────────────────────────────────────────────────
export default function DocumentPreview({ caseData }: DocumentPreviewProps) {
  const cd = caseData;
  const dr = (cd.datos_recopilados ?? {}) as Record<string, unknown>;
  const ready = !!caseData.ready;

  const previewText = buildPreviewText(caseData);
  const lines = previewText.split('\n');

  // Datos faltantes: usar lo que dice el backend (datosFaltantes) o inferir
  const backendFaltantes = (cd.datosFaltantes ?? []) as string[];
  const faltan = backendFaltantes.length > 0
    ? backendFaltantes
    : [
        !pick(cd, dr, ['nombre', 'nombre_completo', 'nombre_trabajador', 'solicitante']) && 'nombre',
        !pick(cd, dr, ['rut', 'rut_trabajador']) && 'RUT',
        !pick(cd, dr, ['direccion', 'domicilio']) && 'domicilio',
        !cd.tipo_documento && 'tipo de documento',
      ].filter(Boolean) as string[];

  function renderLines() {
    return lines.map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={i} style={{ minHeight: '1.1em' }} />;

      const isPending = /\[[^\]]+\]/.test(trimmed); // contiene un marcador sin completar
      const isSectionHeader =
        /^(I{1,3}V?|IV|VI{0,3})\.\s/i.test(trimmed) ||
        /^(POR TANTO|RUEGO A|EN LO PRINCIPAL|SOLICITO|PRIMERO|SEGUNDO|TERCERO|CUARTO)/i.test(trimmed);
      const isRecipient = /^(SE[ÑN]OR|JUZGADO|INSPECTOR|TRIBUNAL|ILUSTR|EXCELENT)/i.test(trimmed) || /^[A-ZÁÉÍÓÚÑ.\s]{6,}$/.test(trimmed) && trimmed === trimmed.toUpperCase() && i < 5;
      const isDate = /^Santiago,/i.test(trimmed);
      const isPresente = /^PRESENTE$/i.test(trimmed);

      return (
        <p key={i} style={{
          margin: '0 0 3px 0',
          textAlign: (isDate || isPresente) ? 'right' : isRecipient ? 'center' : 'justify',
          fontWeight: (isSectionHeader || isRecipient) ? 'bold' : 'normal',
          fontStyle: isPending ? 'italic' : 'normal',
          color: isPending ? '#b8b8b8' : '#111',
          letterSpacing: isRecipient ? '0.03em' : 'normal',
        }}>
          {line}
        </p>
      );
    });
  }

  // ─── Estado LISTO: documento completo con overlay de pago ──────────────────
  if (ready) {
    return (
      <div style={{ position: 'relative', fontFamily: '"Times New Roman", Times, serif', fontSize: '12px', lineHeight: '1.9', color: '#111' }}>
        <div>{renderLines()}</div>

        {/* Overlay de desenfoque — desde 50% */}
        <div style={{
          position: 'absolute', top: '50%', left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.85) 25%, rgba(255,255,255,0.98) 55%)',
          backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: '12px', paddingTop: '40px',
        }}>
          <div style={{ background: '#0b1f3a', borderRadius: '12px', padding: '16px 24px', textAlign: 'center', boxShadow: '0 4px 20px rgba(11,31,58,0.3)', maxWidth: '260px' }}>
            <p style={{ fontFamily: 'sans-serif', fontSize: '13px', fontWeight: 'bold', color: '#fff', margin: '0 0 6px 0' }}>🔒 Documento listo</p>
            <p style={{ fontFamily: 'sans-serif', fontSize: '11px', color: '#a8b8cc', margin: '0 0 12px 0' }}>
              Tu escrito está redactado con tus datos.<br />Descárgalo en PDF para presentarlo.
            </p>
            <div style={{ background: '#c9a84c', borderRadius: '8px', padding: '8px 16px', fontFamily: 'sans-serif', fontSize: '12px', fontWeight: 'bold', color: '#0b1f3a' }}>
              ↓ Desbloquear documento
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Estado EN PROGRESO: mismo esqueleto, con datos parciales ──────────────
  return (
    <div style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '13px', lineHeight: '1.95', color: '#111' }}>
      {renderLines()}

      <div style={{ marginTop: '20px', padding: '10px 12px', border: '1px dashed #c9a84c', borderRadius: '8px', background: '#fdf9f0' }}>
        <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#9a8054', fontFamily: 'sans-serif', marginBottom: '4px' }}>Completando información…</p>
        <p style={{ fontSize: '11px', color: '#b09a6e', fontFamily: 'sans-serif' }}>
          {faltan.length ? faltan.join(' · ') : 'Reuniendo los antecedentes específicos del caso'}
        </p>
      </div>
    </div>
  );
}
