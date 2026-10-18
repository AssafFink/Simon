import type { SimonColor } from './colors.ts';
import { FLASH_MS, GAP_MS, LEAD_IN_MS } from './timing.ts';

type Callbacks = {
  onLight: (color: SimonColor | null) => void;
  onDone: () => void;
};

// Plays the sequence on a fixed schedule. Aborting clears every pending timer,
// turns the light off and guarantees no further callbacks.
export function playSequence(
  sequence: readonly SimonColor[],
  { onLight, onDone }: Callbacks,
  signal: AbortSignal,
  leadInMs = LEAD_IN_MS,
): void {
  if (signal.aborted) return;
  const timers = new Set<number>();

  const after = (ms: number, fn: () => void) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      if (!signal.aborted) fn();
    }, ms);
    timers.add(id);
  };

  signal.addEventListener(
    'abort',
    () => {
      for (const id of timers) window.clearTimeout(id);
      timers.clear();
      onLight(null);
    },
    { once: true },
  );

  const flash = (index: number) => {
    onLight(sequence[index]);
    after(FLASH_MS, () => {
      onLight(null);
      if (index + 1 < sequence.length) after(GAP_MS, () => flash(index + 1));
      else onDone();
    });
  };

  after(leadInMs, () => flash(0));
}
