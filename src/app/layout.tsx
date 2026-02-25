// src/app/layout.tsx
import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = { title: "SS - Viaje - Estaba aburrido" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body
        style={{
          fontFamily: "system-ui",
          margin: 0,
          padding: 16,
          background: "#cfe9d7", // verde pastel base
        }}
      >
        {/* overlay repetido con transparencia */}
        <style>{`
          body::before{
            content:"";
            position: fixed;
            inset: 0;
            pointer-events: none;
            z-index: 0;

            background-image: url("/pattern.png");
            background-repeat: repeat;
            background-size: 120px 120px; /* ajusta tamaño del tile */
            opacity: 0.12;               /* ajusta transparencia */
          }

          /* asegura que tu contenido esté encima del overlay */
          body > * { position: relative; z-index: 1; }
        `}</style>

        <Script src="https://www.airbnb.com.pe/embeddable/airbnb_jssdk" strategy="afterInteractive" />
        {children}
      </body>
    </html>
  );
}