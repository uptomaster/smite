"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchAramSynergySets,
  fetchAugmentEligibleChampions,
  fetchAugmentsAll,
  type AramSynergySet,
  type AugmentEligibleChampion,
  type AugmentEncyclopediaEntry,
} from "@/lib/api";
import {
  AUGMENT_ROUND_LEVELS,
  type AugmentSlotTuple,
  usedAugmentIds,
} from "@/lib/augmentSlots";
import { tierBadgeClass, tierLabelKo, tierRailClass, tierSlotTopClass } from "@/lib/tierLabels";

export function AugmentPicker({
  slots,
  onSlotsChange,
}: {
  slots: AugmentSlotTuple;
  onSlotsChange: (s: AugmentSlotTuple) => void;
}) {
  const [all, setAll] = useState<AugmentEncyclopediaEntry[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [focusIdx, setFocusIdx] = useState(0);
  const [detailAug, setDetailAug] = useState<AugmentEncyclopediaEntry | null>(null);
  const [synergyBySlug, setSynergyBySlug] = useState<Map<string, AramSynergySet>>(new Map());
  const [eligibleChampions, setEligibleChampions] = useState<AugmentEligibleChampion[] | null>(null);
  const [eligibleLoading, setEligibleLoading] = useState(false);
  const [eligibleError, setEligibleError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchAugmentsAll();
      setAll(rows);
    } catch {
      setAll([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let ok = true;
    void (async () => {
      try {
        const rows = await fetchAramSynergySets();
        if (!ok) return;
        const m = new Map<string, AramSynergySet>();
        for (const r of rows) {
          m.set(r.slug, r);
        }
        setSynergyBySlug(m);
      } catch {
        /* 모달에서 이름만 표시 */
      }
    })();
    return () => {
      ok = false;
    };
  }, []);

  useEffect(() => {
    if (!detailAug) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDetailAug(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detailAug]);

  const detailAugId = detailAug?.id ?? null;
  useEffect(() => {
    if (detailAugId == null) {
      setEligibleChampions(null);
      setEligibleError(null);
      return;
    }
    let cancelled = false;
    setEligibleLoading(true);
    setEligibleError(null);
    setEligibleChampions(null);
    void fetchAugmentEligibleChampions(detailAugId)
      .then((res) => {
        if (!cancelled) setEligibleChampions(res.champions);
      })
      .catch(() => {
        if (!cancelled) {
          setEligibleError("챔피언 목록을 불러오지 못했습니다.");
          setEligibleChampions([]);
        }
      })
      .finally(() => {
        if (!cancelled) setEligibleLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [detailAugId]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const base = !s
      ? [...all].sort((a, b) => a.name.localeCompare(b.name, "ko"))
      : all.filter((a) => {
          if (a.name.toLowerCase().includes(s)) return true;
          return (a.name_en?.toLowerCase() ?? "").includes(s);
        });
    return base;
  }, [all, q]);

  const used = usedAugmentIds(slots);

  const placeInSlot = (augId: number) => {
    const next: AugmentSlotTuple = [...slots];
    for (let i = 0; i < 4; i++) {
      if (next[i] === augId) next[i] = null;
    }
    next[focusIdx] = augId;
    onSlotsChange(next);
  };

  const clearSlot = (idx: number) => {
    const next: AugmentSlotTuple = [...slots];
    next[idx] = null;
    onSlotsChange(next);
  };

  const firstEmptyIndex = slots.findIndex((x) => x == null);

  const detailInSlots = detailAug ? used.has(detailAug.id) : false;
  const detailInFocus = detailAug ? slots[focusIdx] === detailAug.id : false;
  const canPlaceFromModal = detailAug && (!detailInSlots || detailInFocus);

  return (
    <div className="space-y-6">
      <div className="relative">
        <div className="absolute left-0 right-0 top-[1.125rem] hidden h-px bg-zinc-200 sm:block" aria-hidden />
        <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-0">
          {AUGMENT_ROUND_LEVELS.map((lv, idx) => {
            const id = slots[idx];
            const aug = id != null ? all.find((x) => x.id === id) : null;
            const focused = focusIdx === idx;
            const tierTop =
              aug && !focused ? tierSlotTopClass[aug.tier] ?? "border-zinc-400" : null;
            return (
              <div key={lv} className="relative sm:px-1">
                <button
                  type="button"
                  onClick={() => setFocusIdx(idx)}
                  className={`relative w-full border-t-2 bg-[color:var(--smite-elevated)] px-2 pb-3 pt-4 text-left transition sm:px-3 ${
                    focused
                      ? "border-[color:var(--smite-accent)]"
                      : tierTop ?? "border-zinc-200 hover:border-zinc-400"
                  }`}
                >
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Lv.{lv}
                  </span>
                  <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-xs font-bold leading-snug text-zinc-900">
                    {aug?.name ?? "—"}
                  </p>
                  {aug && (
                    <p
                      className={`mt-0.5 font-mono text-[10px] font-bold ${
                        aug.tier === "gold"
                          ? "text-amber-800"
                          : aug.tier === "prismatic"
                            ? "text-violet-800 [text-shadow:0_0_10px_rgba(167,139,250,0.45)]"
                            : "text-slate-600"
                      }`}
                    >
                      {tierLabelKo(aug.tier)}
                    </p>
                  )}
                </button>
                {id != null && (
                  <button
                    type="button"
                    onClick={() => clearSlot(idx)}
                    className="mt-1 w-full py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-800"
                  >
                    비우기
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="font-mono text-[11px] text-zinc-600">
        활성 슬롯{" "}
        <span className="font-bold text-[color:var(--smite-accent-bright)]">Lv.{AUGMENT_ROUND_LEVELS[focusIdx]}</span>
        {firstEmptyIndex >= 0 && firstEmptyIndex !== focusIdx && (
          <>
            {" "}
            · 빈 칸 Lv.{AUGMENT_ROUND_LEVELS[firstEmptyIndex]}
          </>
        )}
      </p>

      <p className="text-xs text-zinc-500">증강을 누르면 설명이 있는 창이 열립니다. 그 안에서 현재 슬롯에 넣을 수 있어요.</p>

      <input
        type="search"
        placeholder="증강 검색…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="input-underline font-mono text-sm"
      />

      {loading ? (
        <p className="font-mono text-xs text-zinc-500">증강 목록 로드 중…</p>
      ) : (
        <>
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            전체 {all.length} · 표시 {filtered.length}
            {q.trim() ? ` · “${q.trim()}”` : ""}
          </p>
          <div className="max-h-[min(70vh,28rem)] overflow-y-auto border border-smite-line bg-[color:var(--smite-elevated)]">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-sm text-zinc-600">검색 결과 없음</p>
            ) : (
              <ul>
                {filtered.map((a) => {
                  const inSlots = used.has(a.id);
                  const inFocus = slots[focusIdx] === a.id;
                  const synergies = a.synergy_sets ?? [];
                  const synergyLabel =
                    synergies.length > 0
                      ? `아수라장 시너지 · ${synergies.map((s) => s.name_ko).join(" · ")}`
                      : "";
                  return (
                    <li
                      key={a.id}
                      className={`flex border-b border-smite-line last:border-b-0 ${inFocus ? "bg-white shadow-[inset_0_0_0_1px_rgba(180,83,9,0.25)]" : ""}`}
                    >
                      <div
                        className={`w-1 shrink-0 self-stretch ${tierRailClass[a.tier] ?? "bg-zinc-400"}`}
                        aria-hidden
                      />
                      <button
                        type="button"
                        onClick={() => setDetailAug(a)}
                        className={`flex min-w-0 flex-1 items-start gap-3 py-2.5 pl-3 pr-3 text-left transition hover:bg-white ${
                          inFocus ? "ring-1 ring-inset ring-[color:var(--smite-accent)]/50" : ""
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={a.icon ?? ""}
                          alt=""
                          className="mt-0.5 h-9 w-9 shrink-0 border border-smite-line bg-white object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide ${tierBadgeClass[a.tier] ?? "border border-zinc-400 bg-zinc-100 text-zinc-800"}`}
                            >
                              {tierLabelKo(a.tier)}
                            </span>
                            <span className="text-sm font-bold text-zinc-900">{a.name}</span>
                          </div>
                          {synergies.length > 0 && (
                            <p className="mt-1 text-[11px] font-bold leading-snug text-red-700">{synergyLabel}</p>
                          )}
                          {a.name_en && a.name_en !== a.name && (
                            <p className="mt-0.5 truncate font-mono text-[11px] text-zinc-500">{a.name_en}</p>
                          )}
                        </div>
                        <span className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                          {inFocus ? "▶" : inSlots ? "·" : "⋯"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}

      {detailAug && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
          role="presentation"
          onClick={() => setDetailAug(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="augment-detail-title"
            className="flex max-h-[min(92vh,40rem)] w-full max-w-lg flex-col rounded-t-2xl border border-zinc-200 bg-white shadow-2xl sm:max-h-[85vh] sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-start gap-3 border-b border-zinc-100 p-4 sm:p-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={detailAug.icon ?? ""}
                alt=""
                className="h-14 w-14 shrink-0 border border-smite-line bg-zinc-50 object-cover sm:h-16 sm:w-16"
              />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500">증강</p>
                <h2 id="augment-detail-title" className="mt-1 text-lg font-bold leading-snug text-zinc-900 sm:text-xl">
                  {detailAug.name}
                </h2>
                {detailAug.name_en && detailAug.name_en !== detailAug.name && (
                  <p className="mt-0.5 font-mono text-sm text-zinc-600">{detailAug.name_en}</p>
                )}
                <p className="mt-2">
                  <span
                    className={`inline-block px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide ${tierBadgeClass[detailAug.tier] ?? "border border-zinc-400 bg-zinc-100 text-zinc-800"}`}
                  >
                    {tierLabelKo(detailAug.tier)}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailAug(null)}
                className="shrink-0 rounded-lg px-2 py-1 font-mono text-xs font-bold text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
              <h3 className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500">설명</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">
                {detailAug.description?.trim() || "설명이 없습니다."}
              </p>

              <div className="mt-6 border-t border-zinc-100 pt-4">
                <h3 className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  사용 가능한 챔피언
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  챔피언 키트 태그·증강 제한 기준으로, 이 증강을 선택할 수 있는 챔피언이에요. (전체 목록은 Data
                  Dragon 기준)
                </p>
                {detailAug.excluded_champion_tags.length > 0 && (
                  <p className="mt-2 text-[11px] text-zinc-600">
                    <span className="font-bold text-zinc-700">제외 태그: </span>
                    {detailAug.excluded_champion_tags.join(", ")}
                  </p>
                )}
                {eligibleLoading && (
                  <p className="mt-3 text-sm text-zinc-500">챔피언 목록 불러오는 중…</p>
                )}
                {eligibleError && (
                  <p className="mt-3 text-sm font-medium text-red-700">{eligibleError}</p>
                )}
                {eligibleChampions != null && !eligibleLoading && (
                  <p className="mt-2 font-mono text-[11px] text-zinc-500">총 {eligibleChampions.length}명</p>
                )}
                {eligibleChampions != null && eligibleChampions.length > 0 && (
                  <ul className="mt-2 flex max-h-56 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50/80 p-2">
                    {eligibleChampions.map((c) => (
                      <li
                        key={c.name_en}
                        className="rounded-md border border-zinc-200/80 bg-white px-2 py-1 text-xs shadow-sm"
                      >
                        <span className="font-bold text-zinc-900">{c.name_ko}</span>
                        <span className="ml-1 font-mono text-[10px] text-zinc-500">{c.name_en}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {eligibleChampions != null && eligibleChampions.length === 0 && !eligibleError && (
                  <p className="mt-2 text-sm text-zinc-500">조건에 맞는 챔피언이 없습니다.</p>
                )}
              </div>

              {(detailAug.synergy_sets?.length ?? 0) > 0 && (
                <div className="mt-6 border-t border-red-100 pt-4">
                  <h3 className="font-mono text-[10px] font-bold uppercase tracking-wider text-red-800">
                    아수라장 시너지 종류
                  </h3>
                  <ul className="mt-3 space-y-3">
                    {detailAug.synergy_sets!.map((s) => {
                      const full = synergyBySlug.get(s.slug);
                      return (
                        <li key={s.slug} className="rounded-lg border border-red-200 bg-red-50/80 px-3 py-2.5">
                          <p className="text-sm font-bold text-red-900">{s.name_ko}</p>
                          {full?.effect_ko && (
                            <p className="mt-1.5 text-sm leading-relaxed text-red-950/90">{full.effect_ko}</p>
                          )}
                          {full?.source_note && (
                            <p className="mt-1.5 font-mono text-[10px] text-red-800/80">{full.source_note}</p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {detailAug.tags.length > 0 && (
                <div className="mt-6 border-t border-zinc-100 pt-4">
                  <h3 className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500">태그</h3>
                  <p className="mt-2 text-sm text-zinc-700">{detailAug.tags.join(" · ")}</p>
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-zinc-100 p-4 sm:p-5">
              {!canPlaceFromModal && (
                <p className="mb-3 text-center text-xs font-medium text-red-700">
                  다른 레벨 슬롯에 이미 넣은 증강이에요. 먼저 그 칸을 비운 뒤 넣을 수 있어요.
                </p>
              )}
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setDetailAug(null)}
                  className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-bold text-zinc-800 hover:bg-zinc-50"
                >
                  닫기
                </button>
                <button
                  type="button"
                  disabled={!canPlaceFromModal}
                  onClick={() => {
                    placeInSlot(detailAug.id);
                    setDetailAug(null);
                  }}
                  className="rounded-xl bg-[color:var(--smite-accent)] px-4 py-2.5 text-sm font-bold text-white hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Lv.{AUGMENT_ROUND_LEVELS[focusIdx]} 슬롯에 넣기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
