/**
 * release.ts — publicación por goteo ("drip").
 *
 * Una página con `release` futura existe (sirve 200) pero queda NOINDEX y FUERA
 * del sitemap y del interlinking hasta su fecha. Así Google la descubre de forma
 * gradual (~20/día), evitando un "dump" masivo que dispara señales de spam.
 *
 * Páginas SIN `release` = contenido base ya establecido (siempre publicado).
 */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isReleased(release?: string | null): boolean {
  if (!release) return true;            // sin fecha => siempre publicada
  return release <= todayISO();
}
