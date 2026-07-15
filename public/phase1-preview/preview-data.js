const SESSION_KEY = 'mahar_pos_session_v1';
export const PLACEHOLDER_IMAGE = '/phase1-preview/product-placeholder.svg';

function readStoredSession() {
  try {
    const session = JSON.parse(window.localStorage.getItem(SESSION_KEY) || 'null');
    if (session?.token) return session;
  } catch {
    // Ignore malformed storage and continue through legacy token keys.
  }
  const token = window.localStorage.getItem('mahar_pos_token')
    || window.localStorage.getItem('authToken')
    || window.localStorage.getItem('token')
    || '';
  return token ? { token, user: null } : null;
}

export function getPreviewSession() {
  return readStoredSession();
}

export function getShopIdentity() {
  const session = readStoredSession();
  const user = session?.user || {};
  const shop = user.shop || {};
  return {
    name: shop.name || user.shopName || 'Mahar POS Store',
    branch: user.branch?.name || user.branchName || shop.slug || 'Current Shop',
    logo: shop.logoUrl || shop.logo || '/phase1-preview/product-placeholder.svg',
    userName: user.name || user.username || 'POS User',
  };
}

function authHeaders() {
  const token = readStoredSession()?.token;
  return {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function readJson(response) {
  return response.json().catch(() => ({}));
}

export async function fetchPreviewCatalog() {
  const session = readStoredSession();
  if (!session?.token) {
    const error = new Error('Sign in to Mahar POS first, then reopen this preview route.');
    error.code = 'AUTH_REQUIRED';
    throw error;
  }

  const response = await fetch('/api/pos/catalog?page=1&limit=100', {
    cache: 'no-store',
    headers: authHeaders(),
  });
  const data = await readJson(response);
  if (!response.ok) {
    const error = new Error(data?.message || `Product catalog failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return (data.items || []).map(normalizeProduct);
}

export function normalizeProduct(item = {}) {
  const name = item.productName || item.name || item.model || 'Unnamed Product';
  const variant = item.variantName || [item.color, item.ram, item.storage].filter(Boolean).join(' · ');
  const imageUrl = item.primaryImageUrl
    || item.imageUrl
    || item.image
    || item.thumbnailUrl
    || item.photoUrl
    || PLACEHOLDER_IMAGE;
  return {
    id: String(item.id || item.productVariantId || item.productId || name),
    productId: item.productId || item.id || '',
    name,
    variant,
    brand: item.brand || 'Other',
    model: item.model || '',
    category: item.category || item.categoryName || 'Uncategorized',
    categoryId: item.categoryId || '',
    sku: item.sku || '',
    barcode: item.barcode || '',
    unit: item.unit || '',
    price: Number(item.standardSellingPrice ?? item.sellingPrice ?? item.price ?? 0),
    stock: Number(item.stockQuantity ?? item.stockQty ?? item.availableQty ?? 0),
    lowStockThreshold: Number(item.minAlertQuantity ?? item.lowStockThreshold ?? 3),
    imageUrl,
    galleryImages: Array.isArray(item.galleryImages) ? item.galleryImages : [],
    description: item.description || '',
    requiresSerial: item.requiresSerial === true,
    raw: item,
  };
}

export function stockMeta(product, publicDisplay = false) {
  const stock = Number(product?.stock || 0);
  const threshold = Math.max(1, Number(product?.lowStockThreshold || 3));
  if (stock <= 0) return { key: 'out', label: 'Out of Stock', detail: 'Unavailable' };
  if (publicDisplay) {
    if (stock <= 10) return { key: stock <= threshold ? 'low' : 'in', label: `Only ${stock} left`, detail: `${stock} available` };
    return { key: 'in', label: 'In Stock', detail: 'Available now' };
  }
  if (stock <= threshold) return { key: 'low', label: 'Low Stock', detail: `Stock: ${stock}` };
  return { key: 'in', label: 'In Stock', detail: `Stock: ${stock}` };
}

export function money(value) {
  return `${Number(value || 0).toLocaleString('en-US')} Ks`;
}

export function productSubtitle(product) {
  return [product.brand, product.model, product.variant].filter(Boolean).join(' · ') || product.category;
}

export function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
}

export function matchProduct(product, query) {
  const needle = String(query || '').trim().toLowerCase();
  if (!needle) return true;
  const text = [
    product.name,
    product.variant,
    product.brand,
    product.model,
    product.category,
    product.sku,
    product.barcode,
  ].join(' ').toLowerCase();
  return text.includes(needle);
}
