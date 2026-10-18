import { gameReducer, initialGameState, type GameState } from './gameReducer.ts';
import type { SimonColor } from './colors.ts';

function start(first: SimonColor = 'green', state: GameState = initialGameState) {
  return gameReducer(state, { type: 'start', firstColor: first });
}

function presented(state: GameState) {
  return gameReducer(state, { type: 'presentationDone', presentationId: state.presentationId });
}

function press(state: GameState, color: SimonColor, nextColor: SimonColor = 'red') {
  return gameReducer(state, { type: 'press', color, nextColor });
}

// Replays the whole current sequence correctly, appending `nextColor` if a new round starts.
function completeRound(state: GameState, nextColor: SimonColor = 'red') {
  let s = presented(state);
  for (const color of state.sequence) s = press(s, color, nextColor);
  return s;
}

describe('gameReducer', () => {
  it('starts round 1 with a single color while presenting', () => {
    const s = start('blue');
    expect(s).toMatchObject({ status: 'presenting', sequence: ['blue'], round: 1, completedRounds: 0 });
  });

  it('grows the sequence by one color per round, keeping the previous one as a prefix', () => {
    let s = start('green');
    const lengths = [s.sequence.length];
    let previous = s.sequence;
    for (let round = 2; round <= 10; round++) {
      s = completeRound(s, round % 2 ? 'yellow' : 'blue');
      expect(s.round).toBe(round);
      expect(s.sequence.slice(0, previous.length)).toEqual(previous);
      previous = s.sequence;
      lengths.push(s.sequence.length);
    }
    expect(lengths[0]).toBe(1);
    expect(lengths[1]).toBe(2);
    expect(lengths[9]).toBe(10);
  });

  it('allows the same color to repeat', () => {
    const s = completeRound(start('red'), 'red');
    expect(s.sequence).toEqual(['red', 'red']);
  });

  it('ignores presses outside the player turn', () => {
    const presenting = start('green');
    expect(press(presenting, 'green')).toBe(presenting);
    expect(press(initialGameState, 'green')).toBe(initialGameState);
  });

  it('ignores a stale presentation completion', () => {
    const s = start('green');
    const stale = gameReducer(s, { type: 'presentationDone', presentationId: s.presentationId - 1 });
    expect(stale.status).toBe('presenting');
  });

  it('advances the input index on a correct press', () => {
    let s = completeRound(start('green'), 'blue');
    s = presented(s);
    s = press(s, 'green');
    expect(s).toMatchObject({ status: 'awaitingInput', inputIndex: 1 });
  });

  it('loses on the first wrong press of round 1 with 0 completed rounds', () => {
    const s = press(presented(start('green')), 'red');
    expect(s).toMatchObject({ status: 'lost', completedRounds: 0, round: 1 });
  });

  it('loses mid-sequence in an advanced round with round - 1 completed', () => {
    let s = start('green');
    for (let i = 0; i < 4; i++) s = completeRound(s, 'blue');
    expect(s.round).toBe(5);
    s = presented(s);
    s = press(s, 'green');
    s = press(s, 'green'); // expected blue
    expect(s).toMatchObject({ status: 'lost', completedRounds: 4, round: 5 });
  });

  it('wins after completing round 10 and never reaches round 11', () => {
    let s = start('green');
    for (let i = 0; i < 9; i++) s = completeRound(s, 'yellow');
    expect(s.round).toBe(10);
    s = completeRound(s, 'yellow');
    expect(s).toMatchObject({ status: 'won', round: 10, completedRounds: 10 });
    expect(s.sequence).toHaveLength(10);
    expect(press(s, 'green')).toBe(s);
  });

  it('starts a fresh game from a finished one', () => {
    const lost = press(presented(start('green')), 'red');
    const again = start('blue', lost);
    expect(again).toMatchObject({ status: 'presenting', sequence: ['blue'], round: 1, completedRounds: 0 });
    expect(again.gameId).toBe(lost.gameId + 1);
  });

  it('does not restart an active game', () => {
    const s = start('green');
    expect(start('blue', s)).toBe(s);
  });

  it('pauses while presenting, keeping sequence and round', () => {
    const s = completeRound(start('green'), 'blue');
    const paused = gameReducer(s, { type: 'pause' });
    expect(paused).toMatchObject({
      status: 'paused',
      sequence: s.sequence,
      round: 2,
      completedRounds: 1,
      inputIndex: 0,
      gameId: s.gameId,
    });
  });

  it('pauses during the player turn and drops partial input', () => {
    let s = presented(completeRound(start('green'), 'blue'));
    s = press(s, 'green');
    expect(s.inputIndex).toBe(1);
    const paused = gameReducer(s, { type: 'pause' });
    expect(paused).toMatchObject({ status: 'paused', inputIndex: 0, round: 2, sequence: ['green', 'blue'] });
  });

  it('ignores pause when no game is active', () => {
    const lost = press(presented(start('green')), 'red');
    const won = (() => {
      let s = start('green');
      for (let i = 0; i < 10; i++) s = completeRound(s, 'yellow');
      return s;
    })();
    const paused = gameReducer(start('green'), { type: 'pause' });
    for (const s of [initialGameState, lost, won, paused]) {
      expect(gameReducer(s, { type: 'pause' })).toBe(s);
    }
  });

  it('ignores presses, starts and stale completions while paused', () => {
    const presenting = start('green');
    const paused = gameReducer(presenting, { type: 'pause' });
    expect(press(paused, 'green')).toBe(paused);
    expect(start('blue', paused)).toBe(paused);
    expect(gameReducer(paused, { type: 'presentationDone', presentationId: presenting.presentationId })).toBe(paused);
    expect(gameReducer(paused, { type: 'presentationDone', presentationId: paused.presentationId })).toBe(paused);
  });

  it('resume replays the same round with no new color', () => {
    const s = presented(completeRound(start('green'), 'blue'));
    const paused = gameReducer(press(s, 'green'), { type: 'pause' });
    const resumed = gameReducer(paused, { type: 'resume' });
    expect(resumed).toMatchObject({ status: 'presenting', sequence: ['green', 'blue'], round: 2, inputIndex: 0 });
    expect(resumed.presentationId).toBeGreaterThan(paused.presentationId);
    // A completion from before the pause can't hand over the turn.
    expect(gameReducer(resumed, { type: 'presentationDone', presentationId: s.presentationId })).toBe(resumed);
  });

  it('ignores a second resume and resume outside the paused state', () => {
    const resumed = gameReducer(gameReducer(start('green'), { type: 'pause' }), { type: 'resume' });
    expect(gameReducer(resumed, { type: 'resume' })).toBe(resumed);
    expect(gameReducer(initialGameState, { type: 'resume' })).toBe(initialGameState);
  });
});
