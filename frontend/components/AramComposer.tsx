"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchAramRecommend, fetchChampionSearch, type AramRecommendResponse, type ChampionSearchHit } from "@/lib/api";
import { augmentSlotsToCsv, EMPTY_AUGMENT_SLOTS, type AugmentSlotTuple } from "@/lib/augmentSlots";
import { AugmentPicker } from "@/components/AugmentPicker";
import { AramSynergyReference } from "@/components/AramSynergyReference";

const DEBOUNCE_MS = 280;

function filterChampionsLocal(all: ChampionSearchHit[], query: string): ChampionSearchHit[] {
  const f = query.trim().toLowerCase();
  if (!f) return all;
  const starts: ChampionSearchHit[] = [];
  const contains: ChampionSearchHit[] = [];
  for (const h of all) {
    const nk = h.name_ko.toLowerCase();
    const ne = h.name_en.toLowerCase();
    const sl = h.slug.toLowerCase();
    if (nk.startsWith(f) || ne.startsWith(f) || sl.startsWith(f)) starts.push(h);
    else if (nk.includes(f) || ne.includes(f) || sl.includes(f)) contains.push(h);
  }
  return [...starts, ...contains];
}

function emptyResult(): AramRecommendResponse {
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
  return {
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
  const [champInput, setChampInput] = useState("");
  const [allChampions, setAllChampions] = useState<ChampionSearchHit[]>([]);
  const [champListLoading, setChampListLoading] = useState(true);
  const [champLoadError, setChampLoadError] = useState<string | null>(null);
  const [pickedChamp, setPickedChamp] = useState<ChampionSearchHit | null>(null);

  const [allies, setAllies] = useState("");
  const [enemies, setEnemies] = useState("");
  const [augmentSlots, setAugmentSlots] = useState<AugmentSlotTuple>(EMPTY_AUGMENT_SLOTS);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedCsv = augmentSlotsToCsv(augmentSlots);

  const champHits = useMemo(() => filterChampionsLocal(allChampions, champInput), [allChampions, champInput]);

  useEffect(() => {
    void (async () => {
      setChampListLoading(true);
      setChampLoadError(null);
      try {
        const rows = await fetchChampionSearch("", 500);
        setAllChampions(rows);
        if (rows.length === 0) {
          setChampLoadError(
            "챔피언 목록이 비어 있어요. 백엔드가 켜져 있는지, frontend/.env.local 의 NEXT_PUBLIC_API_URL(예: http://127.0.0.1:8001)을 확인해 주세요.",
          );
        }
      } catch (e) {
        setAllChampions([]);
        setChampLoadError(
          e instanceof Error
            ? `${e.message} — API 주소와 백엔드 실행을 확인해 주세요.`
            : "챔피언 목록을 불러오지 못했습니다.",
        );
      } finally {
        setChampListLoading(false);
      }
    })();
  }, []);

  const load = useCallback(async () => {
    const apiName = pickedChamp?.name_en?.trim();
    if (!apiName) {
      onResult(emptyResult());
      return;
    }
    onLoading(true);
    onError(null);
    try {
      const data = await fetchAramRecommend(apiName, allies, enemies, selectedCsv);
      onResult(data);
    } catch (e) {
      onResult(emptyResult());
      onError(e instanceof Error ? e.message : "Failed");
    } finally {
      onLoading(false);
    }
  }, [pickedChamp, allies, enemies, selectedCsv, onError, onLoading, onResult]);

  useEffect(() => {
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => {
      void load();
    }, DEBOUNCE_MS);
    return () => {
      if (t.current) clearTimeout(t.current);
    };
  }, [load]);

  return (
    <div className="flex flex-col gap-14">
      <section className="section-rail space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-600">01 · 내 챔피언</h2>
          {!champListLoading && (
            <span className="font-mono text-[10px] text-zinc-500">
              {champHits.length} / {allChampions.length}
            </span>
          )}
        </div>
        <p className="text-sm text-zinc-600">목록에서 고르거나, 아래 칸으로 이름을 좁히세요.</p>
        <input
          className="input-underline text-lg font-bold"
          placeholder="검색…"
          value={champInput}
          onChange={(e) => {
            const v = e.target.value;
            setChampInput(v);
            if (pickedChamp && v !== pickedChamp.name_ko && v !== pickedChamp.name_en) {
              setPickedChamp(null);
            }
          }}
          autoComplete="off"
        />
        {pickedChamp && (
          <p className="font-mono text-[11px] text-zinc-600">
            선택됨 <span className="font-bold text-zinc-800">{pickedChamp.name_en}</span>
          </p>
        )}
        {!pickedChamp && (
          <p className="text-xs font-medium text-amber-700">챔피언을 고르기 전까지 아래 추천 브리핑은 비어 있습니다.</p>
        )}
        {champLoadError && (
          <p className="border-l-4 border-amber-500 bg-amber-50 px-3 py-2 text-xs text-amber-950">{champLoadError}</p>
        )}

        <div className="max-h-72 overflow-y-auto border-y border-smite-line bg-[color:var(--smite-elevated)]">
          {champListLoading ? (
            <p className="px-3 py-4 font-mono text-xs text-zinc-500">로드 중…</p>
          ) : champHits.length === 0 ? (
            <p className="px-3 py-4 text-sm text-zinc-600">
              {allChampions.length === 0
                ? "목록을 가져오지 못했습니다. 위 안내를 확인해 주세요."
                : "검색과 일치하는 챔피언이 없습니다."}
            </p>
          ) : (
            <ul>
              {champHits.map((h) => (
                <li key={h.slug} className="border-b border-smite-line last:border-b-0">
                  <button
                    type="button"
                    className={`flex w-full items-center gap-3 border-l-2 py-2.5 pl-3 pr-3 text-left transition hover:bg-white ${
                      pickedChamp?.slug === h.slug
                        ? "border-[color:var(--smite-accent)] bg-white shadow-sm"
                        : "border-transparent"
                    }`}
                    onClick={() => {
                      setPickedChamp(h);
                      setChampInput(h.name_ko);
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={h.image} alt="" className="h-9 w-9 shrink-0 object-cover" />
                    <span className="text-sm font-bold text-zinc-900">{h.name_ko}</span>
                    <span className="font-mono text-xs text-zinc-500">{h.name_en}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="section-rail space-y-4">
        <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-600">02 · 증강 (최대 4)</h2>
        <p className="text-sm text-zinc-600">3 · 7 · 11 · 15레벨 순으로 이미 뽑은 것을 넣으면 다음 추천이 맞춰집니다.</p>
        <AugmentPicker slots={augmentSlots} onSlotsChange={setAugmentSlots} />
      </section>

      <section className="section-rail">
        <AramSynergyReference />
      </section>

      <section className="section-rail">
        <div className="grid gap-10 md:grid-cols-2 md:gap-12">
          <div>
            <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-600">03 · 아군</h2>
            <p className="mb-3 mt-2 text-xs text-zinc-500">쉼표로 구분. 비워도 됩니다.</p>
            <input
              className="input-underline text-base"
              placeholder="애쉬, 잔나…"
              value={allies}
              onChange={(e) => setAllies(e.target.value)}
            />
          </div>
          <div>
            <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-600">04 · 적군</h2>
            <p className="mb-3 mt-2 text-xs text-zinc-500">상대 조합을 알면 포킹·탱 등에 맞춥니다.</p>
            <input
              className="input-underline text-base"
              placeholder="바루스, 직스…"
              value={enemies}
              onChange={(e) => setEnemies(e.target.value)}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
