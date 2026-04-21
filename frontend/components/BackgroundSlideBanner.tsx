"use client";

import { useEffect, useState } from "react";
import { SLIDE_BANNER_IMAGES, SLIDE_BANNER_INTERVAL_MS } from "@/lib/slideBanners";

export function BackgroundSlideBanner() {
  const slides = SLIDE_BANNER_IMAGES;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, SLIDE_BANNER_INTERVAL_MS);
    return () => window.clearInterval(t);
  }, [slides.length]);

  if (slides.length === 0) return null;

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
        {slides.map((src, i) => (
          <div
            key={src}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[1200ms] ease-in-out ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
            style={{ backgroundImage: `url(${src})` }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-white/82 via-white/76 to-white/88" />
      </div>

      {slides.length > 1 && (
        <div
          className="pointer-events-none fixed bottom-5 left-0 right-0 z-[5] flex justify-center gap-2"
          aria-hidden
        >
          {slides.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? "w-6 bg-[color:var(--smite-accent)]" : "w-1.5 bg-zinc-400/70"
              }`}
            />
          ))}
        </div>
      )}
    </>
  );
}
