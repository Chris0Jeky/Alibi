'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const manifest = path.join(root, 'docs/escape-rooms/anthology-review.json');
const names = ['tidekeeper-workshop', 'printmaker-cabinet', 'moonseed-conservatory',
  'herbarium-lift', 'counterweight-loft', 'clockmaker-rehearsal'];
for (const id of names) {
  test(`${id}: reviewed clue/model receipt binds the complete authored source`, () => {
    assert.ok(fs.existsSync(manifest), 'Missing explicit editorial source bindings');
    const ledger = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    assert.equal(ledger.scope, 'author-self-review; not human calibration');
    assert.deepEqual(ledger.rooms.map(room => room.id), names);
    const entry = ledger.rooms.find(room => room.id === id);
    const bytes = fs.readFileSync(path.join(root, 'content/escape-rooms', `${id}.json`));
    const definition = JSON.parse(bytes);
    assert.equal(entry.revision, definition.revision);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), entry.sourceSha256,
      'Room changed: recheck clue derivations, visibility and recovery before rebinding.');
    assert.ok(entry.derivation.length > 30);
  });
}
