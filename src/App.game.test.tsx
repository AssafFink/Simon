import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import App from './App.tsx';
import { COLORS } from './game/colors.ts';
import { FLASH_MS, GAP_MS, LEAD_IN_MS, ROUND_PAUSE_MS, RESULT_DELAY_MS } from './game/timing.ts';

const audio = vi.hoisted(() => ({
  unlockAudio: vi.fn(async () => true),
  startTone: vi.fn(() => () => {}),
  playWinSound: vi.fn(),
  playLoseSound: vi.fn(),
  stopAllSounds: vi.fn(),
}));
vi.mock('./audio/audioEngine.ts', () => audio);

const confetti = vi.hoisted(() => Object.assign(vi.fn(), { reset: vi.fn() }));
vi.mock('canvas-confetti', () => ({ default: confetti }));

// Cycles through the colors so consecutive games get different sequences.
const random = vi.hoisted(() => ({ calls: 0 }));
vi.mock('./game/random.ts', () => ({
  randomColor: () => ['green', 'red', 'yellow', 'blue'][random.calls++ % 4],
}));

const otherLabel = (label: string) => COLORS.find((c) => c.label !== label)!.label;

// fireEvent is synchronous, which keeps fake timers fully under the test's control.
const user = {
  click: async (el: HTMLElement) => {
    if (el.classList.contains('simon-pad')) {
      fireEvent.pointerDown(el, { button: 0, pointerId: 1 });
      fireEvent.pointerUp(el, { button: 0, pointerId: 1 });
    } else {
      fireEvent.click(el);
    }
  },
};

type User = typeof user;

function setup() {
  render(<App />);
  return user;
}

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const pad = (label: string) => screen.getByRole('button', { name: label });
const litLabel = () => document.querySelector('.simon-pad[data-lit="true"]')?.getAttribute('aria-label') ?? null;
const roundText = (n: number) =>
  screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === `שלב ${n} מתוך 10`);

async function clickStart(user: User, name = 'התחל') {
  await user.click(screen.getByRole('button', { name }));
  await act(async () => {});
}

// Watches the presentation like a player would and returns the shown pad labels.
async function watchPresentation(length: number) {
  const seen: string[] = [];
  // Rounds after the first follow a completed round, which adds the post-round pause.
  await advance(length > 1 ? ROUND_PAUSE_MS + LEAD_IN_MS : LEAD_IN_MS);
  for (let i = 0; i < length; i++) {
    seen.push(litLabel()!);
    await advance(FLASH_MS);
    expect(litLabel()).toBeNull();
    if (i < length - 1) await advance(GAP_MS);
  }
  return seen;
}

async function playRound(user: User, round: number) {
  const seen = await watchPresentation(round);
  expect(screen.getByText('התור שלך')).toBeInTheDocument();
  for (const label of seen) await user.click(pad(label));
  return seen;
}

describe('game flow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    audio.unlockAudio.mockImplementation(async () => true);
    random.calls = 0;
  });
  afterEach(() => vi.useRealTimers());

  it('presents the sequence, blocks input meanwhile, then hands over the turn', async () => {
    const user = setup();
    await clickStart(user);

    expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument();
    expect(screen.getByText('המתן...')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'התחל' })).not.toBeInTheDocument();

    await advance(LEAD_IN_MS);
    const shown = litLabel()!;
    expect(audio.startTone).toHaveBeenCalledWith('green');
    // A press while presenting has no effect.
    await user.click(pad(otherLabel(shown)));
    expect(screen.queryByText('נפסלת!')).not.toBeInTheDocument();
    expect(audio.playLoseSound).not.toHaveBeenCalled();

    await advance(FLASH_MS);
    expect(screen.getByText('התור שלך')).toBeInTheDocument();
    expect(screen.getByText('הקש על הצבעים לפי הסדר')).toBeInTheDocument();
  });

  it('a correct press plays its tone and advances to round 2 with a longer sequence', async () => {
    const user = setup();
    await clickStart(user);
    const first = await playRound(user, 1);
    expect(audio.startTone).toHaveBeenLastCalledWith('green');
    expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument();
    const second = await watchPresentation(2);
    expect(second[0]).toBe(first[0]);
  });

  it('keeps the finished round number for a pause, then waits before the next round plays', async () => {
    const user = setup();
    await clickStart(user);
    await playRound(user, 1);
    audio.startTone.mockClear();

    await advance(ROUND_PAUSE_MS - 1);
    roundText(1);
    await advance(1);
    roundText(2);

    await advance(LEAD_IN_MS - 1);
    expect(audio.startTone).not.toHaveBeenCalled();
    await advance(1);
    expect(audio.startTone).toHaveBeenCalledTimes(1);
    expect(litLabel()).not.toBeNull();
  });

  it('loses on a wrong press in round 1: pad tone at once, loss sound and message a second later', async () => {
    const user = setup();
    await clickStart(user);
    const [shown] = await watchPresentation(1);
    audio.startTone.mockClear();

    const wrong = otherLabel(shown);
    await user.click(pad(wrong));
    // The pressed pad sounds immediately, like any press.
    expect(audio.startTone).toHaveBeenCalledTimes(1);
    expect(audio.startTone).toHaveBeenCalledWith(COLORS.find((c) => c.label === wrong)!.id);

    // The loss sound and message arrive together, one second after the wrong press.
    await advance(RESULT_DELAY_MS - 1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(audio.playLoseSound).not.toHaveBeenCalled();
    await advance(1);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'נפסלת!' })).toBeInTheDocument();
    expect(screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === 'השלמת 0 שלבים')).toBeInTheDocument();
    expect(audio.playLoseSound).toHaveBeenCalledTimes(1);
    expect(audio.startTone).toHaveBeenCalledTimes(1);
    expect(audio.playWinSound).not.toHaveBeenCalled();
    expect(confetti).not.toHaveBeenCalled();
    roundText(1);
  });

  it('loses in an advanced round and reports the completed rounds', async () => {
    const user = setup();
    await clickStart(user);
    await playRound(user, 1);
    await playRound(user, 2);
    const seen = await watchPresentation(3);
    await user.click(pad(seen[0]));
    await user.click(pad(otherLabel(seen[1])));
    await advance(RESULT_DELAY_MS);

    expect(screen.getByRole('heading', { name: 'נפסלת!' })).toBeInTheDocument();
    expect(screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === 'השלמת 2 שלבים')).toBeInTheDocument();
    roundText(3);
  });

  it('wins after round 10 with win sound and confetti, and never presents round 11', async () => {
    const user = setup();
    await clickStart(user);
    for (let round = 1; round <= 10; round++) await playRound(user, round);

    // The win result waits one second after the last press.
    await advance(RESULT_DELAY_MS - 1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(audio.playWinSound).not.toHaveBeenCalled();
    expect(confetti).not.toHaveBeenCalled();
    await advance(1);

    expect(screen.getByRole('heading', { name: 'כל הכבוד! ניצחת!' })).toBeInTheDocument();
    expect(audio.playWinSound).toHaveBeenCalledTimes(1);
    expect(confetti).toHaveBeenCalledTimes(1);
    expect(audio.playLoseSound).not.toHaveBeenCalled();
    roundText(10);

    const tones = audio.startTone.mock.calls.length;
    await advance(10_000);
    expect(audio.startTone.mock.calls.length).toBe(tones);
    expect(screen.queryByText('המשחק מציג את הרצף')).not.toBeInTheDocument();
  });

  it('"שחק שוב" starts a new game from round 1 with a new sequence', async () => {
    const user = setup();
    await clickStart(user);
    const [first] = await watchPresentation(1);
    await user.click(pad(otherLabel(first)));
    await advance(RESULT_DELAY_MS);

    await clickStart(user, 'שחק שוב');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    roundText(1);
    const [next] = await watchPresentation(1);
    expect(next).not.toBe(first);
  });

  it('does not start a silent game when audio cannot be enabled', async () => {
    audio.unlockAudio.mockImplementation(async () => false);
    const user = setup();
    await clickStart(user);

    expect(screen.getByText('לא ניתן להפעיל את הצלילים. לחץ שוב על "התחל".')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'התחל' })).toBeInTheDocument();
    await advance(5000);
    expect(audio.startTone).not.toHaveBeenCalled();

    audio.unlockAudio.mockImplementation(async () => true);
    await clickStart(user);
    expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument();
  });

  it.each(['presenting', 'player turn'])('leaving for "אודות" while %s cancels the game cleanly', async (phase) => {
    const user = setup();
    await clickStart(user);
    await advance(LEAD_IN_MS + 100);
    if (phase === 'player turn') {
      await advance(FLASH_MS);
      expect(screen.getByText('התור שלך')).toBeInTheDocument();
    } else {
      expect(litLabel()).not.toBeNull();
    }
    const nav = within(screen.getByRole('navigation', { name: 'ניווט ראשי' }));

    await user.click(nav.getByRole('button', { name: 'אודות' }));
    expect(audio.stopAllSounds).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);

    await user.click(nav.getByRole('button', { name: 'בית' }));
    expect(screen.getByRole('button', { name: 'התחל' })).toBeInTheDocument();
    expect(litLabel()).toBeNull();
    roundText(1);
  });

  it('a page reload resets to the start state and nothing is persisted', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const user = setup();
    await clickStart(user);
    await playRound(user, 1);

    // A reload throws away the whole React tree and mounts a fresh one.
    cleanup();
    render(<App />);
    expect(screen.getByRole('button', { name: 'התחל' })).toBeInTheDocument();
    roundText(1);
    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
  });
});
