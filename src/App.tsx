import { useEffect, useRef, useState } from 'react';
import AppShell from './components/AppShell.tsx';
import HomeScreen from './components/HomeScreen.tsx';
import AboutScreen from './components/AboutScreen.tsx';
import type { Screen } from './components/BottomNav.tsx';
import { useGame } from './game/useGame.ts';
import { useHistory } from './history/useHistory.ts';
import { createResultId } from './history/historyStorage.ts';

export default function App() {
  // Screens are views inside one React tree; switching never reloads the page.
  const [screen, setScreen] = useState<Screen>('home');
  // Game state lives here so it survives switching screens.
  const game = useGame();
  const history = useHistory();
  const { record } = history;

  // Records each finished game exactly once: the gameId guard holds across
  // re-renders, screen switches and Strict Mode's doubled effects.
  const recordedGameRef = useRef(0);
  const { status, gameId, completedRounds } = game.state;
  useEffect(() => {
    if ((status !== 'won' && status !== 'lost') || recordedGameRef.current === gameId) return;
    recordedGameRef.current = gameId;
    record({
      id: createResultId(),
      finishedAt: new Date().toISOString(),
      completedRounds,
      outcome: status === 'won' ? 'win' : 'loss',
    });
  }, [status, gameId, completedRounds, record]);

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
          saveError={history.saveError}
          onStart={game.start}
          onResume={game.resume}
          onDismiss={game.dismiss}
          onPressStart={game.pressStart}
          onPressEnd={game.pressEnd}
        />
      ) : (
        <AboutScreen
          results={history.results}
          loadError={history.loadError}
          clearError={history.clearError}
          onClear={history.clear}
        />
      )}
    </AppShell>
  );
}
