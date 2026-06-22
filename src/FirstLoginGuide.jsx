import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronRight, Database, PlayCircle, ShoppingCart, Sparkles, Trash2, X } from 'lucide-react';
import { apiFetch, getSession } from './phase2Api';
import './first-login-guide.css';

const GUIDE_VERSION = 'v2';
const MAX_DEMO_LOGIN_PROMPTS = 3;

const steps = [
  { page: 'Products', title: 'Step 1 · Product ထည့်မယ်', body: 'Category, Product, Variant, Opening Stock ကို အရင်စစ်ပါ။' },
  { page: 'Sale POS', title: 'Step 2 · Sale POS မှာရောင်းမယ်', body: 'Demo product ကို cart ထဲထည့်ပြီး Cash / KPay / Bank / Credit နဲ့ payment သိမ်းပါ။' },
  { page: 'Sales History', title: 'Step 3 · Sale History စစ်မယ်', body: 'Sale voucher, payment, void flow တွေကို ဒီမှာပြန်စစ်ပါ။' },
  { page: 'Reports', title: 'Step 4 · Report ကြည့်မယ်', body: 'Daily sales, profit, account movement ကို summary အနေနဲ့ကြည့်ပါ။' },
];

function tenantKey(session) {
  const user = session?.user || {};
  const shop = user.shop || {};
  return shop.id || user.shopId || user.id || 'local';
}

function storageKeyFor(session, suffix) {
  return `mahar:first-login-guide:${GUIDE_VERSION}:${tenantKey(session)}:${suffix}`;
}

function clickSidebar(page) {
  const buttons = [...document.querySelectorAll('.sidebar button, .phase9-sidebar button')];
  const target = buttons.find((button) => (button.textContent || '').trim().toLowerCase().includes(page.toLowerCase()));
  if (target) target.click();
}

function readCount(key) {
  const value = Number(window.localStorage.getItem(key) || '0');
  return Number.isFinite(value) ? value : 0;
}

export default function FirstLoginGuide() {
  const [session, setSession] = useState(() => getSession());
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [loginCount, setLoginCount] = useState(0);

  const loginCountKey = useMemo(() => storageKeyFor(session, 'login-count'), [session]);
  const retiredKey = useMemo(() => storageKeyFor(session, 'retired'), [session]);
  const sessionHandledKey = useMemo(() => storageKeyFor(session, 'session-handled'), [session]);
  const canShow = Boolean(session?.token);

  useEffect(() => {
    const sync = () => setSession(getSession());
    const openGuide = () => setOpen(true);
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('mahar:first-login-guide-open', openGuide);
    const timer = window.setInterval(sync, 2000);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('mahar:first-login-guide-open', openGuide);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!canShow) return;
    if (window.localStorage.getItem(retiredKey) === 'true') return;
    if (window.sessionStorage.getItem(sessionHandledKey) === 'true') return;

    window.sessionStorage.setItem(sessionHandledKey, 'true');
    const nextCount = readCount(loginCountKey) + 1;
    window.localStorage.setItem(loginCountKey, String(nextCount));
    setLoginCount(nextCount);

    if (nextCount <= MAX_DEMO_LOGIN_PROMPTS) {
      const timer = window.setTimeout(() => {
        setMessage('Demo data ပြန်ယူမလား? Payment type ၄ မျိုး — Cash / KPay / Bank / Credit ပါမယ်။');
        setMessageType('success');
        setOpen(true);
      }, 700);
      return () => window.clearTimeout(timer);
    }

    setBusy(true);
    apiFetch('/api/onboarding/demo-data', { method: 'DELETE' })
      .then(() => {
        window.localStorage.setItem(retiredKey, 'true');
        window.localStorage.setItem(loginCountKey, String(nextCount));
      })
      .catch((error) => console.warn('Demo data auto cleanup failed:', error?.message || error))
      .finally(() => setBusy(false));
  }, [canShow, loginCountKey, retiredKey, sessionHandledKey]);

  const showMessage = (type, text) => {
    setMessageType(type);
    setMessage(text);
  };

  const close = () => setOpen(false);
  const complete = () => setOpen(false);

  const loadDemo = async () => {
    setBusy(true);
    showMessage('success', 'Demo data ထည့်နေပါတယ်...');
    try {
      const response = await apiFetch('/api/onboarding/demo-data', { method: 'POST' });
      showMessage('success', response?.message || 'Demo data ထည့်ပြီးပါပြီ။ Cash / KPay / Bank / Credit ၄ မျိုး ပါပါမယ်။');
      clickSidebar('Products');
      setStepIndex(0);
    } catch (error) {
      showMessage('error', error?.message || 'Demo data ထည့်မရပါ');
    } finally {
      setBusy(false);
    }
  };

  const deleteDemo = async () => {
    const ok = window.confirm('Demo Data အကုန်ဖျက်မလား? Real tenant data မထိပါ။ Demo marker ပါတဲ့ data တွေကိုပဲဖျက်မယ်။');
    if (!ok) return;
    setBusy(true);
    showMessage('success', 'Demo data ဖျက်နေပါတယ်...');
    try {
      const response = await apiFetch('/api/onboarding/demo-data', { method: 'DELETE' });
      showMessage('success', response?.message || 'Demo data အကုန်ဖျက်ပြီးပါပြီ။ Real data မထိပါ။');
      clickSidebar('Products');
      setStepIndex(0);
    } catch (error) {
      showMessage('error', error?.message || 'Demo data ဖျက်မရပါ');
    } finally {
      setBusy(false);
    }
  };

  const retireNow = async () => {
    setBusy(true);
    showMessage('success', 'Demo guide ပိတ်ပြီး Demo data ရှင်းနေပါတယ်...');
    try {
      await apiFetch('/api/onboarding/demo-data', { method: 'DELETE' });
      window.localStorage.setItem(retiredKey, 'true');
      window.localStorage.setItem(loginCountKey, String(Math.max(readCount(loginCountKey), MAX_DEMO_LOGIN_PROMPTS + 1)));
      setOpen(false);
    } catch (error) {
      showMessage('error', error?.message || 'Demo guide ပိတ်မရပါ');
    } finally {
      setBusy(false);
    }
  };

  const goStep = (index) => {
    setStepIndex(index);
    clickSidebar(steps[index].page);
  };

  if (!open || !canShow) return null;

  const current = steps[stepIndex];
  const displayCount = loginCount || readCount(loginCountKey);

  return <div className="first-login-guide-backdrop">
    <section className="first-login-guide-card" role="dialog" aria-modal="true" aria-label="First login guide">
      <button type="button" className="first-login-guide-close" onClick={close} aria-label="Close guide"><X size={18}/></button>
      <div className="first-login-guide-hero">
        <div className="first-login-guide-icon"><Sparkles size={26}/></div>
        <div>
          <span>FIRST TIME GUIDE · LOGIN {Math.min(displayCount, MAX_DEMO_LOGIN_PROMPTS)} / {MAX_DEMO_LOGIN_PROMPTS}</span>
          <h2>Demo data ပြန်ယူမလား?</h2>
          <p>၃ ကြိမ်ထိသာ Demo data ပြန်ယူခွင့်ရှိမယ်။ ၄ ကြိမ်မြောက် login မှာ Demo data ကို auto ဖျက်ပြီး နောက်ထပ်မမေးတော့ပါ။</p>
        </div>
      </div>

      {message ? <div className={`first-login-guide-message ${messageType === 'error' ? 'error' : 'success'}`}>
        {messageType === 'error' ? <AlertTriangle size={17}/> : <CheckCircle2 size={17}/>}
        {message}
      </div> : null}

      <div className="first-login-guide-demo">
        <div><Database size={20}/><span><b>Demo data ပြန်ယူမယ်</b><small>Cash / KPay / Bank / Credit payment type ၄ မျိုး၊ demo products, stock, customer ထည့်မယ်။</small></span></div>
        <button type="button" onClick={loadDemo} disabled={busy}>{busy ? 'Working...' : 'Add Demo Data'}</button>
      </div>

      <div className="first-login-guide-demo danger">
        <div><Trash2 size={20}/><span><b>Demo data ဖျက်မယ်</b><small>Real tenant data မထိဘဲ Demo marker ပါတဲ့ data တွေပဲ အကုန်ရှင်းမယ်။</small></span></div>
        <button type="button" onClick={deleteDemo} disabled={busy}>{busy ? 'Working...' : 'Delete Demo Data'}</button>
      </div>

      <div className="first-login-guide-step-main">
        <span>{current.title}</span>
        <p>{current.body}</p>
        <button type="button" onClick={() => goStep(stepIndex)}><PlayCircle size={17}/> ဒီ Step ကိုသွားမယ်</button>
      </div>

      <div className="first-login-guide-steps">
        {steps.map((step, index) => <button key={step.page} type="button" className={index === stepIndex ? 'active' : ''} onClick={() => goStep(index)}>
          <b>{index + 1}</b><span>{step.page}</span><ChevronRight size={15}/>
        </button>)}
      </div>

      <footer>
        <button type="button" onClick={() => goStep(Math.min(steps.length - 1, stepIndex + 1))} disabled={stepIndex >= steps.length - 1}>Next Step</button>
        <button type="button" onClick={retireNow} disabled={busy}>Demo မသုံးတော့ပါ</button>
        <button type="button" className="primary" onClick={complete}><ShoppingCart size={17}/> Guide ပိတ်မယ်</button>
      </footer>
    </section>
  </div>;
}
