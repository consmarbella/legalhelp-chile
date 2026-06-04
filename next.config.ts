import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // www.legalhelp.cl → legalhelp.cl
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.legalhelp.cl' }],
        destination: 'https://legalhelp.cl/:path*',
        permanent: true,
      },

      // Alias cortos → hub
      { source: '/p/prescripcion-tag-:ciudad', destination: '/p/prescripcion-de-deuda-tag', permanent: true },
      { source: '/p/prescripcion-bancaria-:ciudad', destination: '/p/prescripcion-de-deuda-bancaria', permanent: true },
      { source: '/p/alimentos-:ciudad', destination: '/p/demanda-de-alimentos', permanent: true },
      { source: '/p/despido-:ciudad', destination: '/p/denuncia-por-despido-injustificado', permanent: true },
      { source: '/p/sernac-:ciudad', destination: '/p/carta-reclamo-sernac', permanent: true },
      { source: '/p/desalojo-:ciudad', destination: '/p/demanda-de-desalojo-por-no-pago', permanent: true },
      { source: '/p/cotizaciones-:ciudad', destination: '/p/denuncia-por-no-pago-de-cotizaciones', permanent: true },

      // PSEO geo → hub (slugs exactos de cada categoria)
      { source: '/p/alzamiento-de-embargo-sobre-vehiculo-:ciudad', destination: '/p/alzamiento-de-embargo-sobre-vehiculo', permanent: true },
      { source: '/p/carta-reclamo-sernac-:ciudad', destination: '/p/carta-reclamo-sernac', permanent: true },
      { source: '/p/certificado-de-antecedentes-para-fines-especiales-:ciudad', destination: '/p/certificado-de-antecedentes-para-fines-especiales', permanent: true },
      { source: '/p/demanda-alimentos-:ciudad', destination: '/p/demanda-de-alimentos', permanent: true },
      { source: '/p/demanda-desalojo-:ciudad', destination: '/p/demanda-de-desalojo-por-no-pago', permanent: true },
      { source: '/p/denuncia-despido-injustificado-:ciudad', destination: '/p/denuncia-por-despido-injustificado', permanent: true },
      { source: '/p/denuncia-no-pago-cotizaciones-:ciudad', destination: '/p/denuncia-por-no-pago-de-cotizaciones', permanent: true },
      { source: '/p/eliminacion-de-antecedentes-penales-:ciudad', destination: '/p/eliminacion-de-antecedentes-penales', permanent: true },
      { source: '/p/limpieza-de-hoja-de-vida-del-conductor-:ciudad', destination: '/p/limpieza-de-hoja-de-vida-del-conductor', permanent: true },
      { source: '/p/omision-de-antecedentes-por-violencia-intrafamiliar-:ciudad', destination: '/p/omision-de-antecedentes-por-violencia-intrafamiliar', permanent: true },
      { source: '/p/poder-simple-:ciudad', destination: '/p/poder-simple-notarial', permanent: true },
      { source: '/p/prescripcion-deuda-tag-:ciudad', destination: '/p/prescripcion-de-deuda-tag', permanent: true },
      { source: '/p/prescripcion-deuda-bancaria-:ciudad', destination: '/p/prescripcion-de-deuda-bancaria', permanent: true },
      { source: '/p/prescripcion-de-multas-de-transito-:ciudad', destination: '/p/prescripcion-de-multas-de-transito', permanent: true },
      { source: '/p/recurso-proteccion-:ciudad', destination: '/p/recurso-de-proteccion', permanent: true },
      { source: '/p/registro-nacional-de-deudores-de-pensiones-de-alimentos-:ciudad', destination: '/p/registro-nacional-de-deudores-de-pensiones-de-alimentos', permanent: true },
    ];
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
