(() => {
  const removeThemeToggles = () => {
    localStorage.removeItem('ms_theme');
    document.documentElement.dataset.msTheme = 'light';
    document.querySelectorAll('[data-ms-theme-toggle], .ms-theme-toggle').forEach((el) => el.remove());
  };

  const improveBrand = () => {
    removeThemeToggles();

    const headings = [...document.querySelectorAll('h1')];
    headings.forEach((h) => {
      if (h.textContent.includes('မဟာရွှေ') || h.textContent.includes('Mahar')) {
        h.classList.add('ms-brand-title');
      }
    });

    [...document.querySelectorAll('button')].forEach((btn) => {
      const text = btn.textContent || '';
      if (text.includes('English') || text.includes('မြန်မာ')) btn.classList.add('ms-lang-button');
    });
  };

  document.addEventListener('DOMContentLoaded', () => {
    improveBrand();
    const mo = new MutationObserver(improveBrand);
    mo.observe(document.body, { childList: true, subtree: true });
  });
})();
