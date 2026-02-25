// src/app/layout.tsx
import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "SS - Viaje",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ fontFamily: "system-ui", margin: 0, padding: 16 }}>
        <Script
          src="https://www.airbnb.com.pe/embeddable/airbnb_jssdk"
          strategy="lazyOnload"
        />
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>{children}</div>
      </body>
    </html>
  );
}