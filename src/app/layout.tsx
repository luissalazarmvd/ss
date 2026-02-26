// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = { title: "gays" };

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const BPM = 135;
  const beat = 60 / BPM;
  const loopSeconds = beat * 8;

  return (
    <html lang="es">
      <body
        style={{
          fontFamily: "system-ui",
          margin: 0,
          padding: 16,
          background: "#cfe9d7",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <style>{`
          :root{
            --tile: 120px;
            --opacity: 0.12;
            --loop: ${loopSeconds}s;
          }

          .bgTiles{
            position: fixed;
            inset: 0;
            z-index: 0;
            pointer-events: none;
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(var(--tile), 1fr));
            grid-auto-rows: var(--tile);
            opacity: var(--opacity);
          }

          .bgTile{
            background-image: url("/pattern.png");
            background-repeat: no-repeat;
            background-size: cover;
            animation: tileHeadbang var(--loop) steps(1, end) infinite;
            will-change: transform;
          }

          @keyframes tileHeadbang{
            0%    { transform: translate(0px, 0px) rotate(0deg)   scale(1); }
            12.5% { transform: translate(0px, 2px) rotate(8deg)   scale(1.02); }
            25%   { transform: translate(0px, -6px) rotate(-14deg) scale(1.03); }
            37.5% { transform: translate(0px, 3px) rotate(10deg)  scale(1.02); }
            50%   { transform: translate(0px, -7px) rotate(-16deg) scale(1.03); }
            62.5% { transform: translate(0px, 2px) rotate(9deg)   scale(1.02); }
            75%   { transform: translate(0px, -6px) rotate(-14deg) scale(1.03); }
            87.5% { transform: translate(0px, 2px) rotate(8deg)   scale(1.02); }
            100%  { transform: translate(0px, 0px) rotate(0deg)   scale(1); }
          }

          body > * { position: relative; z-index: 1; }

          @media (prefers-reduced-motion: reduce){
            .bgTile{ animation: none; }
          }
        `}</style>

        <div className="bgTiles" aria-hidden="true">
          {Array.from({ length: 180 }).map((_, i) => (
            <div
              key={i}
              className="bgTile"
              style={{
                animationDelay: `${(i % 8) * (loopSeconds / 8)}s`,
              }}
            />
          ))}
        </div>

        <Script src="https://www.airbnb.com.pe/embeddable/airbnb_jssdk" strategy="afterInteractive" />

        <main style={{ flex: 1 }}>{children}</main>

        <footer
          style={{
            marginTop: 16,
            padding: "10px 12px",
            textAlign: "center",
            color: "#1f5132",
            fontWeight: 800,
            opacity: 0.9,
          }}
        >
          © 2026 Desarrollado por un chinito de mantenimiento. Todos los derechos reservados. <span style={{ fontWeight: 950 }}>8===D</span>
        </footer>
      </body>
    </html>
  );
}