import React from 'react';
import { BarChart3, History, Users, Wallet } from 'lucide-react';
import './connected-workspace.css';

const links = [
  {
    name: 'Sales History',
    label: 'Sales History',
    description: 'Invoice, reprint, void and return follow-up',
    icon: History,
  },
  {
    name: 'Customers',
    label: 'Customers & Credit',
    description: 'Customer profile and receivable balances',
    icon: Users,
  },
  {
    name: 'Accounting',
    label: 'Payments & Accounts',
    description: 'Cash, KPay, Wave and expense records',
    icon: Wallet,
  },
  {
    name: 'Reports',
    label: 'Reports',
    description: 'Sales, receivable and business summary',
    icon: BarChart3,
  },
];

export default function ConnectedWorkspace({
  active,
  title,
  description,
  onNavigate,
  actions,
}) {
  return (
    <section className="connected-workspace">
      <div className="connected-workspace-heading">
        <div>
          <span className="connected-workspace-eyebrow">SALE AFTERCARE</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        {actions ? <div className="connected-workspace-actions">{actions}</div> : null}
      </div>

      <nav className="connected-workspace-nav" aria-label="Sale aftercare pages">
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
              <span className="connected-workspace-icon"><Icon size={19} /></span>
              <span>
                <b>{item.label}</b>
                <small>{item.description}</small>
              </span>
            </button>
          );
        })}
      </nav>
    </section>
  );
}
