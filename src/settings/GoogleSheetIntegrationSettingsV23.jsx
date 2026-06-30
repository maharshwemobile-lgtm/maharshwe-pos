import React, { useEffect, useState } from 'react';
import { CheckCircle2, Code2, Copy, Globe2, Loader2, RefreshCw, Save, Send, ShieldCheck } from 'lucide-react';
import { apiFetch, getSession } from '../phase2Api';
import GOOGLE_APPS_SCRIPT from '../../integrations/google-apps-script/MaharShwePosSync.gs?raw';
import './project-operations-v23.css';

const EVENTS = [
  { key: 'sale', label: 'Sale' },
  { key: 'repair', label: 'Repair' },
  { key: 'income-expense', label: 'Income / Expense' },
  { key: 'product-stock', label: 'Product / Stock' },
  { key: 'money-service', label: 'Money Service' },
  { key: 'debt', label: 'Debt / Credit' },
];

const EMPTY = {
  enabled: false,
  webhookUrl: '',
  events: EVENTS.map((item) => item.key),
  lastTestStatus: 'NOT_TESTED',
  lastTestMessage: '',
  lastTestAt: null,
};

async function copyText(value) {
  const text = String(value || '');
  if (!text.trim()) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand('copy');
    area.remove();
    return copied;
  }
}

function normalizeIntegration(value) {
  const next = { ...EMPTY, ...(value || {}) };
  if (!Array.isArray(next.events) || !next.events.length) next.events = EMPTY.events;
  return next;
}

export default function GoogleSheetIntegrationSettingsV23() {
  const session = getSession();
  const canManage = ['SUPER_ADMIN', 'SHOP_ADMIN'].includes(session?.user?.role || '') || session?.user?.permissions?.settings === true;
  const [form, setForm] = useState(EMPTY);
  const [counts, setCounts] = useState({});
  const [shop, setShop] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState('');
  const [message, setMessage] = useState('');
  const [generatedScript, setGeneratedScript] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/api/google-sheet-webhook/integration');
      setForm(normalizeIntegration(response.integration));
      setCounts(response.counts || {});
      setShop(response.shop || {});
    } catch (error) {
      setMessage(error.message || 'Google Sheet integration load failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  const update = (patch) => setForm((current) => ({ ...current, ...patch }));

  const notifyCopy = async (value, successMessage = 'Copied') => {
    const copied = await copyText(value);
    setMessage(copied ? successMessage : 'Copy failed. Please select and copy manually.');
  };

  const generateAppsScriptCode = async () => {
    const code = String(GOOGLE_APPS_SCRIPT || '').trim();
    setGeneratedScript(code);
    const copied = await copyText(code);
    setMessage(copied
      ? 'Apps Script Code generated and copied. Google Sheet → Apps Script → Code.gs ထဲ paste လုပ်ပါ။'
      : 'Apps Script Code generated. Copy မရပါက အောက်က code box မှ manually copy လုပ်ပါ။');
  };

  const toggleEvent = (key) => {
    setForm((current) => {
      const events = Array.isArray(current.events) ? current.events : [];
      return {
        ...current,
        events: events.includes(key) ? events.filter((item) => item !== key) : [...events, key],
      };
    });
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const response = await apiFetch('/api/google-sheet-webhook/integration', {
        method: 'PUT',
        body: {
          enabled: form.enabled,
          webhookUrl: form.webhookUrl,
          events: form.events,
        },
      });
      setForm(normalizeIntegration(response.integration));
      setMessage(response.message || 'Google Sheet webhook integration saved');
      await load();
    } catch (error) {
      setMessage(error.message || 'Google Sheet integration save failed');
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting('TEST');
    setMessage('');
    try {
      const response = await apiFetch('/api/google-sheet-webhook/integration/test', {
        method: 'POST',
        body: { webhookUrl: form.webhookUrl },
      });
      setMessage(response.ok ? 'Google Sheet Test Connection အောင်မြင်ပါသည်' : 'Google Sheet Test Connection မအောင်မြင်ပါ');
      await load();
    } catch (error) {
      setMessage(error.message || 'Google Sheet test failed');
      await load();
    } finally {
      setTesting('');
    }
  };

  const retry = async () => {
    setTesting('RETRY');
    setMessage('');
    try {
      const response = await apiFetch('/api/google-sheet-webhook/integration/retry', { method: 'POST', body: {} });
      setMessage(`Checked ${response.checked || 0}, sent ${response.sent || 0}`);
      await load();
    } catch (error) {
      setMessage(error.message || 'Retry failed');
    } finally {
      setTesting('');
    }
  };

  if (!canManage) return null;

  return <section className="project-operations-card">
    <header>
      <div>
        <Globe2 size={23}/>
        <span>
          <b>Google Sheet Auto Sync</b>
          <small>Web App URL တစ်ခုတည်းဖြင့် Sale / Repair / Status Update များကို Google Sheet သို့ auto sync လုပ်ပါ။</small>
        </span>
      </div>
      {loading ? <Loader2 className="project-operations-spin" size={20}/> : <ShieldCheck size={20}/>}
    </header>

    {message ? <div className="project-operations-message">{message}</div> : null}

    <div className="project-google-guide">
      <div>
        <b>သုံးနည်းအကျဉ်း</b>
        <ol>
          <li>မိမိ Google Sheet ကိုဖွင့်ပြီး Extensions → Apps Script ကိုဝင်ပါ။</li>
          <li>Generate & Copy Apps Script Code ကိုနှိပ်ပြီး Code.gs ထဲ paste ပါ။</li>
          <li>Deploy → New deployment → Web app ကိုရွေးပါ။</li>
          <li>Execute as: Me / Who has access: Anyone with the link ဖြင့် Deploy ပါ။</li>
          <li>ရလာတဲ့ Web App URL ကို Webhook URL ထဲ paste → Enable → Save → Test Connection နှိပ်ပါ။</li>
        </ol>
        <small>Script Properties / API Key setup မလိုတော့ပါ။ Web App URL တစ်ခုတည်းသာ လိုပါသည်။</small>
      </div>
      <div className="project-google-guide-actions">
        <button type="button" onClick={generateAppsScriptCode}>
          <Code2 size={16}/> Generate & Copy Apps Script Code
        </button>
        <button type="button" onClick={() => window.open('https://script.google.com/home/projects/create', '_blank', 'noopener,noreferrer')}>
          <Copy size={16}/> Open Apps Script
        </button>
      </div>
    </div>

    {generatedScript ? <div className="project-google-copy-grid">
      <article className="project-google-copy-box wide">
        <span>Generated Apps Script Code</span>
        <pre style={{ maxHeight: 220, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{generatedScript}</pre>
        <button type="button" onClick={() => notifyCopy(generatedScript, 'Generated Apps Script code copied')}>
          <Copy size={15}/> Copy Generated Code
        </button>
      </article>
    </div> : null}

    <form className="project-google-form" onSubmit={save}>
      <label className="project-google-toggle">
        <span>
          <b>Enable Google Sheet Auto Sync</b>
          <small>Sale, Repair, Repair Status Update, Stock, Money Service, Income/Expense, Debt events များကို sync ပို့ပါမည်။</small>
        </span>
        <input type="checkbox" checked={form.enabled} onChange={(event) => update({ enabled: event.target.checked })}/>
      </label>

      <label>
        <span>Google Apps Script Web App URL</span>
        <input
          type="url"
          value={form.webhookUrl || ''}
          onChange={(event) => update({ webhookUrl: event.target.value })}
          placeholder="https://script.google.com/macros/s/.../exec"
        />
        <small>Deploy ထုတ်ပြီးရလာတဲ့ /exec URL ကိုထည့်ပါ။</small>
      </label>

      <div className="project-google-copy-grid">
        <article className="project-google-copy-box wide">
          <span>Sync Events</span>
          <div className="project-google-tabs">
            <div>
              {EVENTS.map((item) => (
                <label key={item.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginRight: 10 }}>
                  <input type="checkbox" checked={(form.events || []).includes(item.key)} onChange={() => toggleEvent(item.key)}/>
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        </article>
      </div>

      <div className="project-google-status">
        <div><CheckCircle2 size={18}/><span><small>Status</small><b>{form.enabled ? 'Enabled' : 'Disabled'}</b></span></div>
        <div><Send size={18}/><span><small>Pending</small><b>{counts.PENDING || 0}</b></span></div>
        <div><RefreshCw size={18}/><span><small>Failed</small><b>{counts.FAILED || 0}</b></span></div>
      </div>

      <div className={`project-google-test-result ${form.lastTestStatus === 'CONNECTED' ? 'good' : form.lastTestStatus === 'FAILED' ? 'bad' : ''}`}>
        <b>Test Status: {form.lastTestStatus || 'NOT_TESTED'}</b>
        <span>{form.lastTestMessage || '-'}</span>
        <small>{form.lastTestAt || ''}</small>
        {shop?.name ? <small>Shop: {shop.name}</small> : null}
      </div>

      <div className="project-google-actions">
        <button className="primary" disabled={saving}>
          {saving ? <Loader2 className="project-operations-spin" size={17}/> : <Save size={17}/>} Save Integration
        </button>
        <button type="button" onClick={testConnection} disabled={Boolean(testing) || !form.webhookUrl}>
          {testing === 'TEST' ? <Loader2 className="project-operations-spin" size={17}/> : <Send size={17}/>} Test Connection
        </button>
        <button type="button" onClick={retry} disabled={Boolean(testing)}>
          {testing === 'RETRY' ? <Loader2 className="project-operations-spin" size={17}/> : <RefreshCw size={17}/>} Retry Pending
        </button>
      </div>
    </form>
  </section>;
}
