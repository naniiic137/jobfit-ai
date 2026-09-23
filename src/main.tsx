import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
// Fonts are bundled with the app (no request to Google Fonts: no third-party tracking).
import '@fontsource-variable/inter';
import '@fontsource-variable/space-grotesk';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
