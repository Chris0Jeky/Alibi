/* Optional, immutable image upgrades. Complete local artwork is always rendered first. */
(function (G) {
  'use strict';
  const CACHE = 'alibi-enhanced-images-v2',
    MAX_BYTES = 1024 * 1024,
    MAX_ENTRIES = 8;
  const entries = G.ALIBI_DELIVERY || {};
  let preference = 'auto',
    dispose = () => {},
    writeQueue = Promise.resolve();
  try {
    if (G.localStorage.getItem('alibi-asset-mode') === 'local') preference = 'local';
  } catch {}
  const mode = () => preference;
  const allowed = () =>
    preference === 'auto' &&
    !G.ALIBI_CONFIG?.standalone &&
    !G.document?.hidden &&
    G.navigator?.onLine !== false &&
    !G.navigator?.connection?.saveData &&
    !/^(slow-)?2g$/.test(G.navigator?.connection?.effectiveType || '');
  function bounded(promise, ms = 1500) {
    let timer;
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(Error('Storage timeout')), ms);
      }),
    ]).finally(() => clearTimeout(timer));
  }
  // Retire only our known superseded image cache. Never enumerate or delete save/shell caches.
  try {
    if (G.caches?.delete) void bounded(G.caches.delete('alibi-enhanced-images-v1')).catch(() => {});
  } catch {}
  async function validated(response, entry) {
    if (
      !response?.ok ||
      response.type === 'opaque' ||
      response.status === 206 ||
      response.headers.get('content-type')?.split(';')[0] !== entry.mime ||
      !response.body
    )
      throw Error('Invalid image response');
    const reader = response.body.getReader(),
      chunks = [];
    let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > Math.min(entry.bytes, MAX_BYTES)) throw Error('Image exceeds budget');
        chunks.push(value);
      }
    } finally {
      await reader.cancel().catch(() => {});
    }
    if (size !== entry.bytes) throw Error('Image length mismatch');
    const blob = new Blob(chunks, { type: entry.mime });
    const digest = Array.from(
      new Uint8Array(await G.crypto.subtle.digest('SHA-256', await blob.arrayBuffer())),
      (b) => b.toString(16).padStart(2, '0'),
    ).join('');
    if (digest !== entry.sha256) throw Error('Image fingerprint mismatch');
    return blob;
  }
  async function resolve(id, signal) {
    const entry = entries[id];
    if (!entry || preference === 'local' || G.ALIBI_CONFIG?.standalone || signal?.aborted)
      return null;
    // Eight deterministic slots remain bounded even when several tabs write concurrently.
    // A collision only replaces optional detail; the fingerprint check prevents a wrong image.
    const slot = parseInt(entry.sha256.slice(0, 8), 16) % MAX_ENTRIES;
    const key = new URL('./__alibi-detail/' + slot, G.location.href).href;
    let cache;
    try {
      cache = await bounded(G.caches.open(CACHE));
      const hit = await bounded(cache.match(key));
      if (hit) return await bounded(validated(hit, entry));
    } catch {
      /* Quota, denied storage or corrupt cached media never blocks the local image. */
    }
    if (!allowed() || signal?.aborted) return null;
    for (const url of entry.urls) {
      if (!allowed() || signal?.aborted) return null;
      const controller = new AbortController();
      const abort = () => controller.abort();
      signal?.addEventListener('abort', abort, { once: true });
      const timer = setTimeout(abort, 4000);
      try {
        const response = await fetch(url, {
          mode: 'cors',
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
          redirect: 'error',
          signal: controller.signal,
        });
        const blob = await validated(response, entry);
        if (controller.signal.aborted || !allowed()) return null;
        if (cache) {
          // Serialize this document's writes to the fixed slots. Optional storage has no access to save databases or shell caches.
          writeQueue = writeQueue
            .catch(() => {})
            .then(async () => {
              await bounded(
                cache.put(key, new Response(blob, { headers: { 'Content-Type': entry.mime } })),
              );
            })
            .catch(() => {});
        }
        return blob;
      } catch {
        /* Try the same-origin mirror, then retain the complete compact image. */
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
      }
    }
    return null;
  }
  function observe(root = G.document) {
    dispose();
    if (!root?.querySelectorAll || !G.IntersectionObserver) return;
    const controller = new AbortController(),
      urls = [],
      queue = [];
    let active = 0;
    const images = [...root.querySelectorAll('img[data-adaptive-image]')];
    for (const img of images) {
      const entry = entries[img.dataset.adaptiveImage];
      if (entry) {
        img.src = entry.fallback;
        img.dataset.assetQuality = 'compact';
        const credit = img.parentElement?.querySelector('[data-adaptive-credit]');
        if (credit) credit.hidden = true;
      }
    }
    async function pump() {
      if (controller.signal.aborted || active >= 2 || !queue.length) return;
      const img = queue.shift();
      active++;
      try {
        const blob = await resolve(img.dataset.adaptiveImage, controller.signal);
        if (!blob || controller.signal.aborted || !img.isConnected) return;
        const url = URL.createObjectURL(blob);
        urls.push(url);
        const probe = new Image();
        probe.src = url;
        await bounded(probe.decode(), 2000);
        if (!controller.signal.aborted && img.isConnected && preference !== 'local') {
          img.src = url;
          img.dataset.assetQuality = 'enhanced';
          const credit = img.parentElement?.querySelector('[data-adaptive-credit]');
          if (credit) credit.hidden = false;
        }
      } catch {
        /* Decode failure retains the compact artwork. */
      } finally {
        active--;
        void pump();
      }
    }
    const observer = new IntersectionObserver((changes) => {
      for (const c of changes)
        if (c.isIntersecting) {
          observer.unobserve(c.target);
          queue.push(c.target);
          void pump();
        }
    });
    images.forEach((img) => observer.observe(img));
    dispose = () => {
      controller.abort();
      observer.disconnect();
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
    root.querySelectorAll('[data-asset-mode]').forEach((button) => {
      button.setAttribute('aria-pressed', String(preference === 'local'));
      button.onclick = () => {
        setMode(preference === 'local' ? 'auto' : 'local');
      };
    });
  }
  function setMode(value) {
    preference = value === 'local' ? 'local' : 'auto';
    try {
      G.localStorage.setItem('alibi-asset-mode', preference);
    } catch {}
    observe();
  }
  G.addEventListener?.('online', () => observe());
  G.document?.addEventListener('visibilitychange', () => observe());
  G.navigator?.connection?.addEventListener('change', () => observe());
  G.AlibiDelivery = { resolve, observe, setMode, mode };
})(globalThis);
