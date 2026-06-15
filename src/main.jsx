import React, { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './pos/pos-minimal-overrides.css';
import App from './App.jsx';
import SalesHistory from './SalesHistory.jsx';
import ServicePreview from './ServicePreview.jsx';
import ProductManager from './ProductManager.jsx';

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

function money(value) {
  return Number(value || 0).toLocaleString('en-US') + ' ကျပ်';
}

function Bridge() {
  const mountedType = useRef('');
  const rootRef = useRef(null);

  useEffect(() => {
    let lastDashboardFetch = 0;

    const unmount = () => {
      if (mountedType.current) {
        rootRef.current?.unmount();
        rootRef.current = null;
        mountedType.current = '';
      }
    };

    const mountPage = (content, className, type, Component) => {
      if (mountedType.current === type) return;
      unmount();
      content.replaceChildren();
      const host = document.createElement('div');
      host.className = className;
      content.appendChild(host);
      rootRef.current = createRoot(host);
      rootRef.current.render(<Component />);
      mountedType.current = type;
    };

    const tuneDashboard = async () => {
      const pageTitle = document.querySelector('header h1')?.textContent?.trim();
      if (pageTitle !== 'Dashboard') return;
      const now = Date.now();
      if (now - lastDashboardFetch < 1000) return;
      lastDashboardFetch = now;

      try {
        const response = await fetch('/api/dashboard');
        const json = await response.json();
        if (!json.ok) return;
        const d = json.dashboard || {};

        const valueMap = {
          'ယနေ့ စုစုပေါင်းဝင်ငွေ': d.todayTotalIncome,
          'ယနေ့ ပစ္စည်းရောင်းဝင်ငွေ': d.todaySaleIncome,
          'ယနေ့ အမြတ်': d.todayProfit,
          'ယနေ့ အထွက်': d.todayExpense,
          'Receivable / Customer Debt': d.receivable,
          'Payable / Supplier Debt': d.payable,
          'ငွေအကောင့်လက်ကျန်': d.accountBalance,
          'ပစ္စည်းလက်ကျန်': d.stockBalance
        };

        document.querySelectorAll('.stat').forEach((card) => {
          const title = card.querySelector('p')?.textContent?.trim();
          const value = card.querySelector('h2');
          if (value && Object.prototype.hasOwnProperty.call(valueMap, title)) value.textContent = money(valueMap[title]);
        });

        const cards = [...document.querySelectorAll('.card')];
        const salesCard = cards.find((card) => card.querySelector('h3')?.textContent?.includes('Sales Overview'));
        if (!salesCard) return;
        const title = salesCard.querySelector('h3');
        if (title) title.textContent = 'Sales Overview - Last 7 Days';
        const btn = salesCard.querySelector('.cardHead button');
        if (btn) btn.textContent = 'Last 7 Days';
        const labels = salesCard.querySelectorAll('.miniStats span');
        const orders = Number(d.last7DaysOrders || 0);
        const sales = Number(d.last7DaysSales || 0);
        if (labels[0]) labels[0].innerHTML = `7 Days Sales <b>${money(sales)}</b>`;
        if (labels[1]) labels[1].innerHTML = `7 Days Orders <b>${orders}</b>`;
        if (labels[2]) labels[2].innerHTML = `Average Order <b>${money(orders ? sales / orders : 0)}</b>`;
      } catch {
        // API may still be starting.
      }
    };

    const renderPage = () => {
      const pageTitle = document.querySelector('header h1')?.textContent?.trim();
      const content = document.querySelector('.content');
      if (!content) {
        unmount();
        return;
      }

      tuneDashboard();

      if (pageTitle === 'Sales History') {
        mountPage(content, 'sales-history-host', 'history', SalesHistory);
        return;
      }

      if (pageTitle === 'Products' || pageTitle === 'Stock') {
        mountPage(content, 'product-manager-host', 'products', ProductManager);
        return;
      }

      if (pageTitle === ('Rep' + 'airs')) {
        mountPage(content, 'service-preview-host', 'service', ServicePreview);
        return;
      }

      unmount();
    };

    renderPage();
    const timer = window.setInterval(renderPage, 120);
    return () => {
      window.clearInterval(timer);
      unmount();
    };
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
    const swUrl = new URL(`${base.replace(/\/?$/, '/')}sw-v4.js`, window.location.href);
    navigator.serviceWorker.register(swUrl).catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
}
