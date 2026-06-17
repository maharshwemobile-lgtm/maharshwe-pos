import React, { useState } from 'react';
import CustomerRepairAdminPanel from './CustomerRepairAdminPanel.jsx';
import RepairOperationsWorkspace from './RepairOperationsWorkspace.jsx';
import RepairVoucherPrintPanel from './printing/RepairVoucherPrintPanel.jsx';

export default function Phase8RepairWorkspace() {
  const [message, setMessage] = useState(null);
  const notify = (type, text) => {
    setMessage({ type, text });
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => setMessage(null), 4000);
  };

  return (
    <div className="phase11-repair-root" style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
      <section className="repair-page-heading phase11-repair-heading" style={{ margin: 0 }}>
        <div>
          <span>PHASE 7 · REPAIR</span>
          <h2>Repair Platform</h2>
          <p>Advanced Repair Platform</p>
        </div>
      </section>
      <RepairVoucherPrintPanel notify={notify}/>
      <CustomerRepairAdminPanel />
      <RepairOperationsWorkspace />
      {message ? <div className={`repair-finance-toast ${message.type}`}>{message.text}</div> : null}
    </div>
  );
}
