import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { gameReducer, initialGameState, isPressCorrect } from './gameReducer.ts';
import { playSequence } from './sequencePlayer.ts';
import { randomColor } from './random.ts';
import { LEAD_IN_MS, PRESS_MIN_MS, ROUND_PAUSE_MS, RESULT_DELAY_MS } from './timing.ts';
import { TOTAL_ROUNDS, type SimonColor } from './colors.ts';
import { playLoseSound, playWinSound, startTone, stopAllSounds, unlockAudio } from '../audio/audioEngine.ts';

type ActivePress = {
  stopTone: () => void;
  startedAt: number;
  releaseTimer: number | null;
};

const CONFETTI_COLORS = ['#00D26A', '#FF3B30', '#FFD600', '#00A3FF'];

export function useGame() {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const [presentedColor, setPresentedColor] = useState<SimonColor | null>(null);
  const [pressedColor, setPressedColor] = useState<SimonColor | null>(null);
  const [audioError, setAudioError] = useState(false);
  // presentationId whose new round number is still hidden behind the post-round pause.
  const [roundHiddenFor, setRoundHiddenFor] = useState<number | null>(null);
  // presentationId that follows a completed round (gets the longer lead-in).
  const afterRoundRef = useRef<number | null>(null);
  // gameId whose result message is already on screen.
  const [resultShownFor, setResultShownFor] = useState<number | null>(null);

  const stateRef = useRef(state);
  stateRef.current = state;
  const pressRef = useRef<ActivePress | null>(null);
  const startingRef = useRef(false);
  const resumingRef = useRef(false);

  const finishPress = useCallback(() => {
    const press = pressRef.current;
    if (!press) return;
    if (press.releaseTimer !== null) window.clearTimeout(press.releaseTimer);
    press.stopTone();
    pressRef.current = null;
    setPressedColor(null);
  }, []);

  // Sequence playback: restarts whenever a new presentation begins, cancelled on any status change.
  useEffect(() => {
    if (state.status !== 'presenting') return;
    const controller = new AbortController();
    const presentationId = state.presentationId;
    const afterRound = afterRoundRef.current === presentationId;
    let stopTone: (() => void) | null = null;
    const revealTimer = afterRound ? window.setTimeout(() => setRoundHiddenFor(null), ROUND_PAUSE_MS) : null;

    playSequence(
      state.sequence,
      {
        onLight: (color) => {
          stopTone?.();
          stopTone = null;
          if (color) {
            finishPress();
            stopTone = startTone(color);
          }
          setPresentedColor(color);
        },
        onDone: () => dispatch({ type: 'presentationDone', presentationId }),
      },
      controller.signal,
      afterRound ? ROUND_PAUSE_MS + LEAD_IN_MS : LEAD_IN_MS,
    );

    return () => {
      controller.abort();
      if (revealTimer !== null) window.clearTimeout(revealTimer);
    };
  }, [state.status, state.presentationId, state.sequence, finishPress]);

  // The result message and its sound appear RESULT_DELAY_MS after the final press;
  // a win also brings confetti.
  useEffect(() => {
    if (state.status !== 'won' && state.status !== 'lost') return;
    const won = state.status === 'won';
    const gameId = state.gameId;
    const timer = window.setTimeout(() => {
      if (won) {
        stopAllSounds();
        playWinSound();
        confetti({
          particleCount: 160,
          spread: 100,
          origin: { y: 0.45 },
          colors: CONFETTI_COLORS,
          disableForReducedMotion: true,
        });
      } else {
        stopAllSounds();
        playLoseSound();
      }
      setResultShownFor(gameId);
    }, RESULT_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      if (won) {
        confetti.reset();
        stopAllSounds();
      }
    };
  }, [state.status, state.gameId]);

  useEffect(
    () => () => {
      finishPress();
      stopAllSounds();
    },
    [finishPress],
  );

  const start = useCallback(async () => {
    const status = stateRef.current.status;
    if (startingRef.current || (status !== 'idle' && status !== 'won' && status !== 'lost')) return;
    startingRef.current = true;
    try {
      const ok = await unlockAudio();
      setAudioError(!ok);
      // Never start a silent game: the player must be able to hear the sequence.
      if (ok) dispatch({ type: 'start', firstColor: randomColor() });
    } finally {
      startingRef.current = false;
    }
  }, []);

  const pressStart = useCallback(
    (color: SimonColor) => {
      const current = stateRef.current;
      if (current.status !== 'awaitingInput') return;
      finishPress();
      // Every press, right or wrong, lights its pad and plays its tone at once;
      // a wrong press's loss sound follows later, together with the message.
      pressRef.current = { stopTone: startTone(color), startedAt: performance.now(), releaseTimer: null };
      setPressedColor(color);
      const completesRound =
        isPressCorrect(current, color) &&
        current.inputIndex + 1 === current.sequence.length &&
        current.round < TOTAL_ROUNDS;
      if (completesRound) {
        afterRoundRef.current = current.presentationId + 1;
        setRoundHiddenFor(current.presentationId + 1);
      }
      // The pad may become disabled before release (end of round or game), so listen on window too.
      window.addEventListener('pointerup', pressEndRef.current, { once: true });
      window.addEventListener('pointercancel', pressEndRef.current, { once: true });
      dispatch({ type: 'press', color, nextColor: randomColor() });
    },
    [finishPress],
  );

  // Highlight and tone last for the longer of the hold and PRESS_MIN_MS.
  const pressEnd = useCallback(() => {
    const press = pressRef.current;
    if (!press || press.releaseTimer !== null) return;
    const remaining = PRESS_MIN_MS - (performance.now() - press.startedAt);
    if (remaining <= 0) finishPress();
    else press.releaseTimer = window.setTimeout(finishPress, remaining);
  }, [finishPress]);
  const pressEndRef = useRef(pressEnd);
  pressEndRef.current = pressEnd;

  // Pausing stops light, tone and timers at once; the presentation effect aborts
  // itself because the status changes. Finished or idle games are left alone.
  const pause = useCallback(() => {
    const status = stateRef.current.status;
    if (status !== 'presenting' && status !== 'awaitingInput') return;
    finishPress();
    stopAllSounds();
    setAudioError(false);
    setRoundHiddenFor(null);
    dispatch({ type: 'pause' });
  }, [finishPress]);

  // Only an explicit "המשך משחק" press resumes; the browser may have suspended audio meanwhile.
  const resume = useCallback(async () => {
    if (resumingRef.current || stateRef.current.status !== 'paused') return;
    resumingRef.current = true;
    try {
      const ok = await unlockAudio();
      setAudioError(!ok);
      if (ok && stateRef.current.status === 'paused') dispatch({ type: 'resume' });
    } finally {
      resumingRef.current = false;
    }
  }, []);

  // Visibility handler: hiding the app (background, lock screen, tab switch) pauses.
  // Becoming visible again does nothing, so there is no automatic resume.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') pause();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', pause);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', pause);
    };
  }, [pause]);

  return {
    state,
    displayRound: roundHiddenFor === state.presentationId ? state.round - 1 : state.round,
    showResult: (state.status === 'won' || state.status === 'lost') && resultShownFor === state.gameId,
    litColor: presentedColor ?? pressedColor,
    audioError,
    start,
    pressStart,
    pressEnd,
    pause,
    resume,
  };
}
