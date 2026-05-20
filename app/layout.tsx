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
  viewport: "width=device-width, initial-scale=1.0",
  icons: { icon: "/favicon.ico" },
  verification: {
    google: "JipDFGc1s1C9-2_55zczlp36vdlW3-VuDweJWJMgGmo",
    other: {
      "msvalidate.01": "5FA314B20BB93FD6E5357FBFF4B76C39",
    },
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
    images: [
      {
        url: "https://legalhelp.cl/og-image.png",
        width: 1200,
        height: 630,
        alt: "LegalHelp Chile – Documentos legales con IA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LegalHelp Chile – Documentos legales con IA",
    description:
      "Generá documentos legales válidos en Chile con IA. Listo en minutos.",
    images: ["https://legalhelp.cl/og-image.png"],
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
              contactPoint: {
                "@type": "ContactPoint",
                email: "contacto@legalhelp.cl",
                contactType: "Customer Service",
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "LegalHelp Chile",
              url: "https://legalhelp.cl",
              description:
                "Generá documentos legales válidos en Chile con inteligencia artificial. Prescripción TAG, demanda de alimentos, reclamos SERNAC, finiquito laboral y más.",
              inLanguage: "es-CL",
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: "https://legalhelp.cl/?q={search_term_string}",
                },
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
        {children}
      </body>
    </html>
  );
}
