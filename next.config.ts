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

      // PSEO geo → solo categorías GEO mantienen páginas de ciudad
      // Las categorías NO-GEO redirigen vía vercel.json (regex), no aquí
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
