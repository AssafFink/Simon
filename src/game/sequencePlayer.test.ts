import { playSequence } from './sequencePlayer.ts';
import { FLASH_MS, GAP_MS, LEAD_IN_MS } from './timing.ts';
import type { SimonColor } from './colors.ts';

type Event = { at: number; light?: SimonColor | null; done?: true };

function record(sequence: SimonColor[], signal = new AbortController().signal) {
  const events: Event[] = [];
  const t0 = Date.now();
  playSequence(
    sequence,
    {
      onLight: (light) => events.push({ at: Date.now() - t0, light }),
      onDone: () => events.push({ at: Date.now() - t0, done: true }),
    },
    signal,
  );
  return events;
}

describe('playSequence', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('follows the DESIGN pace', () => {
    const events = record(['green', 'red']);
    vi.runAllTimers();
    expect(events).toEqual([
      { at: LEAD_IN_MS, light: 'green' },
      { at: LEAD_IN_MS + FLASH_MS, light: null },
      { at: LEAD_IN_MS + FLASH_MS + GAP_MS, light: 'red' },
      { at: LEAD_IN_MS + 2 * FLASH_MS + GAP_MS, light: null },
      { at: LEAD_IN_MS + 2 * FLASH_MS + GAP_MS, done: true },
    ]);
  });

  it('keeps the same pace for short and long sequences', () => {
    for (const length of [1, 3, 10]) {
      const sequence = Array.from({ length }, (_, i) => (['green', 'red', 'yellow', 'blue'] as const)[i % 4]);
      const events = record(sequence);
      vi.runAllTimers();
      const onsets = events.filter((e) => e.light).map((e) => e.at);
      expect(onsets).toEqual(sequence.map((_, i) => LEAD_IN_MS + i * (FLASH_MS + GAP_MS)));
      expect(events.at(-1)).toEqual({ at: LEAD_IN_MS + length * FLASH_MS + (length - 1) * GAP_MS, done: true });
    }
  });

  it('supports a longer lead-in', () => {
    const events: Event[] = [];
    const t0 = Date.now();
    playSequence(
      ['blue'],
      { onLight: (light) => events.push({ at: Date.now() - t0, light }), onDone: () => {} },
      new AbortController().signal,
      2000,
    );
    vi.runAllTimers();
    expect(events[0]).toEqual({ at: 2000, light: 'blue' });
  });

  it('stops immediately when aborted', () => {
    const controller = new AbortController();
    const events = record(['green', 'red', 'blue'], controller.signal);
    vi.advanceTimersByTime(LEAD_IN_MS + 100);
    controller.abort();
    expect(events.at(-1)).toMatchObject({ light: null });
    const count = events.length;
    expect(vi.getTimerCount()).toBe(0);
    vi.runAllTimers();
    expect(events).toHaveLength(count);
  });
});
