import React from 'react';
import DashboardBusinessV4 from './DashboardBusinessV4.jsx';
import ExpenseCategoryPanel from './ExpenseCategoryPanel.jsx';

export default function DashboardBusinessV5(props) {
  return (
    <>
      <DashboardBusinessV4 {...props} />
      <ExpenseCategoryPanel />
    </>
  );
}
