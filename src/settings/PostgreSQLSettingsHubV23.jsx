import React, { useEffect, useState } from 'react';
import { CheckCircle2, Database, RefreshCw, Settings2, ShieldCheck } from 'lucide-react';
import { apiFetch, clearSession } from '../phase2Api';
import ProjectOperationsSettingsV23 from './ProjectOperationsSettingsV23.jsx';
import PostgreSQLTechnicalDefaultsV23 from './PostgreSQLTechnicalDefaultsV23.jsx';
import './postgresql-settings-hub-v23.css';

export default function PostgreSQLSettingsHubV23() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    setMessage('');
    try {
      setData(await apiFetch('/api/project-settings/postgresql/overview'));
    } catch (error) {
      if (error?.status === 401) {
        clearSession();
        window.location.reload();
        return;
      }
      setMessage(error?.message || 'PostgreSQL settings load failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  const db = data?.database || {};

  return <section className="postgresql-settings-hub-v23">
    <header className="postgresql-hub-heading">
      <div><Database size={27}/><span><small>PROJECT SETTINGS · POSTGRESQL TECHNOLOGY</small><h2>PostgreSQL Settings</h2><p>Payment Types, Wallet Accounts, Sale Payments, Money Service Fees, Categories, Google Sheet Integration နဲ့ technical defaults အားလုံး ဒီ master records ကိုပဲ အသုံးပြုမယ်။</p></span></div>
      <button type="button" onClick={load} disabled={loading}><RefreshCw className={loading ? 'postgresql-hub-spin' : ''} size={17}/> Refresh All</button>
    </header>
    {message ? <div className="postgresql-hub-message">{message}</div> : null}
    <div className="postgresql-hub-status">
      <article><Database size={22}/><span><small>Database</small><b>{db.provider || 'PostgreSQL'}</b></span></article>
      <article><CheckCircle2 size={22}/><span><small>Connection</small><b>{db.connected ? 'Connected' : loading ? 'Checking…' : 'Offline'}</b></span></article>
      <article><ShieldCheck size={22}/><span><small>Tenant Scope</small><b>{db.tenantScoped ? 'Protected' : 'Check Required'}</b></span></article>
      <article><Settings2 size={22}/><span><small>Shop</small><b>{db.shopSlug || data?.business?.slug || '-'}</b></span></article>
    </div>
    <ProjectOperationsSettingsV23/>
    <PostgreSQLTechnicalDefaultsV23 initial={data?.system} canManage={data?.canManage === true} onSaved={load}/>
  </section>;
}
