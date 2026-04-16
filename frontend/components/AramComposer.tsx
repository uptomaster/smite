"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchAramRecommend, fetchChampions, type AramRecommendResponse } from "@/lib/api";

const DEBOUNCE_MS = 320;

function emptyResult(): AramRecommendResponse {
  return {
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
}

export function AramComposer({
  onResult,
  onLoading,
  onError,
}: {
  onResult: (data: AramRecommendResponse) => void;
  onLoading: (v: boolean) => void;
  onError: (msg: string | null) => void;
}) {
  const [champion, setChampion] = useState("");
  const [allies, setAllies] = useState("");
  const [enemies, setEnemies] = useState("");
  const [selectedAugments, setSelectedAugments] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const c = champion.trim();
    if (!c) {
      onResult(emptyResult());
      return;
    }
    onLoading(true);
    onError(null);
    try {
      const data = await fetchAramRecommend(c, allies, enemies, selectedAugments);
      onResult(data);
    } catch (e) {
      onResult(emptyResult());
      onError(e instanceof Error ? e.message : "Failed");
    } finally {
      onLoading(false);
    }
  }, [champion, allies, enemies, selectedAugments, onError, onLoading, onResult]);

  useEffect(() => {
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => {
      void load();
    }, DEBOUNCE_MS);
    return () => {
      if (t.current) clearTimeout(t.current);
    };
  }, [load]);

  useEffect(() => {
    if (!champion.trim()) {
      setSuggestions([]);
      return;
    }
    const st = setTimeout(async () => {
      try {
        setSuggestions(await fetchChampions(champion));
      } catch {
        setSuggestions([]);
      }
    }, 200);
    return () => clearTimeout(st);
  }, [champion]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <label className="mb-1 block text-sm font-medium text-neutral-500">내 챔피언</label>
        <input
          className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-xl font-semibold text-neutral-900 outline-none focus:border-neutral-400"
          placeholder="예: Ezreal"
          value={champion}
          onChange={(e) => {
            setChampion(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          autoComplete="off"
        />
        {open && suggestions.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-md">
            {suggestions.map((n) => (
              <li key={n}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-lg hover:bg-neutral-50"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setChampion(n);
                    setOpen(false);
                  }}
                >
                  {n}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-500">
          이미 선택한 증강 (증강 ID, 쉼표 — 이전 라운드에서 고른 것)
        </label>
        <input
          className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 outline-none focus:border-neutral-400"
          placeholder="예: 12345, 67890"
          value={selectedAugments}
          onChange={(e) => setSelectedAugments(e.target.value)}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-500">아군 (쉼표로 구분)</label>
          <input
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 outline-none focus:border-neutral-400"
            placeholder="Ashe, Janna"
            value={allies}
            onChange={(e) => setAllies(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-500">적군 (쉼표로 구분)</label>
          <input
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 outline-none focus:border-neutral-400"
            placeholder="Varus, Ziggs, Maokai"
            value={enemies}
            onChange={(e) => setEnemies(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
