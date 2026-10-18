import { useState } from 'react';
import AppShell from './components/AppShell.tsx';
import HomeScreen from './components/HomeScreen.tsx';
import AboutScreen from './components/AboutScreen.tsx';
import type { Screen } from './components/BottomNav.tsx';

export default function App() {
  // Screens are views inside one React tree; switching never reloads the page.
  const [screen, setScreen] = useState<Screen>('home');

  return (
    <AppShell
      title={screen === 'home' ? 'סיימון' : 'אודות'}
      screen={screen}
      onNavigate={setScreen}
    >
      {screen === 'home' ? <HomeScreen /> : <AboutScreen />}
    </AppShell>
  );
}
