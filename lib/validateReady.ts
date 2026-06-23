/**
 * validateReady.ts — Validación TypeScript de campos obligatorios.
 * ESTE ARCHIVO ES LA RED DE SEGURIDAD: si el LLM marca ready=true
 * pero faltan campos críticos según el tipo de documento, lo rechaza.
 *
 * El LLM extrae datos. TypeScript decide si está completo.
 */

type CaseData = Record<string, unknown>;

/**
 * Schemas de campos OBLIGATORIOS por tipo de documento.
 * Si falta alguno de estos → NO SE PUEDE cobrar (ready=false).
 * Cada campo puede matchear varias keys del caseData (aliases).
 */
const SCHEMAS: Record<string, string[][]> = {
  // Cada inner array = un campo lógico, cualquiera de esas keys lo satisface
  poder: [
    ['nombre', 'nombre_completo', 'mandante', 'otorgante', 'poderdante'],
    ['rut'],
    ['apoderado', 'nombre_apoderado', 'apoderada'],
    ['facultades', 'para_que', 'tramite', 'finalidad', 'detalle_caso'],
  ],
  poder_notarial: [
    ['nombre', 'nombre_completo', 'mandante', 'otorgante', 'poderdante'],
    ['rut'],
    ['apoderado', 'nombre_apoderado', 'apoderada'],
    ['facultades', 'para_que', 'tramite', 'finalidad', 'detalle_caso'],
  ],
  poder_simple: [
    ['nombre', 'nombre_completo', 'mandante', 'otorgante', 'poderdante'],
    ['rut'],
    ['apoderado', 'nombre_apoderado', 'apoderada'],
    ['facultades', 'para_que', 'tramite', 'finalidad', 'detalle_caso'],
  ],
  finiquito: [
    ['nombre', 'nombre_completo', 'trabajador'],
    ['rut'],
    ['empleador', 'empresa', 'empresa_nombre'],
    ['cargo'],
    ['sueldo', 'sueldo_bruto', 'remuneracion'],
    ['fecha_inicio'],
    ['fecha_termino', 'fecha_despido'],
  ],
  demanda_laboral: [
    ['nombre', 'nombre_completo', 'trabajador'],
    ['rut'],
    ['empleador', 'empresa', 'empresa_nombre'],
    ['cargo'],
    ['sueldo', 'sueldo_bruto', 'remuneracion'],
    ['fecha_ingreso', 'fecha_inicio'],
    ['fecha_despido', 'fecha_termino'],
    ['detalle_caso', 'hechos', 'motivo'],
  ],
  despido_injustificado: [
    ['nombre', 'nombre_completo', 'trabajador'],
    ['rut'],
    ['empleador', 'empresa'],
    ['cargo'],
    ['sueldo', 'sueldo_bruto'],
    ['fecha_despido', 'fecha_termino'],
    ['detalle_caso', 'hechos', 'motivo'],
  ],
  carta_reclamo: [
    ['nombre', 'nombre_completo'],
    ['rut'],
    ['empresa', 'destinatario', 'destinatario_inferido'],
    ['detalle_caso', 'hechos', 'problema', 'que_paso'],
    ['peticion', 'que_quiere', 'solucion'],
  ],
  reclamo_sernac: [
    ['nombre', 'nombre_completo'],
    ['rut'],
    ['empresa', 'destinatario', 'destinatario_inferido'],
    ['detalle_caso', 'hechos', 'problema'],
  ],
  recurso_proteccion: [
    ['nombre', 'nombre_completo', 'recurrente'],
    ['rut'],
    ['recurrido', 'empresa', 'quien_vulnera', 'destinatario_inferido'],
    ['detalle_caso', 'hechos', 'acto_arbitrario'],
    ['derecho_vulnerado', 'derecho'],
  ],
  demanda_alimentos: [
    ['nombre', 'nombre_completo', 'demandante'],
    ['rut'],
    ['demandado', 'padre', 'madre', 'obligado'],
    ['hijos', 'hijo', 'nombre_hijo', 'menores'],
    ['monto', 'monto_solicitado', 'pension'],
  ],
  contrato_arriendo: [
    ['nombre', 'nombre_completo', 'arrendador'],
    ['rut'],
    ['arrendatario', 'inquilino', 'arrendatario_nombre'],
    ['inmueble', 'direccion_inmueble', 'propiedad'],
    ['renta', 'arriendo', 'monto_arriendo', 'canon'],
  ],
  contrato_trabajo: [
    ['empleador', 'empresa', 'empresa_nombre'],
    ['nombre', 'nombre_completo', 'trabajador'],
    ['rut'],
    ['cargo'],
    ['sueldo', 'sueldo_bruto', 'remuneracion'],
    ['jornada', 'horario'],
  ],
  declaracion_jurada: [
    ['nombre', 'nombre_completo', 'declarante'],
    ['rut'],
    ['detalle_caso', 'declaracion', 'que_declara', 'hechos'],
  ],
  carta_renuncia: [
    ['nombre', 'nombre_completo', 'trabajador'],
    ['rut'],
    ['empresa', 'empleador'],
  ],
  prescripcion: [
    ['nombre', 'nombre_completo'],
    ['rut'],
    ['patente', 'deuda', 'monto', 'acreedor', 'tribunal', 'detalle_caso'],
  ],
  prescripcion_tag: [
    ['nombre', 'nombre_completo'],
    ['rut'],
    ['patente'],
  ],
  testamento: [
    ['nombre', 'nombre_completo', 'testador'],
    ['rut'],
    ['detalle_caso', 'bienes', 'herederos', 'disposiciones'],
  ],
};

/**
 * Normaliza un string para matching: minúsculas, sin acentos, underscores
 */
function normalize(s: string): string {
  return s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

/**
 * Busca el schema que mejor matchea el tipo de documento detectado.
 */
function findSchema(tipo: string | null | undefined): string[][] | null {
  if (!tipo) return null;
  const tipoNorm = normalize(tipo);

  // Match exacto
  if (SCHEMAS[tipoNorm]) return SCHEMAS[tipoNorm];

  // Match parcial: buscar si el tipo contiene alguna key del schema
  for (const key of Object.keys(SCHEMAS)) {
    if (tipoNorm.includes(key) || key.includes(tipoNorm)) {
      return SCHEMAS[key];
    }
  }

  // Match por palabras clave
  if (/poder/.test(tipoNorm)) return SCHEMAS.poder;
  if (/finiquito/.test(tipoNorm)) return SCHEMAS.finiquito;
  if (/demanda.*laboral|despido/.test(tipoNorm)) return SCHEMAS.demanda_laboral;
  if (/reclamo|sernac/.test(tipoNorm)) return SCHEMAS.carta_reclamo;
  if (/recurso.*proteccion/.test(tipoNorm)) return SCHEMAS.recurso_proteccion;
  if (/alimento/.test(tipoNorm)) return SCHEMAS.demanda_alimentos;
  if (/arriendo|arrendamiento/.test(tipoNorm)) return SCHEMAS.contrato_arriendo;
  if (/contrato.*trabajo/.test(tipoNorm)) return SCHEMAS.contrato_trabajo;
  if (/declaracion.*jurada/.test(tipoNorm)) return SCHEMAS.declaracion_jurada;
  if (/renuncia/.test(tipoNorm)) return SCHEMAS.carta_renuncia;
  if (/prescripcion.*tag|tag/.test(tipoNorm)) return SCHEMAS.prescripcion_tag;
  if (/prescripcion/.test(tipoNorm)) return SCHEMAS.prescripcion;
  if (/testamento/.test(tipoNorm)) return SCHEMAS.testamento;

  return null;
}

/**
 * Verifica si un campo lógico está presente en el caseData.
 * Un campo se considera "presente" si CUALQUIERA de sus aliases tiene un valor no vacío.
 * También busca en datos_recopilados (nested object del LLM).
 */
function fieldPresent(aliases: string[], data: CaseData): boolean {
  // Flatten: include datos_recopilados if present
  const flatData: CaseData = { ...data };
  const nested = data.datos_recopilados;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    Object.assign(flatData, nested as Record<string, unknown>);
  }

  // Also consider tipo_documento as context for "facultades"/"tramite"/"detalle_caso"
  if (aliases.some(a => ['facultades', 'para_que', 'tramite', 'finalidad', 'detalle_caso', 'hechos', 'motivo'].includes(a))) {
    const tipo = flatData.tipo_documento;
    if (typeof tipo === 'string' && tipo.length > 5) return true;
  }

  for (const alias of aliases) {
    // Exact match
    const val = flatData[alias];
    if (val !== null && val !== undefined && val !== '' && val !== false) {
      if (typeof val === 'string' && val.trim().length > 0) {
        // Para "apoderado": exigir que sea un nombre real (2+ palabras, no "mamá" o "contador")
        if (aliases.includes('apoderado') || aliases.includes('nombre_apoderado')) {
          const words = val.trim().split(/\s+/);
          if (words.length >= 2 && val.length > 5) return true;
          // "mamá", "contador", "hermano" no cuentan como nombre real
          continue;
        }
        return true;
      }
      if (typeof val !== 'string') return true;
    }

    // Fuzzy match: check if any key in data starts with or equals this alias
    for (const key of Object.keys(flatData)) {
      if (key === alias || key.startsWith(alias + '_') || key.endsWith('_' + alias)) {
        const v = flatData[key];
        if (v && typeof v === 'string' && v.trim().length > 0) return true;
        if (v && typeof v !== 'string') return true;
      }
    }
  }
  return false;
}

export interface ValidationResult {
  valid: boolean;
  missing: string[];  // Human-readable names of missing fields
  missingAliases: string[][];  // The actual alias arrays that failed
}

/**
 * MAIN FUNCTION: Validates if caseData has all required fields for the document type.
 * Returns { valid: true } if all fields present OR if no schema found (permissive fallback).
 * Returns { valid: false, missing: [...] } if critical fields are missing.
 */
export function validateReadyState(caseData: CaseData): ValidationResult {
  const tipo = caseData.tipo_documento as string | null | undefined;
  const schema = findSchema(tipo);

  // No schema found → permissive (let the LLM decide, backwards compatible)
  if (!schema) {
    // But still require at minimum: nombre + rut + algún detalle
    const hasNombre = fieldPresent(['nombre', 'nombre_completo'], caseData);
    const hasRut = fieldPresent(['rut'], caseData);
    const hasDetalle = fieldPresent(['detalle_caso', 'hechos', 'motivo', 'situacion', 'tramite', 'facultades'], caseData);

    if (hasNombre && hasRut && hasDetalle) return { valid: true, missing: [], missingAliases: [] };
    const missing: string[] = [];
    const missingAliases: string[][] = [];
    if (!hasNombre) { missing.push('nombre completo'); missingAliases.push(['nombre']); }
    if (!hasRut) { missing.push('RUT'); missingAliases.push(['rut']); }
    if (!hasDetalle) { missing.push('detalle del caso'); missingAliases.push(['detalle_caso']); }
    return { valid: false, missing, missingAliases };
  }

  // Validate against schema
  const missing: string[] = [];
  const missingAliases: string[][] = [];
  for (const fieldAliases of schema) {
    if (!fieldPresent(fieldAliases, caseData)) {
      // Use first alias as human-readable name
      missing.push(fieldAliases[0].replace(/_/g, ' '));
      missingAliases.push(fieldAliases);
    }
  }

  return { valid: missing.length === 0, missing, missingAliases };
}

/**
 * Generates the follow-up question to ask for the first missing field.
 */
export function generateMissingFieldQuestion(missing: string[]): string {
  if (missing.length === 0) return '';

  const field = missing[0];

  // Smart question generation based on field name
  const questions: Record<string, string> = {
    'apoderado': '¿Cuál es el nombre completo y RUT de la persona a quien le das el poder (apoderado)?',
    'nombre apoderado': '¿Cuál es el nombre completo y RUT de la persona a quien le das el poder?',
    'apoderada': '¿Cuál es el nombre completo y RUT de la persona a quien le das el poder?',
    'facultades': '¿Para qué necesitas este poder? (qué trámite específico va a hacer)',
    'rut': '¿Cuál es tu RUT?',
    'nombre': '¿Cuál es tu nombre completo?',
    'nombre completo': '¿Cuál es tu nombre completo y RUT?',
    'empleador': '¿Cuál es el nombre de la empresa o empleador?',
    'empresa': '¿Cuál es el nombre de la empresa?',
    'cargo': '¿Cuál era tu cargo en la empresa?',
    'sueldo': '¿Cuál era tu último sueldo bruto mensual?',
    'fecha inicio': '¿Cuándo empezaste a trabajar ahí? (mes y año)',
    'fecha ingreso': '¿Cuándo empezaste a trabajar ahí?',
    'fecha despido': '¿Cuándo te despidieron o terminó la relación laboral?',
    'fecha termino': '¿Cuándo terminó la relación laboral?',
    'detalle caso': '¿Puedes contarme qué pasó? (los hechos principales)',
    'hechos': '¿Qué pasó exactamente? Cuéntame los hechos.',
    'peticion': '¿Qué solución quieres? (devolución, indemnización, etc.)',
    'recurrido': '¿Quién cometió el acto que vulnera tus derechos?',
    'derecho vulnerado': '¿Qué derecho sientes que te vulneraron?',
    'demandado': '¿Cuál es el nombre completo del demandado?',
    'hijos': '¿Cuál es el nombre y fecha de nacimiento de tu(s) hijo(s)?',
    'monto': '¿Cuánto solicitas de pensión mensual?',
    'arrendatario': '¿Cuál es el nombre y RUT del arrendatario (inquilino)?',
    'inmueble': '¿Cuál es la dirección del inmueble?',
    'renta': '¿Cuál es el monto mensual del arriendo?',
    'jornada': '¿Cuál es la jornada laboral? (horario y horas semanales)',
    'patente': '¿Cuál es la patente del vehículo?',
  };

  return questions[field] || `Necesito un dato más: ¿cuál es ${field}?`;
}
