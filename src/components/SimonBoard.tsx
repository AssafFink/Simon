import { COLORS } from '../game/colors.ts';
import './SimonBoard.css';

export default function SimonBoard() {
  return (
    <div className="simon-board" role="group" aria-label="לוח המשחק">
      {COLORS.map(({ id, label, position }) => (
        <button
          key={id}
          type="button"
          className={`simon-pad simon-pad--${id}`}
          data-position={position}
          aria-label={label}
        />
      ))}
      <div className="simon-center" aria-hidden="true" />
    </div>
  );
}
