'use client';

import React from 'react';
import { CaseData, todayChile } from '@/lib/constants';

interface DocumentPreviewProps {
  caseData: CaseData;
}

// Build a convincing document preview from collected data
function buildPreviewText(caseData: CaseData): string {
  const cd = caseData;
  const dr = (cd.datos_recopilados ?? {}) as Record<string, unknown>;

  const nombre = String(cd.nombre ?? dr.nombre ?? dr.nombre_completo ?? '[NOMBRE]').toUpperCase();
  const rut = String(cd.rut ?? dr.rut ?? '[RUT]');
  const direccion = String(cd.direccion ?? dr.direccion ?? dr.domicilio ?? '[DOMICILIO]');
  const destinatario = String(cd.destinatario_inferido ?? cd.destinatario ?? dr.tribunal ?? 'SEÑOR(A) JUEZ(A)');
  const tipoDoc = String(cd.tipo_documento ?? '');
  const today = todayChile();

  // Collect all case-specific data from datos_recopilados
  const extras = Object.entries(dr)
    .filter(([k, v]) => v && typeof v === 'string' && v.length > 2)
    .map(([, v]) => String(v))
    .join('. ');

  const hechos = String(
    cd.hechos ?? cd.detalle_caso ?? cd.contexto ?? cd.situacion ?? cd.motivo ??
    dr.hechos ?? dr.detalle_caso ?? dr.contexto ?? dr.situacion ?? dr.motivo ??
    extras ?? ''
  );

  return `Santiago, ${today}

EN LO PRINCIPAL: ${tipoDoc}.

${destinatario.toUpperCase()}
PRESENTE

${nombre}, RUT ${rut}, domiciliado en ${direccion}, ante US. respetuosamente expongo:

I. ANTECEDENTES DE HECHO

Que, el suscrito viene en solicitar ${tipoDoc.toLowerCase()}, en mérito de los siguientes antecedentes: ${hechos || 'los hechos descritos en el presente escrito, los cuales se detallan a continuación en forma pormenorizada'}. En virtud de lo anterior, y considerando que los hechos descritos revisten mérito suficiente para la acción que se impetra, solicito respetuosamente a US. que tenga por presentado el presente escrito.

II. DERECHO

La presente solicitud se funda en la legislación chilena vigente aplicable al caso de autos, específicamente en las disposiciones legales y reglamentarias que regulan la materia, las cuales han sido debidamente analizadas por el suscrito a fin de fundamentar el presente escrito de manera sólida y conforme a derecho.

III. PETICIÓN CONCRETA

POR TANTO, y en mérito de lo expuesto:

RUEGO A US.: Tener por presentado el presente escrito, por acompañados los documentos que en su caso se señalan, y resolver conforme a lo solicitado, disponiendo lo que en derecho corresponda.

${nombre}
RUT: ${rut}`;
}

export default function DocumentPreview({ caseData }: DocumentPreviewProps) {
  const cd = caseData;
  const dr = (cd.datos_recopilados ?? {}) as Record<string, unknown>;

  const nombre = (cd.nombre ?? dr.nombre ?? dr.nombre_completo)
    ? String(cd.nombre ?? dr.nombre ?? dr.nombre_completo) : null;
  const rut = (cd.rut ?? dr.rut)
    ? String(cd.rut ?? dr.rut) : null;
  const direccion = (cd.direccion ?? dr.direccion ?? dr.domicilio)
    ? String(cd.direccion ?? dr.direccion ?? dr.domicilio) : null;
  const destinatario = (cd.destinatario_inferido ?? cd.destinatario ?? dr.tribunal)
    ? String(cd.destinatario_inferido ?? cd.destinatario ?? dr.tribunal) : null;
  const tipoDoc = cd.tipo_documento ? String(cd.tipo_documento) : null;
  const hechos = (
    cd.hechos ?? cd.detalle_caso ?? cd.contexto ?? cd.situacion ?? cd.motivo ??
    dr.hechos ?? dr.detalle_caso ?? dr.contexto ?? dr.situacion ?? dr.motivo
  ) ? String(
    cd.hechos ?? cd.detalle_caso ?? cd.contexto ?? cd.situacion ?? cd.motivo ??
    dr.hechos ?? dr.detalle_caso ?? dr.contexto ?? dr.situacion ?? dr.motivo
  ) : null;

  // When ready: show full document with blur overlay
  if (caseData.ready) {
    const previewText = buildPreviewText(caseData);
    const lines = previewText.split('\n');

    return (
      <div style={{ position: 'relative', fontFamily: '"Times New Roman", Times, serif', fontSize: '12px', lineHeight: '1.9', color: '#111' }}>

        {/* Document content */}
        <div>
          {lines.map((line, i) => {
            const trimmed = line.trim();
            if (!trimmed) return <div key={i} style={{ minHeight: '1.2em' }} />;

            const isSectionHeader = /^(I{1,3}V?|IV|V?I{1,3})\.\s/i.test(trimmed) ||
              /^(POR TANTO|RUEGO A|EN LO PRINCIPAL)/i.test(trimmed);
            const isRecipient = /^SE[ÑN]OR|^JUZGADO|^INSPECTOR|^TRIBUNAL/i.test(trimmed);
            const isDate = /^Santiago,/i.test(trimmed);
            const isPresente = /^PRESENTE$/i.test(trimmed);

            return (
              <p key={i} style={{
                margin: '0 0 2px 0',
                textAlign: (isDate || isPresente) ? 'right' : isRecipient ? 'center' : 'justify',
                fontWeight: (isSectionHeader || isRecipient) ? 'bold' : 'normal',
                textTransform: isRecipient ? 'uppercase' : 'none',
                letterSpacing: isRecipient ? '0.03em' : 'normal',
              }}>
                {line}
              </p>
            );
          })}
        </div>

        {/* Blur overlay — starts at 50% */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.85) 25%, rgba(255,255,255,0.98) 55%)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          paddingTop: '40px',
        }}>
          <div style={{
            background: '#0b1f3a',
            borderRadius: '12px',
            padding: '16px 24px',
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(11,31,58,0.3)',
            maxWidth: '260px',
          }}>
            <p style={{
              fontFamily: 'sans-serif',
              fontSize: '13px',
              fontWeight: 'bold',
              color: '#fff',
              margin: '0 0 6px 0',
            }}>
              🔒 Documento listo
            </p>
            <p style={{
              fontFamily: 'sans-serif',
              fontSize: '11px',
              color: '#a8b8cc',
              margin: '0 0 12px 0',
            }}>
              Tu escrito está redactado con tus datos.<br />
              Descárgalo en PDF para presentarlo.
            </p>
            <div style={{
              background: '#c9a84c',
              borderRadius: '8px',
              padding: '8px 16px',
              fontFamily: 'sans-serif',
              fontSize: '12px',
              fontWeight: 'bold',
              color: '#0b1f3a',
            }}>
              ↓ Desbloquear documento
            </div>
          </div>
        </div>
      </div>
    );
  }

  // When not ready: show filling template
  return (
    <div style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '13px', lineHeight: '2', color: '#111' }}>

      {/* Fecha */}
      <p style={{ textAlign: 'right', marginBottom: '16px', color: '#4a4030' }}>
        Santiago, {todayChile()}
      </p>

      {/* Sumilla */}
      {tipoDoc && (
        <p style={{ marginBottom: '12px', fontSize: '12px', color: '#555' }}>
          <span style={{ fontWeight: 'bold' }}>EN LO PRINCIPAL:</span> {tipoDoc}.
        </p>
      )}

      {/* Destinatario */}
      <p style={{ textAlign: 'center', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px', color: destinatario ? '#111' : '#ccc' }}>
        {destinatario ?? 'SEÑOR(A) JUEZ(A) / INSTITUCIÓN'}
      </p>
      <p style={{ textAlign: 'center', marginBottom: '20px', color: '#555', fontSize: '12px' }}>PRESENTE</p>

      {/* Compareciente */}
      <p style={{ textAlign: 'justify', marginBottom: '16px' }}>
        <span style={{ color: nombre ? '#111' : '#ccc' }}>{nombre?.toUpperCase() ?? '[NOMBRE DEL SOLICITANTE]'}</span>
        {', RUT '}
        <span style={{ color: rut ? '#111' : '#ccc' }}>{rut ?? '[RUT]'}</span>
        {', domiciliado en '}
        <span style={{ color: direccion ? '#111' : '#ccc' }}>{direccion ?? '[domicilio]'}</span>
        {', a US. respetuosamente digo:'}
      </p>

      <hr style={{ border: 'none', borderTop: '1px solid #e8e2d8', margin: '12px 0' }} />

      <p style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em', marginBottom: '8px' }}>I. Antecedentes de hecho</p>
      <p style={{ textAlign: 'justify', color: hechos ? '#111' : '#ccc', fontStyle: hechos ? 'normal' : 'italic', marginBottom: '16px' }}>
        {hechos ?? 'Que… [se completará con los hechos que indique el solicitante]'}
      </p>

      <hr style={{ border: 'none', borderTop: '1px solid #e8e2d8', margin: '12px 0' }} />

      <p style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em', marginBottom: '8px' }}>II. Fundamento legal</p>
      <p style={{ textAlign: 'justify', color: '#ccc', fontStyle: 'italic', marginBottom: '16px' }}>[La ley aplicable será determinada por el asistente]</p>

      <hr style={{ border: 'none', borderTop: '1px solid #e8e2d8', margin: '12px 0' }} />

      <p style={{ marginBottom: '6px' }}><span style={{ fontWeight: 'bold' }}>POR TANTO,</span></p>
      <p style={{ textAlign: 'justify', color: '#aaa', fontStyle: 'italic' }}>RUEGO A US.: [petición concreta — se generará al finalizar]</p>

      {/* Campos pendientes */}
      <div style={{ marginTop: '20px', padding: '10px 12px', border: '1px dashed #c9a84c', borderRadius: '8px', background: '#fdf9f0' }}>
        <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#9a8054', fontFamily: 'sans-serif', marginBottom: '4px' }}>Completando información…</p>
        <p style={{ fontSize: '11px', color: '#b09a6e', fontFamily: 'sans-serif' }}>
          {[!nombre && 'nombre', !rut && 'RUT', !direccion && 'domicilio', !tipoDoc && 'tipo de documento']
            .filter(Boolean).join(' · ') || 'Faltan algunos datos específicos del caso'}
        </p>
      </div>
    </div>
  );
}
