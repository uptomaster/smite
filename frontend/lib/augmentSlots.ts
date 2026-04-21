/** 칼바람 증강 선택 라운드 (레벨 순) */
export const AUGMENT_ROUND_LEVELS = [3, 7, 11, 15] as const;

/** 각 슬롯에서 주로 고르는 증강 티어 (검색란 색·필터 힌트용) */
export const AUGMENT_SLOT_EXPECTED_TIER = ["silver", "gold", "prismatic", "prismatic"] as const;

export type AugmentSlotExpectedTier = (typeof AUGMENT_SLOT_EXPECTED_TIER)[number];

export type AugmentSlotTuple = [
  number | null,
  number | null,
  number | null,
  number | null,
];

export const EMPTY_AUGMENT_SLOTS: AugmentSlotTuple = [null, null, null, null];

/** 추천 API용: 앞선 라운드 순서대로 ID만 나열 */
export function augmentSlotsToCsv(slots: AugmentSlotTuple): string {
  return slots.filter((x): x is number => x != null).join(",");
}

export function usedAugmentIds(slots: AugmentSlotTuple): Set<number> {
  return new Set(slots.filter((x): x is number => x != null));
}
