import { useState } from 'react';
import AppShell from './components/AppShell.tsx';
import HomeScreen from './components/HomeScreen.tsx';
import AboutScreen from './components/AboutScreen.tsx';
import type { Screen } from './components/BottomNav.tsx';
import { useGame } from './game/useGame.ts';

export default function App() {
  // Screens are views inside one React tree; switching never reloads the page.
  const [screen, setScreen] = useState<Screen>('home');
  // Game state lives here so it survives switching screens.
  const game = useGame();

  const navigate = (next: Screen) => {
    // Leaving home pauses an active game; it resumes only via "המשך משחק".
    if (next === 'about') game.pause();
    setScreen(next);
  };

  return (
    <AppShell title={screen === 'home' ? 'סיימון' : 'אודות'} screen={screen} onNavigate={navigate}>
      {screen === 'home' ? (
        <HomeScreen
          game={game.state}
          displayRound={game.displayRound}
          showResult={game.showResult}
          litColor={game.litColor}
          audioError={game.audioError}
          onStart={game.start}
          onResume={game.resume}
          onPressStart={game.pressStart}
          onPressEnd={game.pressEnd}
        />
      ) : (
        <AboutScreen />
      )}
    </AppShell>
  );
}
