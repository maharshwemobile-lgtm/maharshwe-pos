import React from 'react';
import { Package, RefreshCw, Search } from 'lucide-react';
import { formatMoney } from './pos/posHelpers';

const title = (item) => [item?.productName, item?.variantName].filter(Boolean).join(' — ');

export default function ConnectedPosCatalog({
  products,
  categories,
  categoryId,
  query,
  loading,
  searchRef,
  onQuery,
  onSearch,
  onCategory,
  onRefresh,
  onAdd,
}) {
  return (
    <section className="connected-pos-catalog">
      <div className="connected-pos-search-row">
        <label>
          <Search size={18} />
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && onSearch()}
            placeholder="ပစ္စည်းအမည်၊ SKU သို့ Barcode ရှာရန်"
          />
        </label>
        <button type="button" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={loading ? 'connected-pos-spin' : ''} size={18} />
        </button>
      </div>

      <div className="connected-pos-categories">
        <button type="button" className={!categoryId ? 'active' : ''} onClick={() => onCategory('')}>အားလုံး</button>
        {categories.map((category) => (
          <button type="button" key={category.id} className={categoryId === category.id ? 'active' : ''} onClick={() => onCategory(category.id)}>
            {category.name}
          </button>
        ))}
      </div>

      <div className="connected-pos-products">
        {products.map((item) => {
          const low = item.availableStock <= Math.max(2, Number(item.minAlertQuantity || 0));
          return (
            <button
              type="button"
              key={item.id}
              className={`connected-pos-product ${item.availableStock <= 0 ? 'out' : ''}`}
              onClick={() => onAdd(item)}
              disabled={item.availableStock <= 0}
            >
              <div className="connected-pos-product-icon"><Package size={24} /></div>
              <span className={`connected-pos-stock ${low ? 'low' : ''}`}>{item.availableStock} ခု</span>
              <b>{title(item)}</b>
              <small>{[item.category, item.sku, item.barcode].filter(Boolean).join(' · ')}</small>
              <strong>{formatMoney(item.standardSellingPrice)}</strong>
            </button>
          );
        })}
        {!products.length && !loading ? <div className="connected-pos-empty">ရောင်းရန် ပစ္စည်းမတွေ့ပါ။</div> : null}
      </div>
    </section>
  );
}
