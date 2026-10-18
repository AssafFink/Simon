import { TOTAL_ROUNDS } from '../game/colors.ts';
import './AboutScreen.css';

export default function AboutScreen() {
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

      <h2 className="section-title history-title">
        <bdi>{TOTAL_ROUNDS}</bdi> המשחקים האחרונים
      </h2>
      <p className="card history-empty">עדיין אין משחקים שמורים.</p>
    </section>
  );
}
