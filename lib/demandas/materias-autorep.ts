/**
 * materias-autorep.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Base de datos de materias donde la ley chilena permite autorepresentación
 * (sin abogado patrocinante). La "compuerta de viabilidad" del módulo de demandas
 * valida contra este catálogo.
 *
 * Fuentes:
 *   - Ley 18.120 (comparecencia en juicio)
 *   - Ley 18.287 (procedimiento JPL)
 *   - Art. 20 CPR (recurso de protección)
 *   - Art. 703 CPC (mínima cuantía)
 */

export interface MateriaAutorep {
  id: string;
  nombre: string;
  tribunal: string;
  base_legal: string[];
  plazo: string;
  requiere_abogado: false;
  ticket_sugerido: number; // CLP
  descripcion: string;
  requisitos_minimos: string[];
  jurisprudencia_fuentes: string[]; // URLs BCN / Poder Judicial
}

export const MATERIAS_AUTOREP: MateriaAutorep[] = [
  {
    id: 'prescripcion-multa-transito',
    nombre: 'Excepción de prescripción de multa de tránsito',
    tribunal: 'Juzgado de Policía Local',
    base_legal: [
      'Art. 24 Ley 18.287 (prescripción de 3 años)',
      'Art. 2515 Código Civil (prescripción extintiva)',
      'Art. 26 Ley 18.287 (procedimiento ante JPL)',
    ],
    plazo: '3 años desde la fecha de la infracción sin notificación judicial',
    requiere_abogado: false,
    ticket_sugerido: 59000,
    descripcion: 'Escrito de excepción de prescripción para multas de tránsito ante Juzgado de Policía Local. Se alega que transcurrió el plazo legal sin cobro judicial.',
    requisitos_minimos: [
      'Fecha de la infracción/multa',
      'Número de la causa o detalle del parte',
      'Datos del infractor (nombre, RUT)',
      'Certificado de anotaciones vigentes (opcional pero recomendable)',
    ],
    jurisprudencia_fuentes: [
      'https://www.bcn.cl/leychile/navegar?idNorma=29643', // Ley 18.287
      'https://www.pjud.cl', // Fallos JPL
    ],
  },
  {
    id: 'recurso-proteccion',
    nombre: 'Recurso de protección',
    tribunal: 'Corte de Apelaciones',
    base_legal: [
      'Art. 20 Constitución Política de la República',
      'Auto Acordado de la Corte Suprema sobre tramitación del recurso de protección',
    ],
    plazo: '30 días corridos desde el acto u omisión que afecta la garantía',
    requiere_abogado: false,
    ticket_sugerido: 79000,
    descripcion: 'Recurso constitucional de protección por vulneración de garantías del Art. 19 CPR. Lo puede presentar cualquier persona, sin abogado.',
    requisitos_minimos: [
      'Descripción del acto u omisión arbitrario o ilegal',
      'Garantía constitucional afectada',
      'Datos del recurrente (nombre, RUT, domicilio)',
      'Identificación del recurrido',
      'Fecha del acto (para verificar plazo)',
    ],
    jurisprudencia_fuentes: [
      'https://www.bcn.cl/leychile/navegar?idNorma=242302', // CPR
      'https://www.pjud.cl',
    ],
  },
  {
    id: 'reclamo-jpl-sernac',
    nombre: 'Denuncia/demanda ante JPL (consumidor)',
    tribunal: 'Juzgado de Policía Local',
    base_legal: [
      'Art. 50 A Ley 19.496 (competencia JPL en materia de consumidor)',
      'Art. 50 C Ley 19.496 (comparecencia personal del consumidor)',
      'Ley 18.287 (procedimiento JPL)',
    ],
    plazo: '6 meses desde la infracción para SERNAC; 2 años para demanda directa ante JPL',
    requiere_abogado: false,
    ticket_sugerido: 49000,
    descripcion: 'Demanda de consumidor ante Juzgado de Policía Local. La Ley del Consumidor permite comparecer personalmente.',
    requisitos_minimos: [
      'Datos del consumidor (nombre, RUT)',
      'Identificación del proveedor',
      'Descripción de la infracción',
      'Boleta o comprobante de compra',
      'Petición concreta (devolución, indemnización, etc.)',
    ],
    jurisprudencia_fuentes: [
      'https://www.bcn.cl/leychile/navegar?idNorma=61438', // Ley 19.496
      'https://www.pjud.cl',
    ],
  },
  {
    id: 'defensa-cobranza-minima-cuantia',
    nombre: 'Oposición a cobranza ejecutiva de mínima cuantía',
    tribunal: 'Juzgado de Letras en lo Civil',
    base_legal: [
      'Art. 703 y ss. CPC (procedimiento de mínima cuantía)',
      'Art. 2 Ley 18.120 (excepciones a la obligación de patrocinio)',
    ],
    plazo: '4 días hábiles desde la notificación del requerimiento',
    requiere_abogado: false,
    ticket_sugerido: 59000,
    descripcion: 'Escrito de oposición (excepciones) en juicio ejecutivo de mínima cuantía. La ley permite actuar sin abogado en causas bajo 10 UTM.',
    requisitos_minimos: [
      'Número de causa / tribunal',
      'Notificación o requerimiento recibido',
      'Datos del demandado (nombre, RUT)',
      'Fundamento de la oposición (prescripción, pago, falsedad del título, etc.)',
    ],
    jurisprudencia_fuentes: [
      'https://www.bcn.cl/leychile/navegar?idNorma=22740', // CPC
      'https://www.pjud.cl',
    ],
  },
  {
    id: 'denuncia-ruidos-molestos',
    nombre: 'Denuncia por ruidos molestos',
    tribunal: 'Juzgado de Policía Local',
    base_legal: [
      'Art. 494 N°1 Código Penal (falta por ruidos)',
      'D.S. 38/2011 MMA (norma de emisión de ruidos)',
      'Ley 18.287 (procedimiento JPL)',
    ],
    plazo: 'Se puede denunciar en cualquier momento',
    requiere_abogado: false,
    ticket_sugerido: 39000,
    descripcion: 'Denuncia ante JPL por ruidos molestos de vecinos, locales o industrias que exceden la norma.',
    requisitos_minimos: [
      'Datos del denunciante (nombre, RUT, domicilio)',
      'Identificación/dirección del responsable del ruido',
      'Descripción de los ruidos (frecuencia, horario)',
      'Evidencia (opcional: grabaciones, testigos)',
    ],
    jurisprudencia_fuentes: [
      'https://www.bcn.cl/leychile/navegar?idNorma=1040928', // DS 38
      'https://www.pjud.cl',
    ],
  },
  {
    id: 'apelacion-jpl',
    nombre: 'Recurso de apelación contra sentencia de JPL',
    tribunal: 'Juzgado de Letras (como alzada)',
    base_legal: [
      'Art. 32 Ley 18.287 (recurso de apelación JPL)',
      'Art. 33 Ley 18.287 (plazo de 5 días hábiles)',
    ],
    plazo: '5 días hábiles desde la sentencia del JPL',
    requiere_abogado: false,
    ticket_sugerido: 69000,
    descripcion: 'Recurso de apelación contra sentencia desfavorable del Juzgado de Policía Local.',
    requisitos_minimos: [
      'Sentencia apelada (fecha y contenido)',
      'Fundamento del agravio',
      'Datos del apelante',
      'Número de causa',
    ],
    jurisprudencia_fuentes: [
      'https://www.bcn.cl/leychile/navegar?idNorma=29643', // Ley 18.287
      'https://www.pjud.cl',
    ],
  },
];

export function findMateriaById(id: string): MateriaAutorep | undefined {
  return MATERIAS_AUTOREP.find(m => m.id === id);
}

export function findMateriaByKeywords(text: string): MateriaAutorep | null {
  const t = text.toLowerCase();
  const scored = MATERIAS_AUTOREP.map(m => {
    let score = 0;
    const words = [...m.nombre.toLowerCase().split(/\s+/), ...m.descripcion.toLowerCase().split(/\s+/)];
    for (const w of words) {
      if (w.length > 3 && t.includes(w)) score++;
    }
    return { m, score };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
  return scored.length > 0 ? scored[0].m : null;
}
