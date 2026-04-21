/**
 * 증강 월드컵 토너먼트 결과 누적 (브라우저 localStorage).
 */

export type WorldCupVoteLog = {
  wave: number;
  optionIds: number[];
  chosenId: number;
};

export type WorldCupResultRecord = {
  runId: string;
  tier: string;
  startedAt: number;
  finishedAt: number;
  winnerId: number;
  winnerName: string;
  winnerNameEn: string | null;
  winnerIcon: string | null;
  poolSize: number;
  votes: WorldCupVoteLog[];
};

const STORAGE_KEY = "smite_augment_world_cup_results_v1";
const MAX_ENTRIES = 200;

function safeParse(raw: string | null): WorldCupResultRecord[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v.filter(
      (x): x is WorldCupResultRecord =>
        typeof x === "object" &&
        x !== null &&
        typeof (x as WorldCupResultRecord).runId === "string" &&
        typeof (x as WorldCupResultRecord).winnerId === "number",
    );
  } catch {
    return [];
  }
}

export function loadWorldCupHistory(): WorldCupResultRecord[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
}

export function appendWorldCupResult(record: WorldCupResultRecord): void {
  if (typeof window === "undefined") return;
  const cur = loadWorldCupHistory();
  if (cur.some((r) => r.runId === record.runId)) return;
  const next = [record, ...cur].slice(0, MAX_ENTRIES);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function clearWorldCupHistory(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
