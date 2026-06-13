(() => {
  const LOGO_URL = window.MS_THEME_LOGO_URL || './maharshwe-logo.png';
  const REMOTE_LOGO_RE = /raw\.githubusercontent\.com\/maharshwemobile-lgtm\/DataForPublic|avatars\.githubusercontent\.com/i;

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
