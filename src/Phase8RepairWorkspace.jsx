import React, { useState } from 'react';
import CustomerRepairAdminPanel from './CustomerRepairAdminPanel.jsx';
import RepairOperationsWorkspace from './RepairOperationsWorkspace.jsx';
import RepairExportPanel from './RepairExportPanel.jsx';
import RepairVoucherPrintPanel from './printing/RepairVoucherPrintPanel.jsx';
import './phase11-repair-heading.css';

export default function Phase8RepairWorkspace() {
  const [message, setMessage] = useState(null);
  const notify = (type, text) => {
    setMessage({ type, text });
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => setMessage(null), 4000);
  };

  return (
    <div className="phase11-repair-root" style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
      <RepairOperationsWorkspace />

      <section className="phase11-repair-bottom-tools">
        <header className="phase11-repair-bottom-heading">
          <span>REPAIR TOOLS &amp; AFTERCARE</span>
          <h2>Voucher · Customer Portal · Export</h2>
          <p>Print, customer notification, pickup, warranty and repair transaction export functions.</p>
        </header>
        <RepairVoucherPrintPanel notify={notify}/>
        <CustomerRepairAdminPanel />
        <RepairExportPanel notify={notify}/>
      </section>

      {message ? <div className={`repair-finance-toast ${message.type}`}>{message.text}</div> : null}
    </div>
  );
}
