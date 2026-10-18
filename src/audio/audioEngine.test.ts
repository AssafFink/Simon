import { TONE_FREQUENCIES, unlockAudio } from './audioEngine.ts';

describe('audioEngine', () => {
  it('gives each color a distinct pitch', () => {
    const values = Object.values(TONE_FREQUENCIES);
    expect(values).toHaveLength(4);
    expect(new Set(values).size).toBe(4);
  });

  it('reports failure when Web Audio is unavailable', async () => {
    expect(await unlockAudio()).toBe(false);
  });
});
