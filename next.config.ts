import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // www.legalhelp.cl → legalhelp.cl (301 permanente)
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.legalhelp.cl' }],
        destination: 'https://legalhelp.cl/:path*',
        permanent: true,
      },
      // Alias slug cortos → slugs reales con "deuda" en el nombre
      {
        source: '/p/prescripcion-tag-:ciudad',
        destination: '/p/prescripcion-deuda-tag-:ciudad',
        permanent: true,
      },
      {
        source: '/p/prescripcion-bancaria-:ciudad',
        destination: '/p/prescripcion-deuda-bancaria-:ciudad',
        permanent: true,
      },
      {
        source: '/p/alimentos-:ciudad',
        destination: '/p/demanda-de-alimentos-:ciudad',
        permanent: true,
      },
      {
        source: '/p/despido-:ciudad',
        destination: '/p/denuncia-por-despido-injustificado-:ciudad',
        permanent: true,
      },
      {
        source: '/p/sernac-:ciudad',
        destination: '/p/carta-reclamo-sernac-:ciudad',
        permanent: true,
      },
      {
        source: '/p/desalojo-:ciudad',
        destination: '/p/demanda-de-desalojo-por-no-pago-:ciudad',
        permanent: true,
      },
      {
        source: '/p/cotizaciones-:ciudad',
        destination: '/p/denuncia-por-no-pago-de-cotizaciones-:ciudad',
        permanent: true,
      },
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
