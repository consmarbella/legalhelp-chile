/**
 * tagAssistantLogic.ts — Validación, limpieza y lógica del asistente TAG.
 * Sin dependencias externas. Módulo 11 para RUTs chilenos.
 */

// ─── FECHA SISTEMA ─────────────────────────────────────────────
export const SYSTEM_DATE = new Date(2026, 6, 16); // 16 Julio 2026

// ─── PASOS ─────────────────────────────────────────────────────
export type TagStepId =
  | 'patente'
  | 'fecha'
  | 'rol'
  | 'identidad'
  | 'actividad'
  | 'direccion';

export interface TagStep {
  id: TagStepId;
  titulo: string;
  pregunta: string;
  subtitulo?: string;
}

export const TAG_STEPS: TagStep[] = [
  {
    id: 'patente',
    titulo: 'Paso 1 de 6',
    pregunta: 'Sube tu Certificado de Multas',
    subtitulo: 'Extraeremos todos tus datos automáticamente. Si no lo tienes, ingresa tu Patente:',
  },
  {
    id: 'fecha',
    titulo: 'Paso 2 de 6',
    pregunta: '¿En qué fecha se anotó o cursó la multa?',
    subtitulo: 'Debe tener al menos 3 años de antigüedad para prescribir',
  },
  {
    id: 'rol',
    titulo: 'Paso 3 de 6',
    pregunta: '¿Cuál es el número de Rol de la multa?',
    subtitulo: 'Aparece en tu Permiso de Circulación (ej: Rol 4520-2022)',
  },
  {
    id: 'identidad',
    titulo: 'Paso 4 de 6',
    pregunta: 'Por favor, ingresa tu Nombre Completo y tu RUT',
    subtitulo: 'Aceptamos RUT con o sin puntos y guión',
  },
  {
    id: 'actividad',
    titulo: 'Paso 5 de 6',
    pregunta: '¿Cuál es tu actividad, profesión u oficio?',
  },
  {
    id: 'direccion',
    titulo: 'Paso 6 de 6',
    pregunta: 'Para finalizar, ingresa tu dirección de domicilio',
    subtitulo: 'Incluye calle, número, comuna, correo y teléfono',
  },
];

// ─── VALIDACIONES ──────────────────────────────────────────────

/**
 * Valida patente chilena.
 * Acepta formatos: BBBB12, BB1234, BBBB123
 */
export function validarPatente(input: string): {
  valido: boolean;
  limpia: string;
  error: string;
} {
  const limpia = input.toUpperCase().replace(/[\s-]/g, '');
  const regex = /^[A-Z]{2,4}[0-9]{2,4}$/;
  if (!regex.test(limpia)) {
    return {
      valido: false,
      limpia,
      error: 'Formato inválido. Debe tener 2-4 letras y 2-4 números (ej: BBBB12)',
    };
  }
  return { valido: true, limpia, error: '' };
}

/**
 * Valida fecha de multa con filtro "Anti-Weas".
 * Fecha base del sistema: 16 Julio 2026.
 * La multa debe tener >= 3 años de antigüedad.
 */
export function validarFechaMulta(fechaStr: string): {
  valido: boolean;
  fecha: Date | null;
  fechaFormateada: string;
  error: string;
  fechaHabilitada?: string; // cuándo será legalmente válida
} {
  // Intentar parsear DD/MM/AAAA o DD-MM-AAAA
  const partes = fechaStr.split(/[\/\-]/);
  if (partes.length !== 3) {
    return {
      valido: false,
      fecha: null,
      fechaFormateada: '',
      error: 'Formato inválido. Usa DD/MM/AAAA (ej: 15/03/2020)',
    };
  }

  const d = parseInt(partes[0], 10);
  const m = parseInt(partes[1], 10) - 1; // JS months are 0-based
  const y = parseInt(partes[2], 10);

  if (isNaN(d) || isNaN(m) || isNaN(y)) {
    return {
      valido: false,
      fecha: null,
      fechaFormateada: '',
      error: 'Fecha inválida. Usa números (ej: 15/03/2020)',
    };
  }

  const fecha = new Date(y, m, d);
  if (fecha.getDate() !== d || fecha.getMonth() !== m) {
    return {
      valido: false,
      fecha: null,
      fechaFormateada: '',
      error: 'Fecha inválida (ej: 15/03/2020)',
    };
  }

  // Fecha límite: 16 Julio 2026 - 3 años = 16 Julio 2023
  const fechaLimite = new Date(2023, 6, 16); // 16 Julio 2023

  if (fecha > fechaLimite) {
    const fechaStrFormateada = fecha.toLocaleDateString('es-CL', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    // Fecha + 3 años
    const fechaHabilitada = new Date(y + 3, m, d);
    const fechaHabilitadaStr = fechaHabilitada.toLocaleDateString('es-CL', {
      day: 'numeric', month: 'long', year: 'numeric',
    });

    return {
      valido: false,
      fecha,
      fechaFormateada: fechaStrFormateada,
      error: `La multa ingresada es del ${fechaStrFormateada}. La ley exige un plazo mínimo de 3 años para declarar la prescripción. Este escrito recién será legalmente válido para ser presentado el ${fechaHabilitadaStr}.`,
      fechaHabilitada: fechaHabilitadaStr,
    };
  }

  return {
    valido: true,
    fecha,
    fechaFormateada: fecha.toLocaleDateString('es-CL', {
      day: 'numeric', month: 'long', year: 'numeric',
    }),
    error: '',
  };
}

/**
 * Valida número de Rol (causa).
 * Debe contener número + año. Bloquea "no se", "ninguno", "tag", "s/n".
 */
const EVASION_WORDS = ['no se', 'no sé', 'ninguno', 'tag', 's/n', 'sn', 'n/a', 'na', 'no'];
export function validarRol(input: string): {
  valido: boolean;
  limpio: string;
  error: string;
} {
  const limpio = input.trim();
  if (!limpio || limpio.length < 3) {
    return { valido: false, limpio, error: 'Debe contener el número de Rol (mínimo 3 caracteres)' };
  }

  const lower = limpio.toLowerCase();
  for (const word of EVASION_WORDS) {
    if (lower === word || lower.startsWith(word + ' ')) {
      return {
        valido: false,
        limpio,
        error: 'Debes ingresar el número de Rol real, no un texto de evasión',
      };
    }
  }

  // Debe contener al menos un número
  if (!/\d/.test(limpio)) {
    return { valido: false, limpio, error: 'El Rol debe contener al menos un número (ej: Rol 4520-2022)' };
  }

  return { valido: true, limpio, error: '' };
}

/**
 * Valida y formatea RUT chileno (Módulo 11).
 * Acepta: 138290123, 13.829.012-3, 13829012-3, etc.
 * Devuelve formateado como XX.XXX.XXX-X
 */
export function procesarRUT(input: string): {
  valido: boolean;
  rutFormateado: string;
  rutLimpio: string;
  error: string;
} {
  const limpio = input.replace(/[.\-]/g, '').toUpperCase().trim();

  if (!limpio) {
    return { valido: false, rutFormateado: '', rutLimpio: '', error: 'Ingresa tu RUT' };
  }

  // El nombre completo + RUT puede venir junto "Juan Pérez 13.829.012-3"
  // Intentar extraer RUT del string
  const rutMatch = limpio.match(/(\d{7,8})([0-9K])$/);
  if (!rutMatch) {
    // Intentar separar nombre y RUT
    const rutEnString = limpio.match(/(\d{7,8})[^0-9]*([0-9K])/);
    if (!rutEnString) {
      return {
        valido: false,
        rutFormateado: '',
        rutLimpio: '',
        error: 'No se encontró un RUT válido. Debe tener 7-8 dígitos + dígito verificador',
      };
    }
    const cuerpo = parseInt(rutEnString[1], 10);
    const dv = rutEnString[2].toUpperCase();
    return calcularDV(cuerpo, dv, input);
  }

  const cuerpo = parseInt(rutMatch[1], 10);
  const dv = rutMatch[2];
  return calcularDV(cuerpo, dv, input);
}

function calcularDV(cuerpo: number, dv: string, original: string): {
  valido: boolean;
  rutFormateado: string;
  rutLimpio: string;
  error: string;
} {
  // Calcular dígito verificador (Módulo 11)
  let suma = 0;
  let factor = 2;
  let temp = cuerpo;
  while (temp > 0) {
    suma += (temp % 10) * factor;
    temp = Math.floor(temp / 10);
    factor = factor === 7 ? 2 : factor + 1;
  }
  const resto = 11 - (suma % 11);
  let dvCalc = '';
  if (resto === 11) dvCalc = '0';
  else if (resto === 10) dvCalc = 'K';
  else dvCalc = String(resto);

  if (dvCalc !== dv) {
    return {
      valido: false,
      rutFormateado: '',
      rutLimpio: '',
      error: `Dígito verificador inválido. El RUT correcto sería ${cuerpo}-${dvCalc}`,
    };
  }

  // Formatear RUT con puntos y guión
  const cuerpoStr = String(cuerpo);
  const cuerpoFormateado = cuerpoStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const rutFormateado = `${cuerpoFormateado}-${dv}`;

  return { valido: true, rutFormateado, rutLimpio: `${cuerpo}${dv}`, error: '' };
}

/**
 * Extrae el nombre de un string que contiene "Nombre RUT"
 * Ej: "Juan Pérez 13.829.012-3" → "Juan Pérez"
 */
export function extraerNombre(input: string, rutFormateado: string): string {
  if (!rutFormateado) return input.trim();

  // Remover el RUT formateado del string
  const sinRut = input
    .replace(new RegExp(rutFormateado.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '')
    .replace(new RegExp(rutFormateado.replace(/\./g, '').replace('-', ''), 'g'), '')  // sin puntos
    .replace(/[0-9K-]+$/g, '') // cualquier dígito al final
    .trim();

  return sinRut || input.trim();
}

/**
 * Objeto de datos parcial que vamos construyendo paso a paso.
 */
export interface TagAssistantData {
  patenteVehiculo: string;
  fechaMulta: string;
  causasYAnio: string;
  nombreCliente: string;
  rutCliente: string;
  actividadCliente: string;
  direccionCliente: string;
  correoCliente: string;
  telefonoCliente: string;
  numeroJuzgado: string;
  juzgadoComuna: string;
  step: number; // 0-based, 0..5
  paid: boolean;
  // Batch PDF fields
  isBatch?: boolean;
  parsedComunas?: any[];
  totalCobro?: number;
  totalMultas?: number;
}

export function createEmptyAssistant(comuna?: string): TagAssistantData {
  return {
    patenteVehiculo: '',
    fechaMulta: '',
    causasYAnio: '',
    nombreCliente: '',
    rutCliente: '',
    actividadCliente: 'empleado',
    direccionCliente: '',
    correoCliente: '',
    telefonoCliente: '',
    numeroJuzgado: '',
    juzgadoComuna: comuna || '',
    step: 0,
    paid: false,
    isBatch: false,
    parsedComunas: [],
    totalCobro: 0,
    totalMultas: 0,
  };
}
