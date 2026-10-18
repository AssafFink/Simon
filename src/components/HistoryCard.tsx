import type { GameResult } from '../history/historyStorage.ts';
import './HistoryCard.css';

const dateFormat = new Intl.DateTimeFormat('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
const timeFormat = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false });

export default function HistoryCard({ result }: { result: GameResult }) {
  const finished = new Date(result.finishedAt);
  const won = result.outcome === 'win';

  return (
    <li className="history-card">
      <div className="history-card-main">
        <p className="history-card-rounds">
          שלבים שהושלמו: <bdi>{result.completedRounds}</bdi>
        </p>
        <p className="history-card-outcome">
          תוצאה:{' '}
          <span className={won ? 'history-card-outcome--win' : 'history-card-outcome--loss'}>
            {won ? 'ניצחון' : 'הפסד'}
          </span>
        </p>
      </div>
      <time className="history-card-time" dir="ltr" dateTime={result.finishedAt}>
        {dateFormat.format(finished)} {timeFormat.format(finished)}
      </time>
    </li>
  );
}
