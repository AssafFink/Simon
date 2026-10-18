import { useEffect, useId, useRef } from 'react';
import PrimaryButton from './PrimaryButton.tsx';
import './GameOverOverlay.css';

type Props = {
  outcome: 'won' | 'lost';
  completedRounds: number;
  onPlayAgain: () => void;
};

export default function GameOverOverlay({ outcome, completedRounds, onPlayAgain }: Props) {
  const titleId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    buttonRef.current?.focus();
  }, []);

  return (
    <div className={`game-over game-over--${outcome}`} role="dialog" aria-labelledby={titleId}>
      {outcome === 'won' ? (
        <h2 id={titleId} className="game-over-title">
          <span className="game-over-line game-over-line--accent">כל הכבוד!</span>{' '}
          <span className="game-over-line">ניצחת!</span>
        </h2>
      ) : (
        <>
          <h2 id={titleId} className="game-over-title">
            נפסלת!
          </h2>
          <p className="game-over-detail">
            {completedRounds === 1 ? (
              'השלמת שלב אחד'
            ) : (
              <>
                השלמת <bdi>{completedRounds}</bdi> שלבים
              </>
            )}
          </p>
        </>
      )}
      <PrimaryButton ref={buttonRef} onClick={onPlayAgain}>
        שחק שוב
      </PrimaryButton>
    </div>
  );
}
