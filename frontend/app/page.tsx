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

      <div className="mx-auto w-full max-w-[1680px] px-4 pb-16 pt-6 sm:px-6 lg:px-10 xl:px-12 2xl:px-16">
        <SmiteHeader onOpenWorldCup={() => setWorldCupOpen(true)} />

        <div className="mt-10 grid gap-12 xl:grid-cols-2 xl:gap-x-14 xl:gap-y-10 2xl:gap-x-20">
          <div className="min-w-0 xl:sticky xl:top-6 xl:self-start">
            <AramComposer onResult={onResult} onLoading={setLoading} onError={setError} />

            {error && (
              <div
                className="mt-8 border-l-4 border-amber-500 bg-amber-50/95 px-4 py-3 font-mono text-xs leading-relaxed text-amber-950"
                role="alert"
              >
                <span className="font-bold text-amber-800">연결 오류 · </span>
                백엔드 실행과 API 주소를 확인해 주세요. ({error})
              </div>
            )}
          </div>

          <section aria-live="polite" className="min-w-0 border-t border-smite-line pt-10 xl:border-t-0 xl:pt-0">
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
