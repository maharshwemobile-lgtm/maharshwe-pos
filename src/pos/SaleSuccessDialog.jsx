import React from 'react';
import { CheckCircle2, ShoppingCart } from 'lucide-react';
import { formatMoney } from './posHelpers';

export default function SaleSuccessDialog({ sale, onNewSale }) {
  return <div className="smart-pos-modal-backdrop">
    <section className="smart-pos-modal smart-pos-success-modal">
      <div className="smart-pos-success-check"><CheckCircle2 size={42} /></div>
      <h2>အရောင်းသိမ်းပြီးပါပြီ</h2>
      <p>{sale.invoice}</p>
      <section className="smart-pos-success-grid">
        <div><span>ကျသင့်ငွေ</span><b>{formatMoney(sale.total)}</b></div>
        <div><span>ငွေပေးချေမှု</span><b>{sale.payment}</b></div>
        <div><span>ပြန်အမ်းငွေ</span><b>{formatMoney(sale.change)}</b></div>
      </section>
      <p>Stock၊ Account နဲ့ Report စာရင်းများ ပြောင်းလဲပြီးပါပြီ။</p>
      <div className="smart-pos-success-actions">
        <button type="button" className="primary" onClick={onNewSale}><ShoppingCart size={18} /> အရောင်းအသစ်စမည်</button>
      </div>
    </section>
  </div>;
}
