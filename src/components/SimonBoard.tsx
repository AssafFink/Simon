import type { KeyboardEvent } from 'react';
import { COLORS, type SimonColor } from '../game/colors.ts';
import { EMBOSS_PATH, GRILLE, LOGO_PATH, PAD_PATH, PAD_ROTATION } from './simonBoardShapes.ts';
import './SimonBoard.css';

export type BoardMode = 'idle' | 'presenting' | 'input' | 'paused' | 'over';

type Props = {
  mode?: BoardMode;
  litColor?: SimonColor | null;
  onPressStart?: (color: SimonColor) => void;
  onPressEnd?: () => void;
};

// Static, decorative parts of the device: rim, dark field and center hub.
function BoardArt() {
  return (
    <svg className="simon-board__art" viewBox="0 0 1000 1000" aria-hidden="true" focusable="false">
      <defs>
        {/* Shared by the pads: darker toward the hub, a light rim at the outer edge. */}
        <radialGradient id="simon-pad-shade" gradientUnits="userSpaceOnUse" cx="500" cy="500" r="444">
          <stop offset="0.47" stopColor="#000" stopOpacity="0.16" />
          <stop offset="0.7" stopColor="#000" stopOpacity="0" />
          <stop offset="0.92" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.975" stopColor="#fff" stopOpacity="0.3" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.12" />
        </radialGradient>
        <linearGradient id="simon-hub-gloss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a2a2d" />
          <stop offset="0.5" stopColor="#0c0c0d" />
          <stop offset="1" stopColor="#151516" />
        </linearGradient>
        <pattern id="simon-grille-holes" width="12" height="12" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="2.4" fill="#050505" />
          <circle cx="9" cy="9" r="2.4" fill="#050505" />
        </pattern>
        <clipPath id="simon-hub-inner">
          <circle cx="500" cy="500" r="150" />
        </clipPath>
      </defs>

      {/* Rim: outer edge, a black line, the grooved band, then the dark field. */}
      <circle cx="500" cy="500" r="493" fill="#45494c" />
      <circle cx="500" cy="500" r="476" fill="#111" />
      <circle cx="500" cy="500" r="471" fill="#3f4246" />
      <circle cx="500" cy="500" r="457" fill="#222" />

      {/* Hub rings and glossy inner disc. */}
      <circle cx="500" cy="500" r="180" fill="#3c3d41" />
      <circle cx="500" cy="500" r="163" fill="#121214" />
      <circle cx="500" cy="500" r="160" fill="#4a4b4f" />
      <circle cx="500" cy="500" r="150" fill="url(#simon-hub-gloss)" />

      <g clipPath="url(#simon-hub-inner)">
        <circle cx={GRILLE.cx} cy={GRILLE.cy} r={GRILLE.r} fill="#1e1e1f" stroke="#333" strokeWidth="3" />
        <circle cx={GRILLE.cx} cy={GRILLE.cy} r={GRILLE.r} fill="url(#simon-grille-holes)" />
      </g>

      {/* Reflection on the hub's upper right, as in the photo. */}
      <path d="M548 362 A145 145 0 0 1 628 430" fill="none" stroke="#fff" strokeOpacity="0.16" strokeWidth="7" strokeLinecap="round" />

      {/* Power button (decorative only). */}
      <rect x="440" y="370" width="112" height="45" rx="22.5" fill="#5c6765" stroke="#2a2f2f" strokeWidth="3" />
      <path d="M489 386 A11 11 0 1 0 503 386" fill="none" stroke="#3b4443" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="496" y1="380" x2="496" y2="392" stroke="#3b4443" strokeWidth="3.5" strokeLinecap="round" />

      <path d={LOGO_PATH} fill="#fff" fillRule="evenodd" />
    </svg>
  );
}

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
      <BoardArt />
      {/* Each pad button spans the whole board, but only its drawn shape takes pointer input. */}
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
            // Touch captures the pointer on the shape itself; release it so leaving the pad ends the press.
            (event.target as Element).releasePointerCapture?.(event.pointerId);
            onPressStart?.(id);
          }}
          onPointerUp={onPressEnd}
          onPointerCancel={onPressEnd}
          onPointerLeave={onPressEnd}
          onKeyDown={(event) => handleKeyDown(event, id)}
          onContextMenu={(event) => event.preventDefault()}
        >
          <svg viewBox="0 0 1000 1000" aria-hidden="true" focusable="false">
            <g transform={`rotate(${PAD_ROTATION[position]} 500 500)`}>
              <path className="simon-pad__shape" d={PAD_PATH} />
              <path className="simon-pad__shade" d={PAD_PATH} fill="url(#simon-pad-shade)" />
              <path className="simon-pad__emboss" d={EMBOSS_PATH} />
            </g>
          </svg>
        </button>
      ))}
    </div>
  );
}
