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
