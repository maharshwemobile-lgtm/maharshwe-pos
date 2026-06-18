import React from 'react';
import { Link2, Settings2 } from 'lucide-react';
import FinanceCatalogSettingsV23 from '../FinanceCatalogSettingsV23.jsx';
import MoneyServiceFeeSettingsV23 from '../MoneyServiceFeeSettingsV23.jsx';
import GoogleSheetIntegrationSettingsV23 from './GoogleSheetIntegrationSettingsV23.jsx';
import './project-operations-v23.css';

export default function ProjectOperationsSettingsV23() {
  return <section className="project-operations-settings-v23">
    <header className="project-operations-heading">
      <div><Settings2 size={25}/><span><small>PROJECT SETTINGS · CENTRAL CONFIGURATION</small><h2>Payments, Categories & Integrations</h2><p>Wallet တစ်ခုထည့်တာနဲ့ Sale POS, Money Service Fees, Accounts နဲ့ Transaction History အားလုံး same record ကိုအသုံးပြုမယ်။ Categories နဲ့ Google Sheet webhook ကိုလည်း ဒီနေရာမှာပဲ admin က configure လုပ်မယ်။</p></span></div>
      <div className="project-operations-link-badge"><Link2 size={17}/> One Master Data</div>
    </header>

    <div className="project-operations-stack">
      <FinanceCatalogSettingsV23 />
      <MoneyServiceFeeSettingsV23 />
      <GoogleSheetIntegrationSettingsV23 />
    </div>
  </section>;
}
