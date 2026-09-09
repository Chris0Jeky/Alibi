import test from 'node:test';
import assert from 'node:assert/strict';
import { createPackCache, validatePackConfig } from '../src/castle/cache.mjs';

const scenes = [
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
];
const config = {
  build: '123456abcdef',
  files: [
    './assets/quiet-castle.123456abcdef.js',
    ...scenes.map(
      (id, index) => `./assets/quiet-castle.${String(index + 1).padStart(12, '0')}.${id}.svg`,
    ),
  ],
};
test('Castle cache keeps its predecessor and leaves other activity caches alone', async () => {
  const removed = [];
  const storage = {
    open: async () => ({ match: async () => ({ ok: true }) }),
    keys: async () => [
      'alibi-shell-old',
      'alibi-quiet-wing-pack-old',
      'alibi-castle-pack-oldest',
      'alibi-castle-pack-previous',
      'alibi-castle-pack-123456abcdef',
    ],
    delete: async (key) => removed.push(key),
  };
  const cache = createPackCache(() => config, storage);
  assert.equal(await cache.load(), true);
  assert.equal(cache.available(), true);
  assert.deepEqual(removed, ['alibi-castle-pack-oldest']);
});

test('Castle cache rejects mismatched files and tolerates storage denial', async () => {
  let opened = 0;
  const storage = {
    open: async () => {
      opened++;
      throw Error('Cache storage denied');
    },
  };
  const foreign = { ...config, files: ['https://example.test/x', ...config.files.slice(1)] };
  const invalid = createPackCache(() => foreign, storage);
  assert.equal(await invalid.load(), false);
  assert.equal(opened, 0);
  const denied = createPackCache(() => config, storage);
  assert.equal(await denied.load(), false);
  assert.equal(denied.available(), false);
});

test('Castle cache validates the bounded hashed scene manifest', () => {
  assert.equal(validatePackConfig(config), true);
  for (const files of [
    [config.files[0], ...config.files.slice(1, -1), config.files.at(-1).replace('.svg', '.png')],
    [
      config.files[0],
      ...config.files.slice(1, -1),
      './assets/quiet-castle.not-a-hash.workshop.svg',
    ],
    [config.files[0], ...config.files.slice(1, -1), `${config.files.at(-1)}?v=1`],
    [config.files[0], ...config.files.slice(1, -1), config.files[1]],
    [...config.files, './assets/quiet-castle.abcdefabcdef.extra.svg'],
  ]) {
    assert.equal(validatePackConfig({ ...config, files }), false);
  }
  assert.equal(validatePackConfig({ ...config, build: '123456ABCDEF' }), false);
  assert.equal(
    validatePackConfig({ ...config, files: [config.files[0], ...config.files.slice(2)] }),
    false,
  );
  assert.equal(
    validatePackConfig({
      ...config,
      media: { ...Object.fromEntries(scenes.map((id) => [id, config.files[1]])) },
    }),
    false,
  );
});

test('Castle cache deletes a partial pack and stays unavailable after add failure', async () => {
  const removed = [];
  const storage = {
    open: async () => ({
      match: async (url) => (url === config.files[0] ? { ok: true } : undefined),
      addAll: async () => {
        throw Error('network unavailable');
      },
    }),
    delete: async (key) => {
      removed.push(key);
    },
    keys: async () => [`alibi-castle-pack-${config.build}`],
  };
  const cache = createPackCache(() => config, storage);
  assert.equal(await cache.load(), false);
  assert.equal(cache.available(), false);
  assert.deepEqual(removed, [`alibi-castle-pack-${config.build}`]);
});

test('Castle cache deletes a pack when addAll leaves a scene missing', async () => {
  const removed = [];
  const storage = {
    open: async () => ({
      match: async (url) => (url === config.files[0] ? { ok: true } : undefined),
      addAll: async () => {},
    }),
    delete: async (key) => {
      removed.push(key);
    },
    keys: async () => [],
  };
  const cache = createPackCache(() => config, storage);
  assert.equal(await cache.load(), false);
  assert.equal(cache.available(), false);
  assert.deepEqual(removed, [`alibi-castle-pack-${config.build}`]);
});
