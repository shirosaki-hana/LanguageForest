import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n'; // i18n 초기화
import { ThemedApp } from './ThemedApp';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemedApp />
  </StrictMode>
);
