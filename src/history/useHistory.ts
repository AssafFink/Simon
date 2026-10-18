import { useCallback, useState } from 'react';
import { addResult, clearHistory, loadHistory, type GameResult } from './historyStorage.ts';

type HistoryState = {
  results: GameResult[];
  loadError: boolean;
  saveError: boolean;
  clearError: boolean;
};

export function useHistory() {
  const [state, setState] = useState<HistoryState>(() => {
    const loaded = loadHistory();
    return { results: loaded.results, loadError: !loaded.ok, saveError: false, clearError: false };
  });

  const record = useCallback((result: GameResult) => {
    const saved = addResult(result);
    setState((s) => ({
      ...s,
      results: saved.results,
      saveError: !saved.ok,
      // A successful save rewrote the stored data, so it is readable again.
      loadError: saved.ok ? false : s.loadError,
    }));
  }, []);

  // A failed delete keeps the list on screen: it must never look like it succeeded.
  const clear = useCallback(() => {
    const ok = clearHistory();
    setState((s) => (ok ? { ...s, results: [], loadError: false, clearError: false } : { ...s, clearError: true }));
    return ok;
  }, []);

  return { ...state, record, clear };
}
