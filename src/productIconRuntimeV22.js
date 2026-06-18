import { productIconInfo } from './ProductCategoryIcon.jsx';

const SELECTORS = [
  '.p2-product-name > div',
  '.stock-product-cell > div',
];

function decorate(node) {
  if (!(node instanceof HTMLElement)) return;
  const row = node.closest('tr');
  const productCell = node.closest('.p2-product-name, .stock-product-cell');
  const text = [row?.textContent, productCell?.textContent].filter(Boolean).join(' ');
  const { kind, label, tone } = productIconInfo({ name: text });

  node.classList.add('product-kind-runtime', `product-kind-${tone}`);
  node.dataset.productKind = kind;
  node.title = label;
  node.setAttribute('aria-label', label);
}

function scan() {
  SELECTORS.forEach((selector) => document.querySelectorAll(selector).forEach(decorate));
}

export function installProductIconRuntimeV22() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};

  let frame = 0;
  const schedule = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      scan();
    });
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.getElementById('root') || document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  schedule();
  return () => {
    observer.disconnect();
    if (frame) window.cancelAnimationFrame(frame);
  };
}
