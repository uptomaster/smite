"use client";

import { useMemo, useState } from "react";
import type { ChampionSearchHit } from "@/lib/api";
import { filterChampionsLocal } from "@/lib/championSearchFilter";

type TeamChampionPickerProps = {
  label: string;
  hint: string;
  max: number;
  allChampions: ChampionSearchHit[];
  listLoading: boolean;
  selected: ChampionSearchHit[];
  onChange: (next: ChampionSearchHit[]) => void;
  /** 내 챔피언 등 — 목록에서 선택 불가 */
  blockSlug?: string | null;
};

export function TeamChampionPicker({
  label,
  hint,
  max,
  allChampions,
  listLoading,
  selected,
  onChange,
  blockSlug,
}: TeamChampionPickerProps) {
  const [q, setQ] = useState("");
  const hits = useMemo(() => filterChampionsLocal(allChampions, q), [allChampions, q]);

  const selectedSet = useMemo(() => new Set(selected.map((h) => h.slug)), [selected]);

  const toggle = (h: ChampionSearchHit) => {
    if (blockSlug && h.slug === blockSlug) return;
    if (selectedSet.has(h.slug)) {
      onChange(selected.filter((x) => x.slug !== h.slug));
      return;
    }
    if (selected.length >= max) return;
    onChange([...selected, h]);
  };

  const remove = (slug: string) => {
    onChange(selected.filter((x) => x.slug !== slug));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-lg font-semibold text-zinc-900 md:text-xl">{label}</h3>
        <span className="font-mono text-[10px] font-bold tabular-nums text-zinc-500">
          {selected.length} / {max}
        </span>
      </div>
      <p className="text-sm text-zinc-600">{hint}</p>

      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {selected.map((h) => (
            <li
              key={h.slug}
              className="flex items-center gap-1.5 rounded-md border border-smite-line bg-[color:var(--smite-bg)] py-1 pl-1 pr-1 shadow-sm"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={h.image} alt="" className="h-7 w-7 shrink-0 object-cover" />
              <span className="max-w-[7rem] truncate text-xs font-bold text-zinc-900">{h.name_ko}</span>
              <button
                type="button"
                onClick={() => remove(h.slug)}
                className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900"
                aria-label={`${h.name_ko} 빼기`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        className="input-underline text-sm"
        placeholder="이름 검색…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoComplete="off"
        disabled={listLoading}
      />

      <div className="max-h-52 overflow-y-auto rounded-md border border-smite-line bg-[color:var(--smite-elevated)]">
        {listLoading ? (
          <p className="px-3 py-3 font-mono text-[11px] text-zinc-500">목록 불러오는 중…</p>
        ) : hits.length === 0 ? (
          <p className="px-3 py-3 text-sm text-zinc-600">검색 결과 없음</p>
        ) : (
          <ul>
            {hits.map((h) => {
              const blocked = blockSlug != null && h.slug === blockSlug;
              const on = selectedSet.has(h.slug);
              const full = !on && selected.length >= max;
              return (
                <li key={h.slug} className="border-b border-smite-line last:border-b-0">
                  <button
                    type="button"
                    disabled={blocked || full}
                    onClick={() => toggle(h)}
                    title={
                      blocked
                        ? "내 챔피언과 같아요"
                        : full
                          ? "이미 최대 인원입니다. 위 칩에서 빼 주세요."
                          : on
                            ? "클릭하면 빼기"
                            : "클릭하면 추가"
                    }
                    className={`flex w-full items-center gap-2 border-l-2 py-2 pl-2 pr-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      on
                        ? "border-[color:var(--smite-accent)] bg-[color:var(--smite-bg)]"
                        : "border-transparent hover:bg-[color:var(--smite-bg)]"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={h.image} alt="" className="h-8 w-8 shrink-0 object-cover" />
                    <span className="min-w-0 flex-1 truncate font-bold text-zinc-900">{h.name_ko}</span>
                    <span className="shrink-0 font-mono text-[10px] text-zinc-500">{on ? "✓" : full || blocked ? "—" : "+"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
