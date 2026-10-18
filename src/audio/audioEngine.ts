import type { SimonColor } from '../game/colors.ts';

// Pitches inspired by the original Simon device; all four are distinct.
export const TONE_FREQUENCIES: Record<SimonColor, number> = {
  green: 415,
  red: 310,
  yellow: 252,
  blue: 209,
};

const ENVELOPE_S = 0.01;

type ActiveSound = { stop: () => void };

let ctx: AudioContext | null = null;
const active = new Set<ActiveSound>();

type AudioContextCtor = typeof AudioContext;

function getCtor(): AudioContextCtor | undefined {
  const w = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  return w.AudioContext ?? w.webkitAudioContext;
}

// Must be called from a user gesture ("התחל" / "שחק שוב").
export async function unlockAudio(): Promise<boolean> {
  try {
    if (!ctx) {
      const Ctor = getCtor();
      if (!Ctor) return false;
      ctx = new Ctor();
    }
    if (ctx.state !== 'running') await ctx.resume();
    return ctx.state === 'running';
  } catch {
    return false;
  }
}

function startOscillator(frequency: number, type: OscillatorType, peak: number, at = 0): ActiveSound | null {
  if (!ctx) return null;
  const c = ctx;
  const osc = c.createOscillator();
  const gain = c.createGain();
  const start = c.currentTime + at;
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(peak, start + ENVELOPE_S);
  osc.connect(gain).connect(c.destination);
  osc.start(start);

  let stopped = false;
  const sound: ActiveSound = {
    stop: () => {
      if (stopped) return;
      stopped = true;
      active.delete(sound);
      // Short release ramp avoids an audible click.
      const now = Math.max(c.currentTime, start);
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + ENVELOPE_S);
      osc.stop(now + ENVELOPE_S * 2);
    },
  };
  osc.onended = () => active.delete(sound);
  active.add(sound);
  return sound;
}

// Starts a color tone and returns a function that stops it.
export function startTone(color: SimonColor): () => void {
  const sound = startOscillator(TONE_FREQUENCIES[color], 'triangle', 0.35);
  return () => sound?.stop();
}

function playMotif(notes: { freq: number; at: number; dur: number }[], type: OscillatorType, peak: number) {
  for (const { freq, at, dur } of notes) {
    const sound = startOscillator(freq, type, peak, at);
    if (!sound) return;
    window.setTimeout(() => sound.stop(), (at + dur) * 1000);
  }
}

export function playWinSound(): void {
  playMotif(
    [
      { freq: 523, at: 0, dur: 0.15 },
      { freq: 659, at: 0.15, dur: 0.15 },
      { freq: 784, at: 0.3, dur: 0.15 },
      { freq: 1047, at: 0.45, dur: 0.45 },
    ],
    'triangle',
    0.3,
  );
}

export function playLoseSound(): void {
  playMotif(
    // A single low buzz, so it can't be mistaken for a pad tone.
    [{ freq: 110, at: 0, dur: 0.8 }],
    'sawtooth',
    0.2,
  );
}

export function stopAllSounds(): void {
  for (const sound of [...active]) sound.stop();
}
