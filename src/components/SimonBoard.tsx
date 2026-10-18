import type { KeyboardEvent } from 'react';
import { COLORS, type SimonColor } from '../game/colors.ts';
import './SimonBoard.css';

export type BoardMode = 'idle' | 'presenting' | 'input' | 'over';

type Props = {
  mode?: BoardMode;
  litColor?: SimonColor | null;
  onPressStart?: (color: SimonColor) => void;
  onPressEnd?: () => void;
};

export default function SimonBoard({ mode = 'idle', litColor = null, onPressStart, onPressEnd }: Props) {
  const interactive = mode === 'input';

  const handleKeyDown = (event: KeyboardEvent, color: SimonColor) => {
    if (event.repeat || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    onPressStart?.(color);
    onPressEnd?.();
  };

  return (
    <div className="simon-board" role="group" aria-label="לוח המשחק" data-mode={mode}>
      {COLORS.map(({ id, label, position }) => (
        <button
          key={id}
          type="button"
          className={`simon-pad simon-pad--${id}`}
          data-position={position}
          data-lit={litColor === id ? 'true' : undefined}
          aria-label={label}
          disabled={!interactive}
          // Judge on pointerdown so touch feels instant (no wait for `click`).
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.currentTarget.releasePointerCapture?.(event.pointerId);
            onPressStart?.(id);
          }}
          onPointerUp={onPressEnd}
          onPointerCancel={onPressEnd}
          onPointerLeave={onPressEnd}
          onKeyDown={(event) => handleKeyDown(event, id)}
          onContextMenu={(event) => event.preventDefault()}
        />
      ))}
      <div className="simon-center" aria-hidden="true" />
    </div>
  );
}
