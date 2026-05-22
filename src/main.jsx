import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App.jsx';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('App crashed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900 border border-red-800 rounded-2xl p-6 text-center space-y-3">
            <h1 className="text-xl font-extrabold text-red-300">App error ဖြစ်သွားပါတယ်</h1>
            <p className="text-sm text-slate-300">စာမျက်နှာကို refresh လုပ်ပြီး ပြန်ဝင်ပါ။ Data ကို server ဘက်မှာ သိမ်းထားပါတယ်။</p>
            <button onClick={() => window.location.reload()} className="bg-amber-500 text-slate-950 font-bold px-4 py-2 rounded-lg text-sm">Refresh</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const base = import.meta.env.BASE_URL || './';
    const swUrl = new URL(`${base.replace(/\/?$/, '/')}sw.js`, window.location.href);
    navigator.serviceWorker.register(swUrl).catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
}
