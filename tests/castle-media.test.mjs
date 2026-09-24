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
    ...scenes.map((id, i) => `./assets/quiet-castle.${String(i + 1).padStart(12, '0')}.${id}.svg`),
  ],
};

test('Castle media keys must identify the scene in their own URL', () => {
  const media = Object.fromEntries(scenes.map((id, i) => [id, config.files[i + 1]]));
  assert.equal(validatePackConfig({ ...config, media }), true);
  const swapped = { ...media, library: media.museum, museum: media.library };
  assert.equal(validatePackConfig({ ...config, media: swapped }), false);
  assert.equal(validatePackConfig({ ...config, media: Object.values(media) }), false);
  const renamed = { ...media, unknown: media.library };
  delete renamed.library;
  assert.equal(validatePackConfig({ ...config, media: renamed }), false);
  assert.equal(validatePackConfig({ ...config, media: { ...media, extra: media.library } }), false);
  const missing = { ...media };
  delete missing.library;
  assert.equal(validatePackConfig({ ...config, media: missing }), false);
});

test('Castle media validation permits independent hashes and does not mutate config', () => {
  const media = Object.freeze(Object.fromEntries(scenes.map((id, i) => [id, config.files[i + 1]])));
  const candidate = Object.freeze({ ...config, files: Object.freeze([...config.files]), media });
  const before = JSON.stringify(candidate);
  assert.equal(validatePackConfig(candidate), true);
  assert.equal(JSON.stringify(candidate), before);
  assert.equal(validatePackConfig(config), true, 'legacy configs may omit media');
});

test('A mismatched media map never opens or prunes a cache', async () => {
  const media = Object.fromEntries(scenes.map((id, i) => [id, config.files[i + 1]]));
  [media.library, media.museum] = [media.museum, media.library];
  const calls = [];
  const cache = createPackCache(() => ({ ...config, media }), {
    open: async () => {
      calls.push('open');
      return { match: async () => ({ ok: true }) };
    },
    keys: async () => (calls.push('keys'), []),
    delete: async () => calls.push('delete'),
  });
  assert.equal(await cache.load(), false);
  assert.equal(cache.available(), false);
  assert.deepEqual(calls, [], 'invalid media must not access or remove stored packs');
});
