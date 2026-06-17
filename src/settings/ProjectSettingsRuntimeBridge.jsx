import React from 'react';
import ProjectSettingsCenter from './ProjectSettingsCenter.jsx';
import { applyProjectLanguage } from './ProjectLanguageRuntime.jsx';

function applyTheme(value) {
  const theme = ['light', 'dark', 'system'].includes(value) ? value : 'light';
  const dark = theme === 'dark'
    || (theme === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  document.body.classList.toggle('dark', dark);
  document.documentElement.dataset.theme = theme;
}

function labelText(target) {
  return String(target.closest('label')?.querySelector('span')?.textContent || '').trim();
}

export default function ProjectSettingsRuntimeBridge() {
  const onChange = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    const label = labelText(target);
    if (label === 'Theme' || label === 'Default Theme') applyTheme(target.value);
    if (label === 'Language' || label === 'Default Language') applyProjectLanguage(target.value);
  };

  return <div onChangeCapture={onChange}><ProjectSettingsCenter /></div>;
}
