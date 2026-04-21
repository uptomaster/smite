/**
 * 상단 배너 — 칼바람(아레나) 증강 아트.
 * Community Dragon `iconLarge` 에셋(라이엇 클라이언트와 동일 출처).
 */
export const SLIDE_BANNER_INTERVAL_MS = 6500;

const cdragon = (path: string) => `https://raw.communitydragon.org/latest/${path}`;

/** 아레나 증강 대형 아이콘 PNG (배너용) */
export const SLIDE_BANNER_IMAGES: string[] = [
  cdragon("assets/ux/cherry/augments/icons/warmuproutine_large.png"),
  cdragon("assets/ux/cherry/augments/icons/chainlightning_large.png"),
  cdragon("assets/ux/cherry/augments/icons/dawnbringersresolve_large.png"),
  cdragon("assets/ux/cherry/augments/icons/quantumcomputing_large.png"),
  cdragon("assets/ux/cherry/augments/icons/transmutechaos_large.png"),
  cdragon("assets/ux/cherry/augments/icons/selfdestruct_large.png"),
  cdragon("assets/ux/cherry/augments/icons/typhoon_large.png"),
  cdragon("assets/ux/cherry/augments/icons/cerberus_large.png"),
];
