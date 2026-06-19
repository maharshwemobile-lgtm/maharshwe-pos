import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  KeyRound,
  Link2,
  Loader2,
  LockKeyhole,
  Mail,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  UserPlus,
  UserRound,
} from 'lucide-react';
import { apiFetch } from '../phase2Api';
import AdminPasswordResetPanel from './AdminPasswordResetPanel.jsx';
import UserDeleteDangerZone from './UserDeleteDangerZone.jsx';

const TABS = [
  ['tab.Dashboard','Dashboard'],['tab.Sale POS','Sale POS'],['tab.Sales History','Sales History'],['tab.Repairs','Repairs'],['tab.Partner Settlement','Partner Settlement'],['tab.Products','Products'],['tab.Stock','Stock'],['tab.Purchases','Purchases'],['tab.Customers','Customers & Credit'],['tab.Accounting','Finance & Accounts'],['tab.Reports','Reports'],['tab.Audit Trail','Audit Trail'],['tab.Backup','Backup'],['tab.Settings','Settings'],
];

const FUNCTIONS = [
  ['sale','Use Sale POS'],['history','View Sales History'],['reprint','Reprint / Print Voucher'],['export','Export CSV / Download'],['discount','Apply Discount'],['editSale','Edit Sale'],['deleteSale','Void / Delete Sale'],['repairs','View Repair Platform'],['repairCreate','Create Repair'],['repairEdit','Edit Repair / Status / Finance'],['repairPrint','Print Repair Voucher'],['repairImport','Import / Sync Repair'],['inventory','View Stock & Purchasing'],['stockAdjust','Stock In / Out / Adjustment'],['stockHistory','View Stock Movements'],['productEdit','Create / Edit Products'],['purchaseApprove','Approve Purchase Order'],['purchaseReceive','Receive Purchase Goods'],['purchasePayment','Pay Supplier'],['purchaseReturn','Return Purchase Goods'],['repairParts','Use / Reverse Repair Parts'],['accounting','Finance & Reports'],['settings','Manage Settings & Accounts'],['viewCost','View Cost & Profit'],
];

const DEFAULTS = {
  SHOP_ADMIN: Object.fromEntries([...TABS, ...FUNCTIONS].map(([key]) => [key, true])),
  CASHIER: {
    ...Object.fromEntries(TABS.map(([key]) => [key, false])),
    ...Object.fromEntries(FUNCTIONS.map(([key]) => [key, false])),
    'tab.Dashboard': true,
    'tab.Sale POS': true,
    'tab.Sales History': true,
    sale: true,
    history: true,
    reprint: true,
  },
};

function permissionsFor(user) {
  const permissions = { ...(DEFAULTS[user?.role] || DEFAULTS.CASHIER), ...(user?.permissions || {}) };
  if (user?.role === 'SHOP_ADMIN') permissions['tab.Settings'] = true;
  return permissions;
}

function PermissionGrid({ title, icon: Icon, rows, permissions, onToggle, mode, lockedKey }) {
  return <div className="ps-permission-section"><h4><Icon size={17}/>{title}</h4><div className="ps-permission-grid">{rows.map(([key,label]) => {
    const locked = key === lockedKey;
    const enabled = locked || permissions?.[key] === true;
    return <button type="button" key={key} className={enabled ? 'enabled' : 'disabled'} disabled={locked} onClick={() => onToggle(key)}>{enabled ? (mode === 'tab' ? <Eye size={16}/> : <Check size={16}/>) : <EyeOff size={16}/>}<span>{label}</span><em>{locked ? 'Required' : enabled ? (mode === 'tab' ? 'Show' : 'Allow') : (mode === 'tab' ? 'Hide' : 'Block')}</em></button>;
  })}</div></div>;
}

function AccordionSection({ id, title, description, icon: Icon, openPanel, setOpenPanel, tone = '', children, onOpen }) {
  const open = openPanel === id;
  const toggle = () => {
    const next = open ? '' : id;
    setOpenPanel(next);
    if (!open && onOpen) onOpen();
  };
  return <section className={`ps-user-accordion ${tone} ${open ? 'open' : ''}`}>
    <button type="button" className="ps-user-accordion-toggle" onClick={toggle} aria-expanded={open}>
      <Icon size={19}/><span><b>{title}</b><small>{description}</small></span><ChevronDown className="ps-user-accordion-chevron" size={18}/>
    </button>
    {open ? <div className="ps-user-accordion-body">{children}</div> : null}
  </section>;
}

function formatDate(value) {
  if (!value) return '-';
  try { return new Date(value).toLocaleString(); } catch { return String(value); }
}

export default function ProjectUserAccessSettingsV2({ notify }) {
  const [tenant,setTenant] = useState(null);
  const [users,setUsers] = useState([]);
  const [selectedId,setSelectedId] = useState('');
  const [editor,setEditor] = useState(null);
  const [createForm,setCreateForm] = useState({name:'',username:'',password:'',role:'CASHIER',googleEmail:''});
  const [openPanel,setOpenPanel] = useState('');
  const [activity,setActivity] = useState([]);
  const [activityLoading,setActivityLoading] = useState(false);
  const [loading,setLoading] = useState(false);
  const [saving,setSaving] = useState(false);
  const [creating,setCreating] = useState(false);

  const selected = useMemo(() => users.find((user) => user.id === selectedId) || null,[users,selectedId]);
  const canShowDelete = selected?.role === 'CASHIER' && editor?.role === 'CASHIER';

  const editorFrom = (user) => user ? {
    name:user.name,role:user.role,active:user.active,permissions:permissionsFor(user),
    googleEmail:user.googleEmail || '',googleEnabled:user.googleEnabled === true,
  } : null;

  const load = async (preferredId = selectedId) => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/accounts/v24');
      const list = data.users || [];
      setTenant(data.tenant || null);
      setUsers(list);
      const id = preferredId && list.some((user) => user.id === preferredId) ? preferredId : list[0]?.id || '';
      setSelectedId(id);
      setEditor(editorFrom(list.find((item) => item.id === id)));
    } catch (error) { notify('error',error.message || 'Accounts load failed'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(''); }, []);

  const selectUser = (id) => {
    const user = users.find((item) => item.id === id);
    setSelectedId(id);
    setEditor(editorFrom(user));
    setActivity([]);
    setOpenPanel('');
  };

  const toggle = (key) => setEditor((current) => {
    if (!current || (current.role === 'SHOP_ADMIN' && key === 'tab.Settings')) return current;
    return {...current,permissions:{...current.permissions,[key]:current.permissions?.[key] !== true}};
  });

  const changeRole = (role) => {
    setEditor((current) => current ? {...current,role,permissions:{...(DEFAULTS[role] || {})}} : current);
    if (role === 'SHOP_ADMIN' && openPanel === 'delete') setOpenPanel('');
  };

  const createUser = async (event) => {
    event.preventDefault();
    setCreating(true);
    try {
      const data = await apiFetch('/api/accounts/v24',{method:'POST',body:{...createForm,permissions:DEFAULTS[createForm.role]}});
      setCreateForm({name:'',username:'',password:'',role:'CASHIER',googleEmail:''});
      notify('success','Account created. Google email is pre-approved when provided.');
      await load(data.user?.id || '');
    } catch (error) { notify('error',error.message || 'Account create failed'); }
    finally { setCreating(false); }
  };

  const saveUser = async () => {
    if (!selected || !editor) return;
    setSaving(true);
    try {
      const permissions = {...editor.permissions};
      if (editor.role === 'SHOP_ADMIN') permissions['tab.Settings'] = true;
      await apiFetch(`/api/users/live/${selected.id}`,{method:'PATCH',body:{name:editor.name,role:editor.role,active:editor.active,permissions}});
      await apiFetch(`/api/accounts/v24/${selected.id}/google`,{method:'PATCH',body:{googleEmail:editor.googleEmail.trim() || null,active:editor.googleEnabled}});
      notify('success','Account, permissions and Google sign-in settings saved');
      await load(selected.id);
    } catch (error) { notify('error',error.message || 'Account save failed'); }
    finally { setSaving(false); }
  };

  const loadActivity = async () => {
    if (!selectedId) return;
    setActivityLoading(true);
    try {
      const data = await apiFetch(`/api/accounts/v24/${selectedId}/login-activity?limit=30`);
      setActivity(data.activity || []);
    } catch (error) { notify('error',error.message || 'Login activity load failed'); }
    finally { setActivityLoading(false); }
  };

  return <div className="ps-access-layout">
    <section className="ps-panel">
      <header className="ps-panel-head"><div><UserPlus size={20}/><span><h3>Create Account</h3><p>{tenant?.name || 'Current Shop'} · Password login + optional Google sign-in</p></span></div></header>
      <form className="ps-form" onSubmit={createUser}>
        <label><span>Name</span><input value={createForm.name} onChange={(event) => setCreateForm({...createForm,name:event.target.value})} required/></label>
        <label><span>Username</span><input value={createForm.username} onChange={(event) => setCreateForm({...createForm,username:event.target.value})} required/></label>
        <label><span>Password</span><input type="password" minLength="6" value={createForm.password} onChange={(event) => setCreateForm({...createForm,password:event.target.value})} required/></label>
        <label><span>Google Email (optional)</span><input type="email" value={createForm.googleEmail} onChange={(event) => setCreateForm({...createForm,googleEmail:event.target.value})} placeholder="staff@gmail.com"/><small>First Google sign-in links only this approved email.</small></label>
        <label><span>Role</span><select value={createForm.role} onChange={(event) => setCreateForm({...createForm,role:event.target.value})}><option value="SHOP_ADMIN">Shop Admin</option><option value="CASHIER">Staff / Cashier</option></select></label>
        <button className="ps-primary" type="submit" disabled={creating}>{creating ? <Loader2 className="ps-spin" size={18}/> : <UserPlus size={18}/>}Create Account</button>
      </form>
    </section>

    <section className="ps-panel ps-user-editor">
      <header className="ps-panel-head"><div><ShieldCheck size={20}/><span><h3>Account & Login Management</h3><p>Create accounts, Google sign-in, permissions and login history.</p></span></div><button className="ps-icon-button" type="button" onClick={() => load()} disabled={loading}><RefreshCw className={loading ? 'ps-spin' : ''} size={18}/></button></header>
      <div className="ps-user-picker">{users.map((user) => <button type="button" key={user.id} className={selectedId === user.id ? 'active' : ''} onClick={() => selectUser(user.id)}><UserRound size={17}/><span><b>{user.name}</b><small>@{user.username} · {user.role} · {(user.loginMethods || ['PASSWORD']).join(' + ')}</small></span><em className={user.active ? 'active' : 'inactive'}>{user.active ? 'Active' : 'Off'}</em></button>)}</div>
      {editor ? <div className="ps-access-editor">
        <div className="ps-grid-2">
          <label><span>Display Name</span><input value={editor.name} onChange={(event) => setEditor({...editor,name:event.target.value})}/></label>
          <label><span>Role</span><select value={editor.role} onChange={(event) => changeRole(event.target.value)}><option value="SHOP_ADMIN">Shop Admin</option><option value="CASHIER">Staff / Cashier</option></select></label>
        </div>
        <label className="ps-switch-row"><span><b>Account Active</b><small>Inactive account cannot use password or Google login.</small></span><input type="checkbox" checked={editor.active} onChange={(event) => setEditor({...editor,active:event.target.checked})}/></label>
        <button className="ps-primary" type="button" onClick={saveUser} disabled={saving}>{saving ? <Loader2 className="ps-spin" size={18}/> : <Save size={18}/>}Save Account</button>

        <div className="ps-user-accordion-list">
          <AccordionSection id="google" title="Google Sign-in" description="Pre-approved Gmail and link status" icon={Mail} openPanel={openPanel} setOpenPanel={setOpenPanel}>
            <div className="ps-form">
              <label><span>Approved Google Email</span><input type="email" value={editor.googleEmail} onChange={(event) => setEditor({...editor,googleEmail:event.target.value})} placeholder="staff@gmail.com"/></label>
              <label className="ps-switch-row"><span><b>Allow Google Sign-in</b><small>{selected?.googleLinked ? `Linked ${formatDate(selected.googleLinkedAt)}` : editor.googleEmail ? 'Waiting for first sign-in' : 'Add an email first'}</small></span><input type="checkbox" checked={editor.googleEnabled} onChange={(event) => setEditor({...editor,googleEnabled:event.target.checked})}/></label>
              <div className="ps-empty"><Link2 size={18}/> Changing the email clears the old Google identity link. Unknown emails cannot create admin accounts automatically.</div>
            </div>
          </AccordionSection>

          <AccordionSection id="activity" title="Login Activity" description="Password, Google sign-in, blocked attempts and logout" icon={Activity} openPanel={openPanel} setOpenPanel={setOpenPanel} onOpen={loadActivity}>
            {activityLoading ? <div className="ps-empty"><Loader2 className="ps-spin"/> Loading login activity…</div> : activity.length ? <div className="ps-login-activity">{activity.map((item) => <article key={item.id}><b>{item.action.replaceAll('_',' ')}</b><span>{formatDate(item.createdAt)}</span><small>{item.ipAddress || 'No IP'} · {item.details?.email || item.details?.reason || item.details?.role || '-'}</small></article>)}</div> : <div className="ps-empty">No login activity recorded yet.</div>}
          </AccordionSection>

          <AccordionSection id="password" title="Admin Password Reset" description="Temporary password အသစ်သတ်မှတ်ရန်" icon={LockKeyhole} openPanel={openPanel} setOpenPanel={setOpenPanel}>
            <AdminPasswordResetPanel key={`password-${selected.id}`} user={selected} notify={notify} onReset={() => load(selected.id)}/>
          </AccordionSection>

          <AccordionSection id="tabs" title="Tab Visibility" description="User မြင်ရမည့် Menu Tabs ကို Show / Hide လုပ်ရန်" icon={Eye} openPanel={openPanel} setOpenPanel={setOpenPanel}>
            <PermissionGrid title="Tab Visibility" icon={Eye} rows={TABS} permissions={editor.permissions} onToggle={toggle} mode="tab" lockedKey={editor.role === 'SHOP_ADMIN' ? 'tab.Settings' : null}/>
          </AccordionSection>

          {canShowDelete ? <AccordionSection id="delete" title="Delete User" description="Staff / Cashier account ကိုအပြီးဖယ်ရှားရန်" icon={Trash2} openPanel={openPanel} setOpenPanel={setOpenPanel} tone="danger">
            <UserDeleteDangerZone key={`delete-${selected.id}`} user={selected} notify={notify} onDeleted={() => load('')}/>
          </AccordionSection> : null}

          <AccordionSection id="functions" title="Function Permissions" description="လုပ်ဆောင်ချက်တစ်ခုချင်းစီကို Allow / Block လုပ်ရန်" icon={KeyRound} openPanel={openPanel} setOpenPanel={setOpenPanel}>
            <PermissionGrid title="Function Permissions" icon={KeyRound} rows={FUNCTIONS} permissions={editor.permissions} onToggle={toggle} mode="function"/>
          </AccordionSection>
        </div>
      </div> : <div className="ps-empty">No account selected.</div>}
    </section>
  </div>;
}
