const PREFIX = 'alibi-castle-pack-';
const BUILD = /^[a-f0-9]{12}$/;
const SCRIPT = /^\.\/assets\/quiet-castle\.([a-f0-9]{12})\.js$/;
const SCENE = /^\.\/assets\/quiet-castle\.([a-f0-9]{12})\.([a-z0-9-]+)\.svg$/;
const SCENE_IDS = new Set([
  'cartography',
  'conservatory',
  'estate-1911',
  'estate-today',
  'gatehouse',
  'library',
  'museum',
  'observatory',
  'orangery',
  'study',
  'west-stair',
  'workshop',
]);
const FILE_COUNT = 13;

function validURL(url, pattern) {
  return typeof url === 'string' && !/[?#\\]/.test(url) && pattern.test(url);
}

export function validatePackConfig(config) {
  if (!config || typeof config !== 'object' || !BUILD.test(config.build)) return false;
  if (!Array.isArray(config.files) || config.files.length !== FILE_COUNT) return false;
  if (new Set(config.files).size !== config.files.length) return false;
  const script = `./assets/quiet-castle.${config.build}.js`;
  if (
    config.files[0] !== script ||
    (config.script !== undefined && config.script !== script) ||
    !validURL(config.files[0], SCRIPT)
  )
    return false;
  const scenes = config.files.slice(1);
  const ids = [];
  for (const url of scenes) {
    const match = SCENE.exec(url);
    if (!validURL(url, SCENE) || !match || !SCENE_IDS.has(match[2])) return false;
    ids.push(match[2]);
  }
  if (new Set(ids).size !== ids.length) return false;
  if (config.media !== undefined) {
    if (!config.media || typeof config.media !== 'object') return false;
    const entries = Object.entries(config.media);
    if (
      entries.length !== SCENE_IDS.size ||
      !entries.every(
        ([id, url]) => SCENE_IDS.has(id) && scenes.includes(url) && SCENE.exec(url)[2] === id,
      )
    )
      return false;
  }
  return true;
}

async function discard(storage, name) {
  try {
    await storage?.delete?.(name);
  } catch {}
}

function requestFor(url) {
  const base = globalThis.location?.href || 'https://alibi.invalid/';
  return new Request(new URL(url, base), {
    cache: 'reload',
    signal: AbortSignal.timeout(15000),
  });
}

export function createPackCache(getConfig, storage = globalThis.caches) {
  let pending = null;
  let ready = false;

  async function fill() {
    let config;
    try {
      config = getConfig?.();
    } catch {
      ready = false;
      return false;
    }
    if (!storage || !validatePackConfig(config)) {
      ready = false;
      return false;
    }
    const name = PREFIX + config.build;
    let discarded = false;
    try {
      const cache = await storage.open(name);
      const complete = async () =>
        (await Promise.all(config.files.map((url) => cache.match(url)))).every(Boolean);
      if (!(await complete())) {
        try {
          await cache.addAll(config.files.map(requestFor));
          if (!(await complete())) throw Error('Castle cache did not contain every scene.');
        } catch (error) {
          discarded = true;
          await discard(storage, name);
          throw error;
        }
      }
      const keys = (await storage.keys()).filter((key) => key.startsWith(PREFIX));
      const keep = new Set([name, ...keys.filter((key) => key !== name).slice(-1)]);
      await Promise.all(keys.filter((key) => !keep.has(key)).map((key) => storage.delete(key)));
      ready = true;
      return true;
    } catch {
      ready = false;
      if (!discarded) await discard(storage, name);
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
