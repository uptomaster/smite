"use client";

/**
 * 브랜드 로고는 `public/smite-logo.png`를 두고 아래 주석 블록으로 교체하면 됩니다.
 */
export function SmiteHeader({ onOpenWorldCup }: { onOpenWorldCup?: () => void }) {
  return (
    <header className="border-b border-zinc-300/90 pb-10 shadow-[0_1px_0_rgba(255,255,255,0.65)] md:pb-12">
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:gap-10">
        <div className="flex min-w-0 items-start gap-4 sm:gap-5">
          <div
            className="relative flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center border border-zinc-200 bg-[color:var(--smite-elevated)] sm:h-16 sm:w-16"
            style={{ clipPath: "polygon(12% 0, 100% 0, 100% 88%, 88% 100%, 0 100%, 0 12%)" }}
            aria-hidden
          >
            <span className="select-none font-mono text-xl font-bold tracking-tighter text-[color:var(--smite-accent)] sm:text-2xl">
              S
            </span>
            {/* <Image src="/smite-logo.png" alt="SMITE" width={56} height={56} className="object-contain p-1" /> */}
          </div>
          <div className="min-w-0 space-y-3 pt-0.5 text-left">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-zinc-500">SMITE</p>
            <h1 className="font-display text-left text-3xl font-normal leading-[1.15] tracking-tight text-zinc-900 md:text-[2.125rem] lg:text-[2.4rem]">
              칼바람 증강, 뭘 고를지 헷갈릴 때
            </h1>
            <p className="max-w-xl text-left text-base leading-relaxed text-zinc-600">
              챔피언만 정해도 바로 브리핑이 뜹니다. 아군·적 팀과 이미 뽑은 증강을 넣으면 그다음 라운드에 맞춰 골라 드립니다.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-3 border-t border-smite-line pt-6 text-left md:border-t-0 md:pt-0 md:text-right">
          {onOpenWorldCup && (
            <button
              type="button"
              onClick={onOpenWorldCup}
              className="w-full rounded-lg border border-zinc-200 bg-[color:var(--smite-elevated)] px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-700 transition hover:border-[color:var(--smite-accent)] hover:text-[color:var(--smite-accent-bright)] md:w-auto md:self-end"
            >
              증강 월드컵
            </button>
          )}
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400 md:self-end">ARAM · AUGMENTS</p>
        </div>
      </div>
    </header>
  );
}
