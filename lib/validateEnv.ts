/**
 * validateEnv.ts
 * Validates required environment variables at server startup.
 * Import this in any API route that needs MP credentials.
 * Throws a clear error in development; logs warning in production.
 */

const REQUIRED = [
  'DEEPSEEK_API_KEY',
  'MP_ACCESS_TOKEN',
  'NEXT_PUBLIC_BASE_URL',
] as const;

let validated = false;

export function validateEnv(): void {
  if (validated) return;
  validated = true;

  const missing = REQUIRED.filter(k => !process.env[k]);

  if (missing.length > 0) {
    const msg = `[Legalhelp] Variables de entorno faltantes: ${missing.join(', ')}\n` +
      'Agrega estas variables a .env.local (desarrollo) o a las env vars del hosting (producción).';

    if (process.env.NODE_ENV === 'production') {
      console.error(msg);
    } else {
      throw new Error(msg);
    }
  }

  // Warn about placeholder values
  const token = process.env.MP_ACCESS_TOKEN ?? '';
  if (token === 'TEST-xxxxxxxxxxxxxxxxxxxx' || token.length < 20) {
    console.warn('[Legalhelp] MP_ACCESS_TOKEN parece un placeholder. Reemplázalo con tu token real de MercadoPago.');
  }

  // Warn if Supabase is not configured (orders will be in-memory only)
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.warn('[Legalhelp] SUPABASE_URL o SUPABASE_SERVICE_KEY no configuradas. Las órdenes se almacenan solo en memoria (se pierden al reiniciar).');
  }
}
