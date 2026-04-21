"use client";

import { useEffect, useState } from "react";
import { SLIDE_BANNER_IMAGES, SLIDE_BANNER_INTERVAL_MS } from "@/lib/slideBanners";

/** 상단만 슬라이드, 본문은 페이지에서 흰 배경 처리 */
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
    <div
      className="relative z-0 h-[200px] w-full overflow-hidden bg-zinc-100 sm:h-[260px] md:h-[300px]"
      aria-hidden
    >
      <div className="absolute inset-0">
        {slides.map((src, i) => (
          <div
            key={src}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[1100ms] ease-in-out ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
            style={{ backgroundImage: `url(${src})` }}
          />
        ))}
        {/* 아래로 갈수록 흰색으로 스며들게 해 본문과 이어짐 */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 via-white/55 to-white" />
      </div>

      {slides.length > 1 && (
        <div className="pointer-events-none absolute bottom-3 left-0 right-0 z-[1] flex justify-center gap-2">
          {slides.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full shadow-sm transition-all duration-300 ${
                i === index ? "w-6 bg-[color:var(--smite-accent)]" : "w-1.5 bg-white/90 ring-1 ring-zinc-300/80"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
