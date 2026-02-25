// src/app/layout.tsx
import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "SS - Viaje",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body
        style={{
          fontFamily: "system-ui",
          margin: 0,
          padding: 16,
          background: "#cfe9d7",
        }}
      >
        <img
          src="/esquina.png"
          alt=""
          style={{
            position: "fixed",
            top: 10,
            left: 10,
            width: 38,
            height: "auto",
            zIndex: 9999,
            pointerEvents: "none",
          }}
        />

        <Script src="https://www.airbnb.com.pe/embeddable/airbnb_jssdk" strategy="afterInteractive" />
        {children}
      </body>
    </html>
  );
}