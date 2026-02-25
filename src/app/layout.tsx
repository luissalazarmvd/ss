// src/app/layout.tsx
import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "SS - Viaje",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
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
        <Script src="https://www.airbnb.com.pe/embeddable/airbnb_jssdk" strategy="afterInteractive" />
        {children}
      </body>
    </html>
  );
}