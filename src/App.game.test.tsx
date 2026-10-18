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

async function clickStart(user: User, name = 'התחל משחק') {
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
    expect(screen.queryByRole('button', { name: 'התחל משחק' })).not.toBeInTheDocument();

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

  it('"אישור" closes the result and returns to "התחל משחק"; the next game has a new sequence', async () => {
    const user = setup();
    await clickStart(user);
    const [first] = await watchPresentation(1);
    await user.click(pad(otherLabel(first)));
    await advance(RESULT_DELAY_MS);
    expect(screen.getByRole('button', { name: 'אישור' })).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'שחק שוב' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'אישור' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
    roundText(1);
    // Closing the message does not start a game by itself.
    await advance(10_000);
    expect(screen.queryByText('המשחק מציג את הרצף')).toBeNull();

    await clickStart(user);
    roundText(1);
    const [next] = await watchPresentation(1);
    expect(next).not.toBe(first);
  });

  it('does not start a silent game when audio cannot be enabled', async () => {
    audio.unlockAudio.mockImplementation(async () => false);
    const user = setup();
    await clickStart(user);

    expect(screen.getByText('לא ניתן להפעיל את הצלילים. לחץ שוב על "התחל משחק".')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
    await advance(5000);
    expect(audio.startTone).not.toHaveBeenCalled();

    audio.unlockAudio.mockImplementation(async () => true);
    await clickStart(user);
    expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument();
  });

  const nav = () => within(screen.getByRole('navigation', { name: 'ניווט ראשי' }));
  const goTo = (name: 'אודות' | 'בית') => user.click(nav().getByRole('button', { name }));
  const setVisibility = async (value: 'hidden' | 'visible') => {
    Object.defineProperty(document, 'visibilityState', { value, configurable: true });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
  };
  const toneCount = () => audio.startTone.mock.calls.length;
  const resumeButton = () => screen.queryByRole('button', { name: 'המשך משחק' });

  // Plays round 1, then watches round 2 and returns its pads once the turn is handed over.
  async function reachRound2Turn(u: User) {
    await clickStart(u);
    await playRound(u, 1);
    const seen = await watchPresentation(2);
    expect(screen.getByText('התור שלך')).toBeInTheDocument();
    return seen;
  }

  function expectPausedHome(round: number) {
    expect(screen.getByText('המשחק מושהה')).toBeInTheDocument();
    expect(resumeButton()).toBeInTheDocument();
    expect(document.querySelector('.simon-board')?.getAttribute('data-mode')).toBe('paused');
    expect(litLabel()).toBeNull();
    roundText(round);
  }

  // Resumes and watches the full sequence replay from its first color.
  async function resumeAndWatch(u: User, length: number) {
    audio.startTone.mockClear();
    await clickStart(u, 'המשך משחק');
    expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument();
    await advance(LEAD_IN_MS - 1);
    expect(litLabel()).toBeNull();
    await advance(1);
    const seen: string[] = [];
    for (let i = 0; i < length; i++) {
      seen.push(litLabel()!);
      await advance(FLASH_MS);
      if (i < length - 1) await advance(GAP_MS);
    }
    expect(toneCount()).toBe(length);
    expect(screen.getByText('התור שלך')).toBeInTheDocument();
    return seen;
  }

  afterEach(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  });

  it('leaving for "אודות" mid-presentation pauses at once and waits for "המשך משחק"', async () => {
    const user = setup();
    await clickStart(user);
    await advance(LEAD_IN_MS + 100);
    const first = litLabel();
    expect(first).not.toBeNull();

    await goTo('אודות');
    expect(audio.stopAllSounds).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);

    audio.startTone.mockClear();
    await goTo('בית');
    await advance(10_000);
    expect(audio.startTone).not.toHaveBeenCalled();
    expectPausedHome(1);

    expect(await resumeAndWatch(user, 1)).toEqual([first]);
    roundText(1);
  });

  it('pausing during the player turn drops partial input and replays the whole round', async () => {
    const user = setup();
    const seen = await reachRound2Turn(user);
    await user.click(pad(seen[0]));

    await goTo('אודות');
    expect(audio.stopAllSounds).toHaveBeenCalled();
    expect(litLabel()).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    await goTo('בית');
    expectPausedHome(2);
    // Pads are locked while paused.
    await user.click(pad(seen[1]));
    expect(screen.getByText('המשחק מושהה')).toBeInTheDocument();

    expect(await resumeAndWatch(user, 2)).toEqual(seen);
    roundText(2);
    // Input restarts from the first color; completing it moves on to round 3.
    for (const label of seen) await user.click(pad(label));
    await advance(ROUND_PAUSE_MS);
    roundText(3);
    expect(screen.queryByText('נפסלת!')).toBeNull();
    expect(audio.playLoseSound).not.toHaveBeenCalled();
  });

  it('pausing between rounds shows the new round and replays its full sequence', async () => {
    const user = setup();
    await clickStart(user);
    await playRound(user, 1);
    await advance(ROUND_PAUSE_MS / 2);

    await goTo('אודות');
    await goTo('בית');
    expectPausedHome(2);
    expect(await resumeAndWatch(user, 2)).toHaveLength(2);
  });

  it('hiding the app pauses the same way, and showing it again does not resume', async () => {
    const user = setup();
    const seen = await reachRound2Turn(user);
    await user.click(pad(seen[0]));

    await setVisibility('hidden');
    expect(audio.stopAllSounds).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    audio.startTone.mockClear();
    await setVisibility('visible');
    await advance(10_000);
    expect(audio.startTone).not.toHaveBeenCalled();
    expectPausedHome(2);

    // Hiding again while paused, or while "אודות" is open, changes nothing.
    await goTo('אודות');
    await setVisibility('hidden');
    await setVisibility('visible');
    await goTo('בית');
    expectPausedHome(2);

    expect(await resumeAndWatch(user, 2)).toEqual(seen);
  });

  it('pagehide pauses an active presentation', async () => {
    setup();
    await clickStart(user);
    await advance(LEAD_IN_MS + 100);
    await act(async () => {
      window.dispatchEvent(new Event('pagehide'));
    });
    expectPausedHome(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('a double tap on "המשך משחק" plays the sequence only once', async () => {
    const user = setup();
    await reachRound2Turn(user);
    await goTo('אודות');
    await goTo('בית');

    audio.startTone.mockClear();
    const button = resumeButton()!;
    await user.click(button);
    await user.click(button);
    await act(async () => {});
    await advance(LEAD_IN_MS + 2 * FLASH_MS + GAP_MS);
    expect(toneCount()).toBe(2);
    expect(screen.getByText('התור שלך')).toBeInTheDocument();
  });

  it('stays paused with a message when audio cannot be resumed', async () => {
    const user = setup();
    await clickStart(user);
    await goTo('אודות');
    await goTo('בית');

    audio.unlockAudio.mockImplementation(async () => false);
    await clickStart(user, 'המשך משחק');
    expect(screen.getByText('לא ניתן להפעיל את הצלילים. לחץ שוב על "המשך משחק".')).toBeInTheDocument();
    expect(resumeButton()).toBeInTheDocument();
    await advance(10_000);
    expect(litLabel()).toBeNull();

    audio.unlockAudio.mockImplementation(async () => true);
    await resumeAndWatch(user, 1);
  });

  it('shows "המשך משחק" only for a paused game; leaving a finished game keeps its result', async () => {
    const user = setup();
    expect(resumeButton()).toBeNull();
    await goTo('אודות');
    await goTo('בית');
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
    expect(resumeButton()).toBeNull();

    await clickStart(user);
    expect(resumeButton()).toBeNull();
    const [label] = await watchPresentation(1);
    expect(resumeButton()).toBeNull();
    await user.click(pad(otherLabel(label)));
    await advance(RESULT_DELAY_MS);
    expect(screen.getByText('נפסלת!')).toBeInTheDocument();

    await goTo('אודות');
    await setVisibility('hidden');
    await setVisibility('visible');
    await goTo('בית');
    expect(screen.getByText('נפסלת!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'אישור' })).toBeInTheDocument();
    expect(resumeButton()).toBeNull();
  });

  it('a reload while paused resets to the start state without persisting anything', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const user = setup();
    await reachRound2Turn(user);
    await goTo('אודות');

    cleanup();
    render(<App />);
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
    expect(resumeButton()).toBeNull();
    roundText(1);
    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
  });

  it('a page reload resets to the start state and nothing is persisted', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const user = setup();
    await clickStart(user);
    await playRound(user, 1);

    // A reload throws away the whole React tree and mounts a fresh one.
    cleanup();
    render(<App />);
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
    roundText(1);
    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
  });
});
