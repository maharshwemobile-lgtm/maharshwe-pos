import React, { useState } from 'react';
import { ClipboardList, PackageCheck, Truck, Users } from 'lucide-react';
import SupplierManagementPanel from './SupplierManagementPanel.jsx';
import Phase10PurchaseOrders from './Phase10PurchaseOrders.jsx';
import PurchaseStockPage from './PurchaseStockPage.jsx';
import './purchasing-workspace.css';
import './phase10-purchasing.css';

const tabs = [
  { id: 'suppliers', label: 'Suppliers', icon: Users },
  { id: 'orders', label: 'Purchase Orders', icon: ClipboardList },
  { id: 'legacy', label: 'Direct Receiving', icon: PackageCheck },
];

export default function PurchasingWorkspace() {
  const [tab, setTab] = useState('suppliers');

  return (
    <div className="purchasing-hub">
      <section className="purchasing-hero">
        <div className="purchasing-hero-icon"><Truck size={28} /></div>
        <div>
          <span>PHASE 10 · PURCHASING</span>
          <h2>Suppliers & Purchase Orders</h2>
          <p>Create supplier records and approve purchase orders before goods receiving. Creating or approving a PO does not change stock.</p>
        </div>
      </section>

      <nav className="purchasing-tabs" aria-label="Purchasing sections">
        {tabs.map((item) => (
          <button key={item.id} type="button" className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>
            <item.icon size={18} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {tab === 'suppliers' ? <SupplierManagementPanel onOpenOrders={() => setTab('orders')} /> : null}
      {tab === 'orders' ? <Phase10PurchaseOrders /> : null}
      {tab === 'legacy' ? <PurchaseStockPage /> : null}
    </div>
  );
}
