import React, { useEffect, useMemo, useState } from 'react';
import { BadgeDollarSign, CalendarDays, Download, Link2, Loader2, Plus, RefreshCw, Search, WalletCards, X } from 'lucide-react';
import { apiDownload, apiFetch } from './phase2Api';
import PartnerSettlementTables from './PartnerSettlementTables.jsx';
import PartnerSettlementDetail from './PartnerSettlementDetail.jsx';
import './partner-settlement.css';

const money = (v) => `${Number(v || 0).toLocaleString('en-US')} ကျပ်`;
function weekDates(){const n=new Date(),s=new Date(n);s.setDate(n.getDate()+(n.getDay()===0?-6:1-n.getDay()));const e=new Date(s);e.setDate(s.getDate()+6);const f=(d)=>new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);return{periodStart:f(s),periodEnd:f(e)}}

export default function PartnerSettlementWorkspace(){
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(''),[error,setError]=useState('');
  const [tab,setTab]=useState('settlements'),[query,setQuery]=useState('');
  const [dashboard,setDashboard]=useState({}),[partners,setPartners]=useState([]),[ledger,setLedger]=useState([]),[settlements,setSettlements]=useState([]);
  const [detail,setDetail]=useState(null),[showGenerate,setShowGenerate]=useState(false);
  const [period,setPeriod]=useState({partnerLinkId:'',...weekDates(),notes:''});
  const providerLinks=useMemo(()=>partners.filter((p)=>p.accessMode==='PROVIDER'),[partners]);
  const filter=(rows)=>{const q=query.trim().toLowerCase();return q?rows.filter((r)=>Object.values(r).some((v)=>String(v||'').toLowerCase().includes(q))):rows};

  async function openDetail(id,spin=true){if(spin)setBusy(`detail:${id}`);try{setDetail(await apiFetch(`/api/partner-settlements/settlements/${id}`))}catch(e){setError(e.message)}finally{if(spin)setBusy('')}}
  async function loadAll(keep=true){setLoading(true);setError('');try{const[d,p,l,s]=await Promise.all([apiFetch('/api/partner-settlements/dashboard'),apiFetch('/api/partner-settlements/partners'),apiFetch('/api/partner-settlements/ledger'),apiFetch('/api/partner-settlements/settlements')]);setDashboard(d.dashboard||{});setPartners(p.partners||[]);setLedger(l.ledger||[]);setSettlements(s.settlements||[]);const first=(p.partners||[]).find((x)=>x.accessMode==='PROVIDER');setPeriod((x)=>({...x,partnerLinkId:x.partnerLinkId||first?.id||''}));if(keep&&detail?.settlement?.id)await openDetail(detail.settlement.id,false)}catch(e){setError(e.message||'Partner settlement data မရရှိပါ။')}finally{setLoading(false)}}
  async function run(key,fn){setBusy(key);setError('');try{await fn()}catch(e){setError(e.message||'လုပ်ဆောင်ချက် မအောင်မြင်ပါ။')}finally{setBusy('')}}
  useEffect(()=>{loadAll(false)},[]);

  async function autoSync(){await run('sync',async()=>{const r=await apiFetch('/api/partner-settlements/ledger/auto-sync',{method:'POST',body:{partnerLinkId:period.partnerLinkId||null}});await loadAll(false);window.alert(r.created?`${r.created} ledger အသစ်ဖန်တီးပြီးပါပြီ။`:'Sync လုပ်ရန် completed repair အသစ်မရှိပါ။')})}
  async function generate(e){e.preventDefault();await run('generate',async()=>{const r=await apiFetch('/api/partner-settlements/settlements/generate',{method:'POST',body:period});setShowGenerate(false);await loadAll(false);await openDetail(r.settlement.id)})}
  async function markPaid(item){await run(`paid:${item.id}`,async()=>{await apiFetch(`/api/partner-settlements/ledger/${item.id}/customer-paid`,{method:'PATCH',body:{customerPaid:!item.customerPaid}});await loadAll(false)})}
  async function refreshDetail(id){await loadAll(false);await openDetail(id,false)}

  const stats=[['ပေးရန်ကျန်ငွေ',money(dashboard.outstandingAmount),'Open settlements',WalletCards,'red'],['Settlement မဝင်ရသေး',money(dashboard.unbatchedDue),`${dashboard.unbatchedJobs||0} jobs`,Link2,'orange'],['ဖွင့်ထားသော Settlement',dashboard.openSettlements||0,'Draft / Confirmed / Partial',CalendarDays,'blue'],['Partner စုစုပေါင်းအမြတ်',money(dashboard.totalPartnerProfit),`Paid ${money(dashboard.totalPaid)}`,BadgeDollarSign,'green']];

  return <section className="psw-page">
    {error?<div className="psw-error"><span>{error}</span><button onClick={()=>setError('')}><X size={17}/></button></div>:null}
    <header className="psw-hero"><div><span className="psw-eyebrow">PHASE 9 · PARTNER SHOP</span><h2>Weekly Settlement Center</h2><p>Partner repair handoff၊ အမြတ်ခွဲဝေမှုနဲ့ အပတ်စဉ်ငွေရှင်းမှုကို တစ်နေရာတည်းစီမံပါ။</p></div><div className="psw-actions"><button className="psw-button ghost" onClick={()=>loadAll()}><RefreshCw size={18} className={loading?'psw-spin':''}/>Refresh</button><button className="psw-button ghost" onClick={()=>apiDownload('/api/partner-settlements/export.csv','partner-settlements.csv')}><Download size={18}/>CSV</button>{providerLinks.length?<><button className="psw-button ghost" onClick={autoSync} disabled={busy==='sync'}>{busy==='sync'?<Loader2 className="psw-spin" size={18}/>:<Link2 size={18}/>}Sync Completed</button><button className="psw-button primary" onClick={()=>setShowGenerate(true)}><Plus size={18}/>New Settlement</button></>:null}</div></header>
    <div className="psw-stats">{stats.map(([label,value,note,Icon,tone])=><article className="psw-stat" key={label}><div className={`psw-stat-icon ${tone}`}><Icon size={22}/></div><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></article>)}</div>
    <div className="psw-toolbar"><div className="psw-tabs"><button className={tab==='settlements'?'active':''} onClick={()=>setTab('settlements')}>Weekly Settlements <b>{settlements.length}</b></button><button className={tab==='ledger'?'active':''} onClick={()=>setTab('ledger')}>Repair Ledger <b>{ledger.length}</b></button><button className={tab==='partners'?'active':''} onClick={()=>setTab('partners')}>Partner Shops <b>{partners.length}</b></button></div><label className="psw-search"><Search size={17}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search..."/></label></div>
    {loading?<div className="psw-loading"><Loader2 className="psw-spin"/>Loading partner settlements…</div>:<PartnerSettlementTables tab={tab} settlements={filter(settlements)} ledger={filter(ledger)} partners={filter(partners)} busy={busy} onOpen={openDetail} onMarkPaid={markPaid}/>} 
    {showGenerate?<div className="psw-modal-backdrop"><form className="psw-modal" onSubmit={generate}><header><div><span className="psw-eyebrow">NEW WEEKLY SETTLEMENT</span><h3>Generate Settlement</h3></div><button type="button" onClick={()=>setShowGenerate(false)}><X/></button></header><label><span>Partner Shop</span><select value={period.partnerLinkId} onChange={(e)=>setPeriod({...period,partnerLinkId:e.target.value})} required><option value="">Select partner</option>{providerLinks.map((p)=><option value={p.id} key={p.id}>{p.displayName} ({p.partnerCode})</option>)}</select></label><div className="psw-form-grid"><label><span>Period Start</span><input type="date" value={period.periodStart} onChange={(e)=>setPeriod({...period,periodStart:e.target.value})} required/></label><label><span>Period End</span><input type="date" value={period.periodEnd} onChange={(e)=>setPeriod({...period,periodEnd:e.target.value})} required/></label></div><label><span>Note</span><textarea rows="3" value={period.notes} onChange={(e)=>setPeriod({...period,notes:e.target.value})}/></label><div className="psw-modal-actions"><button type="button" className="psw-button ghost" onClick={()=>setShowGenerate(false)}>Cancel</button><button className="psw-button primary" disabled={busy==='generate'}>{busy==='generate'?<Loader2 className="psw-spin" size={18}/>:<Plus size={18}/>}Generate</button></div></form></div>:null}
    <PartnerSettlementDetail data={detail} onClose={()=>setDetail(null)} onRefresh={refreshDetail} onError={setError}/>
  </section>;
}
