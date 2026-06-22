import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronRight, Database, PlayCircle, ShoppingCart, Sparkles, X } from 'lucide-react';
import { apiFetch, getSession } from './phase2Api';
import './first-login-guide.css';

const GUIDE_VERSION = 'v1';
const DEMO_PREFIX = 'Demo';

const demoCategories = [
  { name: 'Demo Phones', kind: 'Phone' },
  { name: 'Demo Accessories', kind: 'Accessories' },
];

const demoProducts = [
  {
    categoryName: 'Demo Phones',
    name: 'Demo iPhone 13',
    brand: 'Apple',
    model: 'iPhone 13',
    productType: 'Phone',
    groupName: 'Demo Phone',
    variants: [{
      variantName: '128GB / Midnight',
      sku: 'DEMO-IP13-128-MID',
      barcode: 'DEMO0001',
      storage: '128GB',
      color: 'Midnight',
      costPrice: 1250000,
      standardSellingPrice: 1380000,
      minimumSellingPrice: 1320000,
      initialQuantity: 3,
      minAlertQuantity: 1,
      active: true,
    }],
  },
  {
    categoryName: 'Demo Accessories',
    name: 'Demo Fast Charger',
    brand: 'Mahar',
    model: '20W USB-C',
    productType: 'Accessories',
    groupName: 'Demo Accessories',
    variants: [{
      variantName: '20W White',
      sku: 'DEMO-CHARGER-20W',
      barcode: 'DEMO0002',
      color: 'White',
      costPrice: 12000,
      standardSellingPrice: 18000,
      minimumSellingPrice: 15000,
      initialQuantity: 10,
      minAlertQuantity: 2,
      active: true,
    }],
  },
];

const demoPaymentTypes = [
  { name: 'Cash', code: 'CASH', kind: 'CASH', openingBalance: 0, supportsMoneyService: false },
  { name: 'KPay', code: 'KPAY', kind: 'WALLET', openingBalance: 0, supportsMoneyService: true },
  { name: 'Bank', code: 'BANK', kind: 'BANK', openingBalance: 0, supportsMoneyService: false },
];

const steps = [
  { page: 'Products', title: 'Step 1 · Product ထည့်မယ်', body: 'Category, Product, Variant, Opening Stock ကို အရင်စစ်ပါ။' },
  { page: 'Sale POS', title: 'Step 2 · Sale POS မှာရောင်းမယ်', body: 'Demo product ကို cart ထဲထည့်ပြီး Cash/KPay နဲ့ payment သိမ်းပါ။' },
  { page: 'Sales History', title: 'Step 3 · Sale History စစ်မယ်', body: 'Sale voucher, payment, void flow တွေကို ဒီမှာပြန်စစ်ပါ။' },
  { page: 'Reports', title: 'Step 4 · Report ကြည့်မယ်', body: 'Daily sales, profit, account movement ကို summary အနေနဲ့ကြည့်ပါ။' },
];

function keyFor(session) {
  const user = session?.user || {};
  const shop = user.shop || {};
  return `mahar:first-login-guide:${GUIDE_VERSION}:${shop.id || user.shopId || user.id || 'local'}`;
}

function clickSidebar(page) {
  const buttons = [...document.querySelectorAll('.sidebar button, .phase9-sidebar button')];
  const target = buttons.find((button) => (button.textContent || '').trim().toLowerCase().includes(page.toLowerCase()));
  if (target) target.click();
}

async function ignoreDuplicate(request) {
  try { return await request(); }
  catch (error) {
    const text = String(error?.message || '').toLowerCase();
    if (text.includes('duplicate') || text.includes('already') || text.includes('exists') || text.includes('unique')) return null;
    throw error;
  }
}

export default function FirstLoginGuide() {
  const [session, setSession] = useState(() => getSession());
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const storageKey = useMemo(() => keyFor(session), [session]);
  const canShow = Boolean(session?.token);

  useEffect(() => {
    const sync = () => setSession(getSession());
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('mahar:first-login-guide-open', () => setOpen(true));
    const timer = window.setInterval(sync, 2000);
    return () => {
      window.removeEventListener('storage', sync);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!canShow) return;
    if (window.localStorage.getItem(storageKey) === 'done') return;
    const timer = window.setTimeout(() => setOpen(true), 700);
    return () => window.clearTimeout(timer);
  }, [canShow, storageKey]);

  const close = () => setOpen(false);
  const complete = () => {
    window.localStorage.setItem(storageKey, 'done');
    setOpen(false);
  };

  const loadDemo = async () => {
    setBusy(true);
    setMessage('Demo data ထည့်နေပါတယ်...');
    try {
      for (const payment of demoPaymentTypes) {
        await ignoreDuplicate(() => apiFetch('/api/finance/settings/payment-methods', { method: 'POST', body: payment }));
      }

      const categories = [];
      for (const category of demoCategories) {
        await ignoreDuplicate(() => apiFetch('/api/categories', { method: 'POST', body: category }));
      }
      const categoryResponse = await apiFetch('/api/categories');
      categories.push(...(categoryResponse.categories || []));

      for (const product of demoProducts) {
        const category = categories.find((item) => item.name === product.categoryName);
        await ignoreDuplicate(() => apiFetch('/api/products', {
          method: 'POST',
          body: {
            categoryId: category?.id || null,
            groupName: product.groupName,
            name: product.name,
            brand: product.brand,
            model: product.model,
            productType: product.productType,
            requiresSerial: false,
            active: true,
            variants: product.variants,
          },
        }));
      }

      await ignoreDuplicate(() => apiFetch('/api/customers', {
        method: 'POST',
        body: { name: `${DEMO_PREFIX} Customer`, phone: '09999999999', address: 'Demo address', balance: 0 },
      }));

      setMessage('Demo data ထည့်ပြီးပါပြီ။ Step 1 ကနေစနိုင်ပါပြီ။');
      clickSidebar('Products');
      setStepIndex(0);
    } catch (error) {
      setMessage(error?.message || 'Demo data ထည့်မရပါ');
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

  return <div className="first-login-guide-backdrop">
    <section className="first-login-guide-card" role="dialog" aria-modal="true" aria-label="First login guide">
      <button type="button" className="first-login-guide-close" onClick={close} aria-label="Close guide"><X size={18}/></button>
      <div className="first-login-guide-hero">
        <div className="first-login-guide-icon"><Sparkles size={26}/></div>
        <div>
          <span>FIRST TIME GUIDE</span>
          <h2>စစဝင်ချင်း ဘယ်ကနေ ဘယ်ကိုသွားမလဲ</h2>
          <p>Demo data နဲ့ Product → Sale POS → Sale History → Report ကို တစ်ဆင့်ချင်းစမ်းသွားပါ။</p>
        </div>
      </div>

      {message ? <div className="first-login-guide-message"><CheckCircle2 size={17}/>{message}</div> : null}

      <div className="first-login-guide-demo">
        <div><Database size={20}/><span><b>Demo data ထည့်မယ်</b><small>Demo categories, products, stock, customer, payment types ကို sample အနေနဲ့ထည့်မယ်။</small></span></div>
        <button type="button" onClick={loadDemo} disabled={busy}>{busy ? 'Adding...' : 'Add Demo Data'}</button>
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
        <button type="button" className="primary" onClick={complete}><ShoppingCart size={17}/> Guide ပြီးပြီ</button>
      </footer>
    </section>
  </div>;
}
