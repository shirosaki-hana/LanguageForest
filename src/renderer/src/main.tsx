import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n';
import { ThemedApp } from './ThemedApp';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemedApp />
  </StrictMode>
);
