import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createShare } from '../src/castle/case-share.mjs';

const definition = JSON.parse(
  readFileSync(new URL('../content/cases/reading-room-blackout.json', import.meta.url)),
);

test('preview cancel does not copy; explicit copy writes exactly the preview', async () => {
  const share = createShare();
  const copied = [];
  share.open(definition, []);
  const preview = share.text;
  assert.ok(preview.includes(definition.title));
  assert.equal(share.cancel(), true);
  assert.deepEqual(copied, []);
  share.open(definition, []);
  assert.equal(await share.copy(async (text) => copied.push(text)), 'copied');
  assert.deepEqual(copied, [preview]);
  assert.equal(share.text, null);
});

test('pending clipboard disables cancellation and duplicate writes; rejection keeps preview', async () => {
  const share = createShare();
  share.open(definition, []);
  const preview = share.text;
  let reject;
  let calls = 0;
  const pending = share.copy(() => {
    calls++;
    return new Promise((_, fail) => {
      reject = fail;
    });
  });
  assert.equal(share.busy, true);
  assert.equal(share.cancel(), false);
  assert.equal(
    await share.copy(() => {
      calls++;
    }),
    'ignored',
  );
  reject(new Error('clipboard denied'));
  assert.equal(await pending, 'blocked');
  assert.equal(share.text, preview);
  assert.equal(share.busy, false);
  assert.equal(calls, 1);
});

test('dispose ignores late clipboard completion and progress never appears in output', async () => {
  const share = createShare();
  share.open(definition, []);
  const preview = share.text;
  share.cancel();
  share.open(
    definition,
    definition.steps.map((s) => s.id),
  );
  assert.equal(share.text, preview);
  let finish;
  const pending = share.copy(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  share.dispose();
  finish();
  assert.equal(await pending, 'stale');
  assert.equal(share.text, null);
});
