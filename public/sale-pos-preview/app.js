import {
  fetchPreviewCatalog,
  getShopIdentity,
  matchProduct,
  money,
  stockMeta,
  uniqueSorted,
} from '../phase1-preview/preview-data.js';
import {
  createProductCard,
  createSkeletonGrid,
  el,
  showProductDialog,
  wireDialogClose,
} from '../phase1-preview/preview-components.js';

const state = {
  products: [],
  cart: new Map(),
  query: '',
  category: '',
  brand: '',
  stock: '',
  view: 'grid',
  loading: true,
  error: '',
};

const nodes = {
  grid: document.getElementById('catalog-grid'),
  count: document.getElementById('result-count'),
  search: document.getElementById('product-search'),
  category: document.getElementById('category-filter'),
  brand: document.getElementById('brand-filter'),
  stock: document.getElementById('stock-filter'),
  gridView: document.getElementById('grid-view'),
  listView: document.getElementById('list-view'),
  cartList: document.getElementById('cart-list'),
  cartCount: document.getElementById('cart-count'),
  mobileCart: document.getElementById('mobile-cart-toggle'),
  cartHeading: document.getElementById('cart-heading'),
  subtotal: document.getElementById('cart-subtotal'),
  discount: document.getElementById('cart-discount'),
  total: document.getElementById('cart-total'),
  discountInput: document.getElementById('discount-input'),
};

function setupShopIdentity() {
  const shop = getShopIdentity();
  document.querySelector('[data-shop-name]').textContent = shop.name;
  document.querySelector('[data-shop-branch]').textContent = shop.branch;
  const image = document.querySelector('[data-shop-logo]');
  image.src = shop.logo;
  image.addEventListener('error', () => { image.src = '/phase1-preview/product-placeholder.svg'; }, { once: true });
}

function populateSelect(select, values) {
  values.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.append(option);
  });
}

function selectedQuantity(product) {
  return Number(state.cart.get(product.id)?.quantity || 0);
}

function addToCart(product) {
  const current = state.cart.get(product.id);
  const quantity = Number(current?.quantity || 0);
  if (product.stock <= 0 || quantity >= product.stock) return;
  state.cart.set(product.id, { product, quantity: quantity + 1 });
  render();
}

function changeQuantity(productId, delta) {
  const line = state.cart.get(productId);
  if (!line) return;
  const next = line.quantity + delta;
  if (next <= 0) state.cart.delete(productId);
  else if (next <= line.product.stock) state.cart.set(productId, { ...line, quantity: next });
  render();
}

function filteredProducts() {
  return state.products.filter((product) => {
    if (!matchProduct(product, state.query)) return false;
    if (state.category && product.category !== state.category) return false;
    if (state.brand && product.brand !== state.brand) return false;
    if (state.stock && stockMeta(product).key !== state.stock) return false;
    return true;
  });
}

function renderCatalog() {
  nodes.grid.replaceChildren();
  nodes.grid.classList.toggle('is-list', state.view === 'list');
  nodes.gridView.classList.toggle('active', state.view === 'grid');
  nodes.listView.classList.toggle('active', state.view === 'list');

  if (state.loading) {
    nodes.grid.append(createSkeletonGrid(8));
    nodes.count.textContent = 'Loading products…';
    return;
  }
  if (state.error) {
    const box = el('div', 'preview-error');
    box.append(el('strong', '', 'Preview catalog could not load'), el('span', '', state.error));
    const back = el('a', '', 'Open Mahar POS Login');
    back.href = '/';
    box.append(back);
    nodes.grid.append(box);
    nodes.count.textContent = '0 products';
    return;
  }

  const products = filteredProducts();
  nodes.count.textContent = `${products.length} of ${state.products.length} products`;
  if (!products.length) {
    const box = el('div', 'preview-empty');
    box.append(el('strong', '', 'No matching products'), el('span', '', 'Change search or filter values. No fake product data is used in this preview.'));
    nodes.grid.append(box);
    return;
  }

  products.forEach((product) => {
    nodes.grid.append(createProductCard(product, {
      selectedQuantity: selectedQuantity(product),
      listView: state.view === 'list',
      onAdd: addToCart,
      onView: (item) => showProductDialog(item, { onAdd: addToCart }),
    }));
  });
}

function renderCart() {
  nodes.cartList.replaceChildren();
  const lines = [...state.cart.values()];
  const units = lines.reduce((sum, line) => sum + line.quantity, 0);
  nodes.cartCount.textContent = String(units);
  nodes.mobileCart.textContent = `Cart · ${units}`;

  if (!lines.length) {
    nodes.cartList.append(el('div', 'preview-cart-empty', 'Tap a product card to add it to this preview cart.'));
  } else {
    lines.forEach(({ product, quantity }) => {
      const item = el('article', 'preview-cart-item');
      const image = document.createElement('img');
      image.className = 'preview-cart-thumb';
      image.src = product.imageUrl;
      image.alt = product.name;
      image.addEventListener('error', () => { image.src = '/phase1-preview/product-placeholder.svg'; }, { once: true });
      const copy = el('div', 'preview-cart-copy');
      copy.append(el('strong', '', product.name), el('small', '', `${money(product.price)} · ${quantity} item${quantity > 1 ? 's' : ''}`));
      const actions = el('div', 'preview-cart-actions');
      const qty = el('div', 'preview-qty');
      const minus = el('button', '', '−');
      minus.type = 'button';
      minus.setAttribute('aria-label', `Decrease ${product.name}`);
      minus.addEventListener('click', () => changeQuantity(product.id, -1));
      const amount = el('strong', '', String(quantity));
      const plus = el('button', '', '+');
      plus.type = 'button';
      plus.disabled = quantity >= product.stock;
      plus.setAttribute('aria-label', `Increase ${product.name}`);
      plus.addEventListener('click', () => changeQuantity(product.id, 1));
      qty.append(minus, amount, plus);
      const remove = el('button', 'preview-remove', 'Remove');
      remove.type = 'button';
      remove.addEventListener('click', () => { state.cart.delete(product.id); render(); });
      actions.append(qty, remove);
      item.append(image, copy, actions);
      nodes.cartList.append(item);
    });
  }

  const subtotal = lines.reduce((sum, line) => sum + (line.product.price * line.quantity), 0);
  const discount = Math.max(0, Math.min(subtotal, Number(nodes.discountInput.value || 0)));
  nodes.subtotal.textContent = money(subtotal);
  nodes.discount.textContent = `-${money(discount)}`;
  nodes.total.textContent = money(subtotal - discount);
}

function render() {
  renderCatalog();
  renderCart();
}

async function load() {
  render();
  try {
    state.products = await fetchPreviewCatalog();
    populateSelect(nodes.category, uniqueSorted(state.products.map((product) => product.category)));
    populateSelect(nodes.brand, uniqueSorted(state.products.map((product) => product.brand)));
  } catch (error) {
    state.error = error.message || 'Catalog request failed.';
  } finally {
    state.loading = false;
    render();
  }
}

nodes.search.addEventListener('input', (event) => { state.query = event.target.value; renderCatalog(); });
nodes.search.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return;
  const exact = state.products.find((product) => product.barcode === state.query.trim() || product.sku === state.query.trim());
  if (exact) {
    addToCart(exact);
    nodes.search.value = '';
    state.query = '';
  }
});
nodes.category.addEventListener('change', (event) => { state.category = event.target.value; renderCatalog(); });
nodes.brand.addEventListener('change', (event) => { state.brand = event.target.value; renderCatalog(); });
nodes.stock.addEventListener('change', (event) => { state.stock = event.target.value; renderCatalog(); });
nodes.gridView.addEventListener('click', () => { state.view = 'grid'; renderCatalog(); });
nodes.listView.addEventListener('click', () => { state.view = 'list'; renderCatalog(); });
nodes.discountInput.addEventListener('input', renderCart);
nodes.mobileCart.addEventListener('click', () => document.body.classList.toggle('preview-cart-open'));
nodes.cartHeading.addEventListener('click', () => {
  if (window.matchMedia('(max-width: 820px)').matches) document.body.classList.toggle('preview-cart-open');
});

setupShopIdentity();
wireDialogClose();
load();
