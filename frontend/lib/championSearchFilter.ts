import type { ChampionSearchHit } from "@/lib/api";

export function filterChampionsLocal(all: ChampionSearchHit[] | undefined, query: string): ChampionSearchHit[] {
  const safe = Array.isArray(all) ? all : [];
  const f = query.trim().toLowerCase();
  if (!f) return safe;
  const starts: ChampionSearchHit[] = [];
  const contains: ChampionSearchHit[] = [];
  for (const h of safe) {
    const nk = (h.name_ko ?? "").toLowerCase();
    const ne = (h.name_en ?? "").toLowerCase();
    const sl = (h.slug ?? "").toLowerCase();
    if (nk.startsWith(f) || ne.startsWith(f) || sl.startsWith(f)) starts.push(h);
    else if (nk.includes(f) || ne.includes(f) || sl.includes(f)) contains.push(h);
  }
  return [...starts, ...contains];
}

export function teamCsvFromHits(hits: ChampionSearchHit[]): string {
  return hits
    .map((h) => (h.name_en ?? "").trim())
    .filter(Boolean)
    .join(",");
}
