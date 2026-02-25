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
      <head />
      <body style={{ fontFamily: "system-ui", margin: 0, padding: 16 }}>
        <Script
          src="https://www.airbnb.com.pe/embeddable/airbnb_jssdk"
          strategy="afterInteractive"
        />
        <main style={{ maxWidth: 1100, margin: "0 auto" }}>{children}</main>
      </body>
    </html>
  );
}