import React from 'react';
import { createRoot } from 'react-dom/client';
import AppSecure from './AppSecure.jsx';
import AppErrorBoundary from './AppErrorBoundary.jsx';
import './styles.css';
import './pos/pos-minimal-overrides.css';
import './project-runtime-theme.css';

async function clearLegacyRuntime() {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => /maharshwe-pos|phase9|phase10|phase11/i.test(key)).map((key) => caches.delete(key)));
    }
  } catch (error) {
    console.warn('Legacy runtime cleanup failed:', error);
  }
}

function renderApp() {
  const bootStatus = document.getElementById('app-boot-status');
  if (bootStatus) bootStatus.remove();
  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <AppErrorBoundary>
        <AppSecure />
      </AppErrorBoundary>
    </React.StrictMode>
  );
}

window.addEventListener('error', (event) => {
  console.error('Mahar POS window error:', event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Mahar POS unhandled promise rejection:', event.reason);
});

clearLegacyRuntime().finally(renderApp);
