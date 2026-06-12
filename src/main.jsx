import React, { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App.jsx';
import SalesHistory from './SalesHistory.jsx';
import ServicePreview from './ServicePreview.jsx';

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

function Bridge() {
  const mountedType = useRef('');
  const rootRef = useRef(null);

  useEffect(() => {
    const unmount = () => {
      if (mountedType.current) {
        rootRef.current?.unmount();
        rootRef.current = null;
        mountedType.current = '';
      }
    };

    const tuneDashboard = () => {
      const pageTitle = document.querySelector('header h1')?.textContent?.trim();
      if (pageTitle !== 'Dashboard') return;
      const cards = [...document.querySelectorAll('.card')];
      const salesCard = cards.find((card) => card.querySelector('h3')?.textContent?.includes('Sales Overview'));
      if (!salesCard || salesCard.dataset.weekOnly === 'yes') return;
      salesCard.dataset.weekOnly = 'yes';
      const title = salesCard.querySelector('h3');
      if (title) title.textContent = 'Sales Overview - Last 7 Days';
      const btn = salesCard.querySelector('.cardHead button');
      if (btn) btn.textContent = 'Last 7 Days';
      const labels = salesCard.querySelectorAll('.miniStats span');
      if (labels[0]) labels[0].innerHTML = '7 Days Sales <b>701,000 MMK</b>';
      if (labels[1]) labels[1].innerHTML = '7 Days Orders <b>10</b>';
      if (labels[2]) labels[2].innerHTML = 'Average Order <b>70,100 MMK</b>';
    };

    const renderPage = () => {
      const pageTitle = document.querySelector('header h1')?.textContent?.trim();
      const content = document.querySelector('.content');
      if (!content) return;

      tuneDashboard();

      if (pageTitle === 'Sales History') {
        if (mountedType.current === 'history') return;
        unmount();
        content.replaceChildren();
        const host = document.createElement('div');
        host.className = 'sales-history-host';
        content.appendChild(host);
        rootRef.current = createRoot(host);
        rootRef.current.render(<SalesHistory />);
        mountedType.current = 'history';
        return;
      }

      if (pageTitle === ('Rep' + 'airs')) {
        if (mountedType.current === 'service') return;
        unmount();
        content.replaceChildren();
        const host = document.createElement('div');
        host.className = 'service-preview-host';
        content.appendChild(host);
        rootRef.current = createRoot(host);
        rootRef.current.render(<ServicePreview />);
        mountedType.current = 'service';
        return;
      }

      unmount();
    };

    renderPage();
    const timer = window.setInterval(renderPage, 120);
    return () => window.clearInterval(timer);
  }, []);

  return null;
}

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
    <Bridge />
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
