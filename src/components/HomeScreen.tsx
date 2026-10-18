import SimonBoard, { type BoardMode } from './SimonBoard.tsx';
import PrimaryButton from './PrimaryButton.tsx';
import GameOverOverlay from './GameOverOverlay.tsx';
import { TOTAL_ROUNDS, type SimonColor } from '../game/colors.ts';
import type { GameState } from '../game/gameReducer.ts';
import './HomeScreen.css';

type Props = {
  game: GameState;
  displayRound: number;
  showResult: boolean;
  litColor: SimonColor | null;
  audioError: boolean;
  onStart: () => void;
  onResume: () => void;
  onPressStart: (color: SimonColor) => void;
  onPressEnd: () => void;
};

const BOARD_MODE: Record<GameState['status'], BoardMode> = {
  idle: 'idle',
  presenting: 'presenting',
  awaitingInput: 'input',
  paused: 'paused',
  won: 'over',
  lost: 'over',
};

export default function HomeScreen({ game, displayRound, showResult, litColor, audioError, onStart, onResume, onPressStart, onPressEnd }: Props) {
  const { status } = game;
  const isOver = status === 'won' || status === 'lost';

  let statusText = '';
  const retryLabel = status === 'paused' ? 'המשך משחק' : isOver ? 'שחק שוב' : 'התחל';
  if (audioError) statusText = `לא ניתן להפעיל את הצלילים. לחץ שוב על "${retryLabel}".`;
  else if (status === 'presenting') statusText = 'המשחק מציג את הרצף';
  else if (status === 'awaitingInput') statusText = 'התור שלך';
  else if (status === 'paused') statusText = 'המשחק מושהה';

  return (
    <section className="home-screen">
      <p className="round-indicator">
        שלב <bdi>{displayRound}</bdi> מתוך <bdi>{TOTAL_ROUNDS}</bdi>
      </p>
      <p className={`status-line${audioError ? ' status-line--error' : ''}`} aria-live="polite">
        {statusText}
      </p>
      <div className="board-area">
        <SimonBoard
          mode={BOARD_MODE[status]}
          litColor={litColor}
          onPressStart={onPressStart}
          onPressEnd={onPressEnd}
        />
        {isOver && showResult && (
          <GameOverOverlay outcome={status} completedRounds={game.completedRounds} onPlayAgain={onStart} />
        )}
      </div>
      <div className="home-action">
        {status === 'idle' && <PrimaryButton onClick={onStart}>התחל</PrimaryButton>}
        {status === 'paused' && <PrimaryButton onClick={onResume}>המשך משחק</PrimaryButton>}
        {status === 'presenting' && <p className="action-hint">המתן...</p>}
        {status === 'awaitingInput' && <p className="action-hint">הקש על הצבעים לפי הסדר</p>}
      </div>
    </section>
  );
}
