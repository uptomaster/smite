"use client";

/**
 * 브랜드 로고는 `public/smite-logo.png`를 두고 아래 주석 블록으로 교체하면 됩니다.
 */
export function SmiteHeader() {
  return (
    <header className="border-b border-smite-line pb-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-5">
          <div
            className="relative flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center border border-zinc-200 bg-zinc-100 sm:h-14 sm:w-14"
            style={{ clipPath: "polygon(12% 0, 100% 0, 100% 88%, 88% 100%, 0 100%, 0 12%)" }}
            aria-hidden
          >
            <span className="select-none font-mono text-xl font-bold tracking-tighter text-[color:var(--smite-accent)] sm:text-2xl">
              S
            </span>
            {/* <Image src="/smite-logo.png" alt="SMITE" width={56} height={56} className="object-contain p-1" /> */}
          </div>
          <div className="min-w-0 space-y-2 pt-0.5">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-zinc-500">SMITE</p>
            <h1 className="font-display text-2xl font-normal leading-tight tracking-tight text-zinc-900 md:text-[1.85rem] md:leading-snug">
              칼바람 증강, 뭘 고를지 헷갈릴 때
            </h1>
            <p className="max-w-lg text-sm leading-relaxed text-zinc-600">
              챔피언만 정해도 바로 브리핑이 뜹니다. 아군·적 팀과 이미 뽑은 증강을 넣으면 그다음 라운드에 맞춰 골라 드립니다.
            </p>
          </div>
        </div>
        <div className="hidden shrink-0 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400 sm:block">
          ARAM · AUGMENTS
        </div>
      </div>
    </header>
  );
}
