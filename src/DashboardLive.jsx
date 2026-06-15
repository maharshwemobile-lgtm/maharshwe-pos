import React, { useEffect, useState } from 'react';
import { BarChart3, Box, CreditCard, ShoppingCart, TrendingUp, Truck, Users, Wallet } from 'lucide-react';
import { apiFetch } from './phase2Api';

const money = (value) => Number(value || 0).toLocaleString('en-US') + ' ကျပ်';

function Stat({ icon: Icon, title, value, sub, tone }) {
  return <div className="stat"><div className={`statIcon ${tone}`}><Icon size={32} /></div><div><p>{title}</p><h2>{money(value)}</h2><small>{sub}</small></div></div>;
}

export default function DashboardLive({ onNavigate }) {
  const [dashboard, setDashboard] = useState({});
  const [products, setProducts] = useState([]);
  const [message, setMessage] = useState('');

  const load = async () => {
    try {
      const [dashboardData, productData] = await Promise.all([
        apiFetch('/api/dashboard'),
        apiFetch('/api/products'),
      ]);
      setDashboard(dashboardData.dashboard || {});
      setProducts(productData.products || []);
      setMessage('');
    } catch (error) {
      setMessage(error.message || 'Server connection failed');
    }
  };

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 10000);
    return () => window.clearInterval(timer);
  }, []);

  const stats = [
    { icon: Wallet, title: 'ယနေ့ စုစုပေါင်းဝင်ငွေ', value: dashboard.todayTotalIncome, sub: 'Total income today', tone: 'green' },
    { icon: ShoppingCart, title: 'ယနေ့ ပစ္စည်းရောင်းဝင်ငွေ', value: dashboard.todaySaleIncome, sub: 'Product sale income', tone: 'blue' },
    { icon: TrendingUp, title: 'ယနေ့ အမြတ်', value: dashboard.todayProfit, sub: 'Today profit', tone: 'green' },
    { icon: CreditCard, title: 'ယနေ့ အထွက်', value: dashboard.todayExpense, sub: 'Today expense', tone: 'red' },
    { icon: Users, title: 'Receivable / Customer Debt', value: dashboard.receivable, sub: 'Customer debt to receive', tone: 'orange' },
    { icon: Truck, title: 'Payable / Supplier Debt', value: dashboard.payable, sub: 'Supplier debt to pay', tone: 'red' },
    { icon: Wallet, title: 'ငွေအကောင့်လက်ကျန်', value: dashboard.accountBalance, sub: 'Cash / account balance', tone: 'blue' },
    { icon: Box, title: 'ပစ္စည်းလက်ကျန်', value: dashboard.stockBalance, sub: 'Inventory stock balance', tone: 'orange' },
  ];

  const topProducts = [...products].sort((a, b) => Number(b.stockQty || 0) - Number(a.stockQty || 0)).slice(0, 5);
  const orders = Number(dashboard.last7DaysOrders || 0);
  const sales = Number(dashboard.last7DaysSales || 0);

  return <>
    {message && <div className="card" style={{ marginBottom: 16, color: '#b91c1c', fontWeight: 800 }}>Server: {message}</div>}
    <section className="stats">{stats.map((item) => <Stat key={item.title} {...item} />)}</section>
    <section className="grid2">
      <div className="card">
        <div className="cardHead"><h3>Sales Overview - Last 7 Days</h3><button type="button" onClick={load}>Refresh</button></div>
        <div className="chart">{[18, 42, 32, 58, 82, 62, 100].map((height, index) => <i key={index} style={{ height: `${height}%` }}><b /></i>)}</div>
        <div className="miniStats"><span>7 Days Sales <b>{money(sales)}</b></span><span>7 Days Orders <b>{orders}</b></span><span>Average Order <b>{money(orders ? sales / orders : 0)}</b></span></div>
      </div>
      <div className="card">
        <div className="cardHead"><h3>Stock Overview</h3><button type="button" onClick={() => onNavigate('Products')}>View all</button></div>
        {topProducts.map((product, index) => <div className="productRow" key={product.id}><b>{index + 1}</b><div className="thumb">▥</div><span>{product.brand} {product.model}<small>Stock {product.stockQty}</small></span><strong>{money(product.sellingPrice)}</strong></div>)}
        {!topProducts.length && <p>No product data yet.</p>}
      </div>
    </section>
    <section className="quick">
      {[
        ['New Sale', ShoppingCart, 'Sale POS'],
        ['Products', Box, 'Products'],
        ['Repairs', Truck, 'Repairs'],
        ['History', BarChart3, 'Sales History'],
        ['Reports', TrendingUp, 'Reports'],
      ].map(([title, Icon, page]) => <button type="button" className="quickCard" key={title} onClick={() => onNavigate(page)}><Icon size={24} /><b>{title}</b><span>Open {title}</span></button>)}
    </section>
  </>;
}
