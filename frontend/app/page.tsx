"use client";

import { useCallback, useState } from "react";
import { BackgroundSlideBanner } from "@/components/BackgroundSlideBanner";
import { AramComposer } from "@/components/AramComposer";
import { AramDecisionPanel } from "@/components/AramDecisionPanel";
import { SmiteHeader } from "@/components/SmiteHeader";
import type { AramRecommendResponse } from "@/lib/api";

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

  const onResult = useCallback((data: AramRecommendResponse) => {
    setResult(data);
  }, []);

  return (
    <main className="min-h-screen bg-white">
      <BackgroundSlideBanner />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-200px)] max-w-5xl flex-col gap-10 bg-white px-4 py-10 md:min-h-0 md:gap-12 md:px-8 md:py-14">
        <SmiteHeader />

        <AramComposer onResult={onResult} onLoading={setLoading} onError={setError} />

        {error && (
          <div
            className="border-l-4 border-amber-500 bg-amber-50 px-4 py-3 font-mono text-xs leading-relaxed text-amber-950"
            role="alert"
          >
            <span className="font-bold text-amber-800">연결 오류 · </span>
            백엔드 실행과 API 주소를 확인해 주세요. ({error})
          </div>
        )}

        <section aria-live="polite" className="flex-1 pb-20">
          {loading ? (
            <div className="space-y-6 border-t border-smite-line pt-8">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">추천 생성 중</p>
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
    </main>
  );
}
