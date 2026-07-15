import {
  PLACEHOLDER_IMAGE,
  money,
  productSubtitle,
  stockMeta,
} from './preview-data.js';

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

export function button(label, className, onClick, ariaLabel = label) {
  const node = el('button', className, label);
  node.type = 'button';
  node.setAttribute('aria-label', ariaLabel);
  node.addEventListener('click', onClick);
  return node;
}

export function createProductImage(product, className = 'preview-product-image') {
  const frame = el('div', `${className}-frame`);
  const image = document.createElement('img');
  image.className = className;
  image.src = product.imageUrl || PLACEHOLDER_IMAGE;
  image.alt = `${product.name}${product.variant ? ` ${product.variant}` : ''}`;
  image.loading = 'lazy';
  image.decoding = 'async';
  image.addEventListener('error', () => {
    if (!image.src.endsWith(PLACEHOLDER_IMAGE)) image.src = PLACEHOLDER_IMAGE;
  }, { once: true });
  frame.append(image);
  return frame;
}

export function createStockBadge(product, publicDisplay = false) {
  const meta = stockMeta(product, publicDisplay);
  const badge = el('span', `preview-stock-badge is-${meta.key}`);
  badge.append(el('span', 'preview-stock-dot'));
  badge.append(document.createTextNode(meta.label));
  badge.title = meta.detail;
  return badge;
}

export function createPrice(product, className = 'preview-price') {
  const price = el('strong', className, money(product.price));
  price.setAttribute('aria-label', `Selling price ${money(product.price)}`);
  return price;
}

export function createProductCard(product, options = {}) {
  const {
    publicDisplay = false,
    selectedQuantity = 0,
    onAdd = () => {},
    onView = () => {},
    listView = false,
  } = options;
  const stock = stockMeta(product, publicDisplay);
  const card = el('article', `preview-product-card ${listView ? 'is-list' : ''} ${stock.key === 'out' ? 'is-out' : ''} ${selectedQuantity ? 'is-selected' : ''}`);
  card.tabIndex = 0;
  card.setAttribute('aria-label', `${product.name}, ${money(product.price)}, ${stock.label}`);

  const media = createProductImage(product);
  media.addEventListener('click', () => onView(product));
  media.tabIndex = 0;
  media.setAttribute('role', 'button');
  media.setAttribute('aria-label', `View ${product.name} details`);
  media.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onView(product);
    }
  });
  if (stock.key === 'out') media.append(el('span', 'preview-out-overlay', 'Out of Stock'));

  const body = el('div', 'preview-product-body');
  const top = el('div', 'preview-product-topline');
  top.append(el('span', 'preview-category-label', product.category));
  top.append(createStockBadge(product, publicDisplay));
  body.append(top);

  const heading = el('button', 'preview-product-name', product.name);
  heading.type = 'button';
  heading.addEventListener('click', () => onView(product));
  body.append(heading);
  body.append(el('p', 'preview-product-subtitle', productSubtitle(product)));

  const bottom = el('div', 'preview-product-bottom');
  const priceWrap = el('div', 'preview-price-wrap');
  priceWrap.append(createPrice(product));
  priceWrap.append(el('small', '', publicDisplay ? stock.label : `Available: ${product.stock}`));
  bottom.append(priceWrap);

  const add = button(publicDisplay ? 'Add to Cart' : '+ Add', 'preview-add-button', () => onAdd(product));
  add.disabled = stock.key === 'out' || selectedQuantity >= product.stock;
  if (selectedQuantity) add.textContent = `In Cart: ${selectedQuantity}`;
  bottom.append(add);
  body.append(bottom);

  card.append(media, body);
  return card;
}

export function createSkeletonGrid(count = 8) {
  const fragment = document.createDocumentFragment();
  for (let index = 0; index < count; index += 1) {
    const card = el('div', 'preview-skeleton-card');
    card.innerHTML = '<div class="preview-skeleton-image"></div><div class="preview-skeleton-line wide"></div><div class="preview-skeleton-line"></div><div class="preview-skeleton-line short"></div>';
    fragment.append(card);
  }
  return fragment;
}

export function showProductDialog(product, { publicDisplay = false, onAdd = () => {} } = {}) {
  const dialog = document.getElementById('product-dialog');
  if (!dialog) return;
  const content = dialog.querySelector('[data-dialog-content]');
  content.replaceChildren();

  const image = createProductImage(product, 'preview-dialog-image');
  const copy = el('div', 'preview-dialog-copy');
  copy.append(createStockBadge(product, publicDisplay));
  copy.append(el('h2', '', product.name));
  copy.append(el('p', 'preview-dialog-subtitle', productSubtitle(product)));
  copy.append(createPrice(product, 'preview-dialog-price'));
  copy.append(el('p', 'preview-dialog-description', product.description || 'Product description will be managed from Product Manager during Phase 2.'));
  const facts = el('dl', 'preview-dialog-facts');
  [['Category', product.category], ['Brand', product.brand], ['SKU', product.sku || '-'], ['Barcode', product.barcode || '-'], ['Available Stock', String(product.stock)]].forEach(([label, value]) => {
    facts.append(el('dt', '', label), el('dd', '', value));
  });
  copy.append(facts);
  const add = button('Add to Cart', 'preview-primary-button', () => {
    onAdd(product);
    dialog.close();
  });
  add.disabled = product.stock <= 0;
  copy.append(add);
  content.append(image, copy);
  dialog.showModal();
}

export function wireDialogClose() {
  const dialog = document.getElementById('product-dialog');
  if (!dialog) return;
  dialog.querySelector('[data-dialog-close]')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    const rect = dialog.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (!inside) dialog.close();
  });
}
