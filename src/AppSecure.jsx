import React from 'react';
import AppFull from './AppFull.jsx';
import GoogleAuthGate from './GoogleAuthGate.jsx';

export default function AppSecure() {
  return (
    <GoogleAuthGate>
      <AppFull />
    </GoogleAuthGate>
  );
}
