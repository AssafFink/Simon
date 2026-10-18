import type { JSX } from 'react';
import './BottomNav.css';

export type Screen = 'home' | 'about';

type Props = {
  current: Screen;
  onNavigate: (screen: Screen) => void;
};

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-icon">
      <path d="M12 3 2 11.5h3V21h5.5v-6h3v6H19v-9.5h3z" fill="currentColor" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-icon">
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <rect x="10.75" y="10" width="2.5" height="8" rx="1" fill="var(--color-surface)" />
      <circle cx="12" cy="7" r="1.5" fill="var(--color-surface)" />
    </svg>
  );
}

const ITEMS: { id: Screen; label: string; Icon: () => JSX.Element }[] = [
  { id: 'home', label: 'בית', Icon: HomeIcon },
  { id: 'about', label: 'אודות', Icon: InfoIcon },
];

export default function BottomNav({ current, onNavigate }: Props) {
  return (
    <nav className="bottom-nav" aria-label="ניווט ראשי">
      {ITEMS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className="nav-item"
          aria-current={current === id ? 'page' : undefined}
          onClick={() => onNavigate(id)}
        >
          <Icon />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
