"use client";

import React, { useEffect, useRef, useState } from "react";

export default function BgAudio() {
  const ref = useRef<HTMLAudioElement | null>(null);

  const [muted, setMuted] = useState(true);      // inicia muteado
  const [blocked, setBlocked] = useState(false); // autoplay bloqueado

  const ensurePlaying = async () => {
    const a = ref.current;
    if (!a) return;
    try {
      await a.play();
      setBlocked(false);
    } catch {
      setBlocked(true);
    }
  };

  const toggle = async () => {
    const a = ref.current;
    if (!a) return;

    const next = !muted;
    setMuted(next);
    a.muted = next;

    // si está desmuteando, asegúrate que esté reproduciendo
    if (!next) await ensurePlaying();
  };

  useEffect(() => {
    const a = ref.current;
    if (!a) return;

    a.loop = true;
    a.preload = "auto";
    a.muted = true; // clave para que iOS deje autoplay
    setMuted(true);

    // intenta arrancar en mute
    ensurePlaying();

    // primer gesto del usuario: ya puede quedar sonando, y si desmuteas, suena
    const onFirstGesture = () => ensurePlaying();
    window.addEventListener("pointerdown", onFirstGesture, { passive: true });
    window.addEventListener("keydown", onFirstGesture);

    return () => {
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("keydown", onFirstGesture);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <audio ref={ref} src="/audio.mp3" />

      <button
        onClick={toggle}
        style={{
          position: "fixed",
          top: 10,
          right: 10,
          zIndex: 10000,
          border: "1px solid #1f5132",
          background: !muted ? "#1f5132" : "#e8f6ee",
          color: !muted ? "#e8f6ee" : "#1f5132",
          fontWeight: 900,
          padding: "10px 12px",
          borderRadius: 12,
          cursor: "pointer",
        }}
        title={!muted ? "Mutear" : "Activar audio"}
      >
        {!muted ? "🔊 Audio" : "🔇 Audio"}
        {blocked ? " (tap)" : ""}
      </button>
    </>
  );
}