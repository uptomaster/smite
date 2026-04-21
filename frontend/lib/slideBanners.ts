/**
 * 상단 배너 슬라이드 — Unsplash 고해상도(2560px, q=90).
 * 교체: `public/banners/` 에 넣고 `"/banners/xxx.jpg"` 사용.
 */
export const SLIDE_BANNER_INTERVAL_MS = 6500;

const u = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=2560&q=90`;

export const SLIDE_BANNER_IMAGES: string[] = [
  u("photo-1514888286974-57c68334355b"),
  u("photo-1548199973-03cce0bbc87b"),
  u("photo-1587300003388-59208cc962cb"),
  u("photo-1561037404-61cd46aa615c"),
  u("photo-1526336024172-e916f831c792"),
  u("photo-1444212477490-ca40792529e9"),
  u("photo-1537151625747-768eb6cf92b2"),
];
