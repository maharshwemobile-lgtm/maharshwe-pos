import React from 'react';
import {
  Ban,
  Banknote,
  Boxes,
  CheckCircle2,
  FileText,
  PackageCheck,
  Printer,
  ReceiptText,
  UserRound,
  X,
} from 'lucide-react';

const money = (value) => `${Number(value || 0).toLocaleString('en-US')} ကျပ်`;
const dateTime = (value) => value ? new Date(value).toLocaleString('en-GB') : '-';

function StockFlow({ item }) {
  const hasMovement = item.stockBefore !== null && item.stockAfter !== null;
  return (
    <div className="sales-flow-stock-line">
      <span>Stock</span>
      {hasMovement ? (
        <b>{item.stockBefore} <i>→</i> {item.stockAfter} <i>→</i> လက်ရှိ {item.currentStock}</b>
      ) : (
        <b>လက်ရှိ {item.currentStock}</b>
      )}
      {item.lowStock ? <em>လက်ကျန်နည်း</em> : null}
    </div>
  );
}

export default function SalesFlowDetail({ sale, onClose, onPrint, onVoid, printing }) {
  if (!sale) {
    return (
      <aside className="sales-flow-detail sales-flow-detail-empty">
        <FileText size={38} />
        <b>အရောင်းတစ်ခုကို ရွေးပါ</b>
        <span>Product၊ Stock၊ Payment နဲ့ Profit ချိတ်ဆက်မှုကို ဒီနေရာမှာကြည့်နိုင်ပါတယ်။</span>
      </aside>
    );
  }

  const completed = sale.rawStatus !== 'VOIDED';
  return (
    <aside className="sales-flow-detail">
      <header className="sales-flow-detail-head">
        <div>
          <small>{sale.invoice}</small>
          <h3>{sale.customer || 'အထွေထွေ Customer'}</h3>
          <p>{dateTime(sale.dateTime)} · {sale.cashier || '-'}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="ပိတ်ရန်"><X size={18} /></button>
      </header>

      <div className="sales-flow-link-strip">
        <span className={sale.flow?.product ? 'ok' : ''}><PackageCheck size={16} /> Product</span>
        <span className={sale.flow?.stock ? 'ok' : ''}><Boxes size={16} /> Stock</span>
        <span className={sale.flow?.account ? 'ok' : ''}><Banknote size={16} /> Account</span>
        <span className={sale.flow?.report ? 'ok' : ''}><ReceiptText size={16} /> Report</span>
      </div>

      <section className="sales-flow-items">
        {(sale.itemRows || []).map((item) => (
          <article key={item.id}>
            <div className="sales-flow-item-main">
              <div className="sales-flow-item-icon"><PackageCheck size={20} /></div>
              <div>
                <b>{item.productName}</b>
                <span>{[item.variantName, item.categoryName, item.sku].filter(Boolean).join(' · ')}</span>
                {item.imeiSerial ? <small>IMEI / Serial: {item.imeiSerial}</small> : null}
              </div>
              <strong>{item.quantity} ခု</strong>
            </div>
            <div className="sales-flow-item-money">
              <span>ရောင်းဈေး <b>{money(item.unitPrice)}</b></span>
              <span>စုစုပေါင်း <b>{money(item.lineTotal)}</b></span>
              <span>အမြတ် <b className={item.profit >= 0 ? 'positive' : 'negative'}>{money(item.profit)}</b></span>
            </div>
            <StockFlow item={item} />
          </article>
        ))}
      </section>

      <section className="sales-flow-payment-card">
        <div><Banknote size={20} /><span>ငွေပေးချေမှု</span><b>{sale.payment}</b></div>
        {(sale.paymentRows || []).map((payment) => (
          <p key={payment.id}>
            <span>{payment.methodLabel}</span>
            <b>{money(payment.amount)}</b>
            <small>{payment.reference || 'Reference မရှိ'}</small>
          </p>
        ))}
        {!sale.paymentRows?.length && sale.paymentStatus === 'PENDING' ? (
          <p><span>အကြွေးစာရင်း</span><b>{money(sale.total)}</b><small>Customer balance ထဲသို့ချိတ်ထားသည်</small></p>
        ) : null}
      </section>

      <section className="sales-flow-total-card">
        <div><span>ပစ္စည်းတန်ဖိုး</span><b>{money(sale.subtotal)}</b></div>
        <div><span>လျှော့ဈေး</span><b>-{money(sale.discount)}</b></div>
        <div><span>ကုန်ကျစရိတ်</span><b>{money(sale.costTotal)}</b></div>
        <div><span>အမြတ်</span><b className={sale.profit >= 0 ? 'positive' : 'negative'}>{money(sale.profit)}</b></div>
        <div className="grand"><span>ရောင်းရငွေ</span><b>{money(sale.total)}</b></div>
      </section>

      {sale.voidReason ? <div className="sales-flow-void-note">ပယ်ဖျက်ရသည့်အကြောင်း: {sale.voidReason}</div> : null}

      <footer className="sales-flow-detail-actions">
        <button type="button" onClick={() => onPrint(sale)} disabled={printing}><Printer size={17} /> {printing ? 'ပြင်ဆင်နေသည်…' : 'ပြေစာပြန်ထုတ်'}</button>
        <button type="button" className="danger" onClick={() => onVoid(sale)} disabled={!completed}><Ban size={17} /> {completed ? 'အရောင်းပယ်ဖျက်' : 'ပယ်ဖျက်ပြီး'}</button>
      </footer>

      <div className="sales-flow-audit-note"><CheckCircle2 size={15} /> Product၊ Stock၊ Account နဲ့ Report တို့ကို Sale ID တစ်ခုတည်းဖြင့်ချိတ်ထားသည်။</div>
    </aside>
  );
}
