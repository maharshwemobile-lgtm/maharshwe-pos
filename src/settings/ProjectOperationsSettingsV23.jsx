import React, { useState } from 'react';
import { CreditCard, Gauge, Globe2, Percent, Tags, WalletCards } from 'lucide-react';
import FinanceCatalogSettingsV23 from '../FinanceCatalogSettingsV23.jsx';
import MoneyServiceFeeSettingsV23 from '../MoneyServiceFeeSettingsV23.jsx';
import GoogleSheetIntegrationSettingsV23 from './GoogleSheetIntegrationSettingsV23.jsx';
import './project-operations-v23.css';

const TABS = [
  { id: 'overview', label: 'Overview', icon: Gauge },
  { id: 'payments', label: 'POS Payment Types', icon: WalletCards },
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
    <nav className="project-operations-tabs" aria-label="PostgreSQL linked settings tabs">
      {TABS.map((item) => <button key={item.id} type="button" className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}><item.icon size={17}/><span>{item.label}</span></button>)}
    </nav>

    <div className="project-operations-active-title"><active.icon size={20}/><span><b>{active.label}</b><small>{tab === 'overview' ? 'POS, Finance, Money Service နဲ့ Google Sheet ကို PostgreSQL master settings တစ်နေရာတည်းက စီမံပါ။' : tab === 'payments' ? 'Active ဖြစ်သော Payment Type များကို Sale POS မှာချက်ချင်းရွေးနိုင်ပြီး Sale record ထဲ Method ID/Code/Name snapshot သိမ်းပါမယ်။' : 'ဒီ tab နှင့်သက်ဆိုင်သော setting များသာပြထားသည်။'}</small></span></div>

    {tab === 'overview' ? <div className="project-operations-overview-grid">
      <OverviewCard icon={CreditCard} title="POS Payment Types & Wallets" text="Cash, KBZ Pay, Wave Pay နဲ့ စိတ်ကြိုက် Wallet များကို Add, Rename, Enable/Disable လုပ်ရန်" onOpen={() => setTab('payments')}/>
      <OverviewCard icon={Percent} title="Money Service Fees" text="Money Service On ဖြစ်သော Wallet တစ်ခုချင်းစီအတွက် Transfer / Cash Out fee" onOpen={() => setTab('fees')}/>
      <OverviewCard icon={Tags} title="Income & Expense Categories" text="Business forms မှာပြန်ရွေးမည့် master categories" onOpen={() => setTab('categories')}/>
      <OverviewCard icon={Globe2} title="Google Sheet Integration" text="Web App URL, Shared Secret, Test နဲ့ Retry—ဒီတစ်နေရာတည်း" onOpen={() => setTab('google')}/>
    </div> : null}

    {tab === 'payments' ? <FinanceCatalogSettingsV23 mode="payments"/> : null}
    {tab === 'fees' ? <MoneyServiceFeeSettingsV23/> : null}
    {tab === 'categories' ? <FinanceCatalogSettingsV23 mode="categories"/> : null}
    {tab === 'google' ? <GoogleSheetIntegrationSettingsV23/> : null}
  </section>;
}
