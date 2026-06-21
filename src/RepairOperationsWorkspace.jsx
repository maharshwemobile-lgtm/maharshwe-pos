import React, { useEffect, useMemo, useState } from 'react';
import {
  Calculator,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
  Wrench,
} from 'lucide-react';
import RepairPlatformPage from './RepairPlatformPage.jsx';
import RepairSummaryBelowFinance from './RepairSummaryBelowFinance.jsx';
import { apiFetch, clearSession } from './phase2Api';
import './repair-operations-workspace.css';

const money = (value) => `${Number(value || 0).toLocaleString('en-US')} MMK`;

function weekLabel(start, end) {
  if (!start || !end) return 'Current week';
  const format = (value) => new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(new Date(value));
  return `${format(start)} – ${format(new Date(new Date(end).getTime() - 1))}`;
}

export default function RepairOperationsWorkspace() {
  const [weekly, setWeekly] = useState(null);
  const [loadingWeekly, setLoadingWeekly] = useState(false);
  const [repairNumber, setRepairNumber] = useState('');
  const [finance, setFinance] = useState(null);
  const [loadingFinance, setLoadingFinance] = useState(false);
  const [savingFinance, setSavingFinance] = useState(false);
  const [message, setMessage] = useState(null);
  const [summaryRefreshToken, setSummaryRefreshToken] = useState(0);
  const [showFinanceTool, setShowFinanceTool] = useState(false);

  const notify = (type, text) => {
    setMessage({ type, text });
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => setMessage(null), 4000);
  };

  const handleError = (error) => {
    if (error?.status === 401) {
      clearSession();
      window.location.reload();
      return;
    }
    notify('error', error?.message || 'Repair finance request failed');
  };

  const loadWeekly = async () => {
    setLoadingWeekly(true);
    try {
      const response = await apiFetch('/api/repair-platform/finance/weekly');
      setWeekly(response.weekly || null);
      setSummaryRefreshToken((value) => value + 1);
    } catch (error) {
      handleError(error);
    } finally {
      setLoadingWeekly(false);
    }
  };

  useEffect(() => { loadWeekly(); }, []);

  const findFinance = async () => {
    if (!repairNumber.trim()) return;
    setLoadingFinance(true);
    try {
      const response = await apiFetch(`/api/repair-platform/jobs/${encodeURIComponent(repairNumber.trim().toUpperCase())}/finance`);
      setFinance(response.finance);
      setRepairNumber(response.finance.repairNumber);
    } catch (error) {
      setFinance(null);
      handleError(error);
    } finally {
      setLoadingFinance(false);
    }
  };

  const setFinanceField = (key, value) => {
    setFinance((current) => ({ ...current, [key]: Math.max(0, Number(value || 0)) }));
  };

  const saveFinance = async () => {
    if (!finance?.repairId) return;
    setSavingFinance(true);
    try {
      const response = await apiFetch(`/api/repair-platform/jobs/${finance.repairId}/finance`, {
        method: 'PATCH',
        body: {
          finalCost: Number(finance.finalCost || 0),
          partsCost: Number(finance.partsCost || 0),
          technicianCommission: Number(finance.technicianCommission || 0),
          otherCost: Number(finance.otherCost || 0),
          note: 'Updated from Repair Finance workspace',
        },
      });
      setFinance(response.finance);
      notify('success', `${response.finance.repairNumber} profit saved`);
      await loadWeekly();
    } catch (error) {
      handleError(error);
    } finally {
      setSavingFinance(false);
    }
  };

  const financePreview = useMemo(() => {
    if (!finance) return null;
    const totalCost = Number(finance.partsCost || 0) + Number(finance.technicianCommission || 0) + Number(finance.otherCost || 0);
    const profit = Number(finance.finalCost || 0) - totalCost;
    return { totalCost, profit, margin: Number(finance.finalCost || 0) > 0 ? (profit / Number(finance.finalCost)) * 100 : 0 };
  }, [finance]);

  const changePositive = Number(weekly?.changePercent || 0) >= 0;

  return (
    <div className="repair-operations-workspace">
      <section className="repair-finance-overview">
        <header>
          <div><span>REPAIR FINANCE</span><h3>Weekly Repair Performance</h3><p>{weekLabel(weekly?.weekStart, weekly?.weekEnd)} · Completed and delivered repair jobs</p></div>
          <button type="button" onClick={loadWeekly} disabled={loadingWeekly}>{loadingWeekly ? <Loader2 className="repair-finance-spin" size={17} /> : <RefreshCw size={17} />} Refresh</button>
        </header>
        <div className="repair-finance-cards">
          <article className="profit"><TrendingUp size={22} /><span>This Week Total Profit</span><b>{money(weekly?.totalProfit)}</b><small className={changePositive ? 'positive' : 'negative'}>{changePositive ? '▲' : '▼'} {Math.abs(Number(weekly?.changePercent || 0)).toFixed(1)}% vs last week</small></article>
          <article><Wrench size={22} /><span>Repair Profit</span><b>{money(weekly?.repairProfit)}</b><small>{Number(weekly?.completedRepairs || 0)} completed repairs</small></article>
          <article><FileSpreadsheet size={22} /><span>Repair Revenue</span><b>{money(weekly?.repairRevenue)}</b><small>Recognized this week</small></article>
          <article className="cost"><TrendingDown size={22} /><span>Repair Costs</span><b>{money(weekly?.repairCost)}</b><small>Parts + commission + other</small></article>
        </div>
      </section>

      <RepairSummaryBelowFinance refreshToken={summaryRefreshToken} />

      <div className="repair-tool-switcher">
        <button type="button" className={showFinanceTool ? 'active' : ''} onClick={() => setShowFinanceTool((value) => !value)}>
          <Calculator size={20} />
          <span><b>Repair Cost & Profit</b><small>နိုပ်မှ cost/profit form ပေါ်မယ်</small></span>
        </button>
      </div>

      {showFinanceTool ? <div className="repair-finance-tools repair-finance-tools-single">
        <section className="repair-cost-editor">
          <header><Calculator size={20} /><div><b>Repair Cost & Profit</b><small>Repair ID တစ်ခုရိုက်ပြီး အမြတ်တွက်ချက်မှုကို သေချာသိမ်းပါ။</small></div></header>
          <div className="repair-finance-search"><input value={repairNumber} onChange={(event) => setRepairNumber(event.target.value.toUpperCase())} placeholder="AC4470 / MS0551" onKeyDown={(event) => { if (event.key === 'Enter') findFinance(); }} /><button type="button" onClick={findFinance} disabled={loadingFinance || !repairNumber.trim()}>{loadingFinance ? <Loader2 className="repair-finance-spin" size={17} /> : <Search size={17} />} Find</button></div>
          {finance ? <div className="repair-finance-editor-grid">
            <label>Final Cost<input type="number" min="0" value={finance.finalCost} onChange={(event) => setFinanceField('finalCost', event.target.value)} /></label>
            <label>Parts Cost<input type="number" min="0" value={finance.partsCost} onChange={(event) => setFinanceField('partsCost', event.target.value)} /></label>
            <label>Technician Commission<input type="number" min="0" value={finance.technicianCommission} onChange={(event) => setFinanceField('technicianCommission', event.target.value)} /></label>
            <label>Other Cost<input type="number" min="0" value={finance.otherCost} onChange={(event) => setFinanceField('otherCost', event.target.value)} /></label>
            <div><span>Total Cost</span><b>{money(financePreview?.totalCost)}</b></div>
            <div className={Number(financePreview?.profit || 0) >= 0 ? 'profit-value' : 'loss-value'}><span>Net Profit</span><b>{money(financePreview?.profit)}</b><small>{Number(financePreview?.margin || 0).toFixed(1)}% margin</small></div>
            <button type="button" className="save-finance" onClick={saveFinance} disabled={savingFinance}>{savingFinance ? <Loader2 className="repair-finance-spin" size={17} /> : <CheckCircle2 size={17} />} Save Finance</button>
          </div> : null}
        </section>
      </div> : null}

      <RepairPlatformPage />
      {message ? <div className={`repair-finance-toast ${message.type}`}>{message.text}</div> : null}
    </div>
  );
}
