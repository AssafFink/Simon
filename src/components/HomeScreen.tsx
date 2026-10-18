import SimonBoard from './SimonBoard.tsx';
import PrimaryButton from './PrimaryButton.tsx';
import { TOTAL_ROUNDS } from '../game/colors.ts';
import './HomeScreen.css';

export default function HomeScreen() {
  return (
    <section className="home-screen">
      <p className="round-indicator">
        שלב <bdi>1</bdi> מתוך <bdi>{TOTAL_ROUNDS}</bdi>
      </p>
      {/* Reserved status line so the layout stays stable once game states arrive. */}
      <p className="status-line" aria-live="polite" />
      <SimonBoard />
      <div className="home-action">
        <PrimaryButton>התחל</PrimaryButton>
      </div>
    </section>
  );
}
