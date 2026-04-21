"use client";

import type { ScoreBars as Bars } from "@/lib/api";

const labels: Record<keyof Bars, string> = {
  winrate: "승·픽 데이터",
  synergy: "증강 궁합",
  context: "팀 상황 맞춤",
  confidence: "표본 신뢰도",
};

function Bar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(Math.min(100, Math.max(0, value * 100)));
  const segments = 20;
  const filled = Math.round((pct / 100) * segments);
  return (
    <div className="space-y-2">
      <div className="flex justify-between font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-600">
        <span>{label}</span>
        <span className="tabular-nums text-zinc-700">{pct}%</span>
      </div>
      <div className="flex gap-0.5" role="img" aria-label={`${label} ${pct}%`}>
        {Array.from({ length: segments }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 ${i < filled ? "bg-[color:var(--smite-accent)]" : "bg-zinc-200"}`}
          />
        ))}
      </div>
    </div>
  );
}

export function ScoreBars({ bars, compact }: { bars: Bars; compact?: boolean }) {
  const keys = (Object.keys(labels) as (keyof Bars)[]).filter((k) => labels[k]);
  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {keys.map((k) => (
        <Bar key={k} label={labels[k]} value={bars[k]} />
      ))}
    </div>
  );
}
