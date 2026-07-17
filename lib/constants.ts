// Shared types and constants used across the app

export type CaseData = Record<string, unknown>;

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const DOC_TYPES = [
  { id: 'tag',            icon: '\u{1F697}', label: 'Prescripción TAG',       desc: 'Multas de tránsito y TAG',    price: '$7.490' },
  { id: 'dt-carta-renuncia', icon: '\u{1F4DD}', label: 'Carta de Renuncia',   desc: 'Renuncia voluntaria (Piloto)', price: '$9.990' },
  { id: 'civil-contrato-arriendo',  icon: '\u{1F3E0}', label: 'Contrato Arriendo', desc: 'Arriendo habitacional (Piloto)', price: '$14.990' },
  { id: 'sernac-carta-reclamo', icon: '\u{1F4EE}', label: 'Reclamo SERNAC',   desc: 'Derechos del consumidor (Piloto)', price: '$7.490' },
  { id: 'admin-poder-simple', icon: '\u{1F91D}', label: 'Poder Simple',       desc: 'Mandatos para trámites (Piloto)', price: '$4.990'  },
  { id: 'jpl-descargos-infraccion', icon: '\u2696\uFE0F', label: 'Descargos Multa', desc: 'Infracción de Tránsito (Piloto)', price: '$9.990' },
  { id: 'finiquito',      icon: '\u{1F4C4}', label: 'Finiquito Laboral',      desc: 'Disputas con empleador',      price: '$14.990' },
  { id: 'otro',           icon: '\u{1F4DD}', label: 'Otro documento',         desc: 'Cualquier escrito legal',     price: '$9.990' },
] as const;

export const EMPTY_CASE: CaseData = { ready: false };

// Precio fijo del plan mensual (no depende del tipo de documento)
export const MONTHLY_PRICE_CLP = 19990;

// Precio (CLP, entero) del documento según su id de tipo.
// SE RESUELVE EN EL SERVIDOR a partir de DOC_TYPES — NUNCA se confía en un
// precio enviado por el cliente (evita manipular el monto a pagar).
export function getDocPriceCLP(docId: string | null | undefined): number {
  const FALLBACK = 9990; // = precio de 'otro'
  const doc = DOC_TYPES.find(d => d.id === docId);
  if (!doc) return FALLBACK;
  const n = parseInt(doc.price.replace(/\D/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : FALLBACK;
}

export function todayChile() {
  return new Date().toLocaleDateString('es-CL', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Santiago',
  });
}

export function hasMeaningfulValue(value: unknown) {
  return typeof value === 'string' ? value.trim().length > 0 : value !== null && value !== undefined;
}

export function isLegallyUsefulCaseData(caseData: CaseData) {
  const requiredAny = [
    caseData.nombre,
    caseData.rut,
    caseData.direccion,
    caseData.destinatario_inferido ?? caseData.destinatario,
    caseData.detalle_caso ?? caseData.hechos,
    caseData.materia ?? caseData.tipo_documento,
  ];

  const presentCount = requiredAny.filter(hasMeaningfulValue).length;
  const hasNarrative = hasMeaningfulValue(caseData.detalle_caso ?? caseData.hechos);
  const hasIdentity = hasMeaningfulValue(caseData.nombre) || hasMeaningfulValue(caseData.rut);
  const hasMatter = hasMeaningfulValue(caseData.materia ?? caseData.tipo_documento);

  return hasNarrative && hasIdentity && hasMatter && presentCount >= 4;
}
