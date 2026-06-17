import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './pos/pos-minimal-overrides.css';
import AppFull from './AppFull.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppFull />
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = new URL('sw-v4.js?v=11-project-settings-20260617', window.location.href);
    navigator.serviceWorker.register(swUrl, { updateViaCache: 'none' }).then((registration) => {
      registration.update().catch(() => {});
    }).catch((error) => {
      console.warn('Service worker registration failed:', error);
    });
  });
}
