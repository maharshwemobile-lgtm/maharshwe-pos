import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Building2,
  CalendarPlus,
  CheckCircle2,
  Database,
  KeyRound,
  Link2,
  Loader2,
  LockKeyhole,
  Mail,
  Phone,
  Power,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';
import { apiFetch, clearSession, getSession } from './phase2Api';
import './grand-admin-portal.css';

const FEATURE_KEYS = [
  ['dashboard', 'Dashboard'],
  ['sales', 'Sales'],
  ['products', 'Products'],
  ['stock', 'Stock'],
  ['repairs', 'Repairs'],
  ['customers', 'Customers'],
  ['money_service', 'Money Service'],
  ['accounting', 'Accounting'],
  ['reports', 'Reports'],
  ['purchases', 'Purchases'],
  ['users', 'Users'],
  ['settings', 'Settings'],
  ['backup', 'Backup'],
  ['audit_logs', 'Audit Logs'],
  ['telegram_integration', 'Telegram'],
  ['google_sheet_sync', 'Google Sheet'],
  ['payment_gateway', 'Payment Gateway'],
  ['sms_gateway', 'SMS Gateway'],
  ['mail_notifications', 'Mail Notifications'],
];

const EMPTY_EXPORT = { emails: [], phones: [], marketingRows: [] };
const DEFAULT_TENANT_ADMIN = {
  username: '',
  email: '',
  name: '',
  password: '',
  googleAccount: true,
  sendEmail: false,
};
const DEFAULT_SUBSCRIPTION_FORM = {
  status: 'ACTIVE',
  plan: 'starter',
  monthlyFee: 50000,
  setupFee: 0,
  bundleBudget: 0,
  customDays: 30,
  notes: '',
};
const DEFAULT_USER_FILTER = { q: '', provider: '', role: 'SHOP_ADMIN', status: 'ACTIVE', limit: 50 };

function money(value) {
  return `${Number(value || 0).toLocaleString('en-US')} Ks`;
}

function dateText(value) {
  if (!value) return '-';
  try {
    return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return String(value);
  }
}

function statusTone(status) {
  const key = String(status || '').toLowerCase();
  if (key.includes('active')) return 'green';
  if (key.includes('trial')) return 'blue';
  if (key.includes('pending')) return 'orange';
  if (key.includes('suspend') || key.includes('overdue') || key.includes('cancel') || key.includes('delete')) return 'red';
  return 'gray';
}

function numberField(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function compactPayload(payload) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== '' && value !== null && value !== undefined));
}

function csvLine(values) {
  return values.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',');
}

function copyMarketingRows(rows = []) {
  const header = ['shopName', 'tenantId', 'name', 'email', 'phone', 'loginType', 'status', 'lastLoginAt'];
  const body = rows.map((row) => csvLine(header.map((key) => row[key])));
  const text = [csvLine(header), ...body].join('\n');
  navigator.clipboard?.writeText(text);
}

function HealthPill({ label, item }) {
  return (
    <article className={item?.ok ? 'ok' : 'warn'}>
      {item?.ok ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
      <span>{label}</span>
      <b>{item?.status || item?.provider || (item?.ok ? 'ok' : 'not ready')}</b>
    </article>
  );
}

export default function GrandAdminPortal() {
  const session = getSession();
  const [query, setQuery] = useState('');
  const [overview, setOverview] = useState(null);
  const [shops, setShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);
  const [shopUsers, setShopUsers] = useState([]);
  const [auditRows, setAuditRows] = useState([]);
  const [subscriptionDetail, setSubscriptionDetail] = useState(null);
  const [tenantExport, setTenantExport] = useState(EMPTY_EXPORT);
  const [tenantAdminDraft, setTenantAdminDraft] = useState(DEFAULT_TENANT_ADMIN);
  const [tenantAdminResult, setTenantAdminResult] = useState(null);
  const [subscriptionForm, setSubscriptionForm] = useState(DEFAULT_SUBSCRIPTION_FORM);
  const [userFilter, setUserFilter] = useState(DEFAULT_USER_FILTER);
  const [globalUsers, setGlobalUsers] = useState([]);
  const [globalExport, setGlobalExport] = useState(EMPTY_EXPORT);
  const [authSetup, setAuthSetup] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [passwordReset, setPasswordReset] = useState({ user: null, password: '' });

  const isGrandAdmin = session?.user?.role === 'SUPER_ADMIN' && !session?.user?.shopId;

  const notify = (type, text) => {
    setMessage({ type, text });
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => setMessage(null), 3600);
  };

  const handleError = (error) => {
    if (error?.status === 401) {
      clearSession();
      window.location.reload();
      return;
    }
    notify('error', error?.message || 'Request failed');
  };

  const load = async () => {
    setBusy(true);
    try {
      const search = query.trim();
      const [overviewData, shopsData, auditData] = await Promise.all([
        apiFetch('/api/grand-admin/overview'),
        apiFetch(`/api/grand-admin/shops${search ? `?q=${encodeURIComponent(search)}` : ''}`),
        apiFetch('/api/grand-admin/audit-logs?limit=80'),
      ]);
      setOverview(overviewData);
      setShops(shopsData.shops || []);
      setAuditRows(auditData.rows || []);
      if (selectedShop) {
        const next = (shopsData.shops || []).find((shop) => shop.id === selectedShop.id) || null;
        setSelectedShop(next);
      }
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filteredShops = useMemo(() => shops, [shops]);

  const loadStep2ForShop = async (shop) => {
    const [legacyUsers, subscription, userExport] = await Promise.all([
      apiFetch(`/api/grand-admin/shops/${shop.id}/users`),
      apiFetch(`/api/grand-admin/shops/${shop.id}/subscription`),
      apiFetch(`/api/grand-admin/users?shopId=${encodeURIComponent(shop.id)}&limit=200`),
    ]);
    const users = userExport.users?.length ? userExport.users : legacyUsers.users || [];
    setShopUsers(users || []);
    setSubscriptionDetail(subscription.subscription || null);
    setTenantExport(userExport.export || EMPTY_EXPORT);
    setSubscriptionForm({
      status: subscription.subscription?.status || 'ACTIVE',
      plan: subscription.subscription?.plan || 'starter',
      monthlyFee: subscription.subscription?.monthlyFee ?? 50000,
      setupFee: subscription.subscription?.setupFee ?? 0,
      bundleBudget: subscription.subscription?.bundleBudget ?? 0,
      customDays: subscription.subscription?.customDays || 30,
      notes: subscription.subscription?.notes || '',
    });
  };

  const openShop = async (shop) => {
    setSelectedShop(shop);
    setShopUsers([]);
    setSubscriptionDetail(null);
    setTenantExport(EMPTY_EXPORT);
    setTenantAdminResult(null);
    setTenantAdminDraft({
      ...DEFAULT_TENANT_ADMIN,
      email: '',
      username: '',
      name: `${shop.name || ''} Admin`.trim(),
    });
    setBusy(true);
    try {
      await loadStep2ForShop(shop);
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
  };

  const refreshSelectedShop = async () => {
    if (!selectedShop) return;
    await loadStep2ForShop(selectedShop);
    await load();
  };

  const updateShop = async (shop, body) => {
    setBusy(true);
    try {
      const data = await apiFetch(`/api/grand-admin/shops/${shop.id}`, { method: 'PATCH', body });
      const nextShop = data.shop;
      setShops((current) => current.map((item) => item.id === nextShop.id ? nextShop : item));
      setSelectedShop((current) => current?.id === nextShop.id ? nextShop : current);
      notify('success', 'Shop control updated');
      await load();
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
  };

  const updateUser = async (user, body) => {
    setBusy(true);
    try {
      const data = await apiFetch(`/api/grand-admin/users/${user.id}`, { method: 'PATCH', body });
      setShopUsers((current) => current.map((item) => item.id === user.id ? data.user : item));
      notify('success', 'User updated');
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    if (!passwordReset.user || !passwordReset.password) return;
    setBusy(true);
    try {
      await apiFetch(`/api/grand-admin/users/${passwordReset.user.id}/password`, {
        method: 'PATCH',
        body: { password: passwordReset.password, mustChange: true },
      });
      notify('success', 'Password reset completed');
      setPasswordReset({ user: null, password: '' });
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
  };

  const createTenantAdmin = async () => {
    if (!selectedShop) return;
    if (!tenantAdminDraft.username && !tenantAdminDraft.email) {
      notify('error', 'Username or email is required');
      return;
    }
    if (!window.confirm(`Create Tenant Admin for ${selectedShop.name}?\nThis user will be inactive / PENDING_SETUP until activation.`)) return;
    setBusy(true);
    try {
      const data = await apiFetch(`/api/grand-admin/shops/${selectedShop.id}/tenant-admin`, {
        method: 'POST',
        body: compactPayload(tenantAdminDraft),
      });
      setTenantAdminResult(data);
      notify('success', 'Tenant Admin created as PENDING_SETUP');
      await refreshSelectedShop();
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
  };

  const saveSubscription = async () => {
    if (!selectedShop) return;
    if (!window.confirm(`Update subscription for ${selectedShop.name}?`)) return;
    setBusy(true);
    try {
      const data = await apiFetch(`/api/grand-admin/shops/${selectedShop.id}/subscription`, {
        method: 'PATCH',
        body: {
          ...compactPayload(subscriptionForm),
          monthlyFee: numberField(subscriptionForm.monthlyFee, 0),
          setupFee: numberField(subscriptionForm.setupFee, 0),
          bundleBudget: numberField(subscriptionForm.bundleBudget, 0),
          customDays: numberField(subscriptionForm.customDays, 30),
        },
      });
      setSubscriptionDetail(data.subscription || null);
      notify('success', 'Subscription updated');
      await load();
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
  };

  const renewSubscription = async () => {
    if (!selectedShop) return;
    const days = numberField(subscriptionForm.customDays, 30);
    if (!window.confirm(`Renew ${selectedShop.name} for ${days} days?`)) return;
    setBusy(true);
    try {
      const data = await apiFetch(`/api/grand-admin/shops/${selectedShop.id}/subscription/renew`, {
        method: 'POST',
        body: {
          customDays: days,
          plan: subscriptionForm.plan,
          monthlyFee: numberField(subscriptionForm.monthlyFee, 0),
          bundleBudget: numberField(subscriptionForm.bundleBudget, 0),
          notes: subscriptionForm.notes || `Renewed for ${days} days by Grand Super Admin`,
        },
      });
      setSubscriptionDetail(data.subscription || null);
      notify('success', 'Subscription renewed');
      await load();
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
  };

  const cancelSubscription = async () => {
    if (!selectedShop) return;
    if (!window.confirm(`Cancel subscription for ${selectedShop.name}?\nThis can affect tenant access.`)) return;
    setBusy(true);
    try {
      const data = await apiFetch(`/api/grand-admin/shops/${selectedShop.id}/subscription/cancel`, { method: 'POST' });
      setSubscriptionDetail(data.subscription || null);
      notify('success', 'Subscription cancelled');
      await load();
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
  };

  const saveAuthSetup = async () => {
    if (!authSetup?.user) return;
    setBusy(true);
    try {
      const data = await apiFetch(`/api/grand-admin/users/${authSetup.user.id}/auth-setup`, {
        method: 'PATCH',
        body: compactPayload({
          username: authSetup.username,
          email: authSetup.email,
          password: authSetup.password,
          passwordMustChange: authSetup.passwordMustChange,
          googleLinkAllowed: authSetup.googleLinkAllowed,
          status: authSetup.status,
        }),
      });
      setShopUsers((current) => current.map((item) => item.id === data.user?.id ? data.user : item));
      setAuthSetup(null);
      notify('success', 'User auth setup updated');
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
  };

  const allowGoogleLink = async (user) => {
    const email = user.email || window.prompt('Google email to link');
    if (!email) return;
    setBusy(true);
    try {
      const data = await apiFetch(`/api/grand-admin/users/${user.id}/google-link`, {
        method: 'POST',
        body: { email, allowLink: true },
      });
      setShopUsers((current) => current.map((item) => item.id === data.user?.id ? data.user : item));
      notify('success', 'Google link allowed for this user');
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
  };

  const loadGlobalUsers = async () => {
    const params = new URLSearchParams();
    Object.entries(userFilter).forEach(([key, value]) => {
      if (value) params.set(key, String(value));
    });
    setBusy(true);
    try {
      const data = await apiFetch(`/api/grand-admin/users?${params.toString()}`);
      setGlobalUsers(data.users || []);
      setGlobalExport(data.export || EMPTY_EXPORT);
      notify('success', 'Tenant users filter loaded');
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
  };

  const suspendTenant = async () => {
    if (!selectedShop) return;
    if (!window.confirm(`Suspend ${selectedShop.name}?\nAll tenant users will be disabled.`)) return;
    setBusy(true);
    try {
      await apiFetch(`/api/grand-admin/shops/${selectedShop.id}/suspend`, { method: 'POST' });
      notify('success', 'Tenant suspended');
      await refreshSelectedShop();
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
  };

  const softDeleteTenant = async () => {
    if (!selectedShop) return;
    const typed = window.prompt(`Type ${selectedShop.slug} to soft delete this tenant. Tenant must be suspended first.`);
    if (typed !== selectedShop.slug) return;
    setBusy(true);
    try {
      await apiFetch(`/api/grand-admin/shops/${selectedShop.id}`, { method: 'DELETE' });
      notify('success', 'Tenant soft-deleted');
      setSelectedShop(null);
      await load();
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
  };

  if (!isGrandAdmin) {
    return (
      <section className="grand-admin-denied">
        <LockKeyhole size={42} />
        <h2>Grand Super Admin Only</h2>
        <p>ဒီ Portal သည် Platform ပိုင်ရှင်အတွက်သာ ဖြစ်ပါတယ်။ Tenant shop user မဝင်နိုင်ပါ။</p>
      </section>
    );
  }

  return (
    <div className="grand-admin-page">
      {message ? <div className={`grand-toast ${message.type}`}>{message.text}</div> : null}

      <section className="grand-heading">
        <div>
          <span>PLATFORM CENTRALIZED CONTROL</span>
          <h2>Grand Super Admin Portal</h2>
          <p>ဆိုင်အားလုံး၊ Tenant ID၊ Subscription၊ Feature Permission၊ User Suspend နှင့် System Health ကို တစ်နေရာထဲက စီမံနိုင်ပါတယ်။ Step 2 routes ကို UI ကနေချိတ်ထားပါတယ်။</p>
        </div>
        <button type="button" onClick={load} disabled={busy}>
          {busy ? <Loader2 className="grand-spin" size={17} /> : <RefreshCw size={17} />}
          Refresh
        </button>
      </section>

      <section className="grand-metrics">
        <article><Building2 /><span>Total Shops</span><b>{overview?.metrics?.shopCount || 0}</b></article>
        <article><CheckCircle2 /><span>Active Shops</span><b>{overview?.metrics?.activeShopCount || 0}</b></article>
        <article><XCircle /><span>Suspended Shops</span><b>{overview?.metrics?.suspendedShopCount || 0}</b></article>
        <article><Users /><span>All Users</span><b>{overview?.metrics?.userCount || 0}</b></article>
        <article><Database /><span>Products</span><b>{overview?.metrics?.productCount || 0}</b></article>
      </section>

      <section className="grand-health">
        <div><Activity size={19} /><b>API Health Dashboard</b><span>Third-party status included</span></div>
        <HealthPill label="API" item={overview?.health?.api} />
        <HealthPill label="Database" item={overview?.health?.database} />
        <HealthPill label="SMS Gateway" item={overview?.health?.thirdParty?.smsGateway} />
        <HealthPill label="Payment Gateway" item={overview?.health?.thirdParty?.paymentGateway} />
        <HealthPill label="Mail Server" item={overview?.health?.thirdParty?.mailServer} />
      </section>

      <section className="grand-card">
        <div className="grand-toolbar">
          <label><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && load()} placeholder="Shop name / Tenant ID / phone ရှာရန်" /></label>
          <button type="button" onClick={load}>Search</button>
        </div>

        <div className="grand-table-wrap">
          <table className="grand-table">
            <thead>
              <tr>
                <th>Shop / Tenant</th>
                <th>Business</th>
                <th>Subscription</th>
                <th>Metrics</th>
                <th>Portal</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredShops.map((shop) => (
                <tr key={shop.id}>
                  <td><b>{shop.name}</b><span>{shop.tenantId} · {shop.slug}</span></td>
                  <td>{shop.businessType}</td>
                  <td><i className={statusTone(shop.subscription?.status)}>{shop.subscription?.status || '-'}</i><span>{shop.subscription?.endsAt ? `Ends ${dateText(shop.subscription.endsAt)}` : '-'}</span></td>
                  <td><span>{shop.metrics.users} users · {shop.metrics.products} products</span><span>{shop.metrics.sales} sales</span></td>
                  <td><i className={shop.adminPortalEnabled ? 'green' : 'red'}>{shop.adminPortalEnabled ? 'Enabled' : 'Disabled'}</i></td>
                  <td><i className={shop.active ? 'green' : 'red'}>{shop.active ? 'Active' : 'Suspended'}</i></td>
                  <td>
                    <button type="button" onClick={() => openShop(shop)}>Control</button>
                  </td>
                </tr>
              ))}
              {!filteredShops.length ? <tr><td colSpan="7" className="grand-empty">No shops found</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      {selectedShop ? (
        <section className="grand-control-grid">
          <div className="grand-card">
            <div className="grand-section-title">
              <b>{selectedShop.name}</b>
              <span>{selectedShop.tenantId} · {selectedShop.businessType} · Step 1 control</span>
            </div>

            <div className="grand-switch-list">
              <button type="button" onClick={() => updateShop(selectedShop, { active: !selectedShop.active })}>
                {selectedShop.active ? 'Legacy Shop Suspend' : 'Legacy Shop Safe Active'}
              </button>
              <button type="button" onClick={() => updateShop(selectedShop, { adminPortalEnabled: !selectedShop.adminPortalEnabled })}>
                {selectedShop.adminPortalEnabled ? 'Admin Portal ပိတ်မယ်' : 'Admin Portal ဖွင့်မယ်'}
              </button>
              <button type="button" onClick={refreshSelectedShop}><RefreshCw size={14} /> Reload Step 2</button>
            </div>

            <div className="grand-feature-grid">
              {FEATURE_KEYS.map(([key, label]) => {
                const current = selectedShop.featurePermissions || {};
                const enabled = current[key] === true;
                return (
                  <label key={key}>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(event) => updateShop(selectedShop, {
                        featurePermissions: { ...current, [key]: event.target.checked },
                      })}
                    />
                    <span>{label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grand-card">
            <div className="grand-section-title">
              <b>Step 2: Subscription Detail / Renew / Cancel</b>
              <span>GET/PATCH/renew/cancel routes connected</span>
            </div>
            <div className="grand-form-grid">
              <label>Status<select value={subscriptionForm.status} onChange={(event) => setSubscriptionForm({ ...subscriptionForm, status: event.target.value })}><option>TRIAL</option><option>ACTIVE</option><option>PAST_DUE</option><option>EXPIRED</option><option>CANCELLED</option><option>SUSPENDED</option></select></label>
              <label>Plan<input value={subscriptionForm.plan} onChange={(event) => setSubscriptionForm({ ...subscriptionForm, plan: event.target.value })} /></label>
              <label>Monthly Fee<input type="number" value={subscriptionForm.monthlyFee} onChange={(event) => setSubscriptionForm({ ...subscriptionForm, monthlyFee: event.target.value })} /></label>
              <label>Setup Fee<input type="number" value={subscriptionForm.setupFee} onChange={(event) => setSubscriptionForm({ ...subscriptionForm, setupFee: event.target.value })} /></label>
              <label>Bundle Budget<input type="number" value={subscriptionForm.bundleBudget} onChange={(event) => setSubscriptionForm({ ...subscriptionForm, bundleBudget: event.target.value })} /></label>
              <label>Custom Days<input type="number" value={subscriptionForm.customDays} onChange={(event) => setSubscriptionForm({ ...subscriptionForm, customDays: event.target.value })} /></label>
              <label className="wide">Notes<input value={subscriptionForm.notes} onChange={(event) => setSubscriptionForm({ ...subscriptionForm, notes: event.target.value })} /></label>
            </div>
            <div className="grand-detail-row">
              <span>Current: <b>{subscriptionDetail?.status || '-'}</b></span>
              <span>Ends: <b>{dateText(subscriptionDetail?.endsAt)}</b></span>
              <span>Fee: <b>{money(subscriptionDetail?.monthlyFee)}</b></span>
            </div>
            <div className="grand-switch-list">
              <button type="button" onClick={saveSubscription}>Save Subscription</button>
              <button type="button" onClick={renewSubscription}><CalendarPlus size={14} /> Renew Days</button>
              <button type="button" className="danger" onClick={cancelSubscription}>Cancel Subscription</button>
            </div>
          </div>

          <div className="grand-card">
            <div className="grand-section-title">
              <b>Step 2: Tenant Admin Create</b>
              <span>Creates SHOP_ADMIN as inactive / PENDING_SETUP</span>
            </div>
            <div className="grand-form-grid">
              <label>Username<input value={tenantAdminDraft.username} onChange={(event) => setTenantAdminDraft({ ...tenantAdminDraft, username: event.target.value })} placeholder="tenant admin username" /></label>
              <label>Email<input value={tenantAdminDraft.email} onChange={(event) => setTenantAdminDraft({ ...tenantAdminDraft, email: event.target.value })} placeholder="tenant@example.com" /></label>
              <label>Name<input value={tenantAdminDraft.name} onChange={(event) => setTenantAdminDraft({ ...tenantAdminDraft, name: event.target.value })} /></label>
              <label>Password<input value={tenantAdminDraft.password} onChange={(event) => setTenantAdminDraft({ ...tenantAdminDraft, password: event.target.value })} placeholder="optional auto-generate" /></label>
              <label className="check"><input type="checkbox" checked={tenantAdminDraft.googleAccount} onChange={(event) => setTenantAdminDraft({ ...tenantAdminDraft, googleAccount: event.target.checked })} /> Google link ready</label>
              <label className="check"><input type="checkbox" checked={tenantAdminDraft.sendEmail} onChange={(event) => setTenantAdminDraft({ ...tenantAdminDraft, sendEmail: event.target.checked })} /> Send email</label>
            </div>
            <div className="grand-switch-list"><button type="button" onClick={createTenantAdmin}>Create Tenant Admin</button></div>
            {tenantAdminResult?.temporaryPassword ? <div className="grand-secret"><b>Temporary Password</b><code>{tenantAdminResult.temporaryPassword}</code></div> : null}
          </div>

          <div className="grand-card">
            <div className="grand-section-title">
              <b>Step 2: Tenant User Filter / Export</b>
              <span>Email / phone / marketing rows for selected tenant</span>
            </div>
            <div className="grand-export-grid">
              <article><Mail size={16} /><span>Emails</span><b>{tenantExport.emails?.length || 0}</b><small>{tenantExport.emails?.join(', ') || '-'}</small></article>
              <article><Phone size={16} /><span>Phones</span><b>{tenantExport.phones?.length || 0}</b><small>{tenantExport.phones?.join(', ') || '-'}</small></article>
              <article><Users size={16} /><span>Marketing Rows</span><b>{tenantExport.marketingRows?.length || 0}</b><button type="button" onClick={() => copyMarketingRows(tenantExport.marketingRows)}>Copy CSV</button></article>
            </div>
          </div>

          <div className="grand-card">
            <div className="grand-section-title">
              <b>Shop Users</b>
              <span>Auth setup, Google link, safe active, reset password</span>
            </div>
            <div className="grand-user-list">
              {shopUsers.map((user) => (
                <article key={user.id}>
                  <div>
                    <b>{user.name || user.username}</b>
                    <span>{user.username} · {user.role} · {user.authProvider || 'password'} · {user.status || (user.active ? 'ACTIVE' : 'SUSPENDED')}</span>
                    <small>{user.lastLoginAt ? `Last login ${dateText(user.lastLoginAt)}` : 'No login yet'}</small>
                  </div>
                  <button type="button" onClick={() => updateUser(user, { active: !user.active })}>{user.active ? 'Suspend' : 'Safe Active'}</button>
                  <button type="button" onClick={() => setAuthSetup({ user, username: user.username || '', email: user.email || '', password: '', passwordMustChange: true, googleLinkAllowed: Boolean(user.googleLinkAllowed), status: user.status || (user.active ? 'ACTIVE' : 'SUSPENDED') })}>Auth Setup</button>
                  <button type="button" onClick={() => allowGoogleLink(user)}><Link2 size={14} /> Google</button>
                  <button type="button" onClick={() => setPasswordReset({ user, password: '' })}><KeyRound size={14} /> Reset</button>
                </article>
              ))}
              {!shopUsers.length ? <div className="grand-empty">No users</div> : null}
            </div>
          </div>

          <div className="grand-card danger-zone">
            <div className="grand-section-title">
              <b>Step 2: Tenant Governance Danger Zone</b>
              <span>Suspend before soft delete. These actions change production tenant status.</span>
            </div>
            <div className="grand-switch-list">
              <button type="button" className="danger" onClick={suspendTenant}><Power size={14} /> Suspend Tenant</button>
              <button type="button" className="danger" onClick={softDeleteTenant}><Trash2 size={14} /> Soft Delete</button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grand-card">
        <div className="grand-section-title">
          <b>Step 2 Global Tenant User Filter</b>
          <span>GET /api/grand-admin/users route. Read-only filter + export.</span>
        </div>
        <div className="grand-toolbar grand-filter-toolbar">
          <label><Search size={17} /><input value={userFilter.q} onChange={(event) => setUserFilter({ ...userFilter, q: event.target.value })} placeholder="Search user / email / shop" /></label>
          <select value={userFilter.provider} onChange={(event) => setUserFilter({ ...userFilter, provider: event.target.value })}><option value="">All login</option><option value="google">Google</option><option value="password">Password</option></select>
          <select value={userFilter.role} onChange={(event) => setUserFilter({ ...userFilter, role: event.target.value })}><option value="">All roles</option><option>SHOP_ADMIN</option><option>CASHIER</option></select>
          <select value={userFilter.status} onChange={(event) => setUserFilter({ ...userFilter, status: event.target.value })}><option value="">All status</option><option>ACTIVE</option><option>SUSPENDED</option><option>PENDING_SETUP</option><option>DELETED</option></select>
          <button type="button" onClick={loadGlobalUsers}>Load Users</button>
        </div>
        <div className="grand-detail-row">
          <span>Users: <b>{globalUsers.length}</b></span>
          <span>Emails: <b>{globalExport.emails?.length || 0}</b></span>
          <span>Phones: <b>{globalExport.phones?.length || 0}</b></span>
          <button type="button" onClick={() => copyMarketingRows(globalExport.marketingRows)}>Copy Marketing CSV</button>
        </div>
      </section>

      <section className="grand-card">
        <div className="grand-section-title">
          <b>Global Audit Log</b>
          <span>System-wide user activity</span>
        </div>
        <div className="grand-audit-list">
          {auditRows.map((row) => (
            <article key={row.id}>
              <b>{row.action}</b>
              <span>{row.shop?.name || 'Platform'} · {row.user?.name || row.user?.username || '-'}</span>
              <small>{dateText(row.createdAt)}</small>
            </article>
          ))}
        </div>
      </section>

      {passwordReset.user ? (
        <div className="grand-modal-backdrop">
          <section className="grand-modal">
            <header>
              <div><b>Password Reset</b><span>{passwordReset.user.name} · {passwordReset.user.username}</span></div>
              <button type="button" onClick={() => setPasswordReset({ user: null, password: '' })}>×</button>
            </header>
            <label>
              <span>New Temporary Password</span>
              <input value={passwordReset.password} onChange={(event) => setPasswordReset({ ...passwordReset, password: event.target.value })} placeholder="At least 8 characters" />
            </label>
            <footer>
              <button type="button" onClick={() => setPasswordReset({ user: null, password: '' })}>Cancel</button>
              <button type="button" className="primary" onClick={resetPassword} disabled={passwordReset.password.length < 8}>Reset Password</button>
            </footer>
          </section>
        </div>
      ) : null}

      {authSetup?.user ? (
        <div className="grand-modal-backdrop">
          <section className="grand-modal">
            <header>
              <div><b>User Auth Setup</b><span>{authSetup.user.name || authSetup.user.username}</span></div>
              <button type="button" onClick={() => setAuthSetup(null)}>×</button>
            </header>
            <label><span>Username</span><input value={authSetup.username} onChange={(event) => setAuthSetup({ ...authSetup, username: event.target.value })} /></label>
            <label><span>Email / Google Email</span><input value={authSetup.email} onChange={(event) => setAuthSetup({ ...authSetup, email: event.target.value })} /></label>
            <label><span>Optional New Password</span><input value={authSetup.password} onChange={(event) => setAuthSetup({ ...authSetup, password: event.target.value })} placeholder="leave blank to keep current" /></label>
            <label><span>Status</span><select value={authSetup.status} onChange={(event) => setAuthSetup({ ...authSetup, status: event.target.value })}><option>ACTIVE</option><option>SUSPENDED</option><option>LOCKED</option><option>PENDING_SETUP</option><option>PASSWORD_RESET_REQUIRED</option><option>DELETED</option></select></label>
            <label className="grand-checkline"><input type="checkbox" checked={authSetup.passwordMustChange} onChange={(event) => setAuthSetup({ ...authSetup, passwordMustChange: event.target.checked })} /> Password must change</label>
            <label className="grand-checkline"><input type="checkbox" checked={authSetup.googleLinkAllowed} onChange={(event) => setAuthSetup({ ...authSetup, googleLinkAllowed: event.target.checked })} /> Allow Google link</label>
            <footer>
              <button type="button" onClick={() => setAuthSetup(null)}>Cancel</button>
              <button type="button" className="primary" onClick={saveAuthSetup}>Save Auth Setup</button>
            </footer>
          </section>
        </div>
      ) : null}
    </div>
  );
}
