import React, { useEffect, useState } from 'react';
import { Loader2, Percent, Plus, Save, WalletCards } from 'lucide-react';
import { apiFetch, getSession } from './phase2Api';
import './finance-catalog-settings-v23.css';
import './money-service-rate-panel.css';

const PAYMENT_EVENT = 'mahar:payment-methods-changed';
const EMPTY_WALLET = { name: '', code: '', kind: 'WALLET', openingBalance: '', supportsMoneyService: true };

export default function MoneyServiceFeeSettingsV23() {
  const session = getSession();
  const canManage = ['SUPER_ADMIN', 'SHOP_ADMIN'].includes(session?.user?.role || '') || session?.user?.permissions?.settings === true;
  const [methods, setMethods] = useState([]);
  const [draft, setDraft] = useState({ minimumFee: 0, roundTo: 100 });
  const [showWalletForm, setShowWalletForm] = useState(false);
  const [wallet, setWallet] = useState(EMPTY_WALLET);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    const response = await apiFetch('/api/money-service/settings');
    setMethods((response.paymentMethods || []).filter((row) => row.active !== false && row.supportsMoneyService !== false));
    setDraft({ ...(response.rates || {}), minimumFee: Number(response.rates?.minimumFee || 0), roundTo: Number(response.rates?.roundTo || 100) });
  };

  useEffect(() => {
    const refresh = () => load().catch((error) => setMessage(error.message));
    refresh();
    window.addEventListener(PAYMENT_EVENT, refresh);
    return () => window.removeEventListener(PAYMENT_EVENT, refresh);
  }, []);

  const change = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const addWallet = async (event) => {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const code = String(wallet.code || '').trim().toUpperCase().replace(/\s+/g, '_');
      await apiFetch('/api/finance/settings/payment-methods', {
        method: 'POST',
        body: { ...wallet, code, openingBalance: Number(wallet.openingBalance || 0), supportsMoneyService: true },
      });
      setWallet(EMPTY_WALLET);
      setShowWalletForm(false);
      setMessage('New wallet added. Set Cash In / Cash Out fee below.');
      window.dispatchEvent(new CustomEvent(PAYMENT_EVENT));
      await load();
    } catch (error) { setMessage(error.message || 'Wallet add failed'); }
    finally { setBusy(false); }
  };
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const rates = {};
      methods.forEach((row) => {
        rates[`${row.code}_TRANSFER`] = Number(draft[`${row.code}_TRANSFER`] || 0);
        rates[`${row.code}_CASH_OUT`] = Number(draft[`${row.code}_CASH_OUT`] || 0);
      });
      await apiFetch('/api/money-service/settings/rates', { method: 'PUT', body: { rates, minimumFee: Number(draft.minimumFee || 0), roundTo: Number(draft.roundTo || 100) } });
      setMessage('Cash In / Cash Out fee settings saved'); await load();
    } catch (error) { setMessage(error.message || 'Fee settings save failed'); }
    finally { setBusy(false); }
  };

  if (!canManage) return null;
  return <section className="finance-catalog-section open">
    <div className="finance-catalog-section-head"><span><Percent size={20}/><b>Cash In / Cash Out Fees</b><small>Only wallets enabled in Wallet Links appear here. Existing rate keys stay compatible with the backend.</small></span></div>
    <div className="finance-catalog-section-body">
      {message ? <div className="finance-catalog-message">{message}</div> : null}
      <div className="finance-pos-accept-note">
        <b>Fee mapping</b>
        <small>Cash In uses the existing TRANSFER rate. Cash Out uses the existing CASH_OUT rate. No other Finance settings are changed.</small>
      </div>
      <div className="finance-config-toolbar">
        <div><b>{methods.length} Money Service wallets</b><small>Add a wallet here, then set Cash In / Cash Out fees below.</small></div>
        <button type="button" onClick={() => setShowWalletForm((value) => !value)}><Plus size={16}/> {showWalletForm ? 'Close Form' : 'Add Wallet'}</button>
      </div>
      {showWalletForm ? <form className="finance-wallet-form" onSubmit={addWallet}>
        <label><span>Wallet Name</span><input required value={wallet.name} onChange={(event) => setWallet({ ...wallet, name: event.target.value })} placeholder="Wave Pay"/></label>
        <label><span>Code</span><input required value={wallet.code} onChange={(event) => setWallet({ ...wallet, code: event.target.value })} placeholder="WAVE_PAY"/></label>
        <label><span>Type</span><select value={wallet.kind} onChange={(event) => setWallet({ ...wallet, kind: event.target.value })}><option value="WALLET">Wallet</option><option value="BANK">Bank</option><option value="OTHER">Other</option></select></label>
        <label><span>Opening Balance</span><input type="number" min="0" value={wallet.openingBalance} onChange={(event) => setWallet({ ...wallet, openingBalance: event.target.value })} placeholder="0"/></label>
        <label className="finance-wallet-check"><input type="checkbox" checked readOnly/><span>Use in Cash In / Cash Out</span></label>
        <button disabled={busy}>{busy ? <Loader2 className="finance-catalog-spin" size={17}/> : <WalletCards size={17}/>} Add Wallet</button>
      </form> : null}
      <form className="finance-fee-settings" onSubmit={save}>
        <div className="finance-fee-global"><label><span>Minimum Fee</span><input type="number" min="0" value={draft.minimumFee ?? 0} onChange={(event) => change('minimumFee', event.target.value)}/></label><label><span>Round Up To</span><input type="number" min="1" value={draft.roundTo ?? 100} onChange={(event) => change('roundTo', event.target.value)}/></label></div>
        <div className="finance-fee-list">{methods.map((row) => <article key={row.id}><div><b>{row.name}</b><small>{row.code}</small></div><label><span>Cash In %</span><input type="number" min="0" max="100" step="0.01" value={draft[`${row.code}_TRANSFER`] ?? 0} onChange={(event) => change(`${row.code}_TRANSFER`, event.target.value)}/></label><label><span>Cash Out %</span><input type="number" min="0" max="100" step="0.01" value={draft[`${row.code}_CASH_OUT`] ?? 0} onChange={(event) => change(`${row.code}_CASH_OUT`, event.target.value)}/></label></article>)}</div>
        <button className="finance-fee-save" disabled={busy}>{busy ? <Loader2 className="finance-catalog-spin" size={17}/> : <Save size={17}/>} Save Fee Settings</button>
      </form>
    </div>
  </section>;
}
