/**
 * Typed client for the ARAM augment decision API.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface ItemReco {
  name: string;
  reason: string;
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
  /** e.g. "현재 빌드와 가장 시너지 높음" */
  subtitle: string;
  summary: string;
  confidence: number;
  reasons: string[];
  items: ItemReco[];
}

export interface AlternativePick {
  augment: string;
  tier: string;
  summary: string;
  confidence: number;
  reasons: string[];
  items: ItemReco[];
}

export interface AntiPick {
  augment: string;
  reasons: string[];
}

export interface AramRecommendResponse {
  situation: { ally: string[]; enemy: string[] };
  selection_state: SelectionState;
  best_pick: BestPick;
  alternatives: AlternativePick[];
  anti_pick: AntiPick;
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

export async function fetchChampions(prefix: string): Promise<string[]> {
  const q = encodeURIComponent(prefix);
  const data = await fetchJson<{ champions: string[] }>(`/champions?prefix=${q}`);
  return data.champions;
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
