"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchAramRecommend, fetchChampionSearch, type AramRecommendResponse, type ChampionSearchHit } from "@/lib/api";
import { augmentSlotsToCsv, EMPTY_AUGMENT_SLOTS, type AugmentSlotTuple } from "@/lib/augmentSlots";
import { AugmentPicker } from "@/components/AugmentPicker";
import { AramSynergyReference } from "@/components/AramSynergyReference";
import { TeamChampionPicker } from "@/components/TeamChampionPicker";
import { filterChampionsLocal, teamCsvFromHits } from "@/lib/championSearchFilter";

const DEBOUNCE_MS = 280;
const ALLY_MAX = 4;
const ENEMY_MAX = 5;

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

  const [allyPicks, setAllyPicks] = useState<ChampionSearchHit[]>([]);
  const [enemyPicks, setEnemyPicks] = useState<ChampionSearchHit[]>([]);
  const [augmentSlots, setAugmentSlots] = useState<AugmentSlotTuple>(EMPTY_AUGMENT_SLOTS);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedCsv = augmentSlotsToCsv(augmentSlots);
  const alliesCsv = useMemo(() => teamCsvFromHits(allyPicks), [allyPicks]);
  const enemiesCsv = useMemo(() => teamCsvFromHits(enemyPicks), [enemyPicks]);

  const setAlliesAndDedupeEnemies = useCallback((next: ChampionSearchHit[]) => {
    setAllyPicks(next);
    setEnemyPicks((prev) => prev.filter((e) => !next.some((a) => a.slug === e.slug)));
  }, []);

  const setEnemiesAndDedupeAllies = useCallback((next: ChampionSearchHit[]) => {
    setEnemyPicks(next);
    setAllyPicks((prev) => prev.filter((a) => !next.some((e) => e.slug === a.slug)));
  }, []);

  const champHits = useMemo(() => filterChampionsLocal(allChampions, champInput), [allChampions, champInput]);

  useEffect(() => {
    const slug = pickedChamp?.slug;
    if (!slug) return;
    setAllyPicks((p) => p.filter((a) => a.slug !== slug));
    setEnemyPicks((p) => p.filter((e) => e.slug !== slug));
  }, [pickedChamp?.slug]);

  useEffect(() => {
    void (async () => {
      setChampListLoading(true);
      setChampLoadError(null);
      try {
        const rows = await fetchChampionSearch("", 500);
        const safeRows = Array.isArray(rows) ? rows : [];
        setAllChampions(safeRows);
        if (!safeRows.length) {
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
      const data = await fetchAramRecommend(apiName, alliesCsv, enemiesCsv, selectedCsv);
      onResult(data);
    } catch (e) {
      onResult(emptyResult());
      onError(e instanceof Error ? e.message : "Failed");
    } finally {
      onLoading(false);
    }
  }, [pickedChamp, alliesCsv, enemiesCsv, selectedCsv, onError, onLoading, onResult]);

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
    <div className="flex flex-col gap-10 md:gap-12 lg:gap-14">
      <section className="smite-panel section-rail space-y-5 md:space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">01</p>
            <h2 className="font-display mt-1 text-xl font-semibold tracking-tight text-zinc-900 md:text-2xl">내 챔피언</h2>
          </div>
          {!champListLoading && (
            <span className="font-mono text-[10px] tabular-nums text-zinc-500">
              {champHits.length} / {allChampions.length}
            </span>
          )}
        </div>
        <p className="text-sm leading-relaxed text-zinc-600 md:text-base">목록에서 고르거나, 아래 칸으로 이름을 좁히세요.</p>
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

        <div className="smite-scrollbar max-h-72 overflow-y-auto rounded-xl border border-zinc-200/80 bg-[color:var(--smite-elevated)]">
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
                    className={`flex w-full items-center gap-3 border-l-2 py-2.5 pl-3 pr-3 text-left transition hover:bg-[color:var(--smite-bg)] ${
                      pickedChamp?.slug === h.slug
                        ? "border-[color:var(--smite-accent)] bg-[color:var(--smite-bg)] shadow-sm"
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

      <section className="smite-panel section-rail space-y-5 md:space-y-6">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">02</p>
          <h2 className="font-display mt-1 text-xl font-semibold tracking-tight text-zinc-900 md:text-2xl">
            증강 <span className="text-base font-normal text-zinc-500 md:text-lg">(최대 4)</span>
          </h2>
        </div>
        <p className="text-sm leading-relaxed text-zinc-600 md:text-base">
          3 · 7 · 11 · 15레벨 순으로 이미 뽑은 것을 넣으면 다음 추천이 맞춰집니다.
        </p>
        <AugmentPicker slots={augmentSlots} onSlotsChange={setAugmentSlots} />
      </section>

      <section className="smite-panel section-rail">
        <AramSynergyReference />
      </section>

      <section className="smite-panel section-rail">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">03 · 04</p>
        <h2 className="font-display mt-1 text-xl font-semibold tracking-tight text-zinc-900 md:text-2xl">팀 조합</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600 md:text-base">
          아군은 최대 {ALLY_MAX}명, 적군은 최대 {ENEMY_MAX}명까지 목록에서 고를 수 있어요. 같은 챔은 한쪽만 들어갑니다. 비워 두어도 됩니다.
        </p>
        <div className="mt-10 grid gap-8 md:grid-cols-2 md:gap-10 lg:gap-12">
          <div className="smite-panel-muted">
            <TeamChampionPicker
              label="아군"
              hint={`나 말고 같이 싸우는 팀원 (${ALLY_MAX}명까지)`}
              max={ALLY_MAX}
              allChampions={allChampions}
              listLoading={champListLoading}
              selected={allyPicks}
              onChange={setAlliesAndDedupeEnemies}
              blockSlug={pickedChamp?.slug ?? null}
            />
          </div>
          <div className="smite-panel-muted">
            <TeamChampionPicker
              label="적군"
              hint={`상대 팀 (${ENEMY_MAX}명까지)`}
              max={ENEMY_MAX}
              allChampions={allChampions}
              listLoading={champListLoading}
              selected={enemyPicks}
              onChange={setEnemiesAndDedupeAllies}
              blockSlug={pickedChamp?.slug ?? null}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
