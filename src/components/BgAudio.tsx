"use client";

import React, { useEffect, useRef, useState } from "react";

export default function BgAudio() {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [needsClick, setNeedsClick] = useState(false);

  const tryPlay = async () => {
    const a = ref.current;
    if (!a) return;
    try {
      await a.play();
      setNeedsClick(false);
    } catch {
      setNeedsClick(true);
    }
  };

  useEffect(() => {
    tryPlay();

    // fallback: si el usuario toca cualquier parte, intenta arrancar
    const onFirstGesture = () => {
      tryPlay();
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("keydown", onFirstGesture);
    };
    window.addEventListener("pointerdown", onFirstGesture, { once: true });
    window.addEventListener("keydown", onFirstGesture, { once: true });

    return () => {
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("keydown", onFirstGesture);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <audio ref={ref} src="/audio.mp3" loop preload="auto" />

      {needsClick && (
        <button
          onClick={tryPlay}
          style={{
            position: "fixed",
            right: 14,
            bottom: 14,
            zIndex: 9999,
            border: "1px solid #1f5132",
            background: "#1f5132",
            color: "#e8f6ee",
            fontWeight: 900,
            padding: "10px 12px",
            borderRadius: 12,
            cursor: "pointer",
          }}
        >
          Activar audio
        </button>
      )}
    </>
  );
}