import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // www.legalhelp.cl → legalhelp.cl (301 permanente)
      // Evita contenido duplicado y unifica canonical
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.legalhelp.cl' }],
        destination: 'https://legalhelp.cl/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
