import React from 'react';
import {
  Barcode,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Keyboard,
  Loader2,
  PackageSearch,
  RefreshCw,
  Search,
} from 'lucide-react';
import { formatMoney, productTitle } from './posHelpers';

export default function SmartCatalog({
  items,
  categories,
  query,
  setQuery,
  barcode,
  setBarcode,
  categoryId,
  setCategoryId,
  page,
  totalPages,
  loading,
  searchRef,
  barcodeRef,
  onScan,
  onAdd,
  onRefresh,
  onPage,
  reservedUnits,
}) {
  return (
    <section className="smart-pos-catalog">
      <header className="smart-pos-section-head">
        <div>
          <span className="smart-pos-eyebrow">SMART SALE WORKSPACE</span>
          <h2>Products</h2>
          <p>{items.length} available variants · {reservedUnits} units reserved in cart</p>
        </div>
        <button type="button" className="smart-pos-icon-button" onClick={onRefresh} disabled={loading} title="Refresh catalog">
          <RefreshCw size={19} className={loading ? 'smart-pos-spin' : ''} />
        </button>
      </header>

      <div className="smart-pos-search-zone">
        <label className="smart-pos-search-field">
          <Search size={18} />
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Product, variant, brand, SKU or barcode"
          />
          <kbd>F2</kbd>
        </label>

        <label className="smart-pos-barcode-field">
          <Barcode size={19} />
          <input
            ref={barcodeRef}
            value={barcode}
            onChange={(event) => setBarcode(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onScan();
            }}
            placeholder="Scan barcode / SKU"
          />
          <kbd>F3</kbd>
          <button type="button" onClick={onScan}>Add</button>
        </label>

        <div className="smart-pos-shortcut-note">
          <Keyboard size={15} />
          <span>F2 Search · F3 Barcode · Ctrl + Enter Checkout</span>
        </div>
      </div>

      <div className="smart-pos-category-tabs">
        <button type="button" className={!categoryId ? 'active' : ''} onClick={() => setCategoryId('')}>
          <Boxes size={15} /> All
        </button>
        {categories.map((category) => (
          <button
            type="button"
            key={category.id}
            className={categoryId === category.id ? 'active' : ''}
            onClick={() => setCategoryId(category.id)}
          >
            {category.name}
          </button>
        ))}
      </div>

      <div className="smart-pos-product-area">
        {loading ? (
          <div className="smart-pos-state"><Loader2 className="smart-pos-spin" /><b>Loading available stock…</b></div>
        ) : items.length ? (
          <div className="smart-pos-product-grid">
            {items.map((item) => {
              const low = Number(item.minAlertQuantity || 0) > 0
                && Number(item.stockQuantity || 0) <= Number(item.minAlertQuantity || 0);
              const initials = String(item.productName || item.variantName || 'P').slice(0, 2).toUpperCase();
              return (
                <button type="button" className="smart-pos-product" key={item.id} onClick={() => onAdd(item)}>
                  <div className="smart-pos-product-top">
                    <span className="smart-pos-product-avatar">{initials}</span>
                    <span className={`smart-pos-stock ${low ? 'low' : 'ok'}`}>
                      {low ? 'Low' : 'Stock'} {item.stockQuantity}
                    </span>
                  </div>
                  <h3>{productTitle(item)}</h3>
                  <p>{[item.brand, item.model, item.color, item.ram, item.storage].filter(Boolean).join(' · ') || item.category || 'General'}</p>
                  <div className="smart-pos-product-code">
                    <span>{item.sku || item.barcode || 'No code'}</span>
                    {item.requiresSerial ? <em>IMEI</em> : null}
                  </div>
                  <strong>{formatMoney(item.standardSellingPrice)}</strong>
                  <small>Click to add & reserve 1 unit</small>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="smart-pos-state">
            <PackageSearch size={38} />
            <b>No available products</b>
            <span>Out-of-stock variants are hidden automatically.</span>
          </div>
        )}
      </div>

      <footer className="smart-pos-pagination">
        <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1}><ChevronLeft size={18} /></button>
        <span>Page <b>{page}</b> of <b>{totalPages}</b></span>
        <button type="button" onClick={() => onPage(page + 1)} disabled={page >= totalPages}><ChevronRight size={18} /></button>
      </footer>
    </section>
  );
}
