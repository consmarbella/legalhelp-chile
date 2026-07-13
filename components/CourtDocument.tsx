'use client';

import React from 'react';

interface CourtDocumentProps {
  text: string;
}

export default function CourtDocument({ text }: CourtDocumentProps) {
  const lines = text.split('\n');
  let lineNum = 0;

  const rows = lines.map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return { key: i, empty: true, num: null, content: '', style: 'empty' };
    lineNum++;
    const num = lineNum;
    const isRecipient =
      /^se[ñn]or(a)?\s/i.test(trimmed) ||
      /^(excelent[ií]simo|ilustr[ií]simo)/i.test(trimmed);
    const isSectionHeader =
      /^(I{1,3}V?|IV|V?I{1,3})\.\s/i.test(trimmed) ||
      /^(POR TANTO|RUEGO A|SOLICITO A|PIDO A|A US\.)/i.test(trimmed) ||
      /^MATERIA:/i.test(trimmed);
    const isSignature =
      /^[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]/.test(trimmed) && i === lines.length - 1;
    const isRUT = /^RUT:/i.test(trimmed);
    const isDate = /^santiago,/i.test(trimmed);
    let style = 'normal';
    if (isDate) style = 'date';
    else if (isRecipient) style = 'recipient';
    else if (isSectionHeader) style = 'header';
    else if (isSignature || isRUT) style = 'signature';
    return { key: i, empty: false, num, content: line, style };
  });

  return (
    <div style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '12px', lineHeight: '1.9', color: '#111', background: '#fff', padding: '0' }}>
      {rows.map(row => {
        if (row.empty) return (
          <div key={row.key} style={{ display: 'flex', minHeight: '1.9em' }}>
            <span style={{ width: '28px', minWidth: '28px', color: '#ccc', fontSize: '10px', textAlign: 'right', paddingRight: '8px', userSelect: 'none', lineHeight: '1.9' }} />
            <span style={{ flex: 1 }} />
          </div>
        );
        const styles: Record<string, React.CSSProperties> = {
          date: { textAlign: 'right', paddingRight: '4px' },
          recipient: { textAlign: 'center', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '4px' },
          header: { fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.03em', marginTop: '6px' },
          signature: { textAlign: 'center', marginTop: '32px' },
          normal: { textAlign: 'justify' },
        };
        return (
          <div key={row.key} style={{ display: 'flex', alignItems: 'baseline' }}>
            <span style={{ width: '28px', minWidth: '28px', color: '#bbb', fontSize: '10px', textAlign: 'right', paddingRight: '8px', userSelect: 'none', lineHeight: '1.9', flexShrink: 0 }}>
              {row.num}
            </span>
            <span style={{ flex: 1, borderLeft: '1px solid #e8e2d8', paddingLeft: '10px', ...(styles[row.style] ?? styles.normal) }}>
              {row.content}
            </span>
          </div>
        );
      })}

    </div>
  );
}
