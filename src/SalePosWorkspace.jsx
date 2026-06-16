import React from 'react';
import { ArrowLeft, Banknote, Boxes, History, PackageSearch, ReceiptText } from 'lucide-react';
import ConnectedPosCatalog from './ConnectedPosCatalog';
import ConnectedPosCart from './ConnectedPosCart';
import ConnectedPosCheckoutPanel from './ConnectedPosCheckoutPanel';
import { SmartReviewModal, SmartSuccessModal } from './pos/SmartCheckoutModal';
import { useConnectedSale } from './useConnectedSale';
import { useSaleCheckoutActions } from './SaleCheckoutActions';
import './connected-pos.css';

function Shortcut({ icon: Icon, label, onClick }) {
  return <button type="button" onClick={onClick}><Icon size={16} /> {label}</button>;
}

export default function SalePosWorkspace({ onExit, onNavigate }) {
  const sale = useConnectedSale();
  const checkout = useSaleCheckoutActions(sale);
  const panel = React.createElement(ConnectedPosCheckoutPanel, {
    cart: sale.cart, customer: sale.customer, payment: sale.payment,
    discount: sale.discount, canDiscount: sale.canDiscount,
    subtotal: sale.subtotal, total: sale.total, change: sale.change,
    onCustomer: sale.setCustomer, onPayment: sale.setPayment,
    onDiscount: sale.setDiscount, onClear: sale.clearCart,
    onCheckout: checkout.openReview,
  });
  const review = sale.reviewOpen ? React.createElement(SmartReviewModal, {
    cart: sale.cart, customer: sale.customer, payment: sale.payment,
    subtotal: sale.subtotal, discount: sale.safeDiscount, total: sale.total,
    cashReceived: sale.cashReceived, change: sale.change,
    busy: sale.checkoutBusy, error: sale.checkoutError,
    onClose: () => sale.setReviewOpen(false), onConfirm: checkout.completeSale,
  }) : null;
  const success = sale.completedSale ? React.createElement(SmartSuccessModal, {
    sale: sale.completedSale,
    onNewSale: onExit,
  }) : null;

  return <div className="connected-pos-page">
    {sale.message ? <div className={`connected-pos-toast ${sale.message.type}`}>{sale.message.text}</div> : null}
    <header className="connected-pos-topbar">
      <button type="button" className="connected-pos-back" onClick={onExit}><ArrowLeft size={18} /></button>
      <div><span>POS အရောင်း</span><h1>ပစ္စည်းရွေးပြီး တိုက်ရိုက်ရောင်းရန်</h1></div>
      <nav>
        <Shortcut icon={PackageSearch} label="ပစ္စည်း" onClick={() => onNavigate?.('Products')} />
        <Shortcut icon={Boxes} label="Stock" onClick={() => onNavigate?.('Stock')} />
        <Shortcut icon={History} label="မှတ်တမ်း" onClick={() => onNavigate?.('Sales History')} />
        <Shortcut icon={Banknote} label="ငွေစာရင်း" onClick={() => onNavigate?.('Accounting')} />
        <Shortcut icon={ReceiptText} label="Report" onClick={() => onNavigate?.('Reports')} />
      </nav>
    </header>
    <main className="connected-pos-shell">
      <ConnectedPosCatalog products={sale.products} categories={sale.categories} categoryId={sale.categoryId} query={sale.query} loading={sale.loading} searchRef={sale.searchRef} onQuery={sale.setQuery} onSearch={sale.submitSearch} onCategory={sale.setCategoryId} onRefresh={sale.loadCatalog} onAdd={sale.addProduct} />
      {React.createElement(ConnectedPosCart, { cart: sale.cart, reservedMap: sale.reservedMap, onPatch: sale.patchLine, onQuantity: sale.changeQuantity, onRemove: sale.removeLine }, panel)}
    </main>
    {review}
    {success}
  </div>;
}
