import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "LegalHelp Chile – Documentos legales con IA",
    template: "%s | LegalHelp Chile",
  },
  verification: {
    google: "REEMPLAZAR_CON_CODIGO_GSC",
  },
  description:
    "Generá documentos legales válidos en Chile con IA. Prescripción TAG, demanda de alimentos, reclamos SERNAC, finiquito laboral y más. Listo en minutos.",
  metadataBase: new URL("https://legalhelp.cl"),
  openGraph: {
    title: "LegalHelp Chile – Documentos legales al instante",
    description:
      "Generá documentos legales válidos en Chile con inteligencia artificial. Sin abogados caros, sin burocracia.",
    url: "https://legalhelp.cl",
    siteName: "LegalHelp Chile",
    locale: "es_CL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LegalHelp Chile – Documentos legales con IA",
    description:
      "Generá documentos legales válidos en Chile con IA. Listo en minutos.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es-CL"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <meta name="msvalidate.01" content="5FA314B20BB93FD6E5357FBFF4B76C39" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "LegalHelp Chile",
              url: "https://legalhelp.cl",
              description:
                "Documentos legales con inteligencia artificial para Chile",
              foundingLocation: {
                "@type": "Place",
                address: {
                  "@type": "PostalAddress",
                  addressCountry: "CL",
                },
              },
            }),
          }}
        />
        {children}

        {/* WhatsApp Floating Button */}
        <a
          href="https://wa.me/56967658939?text=Hola%20LegalHelp%2C%20quiero%20generar%20un%20documento%20legal"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 bg-[#25D366] w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-[#20ba5a] transition-colors hover:scale-110"
          aria-label="Contactar por WhatsApp"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 16 16">
            <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
          </svg>
        </a>

        {/* WhatsApp bar at bottom of every page */}
        <div className="bg-[#075e54] text-white text-center py-3 px-4 text-sm">
          <span>📱 ¿Necesitás ayuda? Escríbenos por WhatsApp → </span>
          <a
            href="https://wa.me/56967658939?text=Hola%20LegalHelp%2C%20quiero%20generar%20un%20documento%20legal"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold underline hover:text-[#25D366]"
          >
            +56 9 6765 8939
          </a>
        </div>
      </body>
    </html>
  );
}
