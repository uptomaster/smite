/** API 티어 값 → 한글 표기 (실버 / 골드 / 프리즘) */
export const TIER_LABEL_KO: Record<string, string> = {
  silver: "실버",
  gold: "골드",
  prismatic: "프리즘",
};

export function tierLabelKo(tier: string): string {
  return TIER_LABEL_KO[tier] ?? tier;
}

/** 슬롯 카드 상단 띠 (채워진 칸, 비포커스) — 흰 배경용 */
export const tierSlotTopClass: Record<string, string> = {
  silver: "border-slate-500",
  gold: "border-amber-500",
  prismatic: "border-violet-500",
};

/** 목록 왼쪽 세로 띠: 실버(은빛) / 골드 / 프리즘(연보라·네온) */
export const tierRailClass: Record<string, string> = {
  silver:
    "bg-gradient-to-b from-slate-100 via-slate-300 to-slate-500 shadow-[inset_-1px_0_0_rgba(255,255,255,0.5),0_0_10px_rgba(100,116,139,0.25)]",
  gold: "bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 shadow-[0_0_12px_rgba(245,158,11,0.35)]",
  prismatic:
    "bg-gradient-to-b from-violet-200 via-fuchsia-400 to-purple-600 shadow-[0_0_18px_rgba(167,139,250,0.55),0_0_28px_rgba(192,132,252,0.35)]",
};

/** 티어 배지 — 라이트 배경 */
export const tierBadgeClass: Record<string, string> = {
  silver:
    "border border-slate-400 bg-gradient-to-b from-slate-50 to-slate-200/90 text-slate-800 shadow-sm",
  gold: "border border-amber-500 bg-gradient-to-b from-amber-50 to-amber-100 text-amber-950 shadow-sm",
  prismatic:
    "border border-violet-400 bg-violet-50 text-violet-950 shadow-[0_0_14px_rgba(139,92,246,0.28)]",
};

/** 티어 이름 강조 */
export const tierNameEmphasisClass: Record<string, string> = {
  silver: "font-bold text-slate-700",
  gold: "font-bold text-amber-800",
  prismatic:
    "font-bold text-violet-800 [text-shadow:0_0_16px_rgba(167,139,250,0.55),0_0_28px_rgba(192,132,246,0.35)]",
};

/**
 * 증강 검색 섹션 전체(검색·개수·목록을 감싼 블록) — 배경·테두리만 티어색, 텍스트 색은 넣지 않음.
 */
export const tierSearchSectionClass: Record<string, string> = {
  silver:
    "rounded-lg border-2 border-slate-400/80 bg-gradient-to-br from-slate-300/95 via-slate-200/98 to-slate-400/90 p-3 shadow-[inset_0_2px_0_rgba(255,255,255,0.35),0_4px_14px_rgba(51,65,85,0.18)] sm:p-4",
  gold:
    "rounded-lg border-2 border-amber-500/75 bg-gradient-to-br from-amber-200/95 via-amber-100/98 to-amber-300/90 p-3 shadow-[inset_0_2px_0_rgba(255,255,255,0.4),0_4px_20px_rgba(217,119,6,0.22)] sm:p-4",
  prismatic:
    "rounded-lg border-2 border-violet-400/85 bg-gradient-to-br from-violet-200/95 via-fuchsia-100/95 to-purple-300/88 p-3 shadow-[inset_0_2px_0_rgba(255,255,255,0.35),0_0_28px_rgba(167,139,250,0.45),0_0_48px_rgba(192,132,252,0.28)] sm:p-4",
};

/** 검색 input — 티어색 없이 읽기 쉬운 중립 스타일(영역 색은 section이 담당). CSS변수+투명도 조합은 일부 브라우저에서 누락될 수 있어 hex+알파 사용 */
export const augmentSearchInputClass =
  "w-full rounded-md border border-zinc-900/10 bg-[rgba(250,249,246,0.88)] px-3 py-2.5 font-mono text-sm text-zinc-900 shadow-inner outline-none ring-0 placeholder:text-zinc-500 focus:border-zinc-900/25 focus:ring-2 focus:ring-zinc-900/10";
