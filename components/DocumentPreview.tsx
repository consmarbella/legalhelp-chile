'use client';

import React from 'react';
import { CaseData, todayChile } from '@/lib/constants';

interface DocumentPreviewProps {
  caseData: CaseData;
}

export default function DocumentPreview({ caseData }: DocumentPreviewProps) {
  const cd = caseData;
  const nombre = cd.nombre ? String(cd.nombre) : null;
  const rut = cd.rut ? String(cd.rut) : null;
  const direccion = cd.direccion ? String(cd.direccion) : null;
  const destinatario = (cd.destinatario_inferido ?? cd.destinatario)
    ? String(cd.destinatario_inferido ?? cd.destinatario) : null;
  const tipoDoc = cd.tipo_documento ? String(cd.tipo_documento) : null;
  const hechos = (cd.hechos ?? cd.contexto ?? cd.situacion ?? cd.motivo)
    ? String(cd.hechos ?? cd.contexto ?? cd.situacion ?? cd.motivo) : null;

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

      {/* Antecedentes */}
      <p style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em', marginBottom: '8px' }}>I. Antecedentes de hecho</p>
      <p style={{ textAlign: 'justify', color: hechos ? '#111' : '#ccc', fontStyle: hechos ? 'normal' : 'italic', marginBottom: '16px' }}>
        {hechos ?? 'Que\u2026 [se completará con los hechos que indique el solicitante]'}
      </p>

      <hr style={{ border: 'none', borderTop: '1px solid #e8e2d8', margin: '12px 0' }} />

      {/* Fundamento legal */}
      <p style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em', marginBottom: '8px' }}>II. Fundamento legal</p>
      <p style={{ textAlign: 'justify', color: '#ccc', fontStyle: 'italic', marginBottom: '16px' }}>[La ley aplicable será determinada por el asistente]</p>

      <hr style={{ border: 'none', borderTop: '1px solid #e8e2d8', margin: '12px 0' }} />

      <p style={{ marginBottom: '6px' }}><span style={{ fontWeight: 'bold' }}>POR TANTO,</span></p>
      <p style={{ textAlign: 'justify', color: '#aaa', fontStyle: 'italic' }}>RUEGO A US.: [petición concreta — se generará al finalizar]</p>

      {/* Campos pendientes */}
      {!caseData.ready && (
        <div style={{ marginTop: '20px', padding: '10px 12px', border: '1px dashed #c9a84c', borderRadius: '8px', background: '#fdf9f0' }}>
          <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#9a8054', fontFamily: 'sans-serif', marginBottom: '4px' }}>Completando información…</p>
          <p style={{ fontSize: '11px', color: '#b09a6e', fontFamily: 'sans-serif' }}>
            {[!nombre && 'nombre', !rut && 'RUT', !direccion && 'domicilio', !tipoDoc && 'tipo de documento']
              .filter(Boolean).join(' · ') || 'Faltan algunos datos específicos del caso'}
          </p>
        </div>
      )}
    </div>
  );
}
