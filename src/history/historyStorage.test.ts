import { addResult, clearHistory, createResultId, HISTORY_KEY, loadHistory, type GameResult } from './historyStorage.ts';

const result = (n: number, outcome: GameResult['outcome'] = 'loss'): GameResult => ({
  id: `id-${n}`,
  finishedAt: new Date(2026, 9, 1, 12, n).toISOString(),
  completedRounds: n % 11,
  outcome,
});

describe('history storage', () => {
  it('starts empty', () => {
    expect(loadHistory()).toEqual({ ok: true, results: [] });
  });

  it('saves a result and reads it back after a reload', () => {
    const saved = addResult(result(3, 'win'));
    expect(saved).toEqual({ ok: true, results: [result(3, 'win')] });
    expect(JSON.parse(localStorage.getItem(HISTORY_KEY)!)).toEqual({ schemaVersion: 1, results: [result(3, 'win')] });
    expect(loadHistory()).toEqual({ ok: true, results: [result(3, 'win')] });
  });

  it('keeps only the 10 newest results, newest first', () => {
    for (let n = 1; n <= 11; n++) addResult(result(n));
    const { results } = loadHistory();
    expect(results).toHaveLength(10);
    expect(results.map((r) => r.id)).toEqual([11, 10, 9, 8, 7, 6, 5, 4, 3, 2].map((n) => `id-${n}`));
  });

  it('reports unreadable data and drops invalid entries', () => {
    localStorage.setItem(HISTORY_KEY, '{not json');
    expect(loadHistory().ok).toBe(false);
    localStorage.setItem(HISTORY_KEY, JSON.stringify({ schemaVersion: 2, results: [] }));
    expect(loadHistory().ok).toBe(false);
    localStorage.setItem(HISTORY_KEY, JSON.stringify({ schemaVersion: 1, results: 'x' }));
    expect(loadHistory().ok).toBe(false);

    const bad = [
      { ...result(1), completedRounds: 11 },
      { ...result(2), outcome: 'draw' },
      { ...result(3), finishedAt: 'yesterday' },
      { id: 'x' },
      null,
    ];
    localStorage.setItem(HISTORY_KEY, JSON.stringify({ schemaVersion: 1, results: [result(4), ...bad] }));
    expect(loadHistory()).toEqual({ ok: true, results: [result(4)] });
  });

  it('a save after unreadable data writes a fresh valid list', () => {
    localStorage.setItem(HISTORY_KEY, 'garbage');
    expect(addResult(result(5)).ok).toBe(true);
    expect(loadHistory()).toEqual({ ok: true, results: [result(5)] });
  });

  it('reports a failed write and keeps the known list', () => {
    addResult(result(1));
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    expect(addResult(result(2))).toEqual({ ok: false, results: [result(1)] });
    expect(clearHistory()).toBe(false);
  });

  it('reports a failed read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(loadHistory()).toEqual({ ok: false, results: [] });
  });

  it('survives localStorage itself being inaccessible', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    expect(loadHistory().ok).toBe(false);
    expect(addResult(result(1)).ok).toBe(false);
    expect(clearHistory()).toBe(false);
  });

  it('clears all results', () => {
    addResult(result(1));
    addResult(result(2));
    expect(clearHistory()).toBe(true);
    expect(loadHistory()).toEqual({ ok: true, results: [] });
  });

  it('creates distinct ids', () => {
    expect(createResultId()).not.toBe(createResultId());
  });
});
