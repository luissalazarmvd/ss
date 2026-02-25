"use client";

import React, { useEffect, useRef, useState } from "react";

export default function BgAudio() {
  const ref = useRef<HTMLAudioElement | null>(null);

  const [isOn, setIsOn] = useState(false);       // está sonando
  const [blocked, setBlocked] = useState(false); // autoplay bloqueado

  const play = async () => {
    const a = ref.current;
    if (!a) return;
    try {
      await a.play();
      setIsOn(true);
      setBlocked(false);
    } catch {
      setIsOn(false);
      setBlocked(true);
    }
  };

  const pause = () => {
    const a = ref.current;
    if (!a) return;
    a.pause();
    setIsOn(false);
  };

  const toggle = async () => {
    if (isOn) {
      pause();
    } else {
      await play();
    }
  };

  useEffect(() => {
    // intenta autoplay al cargar (puede fallar)
    play();

    // primer gesto del usuario = intenta arrancar
    const onFirstGesture = () => play();
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
      <audio ref={ref} src="/audio.mp3" loop preload="auto" />

      <button
        onClick={toggle}
        style={{
          position: "fixed",
          top: 10,
          right: 10,
          zIndex: 10000,
          border: "1px solid #1f5132",
          background: isOn ? "#1f5132" : "#e8f6ee",
          color: isOn ? "#e8f6ee" : "#1f5132",
          fontWeight: 900,
          padding: "10px 12px",
          borderRadius: 12,
          cursor: "pointer",
        }}
        title={isOn ? "Mutear" : "Activar audio"}
      >
        {isOn ? "🔊 Audio" : "🔇 Audio"}
        {blocked ? " (tap)" : ""}
      </button>
    </>
  );
}