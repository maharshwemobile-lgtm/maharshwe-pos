import React from 'react';
import AppFull from './AppFull.jsx';
import GoogleAuthGate from './GoogleAuthGate.jsx';
import CustomerRepairPortal from './CustomerRepairPortal.jsx';

export default function AppSecure() {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  if (pathname === '/repair' || pathname === '/repair-status') {
    return <CustomerRepairPortal />;
  }

  return (
    <GoogleAuthGate>
      <AppFull />
    </GoogleAuthGate>
  );
}
