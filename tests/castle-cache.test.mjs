import test from 'node:test';
import assert from 'node:assert/strict';
import { createPackCache } from '../src/castle/cache.mjs';

const config = {
  build: '123456abcdef',
  files: ['./assets/quiet-castle.123456abcdef.js'],
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
  const foreign = { ...config, files: ['https://example.test/x'] };
  const invalid = createPackCache(() => foreign, storage);
  assert.equal(await invalid.load(), false);
  assert.equal(opened, 0);
  const denied = createPackCache(() => config, storage);
  assert.equal(await denied.load(), false);
  assert.equal(denied.available(), false);
});
