import { TOTAL_ROUNDS } from '../game/colors.ts';

export type GameResult = {
  id: string;
  finishedAt: string; // ISO 8601
  completedRounds: number; // 0–10
  outcome: 'win' | 'loss';
};

type HistoryData = {
  schemaVersion: 1;
  results: GameResult[]; // newest first, at most MAX_RESULTS
};

export const HISTORY_KEY = 'simon.history.v1';
export const MAX_RESULTS = 10;

export type LoadResult = { ok: true; results: GameResult[] } | { ok: false; results: GameResult[] };

// Even touching window.localStorage can throw (blocked storage, some private modes).
function getStorage(): Storage {
  return window.localStorage;
}

function isGameResult(value: unknown): value is GameResult {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.finishedAt === 'string' &&
    !Number.isNaN(Date.parse(r.finishedAt)) &&
    Number.isInteger(r.completedRounds) &&
    (r.completedRounds as number) >= 0 &&
    (r.completedRounds as number) <= TOTAL_ROUNDS &&
    (r.outcome === 'win' || r.outcome === 'loss')
  );
}

export function loadHistory(): LoadResult {
  let raw: string | null;
  try {
    raw = getStorage().getItem(HISTORY_KEY);
  } catch {
    return { ok: false, results: [] };
  }
  if (raw === null) return { ok: true, results: [] };
  try {
    const data = JSON.parse(raw) as Partial<HistoryData> | null;
    if (!data || data.schemaVersion !== 1 || !Array.isArray(data.results)) return { ok: false, results: [] };
    // Invalid entries are dropped quietly; the rest stays usable.
    return { ok: true, results: data.results.filter(isGameResult).slice(0, MAX_RESULTS) };
  } catch {
    return { ok: false, results: [] };
  }
}

function write(results: GameResult[]): boolean {
  const data: HistoryData = { schemaVersion: 1, results };
  try {
    getStorage().setItem(HISTORY_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

// Unreadable data has nothing worth keeping, so a save then starts a fresh list.
export function addResult(result: GameResult): { ok: boolean; results: GameResult[] } {
  const previous = loadHistory().results;
  const results = [result, ...previous].slice(0, MAX_RESULTS);
  return write(results) ? { ok: true, results } : { ok: false, results: previous };
}

export function clearHistory(): boolean {
  return write([]);
}

// Not crypto.randomUUID: it is missing on plain-HTTP origins (e.g. testing from a phone on the LAN).
export function createResultId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
