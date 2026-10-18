import { TOTAL_ROUNDS, type SimonColor } from './colors.ts';

export type GameStatus = 'idle' | 'presenting' | 'awaitingInput' | 'paused' | 'won' | 'lost';

export type GameState = {
  status: GameStatus;
  sequence: SimonColor[];
  round: number;
  inputIndex: number;
  completedRounds: number;
  gameId: number;
  // Bumped on every entry to `presenting`; lets stale playback completions be ignored.
  presentationId: number;
};

// Random colors arrive in the payload so the reducer stays pure.
export type GameAction =
  | { type: 'start'; firstColor: SimonColor }
  | { type: 'presentationDone'; presentationId: number }
  | { type: 'press'; color: SimonColor; nextColor: SimonColor }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'dismiss' };

export const initialGameState: GameState = {
  status: 'idle',
  sequence: [],
  round: 1,
  inputIndex: 0,
  completedRounds: 0,
  gameId: 0,
  presentationId: 0,
};

export function isPressCorrect(state: GameState, color: SimonColor): boolean {
  return state.sequence[state.inputIndex] === color;
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'start':
      if (state.status !== 'idle' && state.status !== 'won' && state.status !== 'lost') return state;
      return {
        status: 'presenting',
        sequence: [action.firstColor],
        round: 1,
        inputIndex: 0,
        completedRounds: 0,
        gameId: state.gameId + 1,
        presentationId: state.presentationId + 1,
      };

    case 'presentationDone':
      if (state.status !== 'presenting' || action.presentationId !== state.presentationId) return state;
      return { ...state, status: 'awaitingInput', inputIndex: 0 };

    case 'press': {
      if (state.status !== 'awaitingInput') return state;
      if (!isPressCorrect(state, action.color)) {
        return { ...state, status: 'lost', completedRounds: state.round - 1 };
      }
      const inputIndex = state.inputIndex + 1;
      if (inputIndex < state.sequence.length) return { ...state, inputIndex };
      if (state.round >= TOTAL_ROUNDS) {
        return { ...state, status: 'won', inputIndex, completedRounds: TOTAL_ROUNDS };
      }
      return {
        ...state,
        status: 'presenting',
        sequence: [...state.sequence, action.nextColor],
        round: state.round + 1,
        inputIndex: 0,
        completedRounds: state.round,
        presentationId: state.presentationId + 1,
      };
    }

    // Pausing keeps the sequence and round but drops partial input; bumping
    // presentationId makes any completion from the cancelled playback stale.
    case 'pause':
      if (state.status !== 'presenting' && state.status !== 'awaitingInput') return state;
      return { ...state, status: 'paused', inputIndex: 0, presentationId: state.presentationId + 1 };

    // Resuming replays the same round's full sequence from the start.
    case 'resume':
      if (state.status !== 'paused') return state;
      return { ...state, status: 'presenting', inputIndex: 0, presentationId: state.presentationId + 1 };

    // "אישור" on the result message returns to the start state; gameId is kept
    // so the next game still gets a new one.
    case 'dismiss':
      if (state.status !== 'won' && state.status !== 'lost') return state;
      return { ...initialGameState, gameId: state.gameId, presentationId: state.presentationId };
  }
}
