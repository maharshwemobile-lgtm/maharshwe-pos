import React from 'react';
import DashboardBusinessV3 from './DashboardBusinessV3.jsx';
import BusinessRecordsPanel from './BusinessRecordsPanel.jsx';

export default function DashboardBusinessV4(props) {
  return (
    <>
      <DashboardBusinessV3 {...props} />
      <BusinessRecordsPanel />
    </>
  );
}
