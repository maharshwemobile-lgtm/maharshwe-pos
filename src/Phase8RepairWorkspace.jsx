import React, { useState } from 'react';
import CustomerRepairAdminPanel from './CustomerRepairAdminPanel.jsx';
import RepairOperationsWorkspace from './RepairOperationsWorkspace.jsx';
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
      <RepairVoucherPrintPanel notify={notify}/>
      <CustomerRepairAdminPanel />
      <RepairOperationsWorkspace />
      {message ? <div className={`repair-finance-toast ${message.type}`}>{message.text}</div> : null}
    </div>
  );
}
