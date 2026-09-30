// Generated from docs.manifest.json and the Trillion app's own looks. Run npm run docs:generate.
(() => {
  const colours = {"light":"#f4f0e8","dark":"#000000"};
  const root = document.documentElement;
  const paint = () => {
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.append(meta);
    }
    meta.content = root.classList.contains('dark') ? colours.dark : colours.light;
  };
  paint();
  new MutationObserver(paint).observe(root, { attributes: true, attributeFilter: ['class'] });
})();
