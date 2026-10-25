import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import App from './App.tsx';
import { COLORS } from './game/colors.ts';
import { FLASH_MS, GAP_MS, LEAD_IN_MS, ROUND_PAUSE_MS, RESULT_DELAY_MS } from './game/timing.ts';
import { HISTORY_KEY, addResult, type GameResult } from './history/historyStorage.ts';

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

const random = vi.hoisted(() => ({ calls: 0 }));
vi.mock('./game/random.ts', () => ({
  randomColor: () => ['green', 'red', 'yellow', 'blue'][random.calls++ % 4],
}));

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const pad = (label: string) => screen.getByRole('button', { name: label });
const litLabel = () => document.querySelector('.simon-pad[data-lit="true"]')?.getAttribute('aria-label') ?? null;
const otherLabel = (label: string) => COLORS.find((c) => c.label !== label)!.label;
const nav = () => within(screen.getByRole('navigation', { name: 'ניווט ראשי' }));
const goTo = (name: 'אודות' | 'בית') => fireEvent.click(nav().getByRole('button', { name }));
const stored = (): GameResult[] => JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '{"results":[]}').results;
const cards = () => screen.queryAllByRole('listitem');
const tap = (label: string) => {
  fireEvent.pointerDown(pad(label), { button: 0, pointerId: 1 });
  fireEvent.pointerUp(pad(label), { button: 0, pointerId: 1 });
};

async function clickButton(name: string) {
  fireEvent.click(screen.getByRole('button', { name }));
  await act(async () => {});
}

async function watchPresentation(length: number) {
  const seen: string[] = [];
  await advance(length > 1 ? ROUND_PAUSE_MS + LEAD_IN_MS : LEAD_IN_MS);
  for (let i = 0; i < length; i++) {
    seen.push(litLabel()!);
    await advance(FLASH_MS);
    if (i < length - 1) await advance(GAP_MS);
  }
  return seen;
}

// Closes a previous result if one is showing, starts a game, completes `rounds`
// rounds, then loses on the next round, or wins when rounds is 10.
async function playGame(rounds: number) {
  if (screen.queryByRole('button', { name: 'אישור' })) await clickButton('אישור');
  await clickButton('התחל משחק');
  for (let round = 1; round <= rounds; round++) {
    for (const label of await watchPresentation(round)) tap(label);
  }
  if (rounds < 10) {
    const [first] = await watchPresentation(rounds + 1);
    tap(otherLabel(first));
  }
  await advance(RESULT_DELAY_MS);
}

function cardText(card: HTMLElement) {
  return card.textContent?.replace(/\s+/g, ' ').trim();
}

describe('game history', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 12, 14, 32));
    vi.clearAllMocks();
    audio.unlockAudio.mockImplementation(async () => true);
    random.calls = 0;
  });
  afterEach(() => vi.useRealTimers());

  it('a loss in round 1 records 0 completed rounds with date and time', async () => {
    render(<App />);
    await playGame(0);
    expect(stored()).toHaveLength(1);
    expect(stored()[0]).toMatchObject({ completedRounds: 0, outcome: 'loss' });

    goTo('אודות');
    expect(cards()).toHaveLength(1);
    expect(cardText(cards()[0])).toBe('שלבים שהושלמו: 0תוצאה: הפסד12.05.2026 14:32');
    expect(screen.queryByText('עדיין אין משחקים שמורים.')).toBeNull();
  });

  it('a loss in an advanced round records the completed rounds', async () => {
    render(<App />);
    await playGame(3);
    goTo('אודות');
    expect(cardText(cards()[0])).toContain('שלבים שהושלמו: 3');
    expect(cardText(cards()[0])).toContain('תוצאה: הפסד');
  });

  it('a win records 10 completed rounds', async () => {
    render(<App />);
    await playGame(10);
    expect(screen.getByRole('heading', { name: 'כל הכבוד! ניצחת!' })).toBeInTheDocument();
    expect(stored()).toEqual([expect.objectContaining({ completedRounds: 10, outcome: 'win' })]);
    goTo('אודות');
    expect(cardText(cards()[0])).toContain('שלבים שהושלמו: 10');
    expect(cardText(cards()[0])).toContain('תוצאה: ניצחון');
  });

  it('records a game exactly once under Strict Mode and across screen switches', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    await playGame(1);
    goTo('אודות');
    goTo('בית');
    goTo('אודות');
    await advance(5000);
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(stored()).toHaveLength(1);
    expect(cards()).toHaveLength(1);
  });

  it('pausing, hiding or reloading mid-game records nothing and keeps earlier history', async () => {
    addResult({ id: 'old', finishedAt: new Date(2026, 4, 1, 9, 5).toISOString(), completedRounds: 7, outcome: 'loss' });
    render(<App />);
    await clickButton('התחל משחק');
    for (const label of await watchPresentation(1)) tap(label);
    goTo('אודות');
    goTo('בית');
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    expect(stored()).toHaveLength(1);

    // A reload mounts a fresh tree.
    cleanup();
    render(<App />);
    goTo('אודות');
    expect(stored()).toHaveLength(1);
    expect(cards()).toHaveLength(1);
    expect(cardText(cards()[0])).toContain('שלבים שהושלמו: 7');
  });

  it('lists games newest first, keeps 10, and they survive a reload', async () => {
    render(<App />);
    await playGame(0);
    for (let n = 1; n <= 10; n++) {
      vi.setSystemTime(new Date(2026, 4, 12, 15, n));
      await playGame(n % 3);
    }
    expect(stored()).toHaveLength(10);

    cleanup();
    render(<App />);
    goTo('אודות');
    const shown = cards();
    expect(shown).toHaveLength(10);
    // Newest (15:10) first, oldest kept (15:01) last; the 14:32 game was dropped.
    expect(cardText(shown[0])).toContain('15:10');
    expect(cardText(shown[9])).toContain('15:01');
    expect(screen.queryByText(/14:32/)).toBeNull();
  });

  it('delete asks first: cancel or Escape changes nothing, confirm empties the history', async () => {
    addResult({ id: 'a', finishedAt: new Date().toISOString(), completedRounds: 2, outcome: 'loss' });
    render(<App />);
    goTo('אודות');
    expect(cards()).toHaveLength(1);

    await clickButton('מחק היסטוריה');
    const dialog = screen.getByRole('alertdialog', { name: 'למחוק את ההיסטוריה?' });
    expect(within(dialog).getByRole('button', { name: 'ביטול' })).toHaveFocus();
    fireEvent.click(within(dialog).getByRole('button', { name: 'ביטול' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(stored()).toHaveLength(1);
    expect(cards()).toHaveLength(1);

    await clickButton('מחק היסטוריה');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(stored()).toHaveLength(1);

    await clickButton('מחק היסטוריה');
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'מחק' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(stored()).toHaveLength(0);
    expect(cards()).toHaveLength(0);
    expect(screen.getByText('עדיין אין משחקים שמורים.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'מחק היסטוריה' })).toBeNull();
  });

  it('delete dialog keeps Tab inside and returns focus to the opener on cancel', async () => {
    addResult({ id: 'a', finishedAt: new Date().toISOString(), completedRounds: 2, outcome: 'loss' });
    render(<App />);
    goTo('אודות');

    const opener = screen.getByRole('button', { name: 'מחק היסטוריה' });
    opener.focus();
    await clickButton('מחק היסטוריה');
    const dialog = screen.getByRole('alertdialog');
    const confirm = within(dialog).getByRole('button', { name: 'מחק' });
    const cancel = within(dialog).getByRole('button', { name: 'ביטול' });

    fireEvent.keyDown(window, { key: 'Tab' });
    expect(confirm).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(cancel).toHaveFocus();

    fireEvent.click(cancel);
    expect(opener).toHaveFocus();
  });

  it('after confirming delete, focus moves to the history title instead of being lost', async () => {
    addResult({ id: 'a', finishedAt: new Date().toISOString(), completedRounds: 2, outcome: 'loss' });
    render(<App />);
    goTo('אודות');

    screen.getByRole('button', { name: 'מחק היסטוריה' }).focus();
    await clickButton('מחק היסטוריה');
    await clickButton('מחק');

    expect(screen.queryByRole('button', { name: 'מחק היסטוריה' })).toBeNull();
    expect(screen.getByRole('heading', { name: /המשחקים האחרונים/ })).toHaveFocus();
  });

  it('a failed save shows a message and the game can go on', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    render(<App />);
    await playGame(0);
    expect(screen.getByText('לא ניתן היה לשמור את התוצאה בהיסטוריה.')).toBeInTheDocument();
    await clickButton('אישור');
    expect(stored()).toHaveLength(0);
    await clickButton('התחל משחק');
    expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument();
  });

  it('unreadable storage shows a message and does not block playing', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(<App />);
    goTo('אודות');
    expect(screen.getByText('לא ניתן לטעון את היסטוריית המשחקים במכשיר זה.')).toBeInTheDocument();
    goTo('בית');
    await clickButton('התחל משחק');
    expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument();
  });

  it('a failed delete says so and keeps the list', async () => {
    addResult({ id: 'a', finishedAt: new Date().toISOString(), completedRounds: 4, outcome: 'win' });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(<App />);
    goTo('אודות');
    await clickButton('מחק היסטוריה');
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'מחק' }));
    expect(screen.getByText('מחיקת ההיסטוריה נכשלה. נסה שוב.')).toBeInTheDocument();
    expect(cards()).toHaveLength(1);
  });
});
