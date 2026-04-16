"use client";

import type { AramRecommendResponse } from "@/lib/api";

const tierKo: Record<string, string> = {
  prismatic: "프리즘",
  gold: "골드",
  silver: "실버",
};

export function AramDecisionPanel({ data }: { data: AramRecommendResponse }) {
  const { situation, selection_state, best_pick, alternatives, anti_pick } = data;
  const hasCore = Boolean(best_pick.augment);

  if (!hasCore) {
    return (
      <p className="text-neutral-400">
        챔피언 이름을 입력하면 바로 추천이 뜹니다. 아군·적군을 넣을수록 정확해집니다.
      </p>
    );
  }

  return (
    <div className="flex max-h-[calc(100vh-12rem)] flex-col gap-4 overflow-y-auto pr-1 md:max-h-none md:overflow-visible">
      <section className="rounded-2xl border border-neutral-200 bg-neutral-50/80 p-4 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">[현재 선택 상태]</h2>
        {selection_state.count > 0 ? (
          <ul className="mt-2 space-y-1 text-base text-neutral-800">
            {selection_state.selected.map((s) => (
              <li key={s.id}>
                <span className="font-mono text-sm text-neutral-500">{s.id}</span>{" "}
                <span className="font-medium">{s.name}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-base text-neutral-500">이미 선택한 증강 없음 — 첫 라운드이거나 위에 ID를 입력하세요.</p>
        )}
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">현재 상황 분석</h2>
        <div className="mt-2 grid gap-2 text-base text-neutral-800 md:grid-cols-2">
          <p>
            <span className="text-neutral-500">아군:</span>{" "}
            {situation.ally.length ? situation.ally.join(" · ") : "—"}
          </p>
          <p>
            <span className="text-neutral-500">적군:</span>{" "}
            {situation.enemy.length ? situation.enemy.join(" · ") : "—"}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border-2 border-blue-200 bg-gradient-to-b from-blue-50/90 to-white p-5 shadow-md">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-blue-800/80">[지금 선택 추천]</p>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
            🔥 BEST PICK
          </span>
          <span className="text-sm text-neutral-500">
            기대 신뢰 <span className="font-semibold text-blue-700">{Math.round(best_pick.confidence * 100)}%</span>
          </span>
        </div>
        <h3 className="text-2xl font-bold tracking-tight text-neutral-900 md:text-3xl">{best_pick.augment}</h3>
        <p className="mt-1 text-sm text-neutral-500">
          {tierKo[best_pick.tier] ?? best_pick.tier}
        </p>
        {best_pick.subtitle ? (
          <p className="mt-2 text-sm font-semibold text-blue-800">→ {best_pick.subtitle}</p>
        ) : null}
        <p className="mt-3 text-lg font-medium leading-snug text-neutral-800">{best_pick.summary}</p>
        <ul className="mt-2 space-y-1 text-sm text-neutral-600">
          {best_pick.reasons.map((r) => (
            <li key={r} className="flex gap-2">
              <span className="text-emerald-600">✔</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
        {best_pick.items.length > 0 && (
          <div className="mt-4 border-t border-blue-100 pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">추천 아이템</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {best_pick.items.map((it) => (
                <div
                  key={it.name}
                  className="min-w-[140px] shrink-0 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                >
                  <p className="font-semibold text-neutral-900">{it.name}</p>
                  <p className="text-xs text-neutral-500">{it.reason}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {alternatives.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-400">차선 옵션</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {alternatives.map((a) => (
              <div
                key={a.augment}
                className="rounded-xl border border-neutral-200 bg-white p-4 text-sm shadow-sm"
              >
                <p className="font-bold text-neutral-900">{a.augment}</p>
                <p className="text-xs text-neutral-500">{tierKo[a.tier] ?? a.tier}</p>
                <p className="mt-2 text-neutral-700">{a.summary}</p>
                <p className="mt-1 text-xs text-neutral-400">신뢰 {Math.round(a.confidence * 100)}%</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {anti_pick.augment && (
        <section className="rounded-xl border border-red-200 bg-red-50/50 p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-red-700">비추천 증강</h3>
          <p className="mt-1 text-lg font-semibold text-red-900">{anti_pick.augment}</p>
          <ul className="mt-2 list-inside list-disc text-sm text-red-800/90">
            {anti_pick.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
