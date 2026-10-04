/** Browser-only appearance preference. No account or session data is stored. */
(() => {
  const key = 'pokemmo-tiquicia-theme';
  const root = document.documentElement;
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const valid = value => value === 'light' || value === 'dark';
  let choice = null;
  let storage = null;
  try { storage = window.localStorage; const saved = storage.getItem(key); if (valid(saved)) choice = saved; } catch { /* Storage may be unavailable. */ }

  function apply() {
    const dark = (choice || (system.matches ? 'dark' : 'light')) === 'dark';
    root.dataset.theme = dark ? 'dark' : 'light';
    for (const button of document.querySelectorAll('[data-theme-toggle]')) {
      button.textContent = dark ? 'Tema: Oscuro' : 'Tema: Claro';
      button.setAttribute('aria-pressed', String(dark));
      button.setAttribute('aria-label', dark ? 'Activar modo claro' : 'Activar modo oscuro');
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#1c2025' : '#eee9d7');
  }

  apply(); // Before styles paint: respect the saved choice or system preference.
  document.addEventListener('DOMContentLoaded', () => {
    apply();
    for (const button of document.querySelectorAll('[data-theme-toggle]')) {
      button.addEventListener('click', () => {
        choice = root.dataset.theme === 'dark' ? 'light' : 'dark';
        try { storage?.setItem(key, choice); } catch { /* The choice still works for this page. */ }
        apply();
      });
    }
  }, { once: true });
  system.addEventListener('change', () => { if (!choice) apply(); });
  window.addEventListener('storage', event => {
    if (storage && event.storageArea === storage && (event.key === key || event.key === null)) {
      choice = valid(event.newValue) ? event.newValue : null;
      apply();
    }
  });
})();
