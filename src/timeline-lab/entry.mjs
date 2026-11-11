import css from './style.css';
import { createStore } from './storage.mjs';
import { mount as mountPlayer, flushDrafts } from './player.mjs';
let store,
  active = null,
  available = false,
  caching = null;
const getStore = () => (store ||= createStore());
const config = () => globalThis.ALIBI_QUIET_CONFIG?.timeline;
async function flush() {
  flushDrafts();
  if (store) await store.flush();
}
async function cachePack() {
  const c = config();
  if (c?.source) {
    available = true;
    active?.refreshOffline(true);
    return true;
  }
  if (!c?.build || !Array.isArray(c.files) || !c.files.length || !globalThis.caches) return false;
  if (caching) return caching;
  caching = (async () => {
    const name = `alibi-timeline-pack-${c.build}`;
    try {
      const cache = await caches.open(name);
      if (!(await Promise.all(c.files.map((x) => cache.match(x)))).every(Boolean)) {
        try {
          await cache.addAll(
            c.files.map(
              (x) => new Request(x, { cache: 'reload', signal: AbortSignal.timeout(15000) }),
            ),
          );
        } catch (e) {
          await caches.delete(name);
          throw e;
        }
      }
      available = true;
      const keys = (await caches.keys()).filter((x) => x.startsWith('alibi-timeline-pack-'));
      const keep = new Set([name, ...keys.filter((x) => x !== name).slice(-1)]);
      await Promise.all(keys.filter((x) => !keep.has(x)).map((x) => caches.delete(x)));
      active?.refreshOffline(true);
      return true;
    } catch {
      available = false;
      active?.refreshOffline(false);
      return false;
    }
  })().finally(() => {
    caching = null;
  });
  return caching;
}
function mount(options) {
  const h = mountPlayer({
    ...options,
    css,
    store: getStore(),
    offline: available || !!config()?.source,
  });
  active = h;
  return {
    ...h,
    dispose() {
      if (active === h) active = null;
      h.dispose();
    },
  };
}
globalThis.AlibiTimeline = {
  mount,
  flush,
  cachePack,
  offline() {
    return available || !!config()?.source;
  },
};
