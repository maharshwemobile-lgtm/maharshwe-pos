import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Loader2,
  PackageSearch,
  RefreshCw,
  Save,
  Search,
  X,
} from 'lucide-react';
import { apiFetch, clearSession, getSession } from './phase2Api';
import './price-discount-page.css';

const LIMIT = 50;

function money(value) {
  const amount = Number(value || 0);
  return `${amount.toLocaleString('en-US')} Ks`;
}

function numberValue(value) {
  const cleaned = String(value ?? '').replaceAll(',', '').trim();
  if (!cleaned) return 0;
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
}

function marginPercent(selling, cost) {
  const sale = Number(selling || 0);
  const buy = Number(cost || 0);
  if (sale <= 0 || buy <= 0) return '-';
  return `${(((sale - buy) / sale) * 100).toFixed(1)}%`;
}

function variantTitle(row) {
  return [row.productName, row.variantName].filter(Boolean).join(' / ') || 'Unnamed Product';
}

export default function ProductPriceDiscountPage() {
  const session = getSession();
  const user = session?.user || {};
  const canManage = user.role === 'SUPER_ADMIN' || user.role === 'SHOP_ADMIN' || user.permissions?.inventory === true || user.permissions?.productEdit === true;
  const showCost = user.role === 'SUPER_ADMIN' || user.permissions?.viewCost === true;

  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});
  const [savingId, setSavingId] = useState(null);

  const notify = (type, text) => {
    setMessage({ type, text });
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => setMessage(null), 2800);
  };

  const handleError = (error) => {
    if (error?.status === 401) {
      clearSession();
      window.location.reload();
      return;
    }
    notify('error', error?.message || 'Request failed');
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (query.trim()) params.set('q', query.trim());
      const data = await apiFetch(`/api/products?${params.toString()}`);
      setProducts(data.products || []);
      setTotal(data.total || 0);
      setTotalPages(Math.max(1, data.totalPages || 1));
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(loadProducts, 180);
    return () => window.clearTimeout(timer);
  }, [query, page]);

  useEffect(() => setPage(1), [query]);

  const rows = useMemo(() => products.flatMap((product) => (
    (product.variants || []).map((variant) => ({
      ...variant,
      productName: product.name,
      productBrand: product.brand,
      productModel: product.model,
      categoryName: product.category?.name || variant.category?.name || 'Uncategorized',
      productActive: product.active !== false,
    }))
  )), [products]);

  const summary = useMemo(() => {
    const stock = rows.reduce((sum, row) => sum + Number(row.inventory?.quantity || 0), 0);
    const priced = rows.filter((row) => Number(row.standardSellingPrice || 0) > 0).length;
    const low = rows.filter((row) => {
      const quantity = Number(row.inventory?.quantity || 0);
      const alert = Number(row.inventory?.minAlertQuantity || 0);
      return alert > 0 && quantity <= alert;
    }).length;
    return { variants: rows.length, stock, priced, low };
  }, [rows]);

  const startEdit = (row) => {
    setEditingId(row.id);
    setDraft({
      costPrice: row.costPrice ?? '',
      standardSellingPrice: row.standardSellingPrice ?? '',
      wholesalePrice: row.wholesalePrice ?? '',
      minimumSellingPrice: row.minimumSellingPrice ?? '',
      minAlertQuantity: row.inventory?.minAlertQuantity ?? 0,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft({});
  };

  const savePrice = async (row) => {
    if (!canManage) {
      notify('error', 'Price ပြင်ရန် Inventory/Product permission လိုအပ်ပါတယ်။');
      return;
    }

    const selling = numberValue(draft.standardSellingPrice);
    const minimum = numberValue(draft.minimumSellingPrice);
    if (showCost && selling > 0 && minimum > selling) {
      notify('error', 'Minimum Price သည် Selling Price ထက် မများရပါ။');
      return;
    }

    const body = {
      standardSellingPrice: selling,
      wholesalePrice: numberValue(draft.wholesalePrice),
      minAlertQuantity: Math.max(0, Math.trunc(numberValue(draft.minAlertQuantity))),
    };

    if (showCost) {
      body.costPrice = numberValue(draft.costPrice);
      body.minimumSellingPrice = minimum;
    }

    setSavingId(row.id);
    try {
      await apiFetch(`/api/variants/${row.id}`, { method: 'PATCH', body });
      notify('success', `${variantTitle(row)} ဈေးနှုန်း သိမ်းပြီးပါပြီ`);
      setEditingId(null);
      setDraft({});
      await loadProducts();
    } catch (error) {
      handleError(error);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="price-page">
      {message ? <div className={`price-toast ${message.type}`}>{message.text}</div> : null}

      <section className="price-heading">
        <div>
          <span>PRICE & DISCOUNT CONTROL</span>
          <h2>ဈေးနှုန်းနှင့် လျော့ဈေးများ</h2>
          <p>Product / Variant တစ်ခုလုံးအတွက် အမှာဈေး၊ ရောင်းဈေး၊ လက်ကားဈေး၊ Minimum Price ကို ဒီနေရာကနေ ပြင်ပါ။ Sale POS သည် Selling Price အသစ်ကို အလိုအလျောက်ယူသုံးပါမယ်။</p>
        </div>
        <button type="button" onClick={loadProducts} disabled={loading}>
          <RefreshCw className={loading ? 'price-spin' : ''} size={17} /> Refresh
        </button>
      </section>

      <section className="price-summary-grid">
        <article><PackageSearch size={22} /><span>Variants</span><b>{summary.variants}</b></article>
        <article><CheckCircle2 size={22} /><span>Priced Items</span><b>{summary.priced}</b></article>
        <article><PackageSearch size={22} /><span>Stock Units</span><b>{summary.stock}</b></article>
        <article><AlertTriangle size={22} /><span>Low Stock</span><b>{summary.low}</b></article>
      </section>

      <section className="price-card">
        <div className="price-toolbar">
          <label>
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Product, variant, SKU, Barcode ရှာရန်" />
          </label>
          <div>
            <button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
            <b>{page} / {totalPages}</b>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next</button>
          </div>
        </div>

        <div className="price-table-wrap">
          <table className="price-table">
            <thead>
              <tr>
                <th>Product / Variant</th>
                <th>Category / Stock</th>
                {showCost ? <th>အမှာဈေး / Cost</th> : null}
                <th>ရောင်းဈေး / Selling</th>
                <th>လက်ကားဈေး</th>
                {showCost ? <th>လျော့ဈေး Limit</th> : null}
                {showCost ? <th>Profit</th> : null}
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={showCost ? 8 : 5}><div className="price-empty"><Loader2 className="price-spin" /> Loading prices...</div></td></tr>
              ) : null}

              {!loading && rows.length === 0 ? (
                <tr><td colSpan={showCost ? 8 : 5}><div className="price-empty"><PackageSearch size={36} /><b>Product မတွေ့ပါ</b><span>Search ပြောင်းကြည့်ပါ။</span></div></td></tr>
              ) : null}

              {!loading && rows.map((row) => {
                const isEditing = editingId === row.id;
                const stock = Number(row.inventory?.quantity || 0);
                const low = Number(row.inventory?.minAlertQuantity || 0) > 0 && stock <= Number(row.inventory?.minAlertQuantity || 0);
                const selling = isEditing ? numberValue(draft.standardSellingPrice) : Number(row.standardSellingPrice || 0);
                const cost = isEditing ? numberValue(draft.costPrice) : Number(row.costPrice || 0);
                return (
                  <tr key={row.id} className={row.active === false || row.productActive === false ? 'inactive' : ''}>
                    <td>
                      <div className="price-product-cell">
                        <b>{row.productName}</b>
                        <span>{row.variantName || 'Default'}{row.sku ? ` · SKU: ${row.sku}` : ''}{row.barcode ? ` · Barcode: ${row.barcode}` : ''}</span>
                      </div>
                    </td>
                    <td><span>{row.categoryName}</span><b className={low ? 'price-low' : ''}>Stock {stock}</b></td>

                    {showCost ? <td>{isEditing ? <input type="number" min="0" value={draft.costPrice} onChange={(event) => setDraft({ ...draft, costPrice: event.target.value })} /> : money(row.costPrice)}</td> : null}

                    <td>{isEditing ? <input type="number" min="0" value={draft.standardSellingPrice} onChange={(event) => setDraft({ ...draft, standardSellingPrice: event.target.value })} /> : <b>{money(row.standardSellingPrice)}</b>}</td>

                    <td>{isEditing ? <input type="number" min="0" value={draft.wholesalePrice} onChange={(event) => setDraft({ ...draft, wholesalePrice: event.target.value })} /> : money(row.wholesalePrice)}</td>

                    {showCost ? <td>{isEditing ? <input type="number" min="0" value={draft.minimumSellingPrice} onChange={(event) => setDraft({ ...draft, minimumSellingPrice: event.target.value })} /> : money(row.minimumSellingPrice)}</td> : null}

                    {showCost ? <td><b className={selling - cost >= 0 ? 'price-profit' : 'price-loss'}>{money(selling - cost)}</b><small>{marginPercent(selling, cost)}</small></td> : null}

                    <td>
                      {isEditing ? (
                        <div className="price-actions">
                          <button type="button" className="save" onClick={() => savePrice(row)} disabled={savingId === row.id}>{savingId === row.id ? <Loader2 className="price-spin" size={14} /> : <Save size={14} />} Save</button>
                          <button type="button" onClick={cancelEdit}><X size={14} /></button>
                        </div>
                      ) : (
                        <button type="button" className="price-edit" onClick={() => startEdit(row)} disabled={!canManage}><Edit3 size={14} /> ဈေးညှိမယ်</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <footer className="price-footer">
          <span>Total {total} products · Showing {rows.length} variants</span>
          {!showCost ? <b>Cost / Minimum Price ကြည့်ရန် viewCost permission လိုအပ်ပါတယ်။</b> : null}
        </footer>
      </section>
    </div>
  );
}
