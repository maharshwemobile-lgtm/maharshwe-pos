(() => {
  const LOGO_URL = window.MS_THEME_LOGO_URL || './maharshwe-logo.png';
  const REMOTE_LOGO_RE = /raw\.githubusercontent\.com\/maharshwemobile-lgtm\/DataForPublic|avatars\.githubusercontent\.com/i;
  const PAGE_SIZE = 10;

  const logoHref = () => new URL(LOGO_URL, window.location.href).href;

  const ensureHeadAssets = () => {
    const href = logoHref();
    document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]').forEach((link) => {
      if (link.href !== href) link.href = href;
    });
  };

  const replaceLogo = () => {
    const href = logoHref();
    document.querySelectorAll('img').forEach((img) => {
      const src = img.getAttribute('src') || '';
      const alt = img.getAttribute('alt') || '';
      const shouldReplace = REMOTE_LOGO_RE.test(src) || /Mahar Shwe|POS Logo|logo/i.test(alt);
      if (!shouldReplace) return;
      if (img.src !== href) img.src = href;
      img.classList.add('ms-theme-logo');
      img.onerror = () => {
        img.onerror = null;
        img.src = href;
      };
    });
  };

  const markNavigation = (aside) => {
    aside.querySelectorAll('div').forEach((el) => {
      const style = el.getAttribute('style') || '';
      if (style.includes('text-transform: uppercase')) {
        el.classList.add('ms-theme-nav-label');
      }
      if (style.includes('cursor: pointer')) {
        el.classList.add('ms-theme-nav-item');
        const bg = (el.style.background || '').trim();
        const isActive = bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)';
        el.classList.toggle('ms-active', !!isActive);
      }
    });
  };

  const getPageWindow = (page, totalPages) => {
    const pages = new Set([1, totalPages]);
    for (let n = page - 2; n <= page + 2; n += 1) {
      if (n >= 1 && n <= totalPages) pages.add(n);
    }
    return Array.from(pages).sort((a, b) => a - b);
  };

  const button = (label, disabled, active, onClick) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    btn.disabled = disabled;
    if (active) btn.classList.add('ms-page-active');
    btn.addEventListener('click', onClick);
    return btn;
  };

  const paginateTable = (table, index) => {
    const tbody = table.tBodies?.[0];
    if (!tbody) return;

    const rows = Array.from(tbody.rows).filter((row) => row.cells.length);
    const key = table.dataset.msPageKey || `table-${index}`;
    table.dataset.msPageKey = key;
    const totalItems = rows.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    let page = Number(table.dataset.msPage || 1);
    page = Math.min(Math.max(page, 1), totalPages);
    table.dataset.msPage = String(page);

    if (totalItems <= PAGE_SIZE) {
      rows.forEach((row) => { row.hidden = false; });
      table.parentElement?.querySelector(`.ms-pagination[data-ms-page-for="${key}"]`)?.remove();
      return;
    }

    const start = (page - 1) * PAGE_SIZE;
    rows.forEach((row, rowIndex) => {
      row.hidden = rowIndex < start || rowIndex >= start + PAGE_SIZE;
    });

    let controls = table.parentElement?.querySelector(`.ms-pagination[data-ms-page-for="${key}"]`);
    if (!controls) {
      controls = document.createElement('div');
      controls.className = 'ms-pagination';
      controls.dataset.msPageFor = key;
      table.insertAdjacentElement('afterend', controls);
    }

    const controlState = `${page}:${totalItems}:${totalPages}`;
    if (controls.dataset.msPageState === controlState) return;
    controls.dataset.msPageState = controlState;
    controls.replaceChildren();
    const info = document.createElement('span');
    info.className = 'ms-pagination-info';
    info.textContent = `Page ${page} / ${totalPages} - ${PAGE_SIZE} items per page (${totalItems} total)`;
    const pages = document.createElement('div');
    pages.className = 'ms-pagination-pages';
    pages.appendChild(button('Prev', page === 1, false, () => {
      table.dataset.msPage = String(page - 1);
      paginateTable(table, index);
    }));
    getPageWindow(page, totalPages).forEach((pageNo, pos, arr) => {
      if (pos > 0 && pageNo - arr[pos - 1] > 1) {
        const dots = document.createElement('span');
        dots.textContent = '...';
        dots.className = 'ms-pagination-info';
        pages.appendChild(dots);
      }
      pages.appendChild(button(String(pageNo), false, pageNo === page, () => {
        table.dataset.msPage = String(pageNo);
        paginateTable(table, index);
      }));
    });
    pages.appendChild(button('Next', page === totalPages, false, () => {
      table.dataset.msPage = String(page + 1);
      paginateTable(table, index);
    }));
    controls.append(info, pages);
  };

  const applyPagination = () => {
    document.querySelectorAll('table').forEach((table, index) => paginateTable(table, index));
    document.querySelectorAll('button').forEach((btn) => {
      const text = (btn.textContent || '').trim().toLowerCase();
      if (text === 'see more' || text === 'show more' || text === 'load more') {
        btn.style.display = 'none';
      }
    });
  };

  const decorateLayout = () => {
    document.body.classList.add('ms-theme-active');

    const aside = document.querySelector('aside');
    if (aside) {
      aside.classList.add('ms-theme-sidebar');
      const logoWrap = aside.firstElementChild;
      logoWrap?.classList.add('ms-theme-logo-wrap');
      const sidebarLogo = logoWrap?.querySelector('img');
      sidebarLogo?.classList.add('ms-theme-sidebar-logo');
      const logoText = logoWrap?.querySelectorAll('p') || [];
      logoText[0]?.classList.add('ms-theme-logo-title');
      logoText[1]?.classList.add('ms-theme-logo-subtitle');
      markNavigation(aside);
    }

    const main = aside?.nextElementSibling || document.querySelector('main');
    const topbar = main?.firstElementChild;
    const content = main?.children?.[1];
    topbar?.classList.add('ms-theme-topbar');
    content?.classList.add('ms-theme-content');

    topbar?.querySelectorAll('img.ms-theme-logo').forEach((img) => img.classList.add('ms-theme-header-logo'));

    document.querySelectorAll('div').forEach((el) => {
      const style = el.getAttribute('style') || '';
      if (style.includes('border-radius: 10px') && style.includes('padding: 16px')) el.classList.add('ms-theme-card');
      if (style.includes('border-left: 3px solid')) el.classList.add('ms-theme-metric');
      if (style.includes('box-shadow') && style.includes('rgba(83, 74, 183')) el.classList.add('ms-theme-card');
    });

    document.querySelectorAll('button').forEach((btn) => {
      const style = btn.getAttribute('style') || '';
      if (style.includes('#7F77DD') || style.includes('rgb(127, 119, 221)')) btn.classList.add('ms-theme-primary');
    });

    document.querySelectorAll('img.ms-theme-logo').forEach((img) => {
      if (!aside?.contains(img) && !topbar?.contains(img)) img.classList.add('ms-theme-login-logo');
    });

    replaceLogo();
    ensureHeadAssets();
    applyPagination();
  };

  let scheduled = false;
  const run = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      decorateLayout();
    });
  };

  document.addEventListener('DOMContentLoaded', run);
  window.addEventListener('load', run);

  let attempts = 0;
  const bootTimer = window.setInterval(() => {
    run();
    attempts += 1;
    if (attempts >= 24) window.clearInterval(bootTimer);
  }, 250);

  const startObserver = () => {
    const target = document.body || document.documentElement;
    new MutationObserver(run).observe(target, { childList: true, subtree: true });
  };

  if (document.body) startObserver();
  else document.addEventListener('DOMContentLoaded', startObserver, { once: true });
})();
