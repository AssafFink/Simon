import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource/heebo/400.css';
import '@fontsource/heebo/600.css';
import '@fontsource/heebo/700.css';
import './styles/tokens.css';
import './styles/global.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Offline support. No onNeedRefresh handler: updates apply on the next full launch, never mid-game.
registerSW({ immediate: true });
