import { useCallback, useRef, useState } from 'react';
import { TOTAL_ROUNDS } from '../game/colors.ts';
import type { GameResult } from '../history/historyStorage.ts';
import HistoryCard from './HistoryCard.tsx';
import ConfirmDialog from './ConfirmDialog.tsx';
import './AboutScreen.css';

type Props = {
  results: GameResult[];
  loadError: boolean;
  clearError: boolean;
  onClear: () => void;
};

export default function AboutScreen({ results, loadError, clearError, onClear }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const closeConfirm = useCallback(() => setConfirmOpen(false), []);
  const historyTitleRef = useRef<HTMLHeadingElement>(null);

  // The delete button disappears with the history, so focus lands on the history title.
  // If the delete fails the button stays, and the dialog returns focus to it instead.
  const confirmDelete = () => {
    historyTitleRef.current?.focus();
    setConfirmOpen(false);
    onClear();
  };

  return (
    <section className="about-screen">
      <article className="card about-card">
        <h2 className="section-title">על המשחק</h2>
        <p>זכור את רצף הצבעים שמוצג.</p>
        <p>לחץ על הצבעים באותו סדר.</p>
        <p>
          נסה להגיע עד שלב <bdi>{TOTAL_ROUNDS}</bdi>!
        </p>
      </article>

      <h2 ref={historyTitleRef} tabIndex={-1} className="section-title history-title">
        <bdi>{TOTAL_ROUNDS}</bdi> המשחקים האחרונים
      </h2>
      {loadError && (
        <p className="card history-message history-message--error" role="alert">
          לא ניתן לטעון את היסטוריית המשחקים במכשיר זה.
        </p>
      )}
      {results.length > 0 ? (
        <ol className="history-list">
          {results.map((result) => (
            <HistoryCard key={result.id} result={result} />
          ))}
        </ol>
      ) : (
        !loadError && <p className="card history-message">עדיין אין משחקים שמורים.</p>
      )}
      {clearError && (
        <p className="history-message history-message--error" role="alert">
          מחיקת ההיסטוריה נכשלה. נסה שוב.
        </p>
      )}
      {results.length > 0 && (
        <button type="button" className="secondary-button" onClick={() => setConfirmOpen(true)}>
          מחק היסטוריה
        </button>
      )}

      {confirmOpen && (
        <ConfirmDialog
          title="למחוק את ההיסטוריה?"
          message="כל תוצאות המשחקים יימחקו."
          confirmLabel="מחק"
          cancelLabel="ביטול"
          onConfirm={confirmDelete}
          onCancel={closeConfirm}
        />
      )}
    </section>
  );
}
