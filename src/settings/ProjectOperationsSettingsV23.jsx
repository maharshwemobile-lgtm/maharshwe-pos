import React, { useState } from 'react';
import { CreditCard, Gauge, Globe2, Link2, Percent, Settings2, Tags, WalletCards } from 'lucide-react';
import FinanceCatalogSettingsV23 from '../FinanceCatalogSettingsV23.jsx';
import MoneyServiceFeeSettingsV23 from '../MoneyServiceFeeSettingsV23.jsx';
import GoogleSheetIntegrationSettingsV23 from './GoogleSheetIntegrationSettingsV23.jsx';
import './project-operations-v23.css';

const TABS = [
  { id: 'overview', label: 'Overview', icon: Gauge },
  { id: 'payments', label: 'Payments & Wallets', icon: WalletCards },
  { id: 'fees', label: 'Money Service Fees', icon: Percent },
  { id: 'categories', label: 'Categories', icon: Tags },
  { id: 'google', label: 'Google Sheet', icon: Globe2 },
];

function OverviewCard({ icon: Icon, title, text, onOpen }) {
  return <button type="button" className="project-operations-overview-card" onClick={onOpen}>
    <span className="project-operations-overview-icon"><Icon size={22}/></span>
    <span><b>{title}</b><small>{text}</small></span>
    <strong>Configure</strong>
  </button>;
}

export default function ProjectOperationsSettingsV23() {
  const [tab, setTab] = useState('overview');
  const active = TABS.find((item) => item.id === tab) || TABS[0];

  return <section className="project-operations-settings-v23">
    <header className="project-operations-heading">
      <div><Settings2 size={25}/><span><small>PROJECT SETTINGS · CENTRAL CONFIGURATION</small><h2>Payments, Categories & Integrations</h2><p>အကုန်တစ်မျက်နှာတည်းမပြတော့ပါ။ လိုသည့် tab ကိုနှိပ်မှ configure form ပေါ်မယ်။ Wallet master တစ်ခုတည်းကို Sale POS, Money Service နဲ့ Accounts အားလုံးသုံးမယ်။</p></span></div>
      <div className="project-operations-link-badge"><Link2 size={17}/> One Master Data</div>
    </header>

    <nav className="project-operations-tabs" aria-label="Central configuration tabs">
      {TABS.map((item) => <button key={item.id} type="button" className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}><item.icon size={17}/><span>{item.label}</span></button>)}
    </nav>

    <div className="project-operations-active-title"><active.icon size={20}/><span><b>{active.label}</b><small>{tab === 'overview' ? 'အကျဉ်းချုပ်သာပြထားသည်။ Configure နှိပ်မှ form ပေါ်မယ်။' : 'ဒီ tab နှင့်သက်ဆိုင်သော setting များသာပြထားသည်။'}</small></span></div>

    {tab === 'overview' ? <div className="project-operations-overview-grid">
      <OverviewCard icon={CreditCard} title="Payments & Wallets" text="Sale POS, Accounts နဲ့ Money Service link ချိတ်ထားသော Wallet master list" onOpen={() => setTab('payments')}/>
      <OverviewCard icon={Percent} title="Money Service Fees" text="Money Service On ဖြစ်သော Wallet တစ်ခုချင်းစီအတွက် Transfer / Cash Out fee" onOpen={() => setTab('fees')}/>
      <OverviewCard icon={Tags} title="Income & Expense Categories" text="Business forms မှာပြန်ရွေးမည့် master categories" onOpen={() => setTab('categories')}/>
      <OverviewCard icon={Globe2} title="Google Sheet Integration" text="Web App URL, Shared Secret, Test နဲ့ Retry" onOpen={() => setTab('google')}/>
    </div> : null}

    {tab === 'payments' ? <FinanceCatalogSettingsV23 mode="payments"/> : null}
    {tab === 'fees' ? <MoneyServiceFeeSettingsV23/> : null}
    {tab === 'categories' ? <FinanceCatalogSettingsV23 mode="categories"/> : null}
    {tab === 'google' ? <GoogleSheetIntegrationSettingsV23/> : null}
  </section>;
}
