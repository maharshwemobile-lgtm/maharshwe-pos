import React, { useState } from 'react';
import { CreditCard, Gauge, Globe2, Percent, Tags, WalletCards } from 'lucide-react';
import FinanceCatalogSettingsV23 from '../FinanceCatalogSettingsV23.jsx';
import MoneyServiceFeeSettingsV23 from '../MoneyServiceFeeSettingsV23.jsx';
import GoogleSheetIntegrationSettingsV23 from './GoogleSheetIntegrationSettingsV23.jsx';
import './project-operations-v23.css';

const TABS = [
  { id: 'overview', label: 'Overview', icon: Gauge },
  { id: 'payments', label: 'Wallet Links', icon: WalletCards },
  { id: 'fees', label: 'Cash In / Out Fees', icon: Percent },
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

    <div className="project-operations-active-title"><active.icon size={20}/><span><b>{active.label}</b><small>{tab === 'overview' ? 'PostgreSQL linked modules overview. Open a card to configure only that module.' : 'This tab changes only the selected setting area.'}</small></span></div>

    {tab === 'overview' ? <>
      <div className="project-cash-flow-note">
        <CreditCard size={21}/>
        <div>
          <b>Cash In / Cash Out is separated from other Finance screens.</b>
          <small>Use Wallet Links to decide which wallet appears in Money Service. Existing Finance & Accounts pages are not changed by this layout.</small>
        </div>
      </div>
      <div className="project-operations-overview-grid">
        <OverviewCard icon={CreditCard} title="Wallet Links" text="Wallet master list for POS payments and Cash In / Cash Out availability." onOpen={() => setTab('payments')}/>
        <OverviewCard icon={Percent} title="Cash In / Out Fees" text="Fee percentages for wallets that are enabled for Money Service." onOpen={() => setTab('fees')}/>
        <OverviewCard icon={Tags} title="Income & Expense Categories" text="Master categories used by business forms only." onOpen={() => setTab('categories')}/>
        <OverviewCard icon={Globe2} title="Google Sheet Integration" text="Web App URL, Shared Secret, Test and Retry settings." onOpen={() => setTab('google')}/>
      </div>
    </> : null}

    {tab === 'payments' ? <FinanceCatalogSettingsV23 mode="payments"/> : null}
    {tab === 'fees' ? <MoneyServiceFeeSettingsV23/> : null}
    {tab === 'categories' ? <FinanceCatalogSettingsV23 mode="categories"/> : null}
    {tab === 'google' ? <GoogleSheetIntegrationSettingsV23/> : null}
  </section>;
}
