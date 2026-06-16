import React from 'react';
import CustomerRepairAdminPanel from './CustomerRepairAdminPanel.jsx';
import RepairOperationsWorkspace from './RepairOperationsWorkspace.jsx';

export default function Phase8RepairWorkspace() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
      <CustomerRepairAdminPanel />
      <RepairOperationsWorkspace />
    </div>
  );
}
