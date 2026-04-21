"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchAugmentsAll, type AugmentEncyclopediaEntry } from "@/lib/api";
import {
  applyVote,
  countAlive,
  startWorldCup,
  type WorldCupPlaying,
  type WorldCupState,
} from "@/lib/augmentWorldCup";
import { tierBadgeClass, tierLabelKo, tierSlotTopClass } from "@/lib/tierLabels";
import { appendWorldCupResult, loadWorldCupHistory, type WorldCupResultRecord, type WorldCupVoteLog } from "@/lib/worldCupHistory";

const TIERS = ["silver", "gold", "prismatic"] as const;
export type AugmentWorldCupTier = (typeof TIERS)[number];

function isPlaying(s: WorldCupState): s is WorldCupPlaying {
  return s.phase === "playing";
}

function AugmentCardImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        className="flex w-full items-end justify-start bg-zinc-200 p-3 text-left font-mono text-[10px] font-bold uppercase leading-tight tracking-wider text-zinc-600"
        style={{ aspectRatio: "1 / 1" }}
      >
        이미지 없음
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="h-full w-full object-cover"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export function AugmentWorldCupModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [list, setList] = useState<AugmentEncyclopediaEntry[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [tier, setTier] = useState<AugmentWorldCupTier>("silver");
  const [cup, setCup] = useState<WorldCupState | null>(null);
  const [poolSize, setPoolSize] = useState(0);
  const [runId, setRunId] = useState<string | null>(null);
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null);
  const [history, setHistory] = useState<WorldCupResultRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const lastSavedRunId = useRef<string | null>(null);
  const sessionVotesRef = useRef<WorldCupVoteLog[]>([]);

  const refreshHistory = useCallback(() => {
    setHistory(loadWorldCupHistory());
  }, []);

  const load = useCallback(async () => {
    setLoadingList(true);
    setLoadErr(null);
    try {
      const rows = await fetchAugmentsAll();
      setList(rows);
    } catch (e) {
      setList([]);
      setLoadErr(e instanceof Error ? e.message : "목록을 불러오지 못했습니다.");
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void load();
    refreshHistory();
  }, [open, load, refreshHistory]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const poolForTier = useMemo(() => list.filter((a) => a.tier === tier), [list, tier]);

  const resetSession = () => {
    setCup(null);
    setPoolSize(0);
    setRunId(null);
    setRunStartedAt(null);
    lastSavedRunId.current = null;
    sessionVotesRef.current = [];
  };

  const begin = () => {
    const next = startWorldCup(poolForTier);
    if (next.phase === "need_data") return;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `run-${Date.now()}-${Math.random()}`;
    setRunId(id);
    sessionVotesRef.current = [];
    setRunStartedAt(Date.now());
    lastSavedRunId.current = null;
    setPoolSize(poolForTier.length);
    setCup(next);
  };

  const vote = (winner: AugmentEncyclopediaEntry) => {
    setCup((prev) => {
      if (!prev || !isPlaying(prev)) return prev;
      const wave = prev.wave;
      const optionIds = prev.match.map((m) => m.id);
      sessionVotesRef.current.push({ wave, optionIds, chosenId: winner.id });
      return applyVote(prev, winner);
    });
  };

  useEffect(() => {
    if (!open || !runId || !runStartedAt || cup?.phase !== "champion") return;
    if (lastSavedRunId.current === runId) return;
    lastSavedRunId.current = runId;
    const w = cup.winner;
    appendWorldCupResult({
      runId,
      tier,
      startedAt: runStartedAt,
      finishedAt: Date.now(),
      winnerId: w.id,
      winnerName: w.name,
      winnerNameEn: w.name_en ?? null,
      winnerIcon: w.icon ?? null,
      poolSize,
      votes: [...sessionVotesRef.current],
    });
    refreshHistory();
  }, [open, runId, runStartedAt, cup, tier, poolSize, refreshHistory]);

  const playing = cup && isPlaying(cup) ? cup : null;
  const champion = cup?.phase === "champion" ? cup : null;
  const alive = playing ? countAlive(playing) : 0;
  const stuckEmptyMatch = playing && playing.match.length === 0;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default border-0 bg-transparent"
        aria-label="닫기"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="world-cup-title"
        className="relative flex max-h-[100dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-smite-line bg-[color:var(--smite-bg)] shadow-2xl sm:max-h-[min(92vh,44rem)] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 flex-wrap items-end justify-between gap-3 border-b border-zinc-100 px-4 py-4 text-left sm:px-5">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500">같은 티어끼리만 대결</p>
            <h2 id="world-cup-title" className="font-display mt-1 text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">
              증강 월드컵
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className="rounded-md border border-zinc-200 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-600 hover:bg-zinc-50"
            >
              기록 {history.length > 0 ? `(${history.length})` : ""}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-zinc-200 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-600 hover:bg-zinc-50"
            >
              닫기
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 text-left sm:px-5">
          {showHistory && (
            <section className="mb-6 border border-smite-line bg-[color:var(--smite-elevated)] p-3 sm:p-4">
              <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500">저장된 토너먼트 결과</p>
              {history.length === 0 ? (
                <p className="mt-2 text-xs text-zinc-600">아직 기록이 없습니다. 한 판 끝까지 진행하면 자동 저장됩니다.</p>
              ) : (
                <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto sm:max-h-56">
                  {history.slice(0, 15).map((h) => (
                    <li
                      key={h.runId}
                      className="flex items-center gap-3 border-b border-smite-line pb-2 last:border-b-0 last:pb-0"
                    >
                      <div className="h-11 w-11 shrink-0 overflow-hidden border border-smite-line bg-white">
                        {h.winnerIcon ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={h.winnerIcon} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center font-mono text-[8px] text-zinc-400">
                            —
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-zinc-900">{h.winnerName}</p>
                        <p className="font-mono text-[10px] text-zinc-500">
                          {tierLabelKo(h.tier)} · 참가 {h.poolSize} · 투표 {h.votes.length}회 ·{" "}
                          {new Date(h.finishedAt).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {loadingList ? (
            <p className="font-mono text-xs text-zinc-500">증강 목록 불러오는 중…</p>
          ) : loadErr ? (
            <div className="space-y-2">
              <p className="text-sm text-red-700">{loadErr}</p>
              <button
                type="button"
                onClick={() => void load()}
                className="font-mono text-xs font-bold uppercase tracking-wider text-[color:var(--smite-accent-bright)] underline"
              >
                다시 시도
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {!cup && (
                <div className="space-y-3">
                  <p className="text-left text-sm leading-relaxed text-zinc-700 md:text-base">
                    티어를 고른 뒤 시작하세요. 매 투표는{" "}
                    <strong className="font-semibold text-zinc-900">선택한 티어 안에서만</strong> 세 명(또는 둘)이 붙습니다.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {TIERS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTier(t)}
                        className={`rounded-md border px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wider transition ${
                          tier === t
                            ? "border-[color:var(--smite-accent)] bg-[color:var(--smite-accent-dim)] text-zinc-900"
                            : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                        }`}
                      >
                        {tierLabelKo(t)} ({list.filter((a) => a.tier === t).length})
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={poolForTier.length === 0}
                    onClick={begin}
                    title={poolForTier.length === 0 ? "이 티어에 증강이 없습니다" : undefined}
                    className="w-full border-2 border-[color:var(--smite-accent)] bg-[color:var(--smite-accent-dim)] py-3 font-mono text-xs font-bold uppercase tracking-wider text-zinc-900 transition hover:bg-[color:var(--smite-accent)]/25 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {tierLabelKo(tier)} 월드컵 시작 ({poolForTier.length}명 참가)
                  </button>
                </div>
              )}

              {champion && (
                <div className="space-y-5 text-left">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    제 {champion.wave} 라운드 · 우승
                  </p>
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
                    <div className="w-full max-w-[200px] shrink-0 overflow-hidden border border-smite-line bg-zinc-900 shadow-lg sm:max-w-[220px]">
                      <AugmentCardImage src={champion.winner.icon ?? ""} alt={champion.winner.name} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span
                        className={`inline-block px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide ${tierBadgeClass[champion.winner.tier] ?? "border border-zinc-400 bg-zinc-100 text-zinc-800"}`}
                      >
                        {tierLabelKo(champion.winner.tier)}
                      </span>
                      <p className="font-display mt-3 text-2xl font-semibold leading-tight text-zinc-900 md:text-3xl">
                        {champion.winner.name}
                      </p>
                      {champion.winner.name_en && champion.winner.name_en !== champion.winner.name && (
                        <p className="mt-2 font-mono text-sm text-zinc-600">{champion.winner.name_en}</p>
                      )}
                      <p className="mt-4 text-sm leading-relaxed text-zinc-600">
                        결과는 상단 <span className="font-mono text-xs font-bold">기록</span>에서 확인할 수 있습니다.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={begin}
                    className="w-full border border-zinc-300 py-2.5 font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-800 hover:bg-zinc-50"
                  >
                    같은 티어로 다시 하기
                  </button>
                </div>
              )}

              {playing && !stuckEmptyMatch && playing.match.length > 0 && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      제 {playing.wave} 라운드 · {tierLabelKo(tier)}
                    </p>
                    {poolSize > 0 && (
                      <p className="font-mono text-[10px] text-zinc-500">
                        남은 후보 <span className="font-bold text-zinc-800">{alive}</span> / {poolSize}
                      </p>
                    )}
                  </div>
                  <p className="text-left font-display text-lg font-semibold leading-snug text-zinc-900 md:text-xl">
                    마음에 드는 증강 한 개를 고르세요
                  </p>
                  <p className="text-left text-sm text-zinc-600">카드 아무 곳이나 누르면 그 증강에 투표됩니다.</p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {playing.match.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => vote(a)}
                        className="group flex flex-col overflow-hidden border border-smite-line bg-[color:var(--smite-elevated)] text-left shadow-sm transition hover:border-[color:var(--smite-accent)] hover:shadow-md"
                      >
                        <div
                          className={`relative w-full overflow-hidden border-b border-smite-line border-t-4 bg-zinc-100 ${tierSlotTopClass[a.tier] ?? "border-zinc-400"}`}
                        >
                          <div className="aspect-square w-full max-h-[min(40vh,14rem)] sm:max-h-none">
                            <AugmentCardImage src={a.icon ?? ""} alt={a.name} />
                          </div>
                        </div>
                        <div className="flex flex-1 flex-col gap-1 p-3">
                          <span
                            className={`w-fit px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide ${tierBadgeClass[a.tier] ?? "border border-zinc-400 bg-zinc-100 text-zinc-800"}`}
                          >
                            {tierLabelKo(a.tier)}
                          </span>
                          <p className="text-base font-bold leading-snug text-zinc-900 group-hover:text-[color:var(--smite-accent-bright)] md:text-lg">
                            {a.name}
                          </p>
                          {a.description ? (
                            <p className="line-clamp-3 text-[11px] leading-relaxed text-zinc-600">{a.description}</p>
                          ) : null}
                          <span className="mt-auto pt-2 font-mono text-[10px] font-bold uppercase tracking-wider text-[color:var(--smite-accent-bright)]">
                            이 증강에 투표
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {stuckEmptyMatch && (
                <p className="text-sm text-amber-800">진행 상태 오류입니다. 나가기 후 다시 시작해 주세요.</p>
              )}

              {cup && (
                <button
                  type="button"
                  onClick={() => {
                    resetSession();
                  }}
                  className="w-full py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-800"
                >
                  처음으로 (티어 선택)
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
