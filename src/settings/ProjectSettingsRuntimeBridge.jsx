import React, { useEffect, useState } from 'react';
import { SlidersHorizontal, WalletCards } from 'lucide-react';
import ProjectSettingsCenter from './ProjectSettingsCenter.jsx';
import ProjectOperationsSettingsV23 from './ProjectOperationsSettingsV23.jsx';
import { applyProjectLanguage } from './ProjectLanguageRuntime.jsx';
import './project-operations-v23.css';

const THEME_KEY = 'mahar-pos-theme';

export function applyProjectTheme(value) {
  if (typeof document === 'undefined') return;
  const theme = ['light', 'dark', 'system'].includes(value) ? value : 'light';
  const dark = theme === 'dark'
    || (theme === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  document.body.classList.toggle('dark', dark);
  document.documentElement.dataset.theme = theme;
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage can be unavailable in browser privacy mode.
  }
  window.dispatchEvent(new CustomEvent('mahar-project-theme', { detail: { theme, dark } }));
}

export default function ProjectSettingsRuntimeBridge() {
  const [group, setGroup] = useState('operations');

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(THEME_KEY);
    if (storedTheme) applyProjectTheme(storedTheme);

    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    const refreshSystemTheme = () => {
      if (document.documentElement.dataset.theme === 'system') applyProjectTheme('system');
    };
    media?.addEventListener?.('change', refreshSystemTheme);
    return () => media?.removeEventListener?.('change', refreshSystemTheme);
  }, []);

  const onChange = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    if (['light', 'dark', 'system'].includes(target.value)) applyProjectTheme(target.value);
    if (['my', 'en'].includes(target.value)) applyProjectLanguage(target.value);
  };

  return <div className="project-settings-v23-centralized" onChangeCapture={onChange}>
    <nav className="project-settings-group-tabs">
      <button type="button" className={group === 'operations' ? 'active' : ''} onClick={() => setGroup('operations')}><WalletCards size={18}/><span><b>Payments & Operations</b><small>Wallets, Fees, Categories, Google Sheet</small></span></button>
      <button type="button" className={group === 'general' ? 'active' : ''} onClick={() => setGroup('general')}><SlidersHorizontal size={18}/><span><b>General Project Settings</b><small>Preference, Slip, Profile, Users, Appearance</small></span></button>
    </nav>

    {group === 'operations' ? <ProjectOperationsSettingsV23/> : <ProjectSettingsCenter/>}
  </div>;
}
