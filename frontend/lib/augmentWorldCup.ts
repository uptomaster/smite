/**
 * 3자(또는 마지막 2자) 대결 투표로 증강을 한 명씩 줄여 나가는 단순 토너먼트.
 * 한 판에서 1명만 다음 라운드로, 나머지는 탈락.
 */

import type { AugmentEncyclopediaEntry } from "./api";

export type WorldCupPlaying = {
  phase: "playing";
  pending: AugmentEncyclopediaEntry[];
  nextWave: AugmentEncyclopediaEntry[];
  match: AugmentEncyclopediaEntry[];
  wave: number;
};

export type WorldCupChampion = {
  phase: "champion";
  winner: AugmentEncyclopediaEntry;
  wave: number;
};

export type WorldCupState = WorldCupPlaying | WorldCupChampion;

export type WorldCupBootstrap = WorldCupState | { phase: "need_data" };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function fillMatch(pending: AugmentEncyclopediaEntry[], nextWave: AugmentEncyclopediaEntry[], wave: number): WorldCupState {
  let p = pending;
  let n = nextWave;
  let w = wave;

  if (p.length === 0) {
    if (n.length === 0) {
      return {
        phase: "playing",
        pending: [],
        nextWave: [],
        match: [],
        wave: w,
      };
    }
    if (n.length === 1) {
      return { phase: "champion", winner: n[0]!, wave: w };
    }
    p = shuffle(n);
    n = [];
    w += 1;
  }

  if (p.length === 1) {
    n = [...n, p[0]!];
    return fillMatch([], n, w);
  }

  const k = Math.min(3, p.length);
  const match = p.slice(0, k);
  const rest = p.slice(k);
  return {
    phase: "playing",
    pending: rest,
    nextWave: n,
    match,
    wave: w,
  };
}

export function startWorldCup(all: AugmentEncyclopediaEntry[]): WorldCupBootstrap {
  if (all.length === 0) return { phase: "need_data" };
  return fillMatch(shuffle(all), [], 1);
}

export function applyVote(state: WorldCupPlaying, winner: AugmentEncyclopediaEntry): WorldCupState {
  if (!state.match.some((m) => m.id === winner.id)) return state;
  return fillMatch(state.pending, [...state.nextWave, winner], state.wave);
}

export function countAlive(state: WorldCupPlaying): number {
  return state.pending.length + state.match.length + state.nextWave.length;
}
