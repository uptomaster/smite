"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { AramComposer } from "@/components/AramComposer";
import { AramDecisionPanel } from "@/components/AramDecisionPanel";
import { SmiteHeader } from "@/components/SmiteHeader";
import type { AramRecommendResponse } from "@/lib/api";

const AugmentWorldCupModal = dynamic(
  () => import("@/components/AugmentWorldCupModal").then((m) => m.AugmentWorldCupModal),
  { ssr: false },
);

const z = {
  winrate: 0,
  pickrate: 0,
  games_played: 0,
  confidence_score: 0,
  data_source: "estimated" as const,
  patch_version: null,
};
const sb = { base_score: 0, augment_combo: 0, context: 0, strength: 0, final_score: 0 };
const bars = { winrate: 0, synergy: 0, context: 0, confidence: 0 };
const rb = { synergy: "", context: "", statistical: "" };

const initial: AramRecommendResponse = {
  situation: { ally: [], enemy: [] },
  selection_state: { selected: [], count: 0 },
  best_pick: {
    augment: "",
    tier: "silver",
    subtitle: "",
    summary: "",
    description_short: "",
    confidence: 0,
    reasons: [],
    reason_breakdown: rb,
    stats: z,
    score_breakdown: sb,
    score_bars: bars,
    items: [],
  },
  alternatives: [],
  anti_pick: { augment: "", reasons: [], stats: null, score: null },
};

export default function HomePage() {
  const [result, setResult] = useState<AramRecommendResponse>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [worldCupOpen, setWorldCupOpen] = useState(false);

  const onResult = useCallback((data: AramRecommendResponse) => {
    setResult(data);
  }, []);

  return (
    <main className="relative min-h-[100dvh] w-full overflow-x-hidden">
      <AugmentWorldCupModal open={worldCupOpen} onClose={() => setWorldCupOpen(false)} />

      <div className="mx-auto w-full max-w-5xl px-4 pb-24 pt-8 sm:px-6 sm:pb-28 md:px-8 md:pb-32 lg:max-w-6xl lg:px-10">
        <SmiteHeader onOpenWorldCup={() => setWorldCupOpen(true)} />

        <div className="mt-12 flex min-w-0 flex-col md:mt-16 lg:mt-20">
          <div className="min-w-0">
            <div className="mb-8 flex items-start gap-4 border-b border-zinc-300/80 pb-6 md:mb-10 md:pb-8">
              <span
                className="mt-0.5 h-10 w-1 shrink-0 rounded-full bg-[color:var(--smite-accent)]"
                aria-hidden
              />
              <div>
                <p className="smite-zone-label">조건 입력</p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600 md:text-base">
                  챔피언·증강·팀을 채우면 <strong className="font-semibold text-zinc-800">아래 브리핑</strong>이 갱신됩니다.
                </p>
              </div>
            </div>
            <AramComposer onResult={onResult} onLoading={setLoading} onError={setError} />

            {error && (
              <div
                className="mt-10 rounded-xl border border-amber-200/90 border-l-4 border-l-amber-500 bg-amber-50/95 px-4 py-3 font-mono text-xs leading-relaxed text-amber-950"
                role="alert"
              >
                <span className="font-bold text-amber-800">연결 오류 · </span>
                백엔드 실행과 API 주소를 확인해 주세요. ({error})
              </div>
            )}
          </div>

          <section
            aria-live="polite"
            className="mt-16 min-w-0 border-t-2 border-zinc-300/80 pt-14 md:mt-24 md:pt-20 lg:mt-28 lg:pt-24"
          >
            <div className="mb-10 flex items-start gap-4 border-b border-zinc-300/80 pb-6 md:mb-12 md:pb-8">
              <span className="mt-0.5 h-10 w-1 shrink-0 rounded-full bg-zinc-400" aria-hidden />
              <div>
                <p className="smite-zone-label text-[color:var(--smite-accent-bright)]">추천 브리핑</p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600 md:text-base">
                  같은 페이지 아래에서 조합·추천·근거·대안을 확인합니다.
                </p>
              </div>
            </div>
            {loading ? (
              <div className="space-y-6 text-left">
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">잠시만요</p>
                  <p className="font-display mt-2 text-2xl font-semibold text-zinc-800 md:text-3xl">추천 브리핑 준비 중</p>
                </div>
                <div className="flex animate-pulse flex-col gap-4">
                  <div className="h-px w-full bg-zinc-200" />
                  <div className="h-8 max-w-md bg-zinc-200" />
                  <div className="space-y-2">
                    <div className="h-3 w-full bg-zinc-200" />
                    <div className="h-3 w-5/6 bg-zinc-200/90" />
                    <div className="h-3 w-4/6 bg-zinc-200/80" />
                  </div>
                  <div className="h-px w-full bg-zinc-200" />
                </div>
              </div>
            ) : (
              <AramDecisionPanel data={result} />
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
