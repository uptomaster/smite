"use client";

import type { AramRecommendResponse } from "@/lib/api";
import { ScoreBars } from "@/components/ScoreBars";
import { tierLabelKo, tierNameEmphasisClass } from "@/lib/tierLabels";

export function AramDecisionPanel({ data }: { data: AramRecommendResponse }) {
  const { situation, selection_state, best_pick, alternatives, anti_pick } = data;
  const hasCore = Boolean(best_pick.augment);

  if (!hasCore) {
    return (
      <div className="border-t border-smite-line pt-10 text-left">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">추천 브리핑</p>
        <p className="mt-3 max-w-xl font-display text-2xl font-normal leading-snug text-zinc-800 md:text-3xl">
          위에서 챔피언을 고르면 이 구역에 표시됩니다.
        </p>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-zinc-600 md:text-base">
          이미 뽑은 증강은 02 슬롯에 넣어 두면 반영됩니다.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-12 pr-1 text-left">
      <section className="grid gap-10 border-t border-smite-line pt-8 md:grid-cols-2 md:gap-12">
        <div>
          <h2 className="font-display text-lg font-semibold text-zinc-900 md:text-xl">조합 · 우리 편</h2>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-zinc-500">아군 입력 기준</p>
          <p className="mt-4 text-base font-medium leading-relaxed text-zinc-900 md:text-lg">
            {situation.ally.length ? situation.ally.join(" · ") : "—"}
          </p>
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold text-zinc-900 md:text-xl">조합 · 상대 편</h2>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-zinc-500">적군 입력 기준</p>
          <p className="mt-4 text-base font-medium leading-relaxed text-zinc-900 md:text-lg">
            {situation.enemy.length ? situation.enemy.join(" · ") : "—"}
          </p>
        </div>
      </section>

      <section className="section-rail space-y-3">
        <h2 className="font-display text-lg font-semibold text-zinc-900 md:text-xl">빌드에 넣은 증강</h2>
        {selection_state.count > 0 ? (
          <p className="text-base font-medium leading-relaxed text-zinc-900">
            {selection_state.selected.map((s) => s.name).join(" → ")}
          </p>
        ) : (
          <p className="text-sm text-zinc-500">없음</p>
        )}
      </section>

      <article className="relative border-t-2 border-[color:var(--smite-accent-dim)] pt-10">
        <div className="absolute left-0 top-0 h-px w-16 bg-[color:var(--smite-accent)]" aria-hidden />
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-[color:var(--smite-accent-bright)]">
            이번 라운드 추천
          </p>
          <p className="font-mono text-xs tabular-nums text-zinc-500">
            신뢰 {Math.round(best_pick.confidence * 100)}%
          </p>
        </div>
        <h3 className="font-display mt-5 max-w-4xl text-3xl font-normal tracking-tight text-zinc-900 md:text-4xl lg:text-[2.75rem] lg:leading-[1.12]">
          {best_pick.augment}
        </h3>
        <p className={`mt-2 text-sm ${tierNameEmphasisClass[best_pick.tier] ?? "font-bold text-zinc-700"}`}>
          {tierLabelKo(best_pick.tier)}
        </p>
        {best_pick.subtitle ? <p className="mt-3 text-sm font-bold text-zinc-800">{best_pick.subtitle}</p> : null}
        {best_pick.description_short ? (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">{best_pick.description_short}</p>
        ) : null}
        <p className="mt-4 max-w-2xl text-base font-bold leading-snug text-zinc-900">{best_pick.summary}</p>

        <ul className="mt-6 space-y-2 border-l border-smite-line pl-4">
          {best_pick.reasons.map((r) => (
            <li key={r} className="text-sm leading-relaxed text-zinc-700">
              <span className="mr-2 font-mono text-[color:var(--smite-accent)]">—</span>
              {r}
            </li>
          ))}
        </ul>

        <div className="mt-8 border-t border-smite-line pt-8">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">근거</p>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500">시너지</dt>
              <dd className="mt-1 text-zinc-700">{best_pick.reason_breakdown.synergy}</dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500">조합</dt>
              <dd className="mt-1 text-zinc-700">{best_pick.reason_breakdown.context}</dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500">통계</dt>
              <dd className="mt-1 text-zinc-700">{best_pick.reason_breakdown.statistical}</dd>
            </div>
          </dl>
          <p className="mt-4 font-mono text-[11px] text-zinc-500">
            승률 {(best_pick.stats.winrate * 100).toFixed(1)}% · 픽률 {(best_pick.stats.pickrate * 100).toFixed(1)}% · 표본{" "}
            {best_pick.stats.games_played}
            {best_pick.stats.data_source === "estimated" ? " · 추정" : ""}
          </p>
        </div>

        <div className="mt-8">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">가중치</p>
          <div className="mt-4 max-w-md">
            <ScoreBars bars={best_pick.score_bars} />
          </div>
        </div>

        {best_pick.items.length > 0 && (
          <div className="mt-8 border-t border-smite-line pt-8">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">아이템 아이디어</p>
            <ul className="mt-4 divide-y divide-zinc-200 border border-smite-line bg-[color:var(--smite-bg)]">
              {best_pick.items.map((it) => (
                <li key={it.name} className="flex flex-col gap-1 px-3 py-3 sm:flex-row sm:items-baseline sm:gap-6">
                  <span className="shrink-0 text-sm font-bold text-zinc-900">{it.name}</span>
                  <span className="text-xs text-zinc-600">{it.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>

      {alternatives.length > 0 && (
        <section>
          <h3 className="font-display text-lg font-semibold text-zinc-900 md:text-xl">대안</h3>
          <ul className="mt-4 divide-y divide-zinc-200 border-y border-smite-line">
            {alternatives.map((a) => (
              <li
                key={a.augment}
                className="group flex flex-col gap-2 py-4 transition hover:bg-zinc-50 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-base font-bold text-zinc-900">{a.augment}</span>
                    <span className={`text-xs ${tierNameEmphasisClass[a.tier] ?? "font-bold text-zinc-600"}`}>
                      {tierLabelKo(a.tier)}
                    </span>
                  </div>
                  {a.description_short ? (
                    <p className="mt-2 line-clamp-2 text-sm text-zinc-600">{a.description_short}</p>
                  ) : null}
                  <p className="mt-2 text-sm text-zinc-700">{a.summary}</p>
                  <p className="mt-2 font-mono text-[11px] text-zinc-500">
                    승률 {(a.stats.winrate * 100).toFixed(1)}% · 신뢰 {Math.round(a.confidence * 100)}%
                  </p>
                </div>
                <div className="shrink-0 text-left sm:min-w-[4.5rem] sm:border-l sm:border-smite-line sm:pl-4">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500">가중 점수</p>
                  <p className="mt-0.5 font-mono text-sm font-bold tabular-nums text-zinc-800">{Math.round(a.score * 100)}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {anti_pick.augment && (
        <section className="border-l-4 border-red-500 bg-red-50 px-4 py-5">
          <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-red-800">이번 판에 약한 쪽</h3>
          <p className="mt-2 text-lg font-bold text-red-900">{anti_pick.augment}</p>
          {anti_pick.score != null && (
            <p className="mt-1 font-mono text-xs text-red-700">점수 {Math.round(anti_pick.score * 100)}</p>
          )}
          <ul className="mt-3 space-y-1.5 text-sm text-red-900/90">
            {anti_pick.reasons.map((r) => (
              <li key={r} className="flex gap-2">
                <span className="font-mono text-red-600">·</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
