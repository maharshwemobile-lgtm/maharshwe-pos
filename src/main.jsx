import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './pos/pos-minimal-overrides.css';
import './typography-v20.css';
import AppFull from './AppFull.jsx';
import AppErrorBoundary from './AppErrorBoundary.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <AppFull />
    </AppErrorBoundary>
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = new URL('sw-v4.js?v=20-unified-typography-20260618', window.location.href);
    navigator.serviceWorker.register(swUrl, { updateViaCache: 'none' }).then((registration) => {
      registration.update().catch(() => {});
    }).catch((error) => {
      console.warn('Service worker registration failed:', error);
    });
  });
}
