import test from 'node:test';
import assert from 'node:assert/strict';
import { createPackCache } from '../src/castle/cache.mjs';

const config = {
  build: '123456abcdef',
  files: ['./assets/quiet-castle.123456abcdef.js'],
};
test('Castle cache retains its predecessor and never deletes other activity caches', async () => {
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

test('Castle cache refuses foreign or mismatched files and tolerates denied storage', async () => {
  let opened = 0;
  const storage = {
    open: async () => {
      opened++;
      throw Error('Cache storage denied');
    },
  };
  const invalid = createPackCache(() => ({ ...config, files: ['https://example.test/x'] }), storage);
  assert.equal(await invalid.load(), false);
  assert.equal(opened, 0);
  const denied = createPackCache(() => config, storage);
  assert.equal(await denied.load(), false);
  assert.equal(denied.available(), false);
});
