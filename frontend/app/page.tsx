"use client";

import { useCallback, useState } from "react";
import { AramComposer } from "@/components/AramComposer";
import { AramDecisionPanel } from "@/components/AramDecisionPanel";
import type { AramRecommendResponse } from "@/lib/api";

const initial: AramRecommendResponse = {
  situation: { ally: [], enemy: [] },
  selection_state: { selected: [], count: 0 },
  best_pick: {
    augment: "",
    tier: "silver",
    subtitle: "",
    summary: "",
    confidence: 0,
    reasons: [],
    items: [],
  },
  alternatives: [],
  anti_pick: { augment: "", reasons: [] },
};

export default function HomePage() {
  const [result, setResult] = useState<AramRecommendResponse>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onResult = useCallback((data: AramRecommendResponse) => {
    setResult(data);
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-8 md:px-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">ARAM · 30초 안에 결정</p>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 md:text-4xl">지금 뭐 고를지</h1>
        <p className="text-sm text-neutral-500">숫자 대신 의미만. 클릭 최소.</p>
      </header>

      <AramComposer onResult={onResult} onLoading={setLoading} onError={setError} />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <section aria-live="polite" className="flex-1">
        {loading ? (
          <div className="animate-pulse space-y-4 rounded-2xl border border-neutral-100 bg-neutral-50 p-6">
            <div className="h-6 w-1/3 rounded bg-neutral-200" />
            <div className="h-32 rounded-xl bg-neutral-200" />
            <div className="h-20 rounded-lg bg-neutral-200" />
          </div>
        ) : (
          <AramDecisionPanel data={result} />
        )}
      </section>
    </main>
  );
}
