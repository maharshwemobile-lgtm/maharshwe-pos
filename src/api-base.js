// Routes the bundled POS app's relative `/api` calls to the hosted backend
// when the app runs as a native (Capacitor) APK. On the web (dev/preview) the
// Vite proxy / same-origin server keeps handling `/api`, so we leave it alone.

const BACKEND_URL = (import.meta.env.VITE_API_BASE || 'https://app.maharshwe.shop').replace(/\/+$/, '');

function isNativeRuntime() {
  if (typeof window === 'undefined') return false;
  try {
    if (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function') {
      return window.Capacitor.isNativePlatform();
    }
  } catch (_) {}
  const { protocol, hostname, port } = window.location;
  // Capacitor Android serves the bundled app from https://localhost (no port).
  return protocol === 'capacitor:' || protocol === 'file:' || (protocol === 'https:' && hostname === 'localhost' && !port);
}

function toBackend(url) {
  if (typeof url !== 'string') return url;
  if (url.startsWith('/api') || url.startsWith('/pos/api')) {
    return BACKEND_URL + url;
  }
  return url;
}

if (typeof window !== 'undefined' && isNativeRuntime() && !window.__MS_FETCH_PATCHED__) {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    try {
      if (typeof input === 'string') {
        input = toBackend(input);
      } else if (input && typeof input.url === 'string' && (input.url.startsWith('/api') || input.url.startsWith('/pos/api'))) {
        input = new Request(toBackend(input.url), input);
      }
    } catch (_) {}
    return originalFetch(input, init);
  };
  window.__MS_FETCH_PATCHED__ = true;
  console.log('[v0] Native runtime detected, API calls routed to', BACKEND_URL);
}

export { BACKEND_URL };
