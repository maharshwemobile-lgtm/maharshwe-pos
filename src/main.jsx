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
    const base = import.meta.env.BASE_URL || './';
    const swUrl = new URL(`${base.replace(/\/?$/, '/')}sw-v4.js?phase=3-payments`, window.location.href);
    navigator.serviceWorker.register(swUrl).catch((error) => {
      console.warn('Service worker registration failed:', error);
    });
  });
}
