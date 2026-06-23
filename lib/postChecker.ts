/**
 * postChecker.ts — Verificación post-generación.
 * Capa 4: reglas DURAS que bloquean documentos con errores graves.
 * No depende del LLM. Es regex + lógica determinista.
 */

export interface CheckResult {
  passed: boolean;
  errors: string[];   // Errores graves (bloquean entrega)
  warnings: string[]; // Advertencias (no bloquean pero se loguean)
}

/**
 * Verifica el documento generado contra reglas duras.
 * Si no pasa → se reintenta generación o se marca para revisión.
 */
export function checkDocument(doc: string, tipo: string): CheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ─── 1. Patrones PROHIBIDOS ────────────────────────────────────────────

  // "y siguientes" / "y ss."
  if (/y\s+siguientes|y\s+ss\./i.test(doc)) {
    errors.push('Contiene "y siguientes" o "y ss." — debe citar artículos específicos');
  }

  // Artículos consecutivos (3+ seguidos del mismo cuerpo legal): arts. 1, 2, 3, 4
  const consecutivePattern = /art[sí]?\.?\s*(\d+),\s*(\d+),\s*(\d+)/gi;
  let match;
  while ((match = consecutivePattern.exec(doc)) !== null) {
    const n1 = parseInt(match[1]);
    const n2 = parseInt(match[2]);
    const n3 = parseInt(match[3]);
    if (n2 === n1 + 1 && n3 === n2 + 1) {
      errors.push(`Artículos consecutivos detectados: ${n1}, ${n2}, ${n3} — deben ser específicos, no correlativos`);
      break;
    }
  }

  // Voz de abogado (debe ser primera persona del compareciente)
  const vozAbogado = /\bmi\s+representado\b|\bmi\s+cliente\b|\bel\s+representado\b|\bsu\s+representado\b/i;
  if (vozAbogado.test(doc)) {
    errors.push('Usa voz de abogado ("mi representado/mi cliente") — debe ser primera persona');
  }

  // Markdown o HTML
  if (/\*\*|__|#{1,6}\s|<[a-z]+>/i.test(doc)) {
    errors.push('Contiene markdown o HTML — debe ser texto plano');
  }

  // ─── 2. Estructura según tipo de documento ─────────────────────────────

  const tipoNorm = tipo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Escritos judiciales: deben tener POR TANTO
  if (/demanda|recurso|solicitud.*prescripcion|solicitud.*nulidad|denuncia.*inspeccion/.test(tipoNorm)) {
    if (!/POR\s+TANTO/i.test(doc)) {
      warnings.push('Escrito judicial sin "POR TANTO" — puede faltar la petición');
    }
    if (!/PRESENTE/i.test(doc)) {
      warnings.push('Escrito judicial sin "PRESENTE" — puede faltar el encabezado');
    }
  }

  // Contratos: deben tener PARTES o CLÁUSULAS
  if (/contrato|arriendo|arrendamiento|trabajo/.test(tipoNorm) && !/demanda/.test(tipoNorm)) {
    if (!/CL[AÁ]USULA|PARTES|PRIMERO|PRIMERA/i.test(doc)) {
      warnings.push('Contrato sin cláusulas visibles');
    }
  }

  // Poderes: deben tener otorgante + apoderado + facultades
  if (/poder/.test(tipoNorm)) {
    if (!/otorgo\s+poder|confiero\s+poder|por\s+medio\s+del\s+presente/i.test(doc)) {
      warnings.push('Poder sin fórmula de otorgamiento');
    }
  }

  // ─── 3. Datos pendientes excesivos ─────────────────────────────────────

  const pendientes = (doc.match(/\[DATO PENDIENTE[^\]]*\]|\[DATO\]/gi) || []).length;
  if (pendientes > 3) {
    errors.push(`Demasiados [DATO PENDIENTE] (${pendientes}) — el documento no es útil`);
  } else if (pendientes > 1) {
    warnings.push(`${pendientes} campos con [DATO PENDIENTE]`);
  }

  // ─── 4. Largo mínimo ──────────────────────────────────────────────────

  if (doc.length < 300) {
    errors.push('Documento demasiado corto (menos de 300 caracteres) — probablemente incompleto');
  }

  // ─── 5. Fecha presente ─────────────────────────────────────────────────

  if (/\[FECHA\]|\[DIA\]|\[MES\]|\[AÑO\]/i.test(doc)) {
    warnings.push('Contiene placeholders de fecha — debería usar fecha real');
  }

  // ─── 6. Placeholders genéricos (no son [DATO PENDIENTE] sino instrucciones sin rellenar) ─

  const genericPlaceholders = doc.match(/\[[a-z][^\]]{3,}\]/g) || [];
  // Filter out [DATO PENDIENTE] which is our valid placeholder
  const realGeneric = genericPlaceholders.filter(p => !/dato pendiente/i.test(p));
  if (realGeneric.length > 0) {
    warnings.push(`Placeholders genéricos detectados (${realGeneric.length}): ${realGeneric.slice(0, 3).join(', ')}${realGeneric.length > 3 ? '...' : ''}`);
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Genera un prompt de corrección para reintentar generación si el checker falla.
 */
export function buildCorrectionPrompt(errors: string[]): string {
  return `ERRORES DETECTADOS EN TU REDACCIÓN ANTERIOR — CORRIGE OBLIGATORIAMENTE:\n${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}\n\nVuelve a redactar el documento COMPLETO corrigiendo estos errores. No expliques qué corregiste, solo entrega el documento corregido.`;
}
