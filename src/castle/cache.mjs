export function createPackCache(getConfig, storage = globalThis.caches) {
  let pending = null,
    ready = false;
  async function fill() {
    const c = getConfig();
    if (!storage || !c?.build || !Array.isArray(c.files) || c.files.length !== 1) return false;
    const expected = `./assets/quiet-castle.${c.build}.js`;
    if (!/^[a-f0-9]{12}$/.test(c.build) || c.files[0] !== expected) return false;
    const prefix = 'alibi-castle-pack-',
      name = prefix + c.build;
    try {
      const cache = await storage.open(name);
      if (!(await cache.match(expected))) {
        try {
          await cache.addAll([
            new Request(new URL(expected, globalThis.location.href), {
              cache: 'reload',
              signal: AbortSignal.timeout(15000),
            }),
          ]);
        } catch (error) {
          await storage.delete(name);
          throw error;
        }
      }
      ready = true;
      const keys = (await storage.keys()).filter((key) => key.startsWith(prefix));
      const keep = new Set([name, ...keys.filter((key) => key !== name).slice(-1)]);
      await Promise.all(keys.filter((key) => !keep.has(key)).map((key) => storage.delete(key)));
      return true;
    } catch {
      ready = false;
      return false;
    }
  }
  return {
    load() {
      if (!pending)
        pending = fill().finally(() => {
          pending = null;
        });
      return pending;
    },
    available: () => ready,
  };
}
