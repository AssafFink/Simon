import { useEffect, useId, useRef } from 'react';
import './ConfirmDialog.css';

type Props = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({ title, message, confirmLabel, cancelLabel, onConfirm, onCancel }: Props) {
  const titleId = useId();
  const messageId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // On close, focus goes back to whatever opened the dialog (if it still exists).
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    return () => {
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  // Focus starts on the safe choice; Escape cancels; Tab stays inside the dialog.
  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const buttons = dialogRef.current.querySelectorAll<HTMLButtonElement>('button');
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (!dialogRef.current.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  // Clicking the scrim is a pointer shortcut only; keyboard users have Escape and the cancel button.
  return (
    <div className="confirm-scrim" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div
        ref={dialogRef}
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
      >
        <h2 id={titleId} className="confirm-title">
          {title}
        </h2>
        <p id={messageId} className="confirm-message">
          {message}
        </p>
        <div className="confirm-actions">
          <button type="button" className="confirm-button confirm-button--danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button type="button" ref={cancelRef} className="confirm-button confirm-button--cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
