/**
 * Typed client for the ARAM augment decision API.
 */

/** Windows에서 8000 바인드 오류가 나는 환경이 있어 8001을 기본값으로 둡니다. */
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8001";

export interface ItemReco {
  name: string;
  reason: string;
}

export interface AugmentStatsBlock {
  winrate: number;
  pickrate: number;
  games_played: number;
  confidence_score: number;
  data_source: "aggregated" | "estimated";
  patch_version: string | null;
}

export interface ScoreBreakdown {
  base_score: number;
  augment_combo: number;
  context: number;
  strength: number;
  final_score: number;
}

export interface ScoreBars {
  winrate: number;
  synergy: number;
  context: number;
  confidence: number;
}

export interface ReasonBreakdown {
  synergy: string;
  context: string;
  statistical: string;
}

export interface SelectedAugmentState {
  id: number;
  name: string;
}

export interface SelectionState {
  selected: SelectedAugmentState[];
  count: number;
}

export interface BestPick {
  augment: string;
  tier: string;
  subtitle: string;
  summary: string;
  description_short: string;
  confidence: number;
  reasons: string[];
  reason_breakdown: ReasonBreakdown;
  stats: AugmentStatsBlock;
  score_breakdown: ScoreBreakdown;
  score_bars: ScoreBars;
  items: ItemReco[];
}

export interface AlternativePick {
  augment: string;
  tier: string;
  summary: string;
  description_short: string;
  confidence: number;
  score: number;
  reasons: string[];
  reason_breakdown: ReasonBreakdown;
  stats: AugmentStatsBlock;
  score_breakdown: ScoreBreakdown;
  score_bars: ScoreBars;
  items: ItemReco[];
}

export interface AntiPick {
  augment: string;
  reasons: string[];
  stats: AugmentStatsBlock | null;
  score: number | null;
}

export interface AramRecommendResponse {
  situation: { ally: string[]; enemy: string[] };
  selection_state: SelectionState;
  best_pick: BestPick;
  alternatives: AlternativePick[];
  anti_pick: AntiPick;
}

export interface AugmentSynergyRef {
  slug: string;
  name_ko: string;
}

export interface AugmentEncyclopediaEntry {
  id: number;
  name: string;
  name_en?: string | null;
  description: string;
  tags: string[];
  tier: string;
  icon: string | null;
  excluded_champion_tags: string[];
  synergy_sets?: AugmentSynergyRef[];
}

export interface AramSynergySet {
  slug: string;
  name_ko: string;
  effect_ko: string;
  source_note?: string;
}

/** Data Dragon 병합 + 더미 초상화 */
export interface ChampionSearchHit {
  slug: string;
  riot_id: number;
  name_en: string;
  name_ko: string;
  image: string;
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text();
    let message = `Request failed (${res.status})`;
    try {
      const body = JSON.parse(text) as { detail?: unknown };
      if (typeof body.detail === "string") {
        message = body.detail;
      }
    } catch {
      if (text) message = text;
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

/** limit 기본 500 — Data Dragon 전체 챔피언(빈 q일 때 가나다순). */
export async function fetchChampionSearch(query: string, limit: number = 500): Promise<ChampionSearchHit[]> {
  const q = encodeURIComponent(query);
  const data = await fetchJson<{ champions: ChampionSearchHit[] }>(`/champions?q=${q}&limit=${limit}`);
  return data.champions;
}

/** 전체 증강 (필터 없음). */
export async function fetchAugmentsAll(): Promise<AugmentEncyclopediaEntry[]> {
  const data = await fetchJson<{ augments: AugmentEncyclopediaEntry[] }>("/augments");
  return data.augments;
}

export interface AugmentEligibleChampion {
  name_en: string;
  name_ko: string;
}

export async function fetchAugmentEligibleChampions(
  augmentId: number,
): Promise<{ augment_id: number; count: number; champions: AugmentEligibleChampion[] }> {
  return fetchJson(`/augments/${augmentId}/champions`);
}

/** 특정 챔 기준 제한 증강만 (선택). */
export async function fetchAugmentsForChampion(championEn: string): Promise<AugmentEncyclopediaEntry[]> {
  const q = encodeURIComponent(championEn.trim());
  const data = await fetchJson<{ augments: AugmentEncyclopediaEntry[] }>(`/augments?champion=${q}`);
  return data.augments;
}

export async function fetchAramSynergySets(): Promise<AramSynergySet[]> {
  const data = await fetchJson<{ synergies: AramSynergySet[] }>("/augments/synergies");
  return data.synergies;
}

export async function fetchAramRecommend(
  champion: string,
  allies: string,
  enemies: string,
  selectedAugmentIds: string = "",
): Promise<AramRecommendResponse> {
  const p = new URLSearchParams({ champion });
  if (allies.trim()) p.set("allies", allies);
  if (enemies.trim()) p.set("enemies", enemies);
  if (selectedAugmentIds.trim()) p.set("selected", selectedAugmentIds);
  return fetchJson<AramRecommendResponse>(`/recommend?${p.toString()}`);
}
