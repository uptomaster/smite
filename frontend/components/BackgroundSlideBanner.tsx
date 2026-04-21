"use client";

import { useEffect, useState } from "react";
import { SLIDE_BANNER_IMAGES, SLIDE_BANNER_INTERVAL_MS } from "@/lib/slideBanners";

/** 상단 배너만 슬라이드. 페이드·인디케이터 없이 이미지 전체 노출 */
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
      className="relative z-0 h-[220px] w-full overflow-hidden bg-zinc-200 sm:h-[300px] md:h-[380px]"
      aria-hidden
    >
      <div className="absolute inset-0">
        {slides.map((src, i) => (
          <div
            key={src}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[1200ms] ease-in-out ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
            style={{ backgroundImage: `url(${src})` }}
          />
        ))}
      </div>
    </div>
  );
}
