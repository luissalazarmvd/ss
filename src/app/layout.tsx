// src/app/layout.tsx
import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = { title: "SS - Viaje - Estaba aburrido" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Psychosocial ~135 BPM
  const BPM = 135;
  const beat = 60 / BPM;           // 0.444...
  const loopSeconds = beat * 8;    // 8 beats = 2 compases = 3.555...

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
        <style>{`
          :root{
            --tile: 120px;
            --opacity: 0.12;
            --loop: ${loopSeconds}s; /* 8 beats a ~135 BPM */
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

          /* “baila en su lugar” con acentos por beat (0,2,4,6) */
          @keyframes tileHeadbang{
            /* 8 beats (0,12.5,25,...,100) con golpes fuertes */
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

          /* contenido encima */
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
                // desfase por “beat” para que no bailen iguales
                animationDelay: `${(i % 8) * (loopSeconds / 8)}s`,
              }}
            />
          ))}
        </div>

        <Script src="https://www.airbnb.com.pe/embeddable/airbnb_jssdk" strategy="afterInteractive" />
        {children}
      </body>
    </html>
  );
}