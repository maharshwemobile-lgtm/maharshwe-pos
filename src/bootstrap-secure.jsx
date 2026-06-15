import React from 'react';
import { createRoot } from 'react-dom/client';
import AppSecure from './AppSecure.jsx';
import './styles.css';
import './pos/pos-minimal-overrides.css';

createRoot(document.getElementById('root')).render(React.createElement(AppSecure));
