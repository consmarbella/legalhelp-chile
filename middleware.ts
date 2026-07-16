import { NextRequest, NextResponse } from 'next/server';
import paginas from '@/data/paginas.json';

/**
 * Routing de /p/ con paginas.json como ÚNICA fuente de verdad (reemplaza los
 * redirects regex que estaban en vercel.json).
 *
 *  - slug válido (en paginas.json)        → 200 (sirve la página)
 *  - variante de ciudad de un doc-type    → 301 al hub (consolida señal SEO)
 *  - doc-types sin hub propio             → 301 a /p/servicios-legales
 *  - cualquier otra cosa removida         → 410 Gone (deindexar el relleno)
 */

const VALID = new Set(paginas.map((p) => p.slug));

// Doc-types cuyas variantes de ciudad consolidan a su hub: /p/<prefijo>
const HUB_PREFIXES = [
  'contrato-trabajo-indefinido', 'contrato-trabajo-plazo-fijo', 'contrato-trabajo-part-time',
  'contrato-trabajo-teletrabajo', 'contrato-trabajo-obra-faena', 'carta-renuncia-laboral',
  'carta-amonestacion-laboral', 'anexo-contrato-trabajo-sueldo', 'contrato-arriendo-casa',
  'contrato-arriendo-departamento', 'contrato-arriendo-local-comercial', 'contrato-subarriendo',
  'carta-termino-contrato-arriendo', 'carta-cobro-arriendo-impago', 'poder-notarial',
  'poder-para-vender-vehiculo', 'poder-para-cobrar-finiquito', 'poder-para-tramites-bancarios',
  'mandato-especial', 'declaracion-jurada-simple', 'declaracion-jurada-domicilio',
  'declaracion-jurada-ingresos', 'declaracion-jurada-dependientes', 'acuerdo-divorcio-mutuo-acuerdo',
  'convenio-regulacion-divorcio', 'acuerdo-tuicion-compartida', 'solicitud-visitas-reguladas',
  'carta-reclamo-sernac', 'carta-reclamo-banco', 'carta-reclamo-aerolinea', 'carta-reclamo-isapre',
  'carta-reclamo-telecomunicaciones', 'carta-reclamo-seguro', 'carta-reclamo-tienda-retail',
  'contrato-compraventa-vehiculo', 'contrato-compraventa-bien-mueble', 'promesa-compraventa-inmueble',
  'contrato-prestacion-servicios-honorarios', 'contrato-freelance', 'carta-cobranza-deuda',
  'acuerdo-pago-deuda', 'carta-prescripcion-deuda-general', 'solicitud-alzamiento-protesto',
  'escrito-defensa-infraccion-transito', 'escrito-impugnacion-multa-municipalidad',
  'escrito-prescripcion-multa-transito', 'prescripcion-deuda-tag', 'denuncia-ruidos-molestos-vecinos', 'denuncia-maltrato-animal',
  'recurso-apelacion-juzgado-policia-local', 'eliminacion-de-antecedentes-penales',
  'limpieza-de-hoja-de-vida-del-conductor', 'omision-de-antecedentes-por-violencia-intrafamiliar',
  'certificado-de-antecedentes-para-fines-especiales', 'registro-nacional-de-deudores-de-pensiones-de-alimentos',
]
  // del más largo al más corto para hacer match con el prefijo más específico
  .sort((a, b) => b.length - a.length);

// Doc-types sin página propia → van a servicios-legales
const SERVICIOS_PREFIXES = [
  'finiquito-laboral', 'carta-despido', 'demanda-dano-moral', 'denuncia-acoso-laboral',
  'denuncia-estafa', 'constitucion-spa', 'pagare', 'contrato-mutuo', 'testamento',
  'crear-escrito-legal',
];

const GONE_HTML =
  '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Página no disponible</title></head>' +
  '<body style="font-family:sans-serif;text-align:center;padding:60px 20px;color:#0b1f3a"><h1>Esta página ya no existe</h1>' +
  '<p>El contenido fue retirado. <a href="https://legalhelp.cl">Ir al inicio de LegalHelp Chile</a></p></body></html>';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const m = pathname.match(/^\/p\/([^/]+)\/?$/);
  if (!m) return NextResponse.next();

  const slug = decodeURIComponent(m[1]);

  // 1) Página válida → servir
  if (VALID.has(slug)) return NextResponse.next();

  const redirectTo = (target: string) => {
    const url = req.nextUrl.clone();
    url.pathname = `/p/${target}`;
    return NextResponse.redirect(url, 301);
  };

  // 2) Variante de ciudad de un doc-type con hub → 301 al hub (si el hub existe)
  for (const prefix of HUB_PREFIXES) {
    if (slug === prefix || slug.startsWith(prefix + '-')) {
      return VALID.has(prefix) ? redirectTo(prefix) : gone();
    }
  }

  // 3) Doc-types sin hub propio → servicios-legales
  for (const prefix of SERVICIOS_PREFIXES) {
    if (slug === prefix || slug.startsWith(prefix + '-')) {
      return VALID.has('servicios-legales') ? redirectTo('servicios-legales') : gone();
    }
  }
  // poder-simple (excepto el hub notarial, ya cubierto por VALID) → servicios-legales
  if (slug.startsWith('poder-simple')) {
    return VALID.has('servicios-legales') ? redirectTo('servicios-legales') : gone();
  }

  // 4) Resto (relleno sin demanda) → 410 Gone para deindexar
  return gone();
}

function gone() {
  return new NextResponse(GONE_HTML, {
    status: 410,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

export const config = {
  matcher: '/p/:path*',
};
