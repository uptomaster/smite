/** 칼바람 증강 선택 라운드 (레벨 순) */
export const AUGMENT_ROUND_LEVELS = [3, 7, 11, 15] as const;

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
