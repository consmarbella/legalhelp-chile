// Validador RUT chileno (Módulo 11)
export function validarRUT(rut: string): boolean {
  const limpio = rut.replace(/[.\-]/g, '').toUpperCase();
  if (!/^\d+[0-9K]$/.test(limpio)) return false;
  const cuerpo = parseInt(limpio.slice(0, -1), 10);
  const dv = limpio.slice(-1);
  let suma = 0, factor = 2;
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
  return dvCalc === dv;
}

// Formatear RUT con puntos y guión
export function formatearRUT(rut: string): string {
  const limpio = rut.replace(/[.\-]/g, '').toUpperCase();
  if (!/^\d+[0-9K]$/.test(limpio)) return rut;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${cuerpoFormateado}-${dv}`;
}

// Regex para patente chilena (antigua BB·BB·BB y nueva BBBB·BB)
export const PATENTE_REGEX = /^[A-Za-z]{2,4}[0-9]{2,4}$/;
export function validarPatente(p: string): boolean {
  return PATENTE_REGEX.test(p.toUpperCase().replace(/[\s-]/g, ''));
}

// Fechas
export function validarFechaPasada(fechaStr: string): boolean {
  const [d, m, y] = fechaStr.split(/[\/\-]/).map(Number);
  if (!d || !m || !y) return false;
  const fecha = new Date(y, m - 1, d);
  if (fecha.getDate() !== d || fecha.getMonth() !== m - 1) return false;
  return fecha <= new Date();
}

export function esMayorDeEdad(fechaStr: string): boolean {
  const [d, m, y] = fechaStr.split(/[\/\-]/).map(Number);
  if (!d || !m || !y) return false;
  const hoy = new Date();
  let edad = hoy.getFullYear() - y;
  const mesDiff = hoy.getMonth() + 1 - m;
  if (mesDiff < 0 || (mesDiff === 0 && hoy.getDate() < d)) edad--;
  return edad >= 18;
}

// Teléfono chileno
export function validarTelefono(tel: string): boolean {
  return /^(\+56)?\s?9\s?\d{4}\s?\d{4}$/.test(tel.trim());
}

// Email
export function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Monto CLP
export function validarMonto(monto: string): boolean {
  const n = parseInt(monto.replace(/\D/g, ''), 10);
  return Number.isFinite(n) && n > 0;
}
