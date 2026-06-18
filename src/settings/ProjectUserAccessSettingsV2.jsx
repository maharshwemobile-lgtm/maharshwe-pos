import React, { useEffect, useMemo, useState } from 'react';
import { Check, Eye, EyeOff, KeyRound, Loader2, RefreshCw, Save, ShieldCheck, UserPlus, UserRound } from 'lucide-react';
import { apiFetch } from '../phase2Api';

const TABS = [
  ['tab.Dashboard','Dashboard'],['tab.Sale POS','Sale POS'],['tab.Sales History','Sales History'],['tab.Repairs','Repairs'],['tab.Partner Settlement','Partner Settlement'],['tab.Products','Products'],['tab.Stock','Stock'],['tab.Purchases','Purchases'],['tab.Customers','Customers & Credit'],['tab.Accounting','Finance & Accounts'],['tab.Reports','Reports'],['tab.Audit Trail','Audit Trail'],['tab.Backup','Backup'],['tab.Settings','Settings'],
];

const FUNCTIONS = [
  ['sale','Use Sale POS'],['history','View Sales History'],['reprint','Reprint / Print Voucher'],['export','Export CSV / Download'],['discount','Apply Discount'],['editSale','Edit Sale'],['deleteSale','Void / Delete Sale'],['repairs','View Repair Platform'],['repairCreate','Create Repair'],['repairEdit','Edit Repair / Status / Finance'],['repairPrint','Print Repair Voucher'],['repairImport','Import / Sync Repair'],['inventory','View Stock & Purchasing'],['stockAdjust','Stock In / Out / Adjustment'],['stockHistory','View Stock Movements'],['productEdit','Create / Edit Products'],['purchaseApprove','Approve Purchase Order'],['purchaseReceive','Receive Purchase Goods'],['purchasePayment','Pay Supplier'],['purchaseReturn','Return Purchase Goods'],['repairParts','Use / Reverse Repair Parts'],['accounting','Finance & Reports'],['settings','Manage Settings & Users'],['viewCost','View Cost & Profit'],
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

export default function ProjectUserAccessSettingsV2({ notify }) {
  const [tenant,setTenant] = useState(null);
  const [users,setUsers] = useState([]);
  const [selectedId,setSelectedId] = useState('');
  const [editor,setEditor] = useState(null);
  const [createForm,setCreateForm] = useState({name:'',username:'',password:'',role:'CASHIER'});
  const [loading,setLoading] = useState(false);
  const [saving,setSaving] = useState(false);
  const [creating,setCreating] = useState(false);

  const selected = useMemo(() => users.find((user) => user.id === selectedId) || null,[users,selectedId]);

  const load = async (preferredId = selectedId) => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/users/live');
      const list = data.users || [];
      setTenant(data.tenant || null);
      setUsers(list);
      const id = preferredId && list.some((user) => user.id === preferredId) ? preferredId : list[0]?.id || '';
      setSelectedId(id);
      const user = list.find((item) => item.id === id);
      setEditor(user ? {name:user.name,role:user.role,active:user.active,password:'',permissions:permissionsFor(user)} : null);
    } catch (error) { notify('error',error.message || 'Users load failed'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(''); }, []);

  const selectUser = (id) => {
    const user = users.find((item) => item.id === id);
    setSelectedId(id);
    setEditor(user ? {name:user.name,role:user.role,active:user.active,password:'',permissions:permissionsFor(user)} : null);
  };

  const toggle = (key) => setEditor((current) => {
    if (!current || (current.role === 'SHOP_ADMIN' && key === 'tab.Settings')) return current;
    return {...current,permissions:{...current.permissions,[key]:current.permissions?.[key] !== true}};
  });
  const changeRole = (role) => setEditor((current) => current ? {...current,role,permissions:{...(DEFAULTS[role] || {})}} : current);

  const createUser = async (event) => {
    event.preventDefault();
    setCreating(true);
    try {
      const data = await apiFetch('/api/users/live',{method:'POST',body:{...createForm,permissions:DEFAULTS[createForm.role]}});
      setCreateForm({name:'',username:'',password:'',role:'CASHIER'});
      notify('success','New PostgreSQL tenant user created');
      await load(data.user?.id || '');
    } catch (error) { notify('error',error.message || 'User create failed'); }
    finally { setCreating(false); }
  };

  const saveUser = async () => {
    if (!selected || !editor) return;
    setSaving(true);
    try {
      const permissions = {...editor.permissions};
      if (editor.role === 'SHOP_ADMIN') permissions['tab.Settings'] = true;
      await apiFetch(`/api/users/live/${selected.id}`,{method:'PATCH',body:{name:editor.name,role:editor.role,active:editor.active,permissions,...(editor.password ? {password:editor.password} : {})}});
      notify('success','User role, function permissions and hidden tabs saved');
      await load(selected.id);
    } catch (error) { notify('error',error.message || 'User save failed'); }
    finally { setSaving(false); }
  };

  return <div className="ps-access-layout">
    <section className="ps-panel">
      <header className="ps-panel-head"><div><UserPlus size={20}/><span><h3>Create User</h3><p>{tenant?.name || 'Current Shop'} PostgreSQL tenant</p></span></div></header>
      <form className="ps-form" onSubmit={createUser}>
        <label><span>Name</span><input value={createForm.name} onChange={(event) => setCreateForm({...createForm,name:event.target.value})} required/></label>
        <label><span>Username</span><input value={createForm.username} onChange={(event) => setCreateForm({...createForm,username:event.target.value})} required/></label>
        <label><span>Password</span><input type="password" minLength="6" value={createForm.password} onChange={(event) => setCreateForm({...createForm,password:event.target.value})} required/></label>
        <label><span>Role</span><select value={createForm.role} onChange={(event) => setCreateForm({...createForm,role:event.target.value})}><option value="SHOP_ADMIN">Shop Admin</option><option value="CASHIER">Staff / Cashier</option></select></label>
        <button className="ps-primary" type="submit" disabled={creating}>{creating ? <Loader2 className="ps-spin" size={18}/> : <UserPlus size={18}/>}Create User</button>
      </form>
    </section>

    <section className="ps-panel ps-user-editor">
      <header className="ps-panel-head"><div><ShieldCheck size={20}/><span><h3>Role, Permission & Visibility</h3><p>Function buttons နဲ့ Tabs ကို User တစ်ယောက်ချင်းစီအလိုက် Show / Hide၊ Allow / Block လုပ်ပါ။</p></span></div><button className="ps-icon-button" type="button" onClick={() => load()} disabled={loading}><RefreshCw className={loading ? 'ps-spin' : ''} size={18}/></button></header>
      <div className="ps-user-picker">{users.map((user) => <button type="button" key={user.id} className={selectedId === user.id ? 'active' : ''} onClick={() => selectUser(user.id)}><UserRound size={17}/><span><b>{user.name}</b><small>@{user.username} · {user.role}</small></span><em className={user.active ? 'active' : 'inactive'}>{user.active ? 'Active' : 'Off'}</em></button>)}</div>
      {editor ? <div className="ps-access-editor">
        <div className="ps-grid-3">
          <label><span>Display Name</span><input value={editor.name} onChange={(event) => setEditor({...editor,name:event.target.value})}/></label>
          <label><span>Role</span><select value={editor.role} onChange={(event) => changeRole(event.target.value)}><option value="SHOP_ADMIN">Shop Admin</option><option value="CASHIER">Staff / Cashier</option></select></label>
          <label><span>Reset Password</span><input type="password" minLength="6" value={editor.password} onChange={(event) => setEditor({...editor,password:event.target.value})} placeholder="Leave blank to keep"/></label>
        </div>
        <label className="ps-switch-row"><span><b>User Active</b><small>Inactive user cannot log in.</small></span><input type="checkbox" checked={editor.active} onChange={(event) => setEditor({...editor,active:event.target.checked})}/></label>
        <PermissionGrid title="Tab Visibility" icon={Eye} rows={TABS} permissions={editor.permissions} onToggle={toggle} mode="tab" lockedKey={editor.role === 'SHOP_ADMIN' ? 'tab.Settings' : null}/>
        <PermissionGrid title="Function Permissions" icon={KeyRound} rows={FUNCTIONS} permissions={editor.permissions} onToggle={toggle} mode="function"/>
        <button className="ps-primary" type="button" onClick={saveUser} disabled={saving}>{saving ? <Loader2 className="ps-spin" size={18}/> : <Save size={18}/>}Save User Access</button>
      </div> : <div className="ps-empty">No user selected.</div>}
    </section>
  </div>;
}
