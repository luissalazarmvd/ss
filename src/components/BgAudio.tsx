"use client";

import React, { useEffect, useRef } from "react";

export default function BgAudio() {
  const ref = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const a = ref.current;
    if (!a) return;

    // intenta autoplay (puede fallar en iPhone/Chrome si no hubo interacción)
    a.play().catch(() => {});
  }, []);

  return <audio ref={ref} src="/audio.mp3" autoPlay loop preload="auto" />;
}