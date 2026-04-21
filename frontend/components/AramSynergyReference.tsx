"use client";

import { useEffect, useState } from "react";
import { fetchAramSynergySets, type AramSynergySet } from "@/lib/api";

export function AramSynergyReference() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<AramSynergySet[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let ok = true;
    void (async () => {
      try {
        const s = await fetchAramSynergySets();
        if (ok) setRows(s);
      } catch {
        if (ok) setErr("시너지 설명을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
      }
    })();
    return () => {
      ok = false;
    };
  }, []);

  if (!rows.length && !err) {
    return (
      <p className="font-mono text-[11px] text-zinc-500" aria-live="polite">
        아수라장 시너지 정보 로드 중…
      </p>
    );
  }

  if (err) {
    return <p className="text-xs font-medium text-amber-800">{err}</p>;
  }

  return (
    <div className="border-y border-smite-line text-left">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 py-3 text-left transition hover:text-zinc-900"
      >
        <span className="text-left">
          <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500">참고</span>
          <span className="mt-0.5 block font-display text-base font-semibold text-zinc-900 md:text-lg">
            시너지 레퍼런스 <span className="font-mono text-sm font-normal text-zinc-500">· {rows.length}종</span>
          </span>
        </span>
        <span className="font-mono text-[10px] font-bold text-zinc-500">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <ul className="space-y-0 border-t border-smite-line">
          {rows.map((r) => (
            <li key={r.slug} className="border-b border-smite-line py-4 last:border-b-0">
              <p className="text-sm font-bold text-zinc-900">{r.name_ko}</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">{r.effect_ko}</p>
              {r.source_note && <p className="mt-2 font-mono text-[10px] text-zinc-500">{r.source_note}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
