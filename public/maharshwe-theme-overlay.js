(() => {
  const LOGO_URL = './maharshwe-logo.png';
  const REMOTE_LOGO_RE = /raw\.githubusercontent\.com\/maharshwemobile-lgtm\/DataForPublic|avatars\.githubusercontent\.com/i;

  const setImportant = (el, styles) => {
    Object.entries(styles).forEach(([key, value]) => el.style.setProperty(key, value, 'important'));
  };

  const ensureHeadAssets = () => {
    const href = new URL(LOGO_URL, window.location.href).href;
    document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]').forEach((link) => {
      link.href = href;
    });
  };

  const replaceLogo = () => {
    const href = new URL(LOGO_URL, window.location.href).href;
    document.querySelectorAll('img').forEach((img) => {
      const src = img.getAttribute('src') || '';
      const alt = img.getAttribute('alt') || '';
      if (REMOTE_LOGO_RE.test(src) || /Mahar Shwe|POS Logo|logo/i.test(alt)) {
        if (img.src !== href) img.src = href;
        img.classList.add('ms-theme-logo');
        img.onerror = () => {
          img.onerror = null;
          img.src = href;
        };
      }
    });
  };

  const decorateLayout = () => {
    document.body.classList.add('ms-theme-active');
    const aside = document.querySelector('aside');
    if (aside) {
      aside.classList.add('ms-theme-sidebar');
      aside.firstElementChild?.classList.add('ms-theme-logo-wrap');
      aside.querySelectorAll('div').forEach((el) => {
        const style = el.getAttribute('style') || '';
        if (style.includes('text-transform: uppercase')) el.classList.add('ms-theme-nav-label');
        if (style.includes('cursor: pointer')) {
          el.classList.add('ms-theme-nav-item');
          const bg = el.style.background || '';
          const color = el.style.color || '';
          if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)' && color.includes('83, 74, 183')) {
            el.classList.add('ms-active');
          } else if (bg && bg !== 'transparent') {
            el.classList.add('ms-active');
          } else {
            el.classList.remove('ms-active');
          }
        }
      });
    }

    const main = aside?.nextElementSibling || document.querySelector('main');
    const topbar = main?.firstElementChild;
    const content = main?.children?.[1];
    topbar?.classList.add('ms-theme-topbar');
    content?.classList.add('ms-theme-content');

    document.querySelectorAll('div').forEach((el) => {
      const style = el.getAttribute('style') || '';
      if (style.includes('border-radius: 10px') && style.includes('padding: 16px')) el.classList.add('ms-theme-card');
      if (style.includes('border-left: 3px solid')) el.classList.add('ms-theme-metric');
    });

    document.querySelectorAll('button').forEach((btn) => {
      const style = btn.getAttribute('style') || '';
      if (style.includes('#7F77DD') || style.includes('rgb(127, 119, 221)')) btn.classList.add('ms-theme-primary');
    });

    replaceLogo();
    ensureHeadAssets();
  };

  const run = () => requestAnimationFrame(decorateLayout);
  document.addEventListener('DOMContentLoaded', run);
  window.addEventListener('load', run);
  const observer = new MutationObserver(run);
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'src', 'class'] });
})();
