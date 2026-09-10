/* Optional tactile controls. Failure leaves the original Block Cabinet fully playable. */
(function (G) {
  'use strict';
  let loading = null;
  async function cache(c) {
    if (!G.caches || !c.files) return;
    const name = 'alibi-block-motion-' + c.build;
    try {
      const pack = await caches.open(name);
      await pack.addAll(c.files.map((url) => new Request(url, { cache: 'reload', signal: AbortSignal.timeout(15000) })));
      const keys = (await caches.keys()).filter((key) => key.startsWith('alibi-block-motion-'));
      const keep = new Set([name, ...keys.filter((key) => key !== name).slice(-1)]);
      await Promise.all(keys.filter((key) => !keep.has(key)).map((key) => caches.delete(key)));
    } catch { /* A downloaded pack is not a promise of offline readiness. */ }
  }
  function resource(tag, value, inline) {
    return new Promise((resolve, reject) => {
      const node = document.createElement(tag);
      if (inline) { node.textContent = value; document.head.append(node); resolve(); return; }
      const timer = setTimeout(() => { node.remove(); reject(Error('Tactile controls timed out.')); }, 15000);
      node.onload = () => { clearTimeout(timer); resolve(); };
      node.onerror = () => { clearTimeout(timer); node.remove(); reject(Error('Tactile controls unavailable.')); };
      if (tag === 'link') { node.rel = 'stylesheet'; node.href = value; } else node.src = value;
      document.head.append(node);
    });
  }
  function check() {
    if (loading || !document.querySelector('.block-panel') || !G.ALIBI_BLOCK_MOTION) return;
    const c = G.ALIBI_BLOCK_MOTION;
    loading = Promise.all([
      resource(c.cssSource ? 'style' : 'link', c.cssSource || c.css, !!c.cssSource),
      resource('script', c.source || c.script, !!c.source),
    ]).then(() => { G.AlibiBlockMotion.start(); observer.disconnect(); cache(c); })
      .catch(() => { loading = null; });
  }
  const observer = new MutationObserver(check);
  observer.observe(document.body, { childList: true, subtree: true });
  check();
})(globalThis);
