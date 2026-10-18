import type { ReactNode } from 'react';
import BottomNav, { type Screen } from './BottomNav.tsx';
import './AppShell.css';

type Props = {
  title: string;
  screen: Screen;
  onNavigate: (screen: Screen) => void;
  children: ReactNode;
};

export default function AppShell({ title, screen, onNavigate, children }: Props) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="app-title">{title}</h1>
      </header>
      <main className="app-main">{children}</main>
      <BottomNav current={screen} onNavigate={onNavigate} />
    </div>
  );
}
