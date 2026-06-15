import React from 'react';
import { BarChart3, History, Users, Wallet } from 'lucide-react';
import './connected-workspace.css';

const links = [
  { name: 'Sales History', label: 'Sales History', description: 'Invoice records', icon: History },
  { name: 'Customers', label: 'Customers & Credit', description: 'Profiles and balances', icon: Users },
  { name: 'Accounting', label: 'Payments & Accounts', description: 'Cash and wallets', icon: Wallet },
  { name: 'Reports', label: 'Reports', description: 'Business summary', icon: BarChart3 },
];

export default function ConnectedWorkspace({ active, onNavigate, actions }) {
  return (
    <section className="connected-workspace">
      <div className="connected-workspace-heading">
        <span className="connected-workspace-eyebrow">CONNECTED WORKSPACES</span>
        {actions ? <div className="connected-workspace-actions">{actions}</div> : null}
      </div>
      <nav className="connected-workspace-nav" aria-label="Connected pages">
        {links.map((item) => {
          const Icon = item.icon;
          const selected = active === item.name;
          return (
            <button
              key={item.name}
              type="button"
              className={selected ? 'active' : ''}
              onClick={() => onNavigate?.(item.name)}
              aria-current={selected ? 'page' : undefined}
            >
              <span className="connected-workspace-icon"><Icon size={18} /></span>
              <span><b>{item.label}</b><small>{item.description}</small></span>
            </button>
          );
        })}
      </nav>
    </section>
  );
}
