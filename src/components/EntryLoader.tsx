"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";

export default function EntryLoader({ durationMs = 2100 }: { durationMs?: number }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => setShow(false), durationMs);
    return () => window.clearTimeout(t);
  }, [durationMs]);

  if (!show) return null;

  return (
    <>
      <style jsx>{`
        .overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: grid;
          place-items: center;
          background: rgba(232, 246, 238, 0.92);
          backdrop-filter: blur(6px);
        }

        .wrap {
          display: grid;
          place-items: center;
          gap: 10px;
          width: 100%;
          padding: 0 14px;
        }

        /* Contenedor responsivo: respeta ratio (Image con height:auto) */
        .imgBox {
          width: min(320px, calc(100vw - 28px)); /* iPhone: no se sale */
          height: auto;
          animation: wobbleSpin 1.2s ease-in-out 1;
          transform-origin: center;
        }

        @keyframes wobbleSpin {
          0% {
            transform: translateX(-18px) rotate(0deg) scale(0.98);
            opacity: 0.95;
          }
          25% {
            transform: translateX(18px) rotate(180deg) scale(1.02);
            opacity: 1;
          }
          50% {
            transform: translateX(-12px) rotate(360deg) scale(0.98);
          }
          75% {
            transform: translateX(12px) rotate(540deg) scale(1.02);
          }
          100% {
            transform: translateX(0px) rotate(720deg) scale(1);
            opacity: 1;
          }
        }

        .txt {
          font-weight: 900;
          color: #1f5132;
          opacity: 0.9;
          text-align: center;
        }

        @media (prefers-reduced-motion: reduce) {
          .imgBox {
            animation: none;
          }
        }
      `}</style>

      <div className="overlay" aria-label="Cagando 💩">
        <div className="wrap">
          <div className="imgBox">
            <Image
              src="/loading.png"
              alt="loading"
              width={1200}              /* “base” grande, no importa */
              height={1200}             /* se conserva ratio */
              style={{ width: "100%", height: "auto" }}  /* <- respeta ratio y escala */
              priority
            />
          </div>
          <div className="txt">Cargando…</div>
        </div>
      </div>
    </>
  );
}