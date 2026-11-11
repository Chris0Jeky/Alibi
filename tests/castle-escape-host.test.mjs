import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createEscapeHost } from '../src/castle/escape-room.mjs';

const dir = new URL('../content/escape-rooms/', import.meta.url);
const rooms = Object.fromEntries(
  fs
    .readdirSync(dir)
    .map((file) => JSON.parse(fs.readFileSync(new URL(file, dir), 'utf8')))
    .map((d) => [d.id, d]),
);
const tide = rooms['tidekeeper-workshop'];
const loft = rooms['counterweight-loft'];
const open = 'tidekeeper-workshop@1/locker/open-cabinet';

test('Undo and restart obey the route token of the visit that rendered them', () => {
  const host = createEscapeHost([tide, loft]);
  const a1 = host.enter(tide.id);
  assert.equal(host.act(a1, open, '9472').ok, true);
  const b = host.enter(loft.id);
  assert.equal(host.undo(a1), false, 'an old A control cannot rewind B');
  assert.equal(host.restart(a1), false);
  assert.equal(host.act(b, 'counterweight-loft@1/weight-object-1/weight-1-left').ok, true);
  assert.equal(host.view().undoDepth, 1, 'B kept its step');
  const a2 = host.enter(tide.id);
  assert.equal(host.view().undoDepth, 1, 'A kept its session across A/B/A');
  assert.equal(host.undo(String(b)), false);
  assert.equal(host.undo(String(a2)), true, 'dataset strings are accepted for the current visit');
  assert.equal(host.view().undoDepth, 0);
  assert.equal(host.act(a2, open, '9472').ok, true);
  assert.equal(host.restart(a2), true);
  assert.equal(host.view().undoDepth, 0);
  assert.equal(host.undo(a2), false);
  host.enter(null);
  assert.equal(host.view(), null);
  assert.equal(host.undo(a2), false, 'no room is current after leaving');
});

test('A wrong answer or an unoffered item use leaves the room exactly as it was', () => {
  const host = createEscapeHost([tide]);
  const t = host.enter(tide.id);
  const before = JSON.stringify(host.view());
  assert.deepEqual(
    [host.act(t, open, '1111').code, host.act(t, open, 'x'.repeat(65)).code],
    ['incorrect', 'invalid'],
  );
  // Installing the handle before it has been picked up is not offered.
  assert.equal(host.act(t, 'tidekeeper-workshop@1/lifting-gear/install-handle').code, 'stale');
  assert.equal(JSON.stringify(host.view()), before);
});

test('A fresh host resumes the exact room state and undo history', () => {
  const host = createEscapeHost([tide, loft]);
  const token = host.enter(tide.id);
  assert.equal(host.act(token, open, '9472').ok, true);
  assert.equal(host.act(token, 'tidekeeper-workshop@1/locker/take-handle').ok, true);
  const trail = host.snapshot(token);
  const restored = createEscapeHost([tide, loft]);
  const current = restored.enter(tide.id, trail);
  assert.deepEqual(restored.view(), host.view());
  assert.equal(restored.undo(current), true);
  assert.deepEqual(restored.view().inventory, []);
  host.enter(loft.id);
  assert.equal(host.snapshot(token), null, 'a disposed visit cannot snapshot another room');
});

test('Each offered action carries only its own authored hint ladder', () => {
  for (const d of Object.values(rooms)) {
    const host = createEscapeHost([d]);
    host.enter(d.id);
    for (const mode of [true, false])
      for (const o of host.view(mode).objects)
        for (const a of o.actions) {
          const source = d.actions.find((x) => a.handle.endsWith(`/${x.object}/${x.id}`));
          assert.deepEqual(
            a.hints,
            source.hints.map((h) => h[mode ? 'storyOn' : 'storyOff']),
          );
          if (source.input)
            assert.ok(
              a.hints.every((h) => !h.includes(source.answer)),
              `${d.id}/${source.id} hint text never states the accepted answer`,
            );
        }
  }
});

test('The escape player uses the Castle host save and no separate store', () => {
  const player = fs.readFileSync(
    new URL('../src/castle/escape-player.mjs', import.meta.url),
    'utf8',
  );
  for (const forbidden of [/indexedDB/, /localStorage/, /sessionStorage/])
    assert.doesNotMatch(player, forbidden);
  assert.match(player, /\bsave\(next\)/);
});
