'use strict';
// Fail-closed guards for dev-only release tooling: a malformed curation derivative must throw
// instead of emitting a corrupt data URL, and a bad --pulseboard value must throw instead of
// silently falling back to an ambient checkout.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const buildCuration = require('../tools/build-curation.cjs');
const { findPulseboard, pulseboardOption } = require('../tools/release-prepare.cjs');

function curationFixture({ format } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-curation-'));
  const dist = path.join(root, 'dist');
  const payload = Buffer.from('cover-bytes-for-hash-check');
  const sha256 = crypto.createHash('sha256').update(payload).digest('hex');
  fs.mkdirSync(path.join(root, 'assets-source/curation'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src/curation-assets'), { recursive: true });
  fs.mkdirSync(dist, { recursive: true });
  fs.mkdirSync(path.join(dist, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(root, 'src/curation-assets/x.webp'), payload);
  const derivative = { file: 'src/curation-assets/x.webp', sha256 };
  if (format !== undefined) derivative.format = format;
  const registry = {
    assets: [
      {
        id: 'cover-x',
        kind: 'venue-cover',
        venue: 'copper',
        title: 'Cover X',
        alt: 'Alt text.',
        source: { objectPage: 'https://example.invalid/cover-x' },
        derivative,
      },
    ],
  };
  fs.writeFileSync(
    path.join(root, 'assets-source/curation/registry.json'),
    JSON.stringify(registry),
  );
  fs.writeFileSync(
    path.join(root, 'assets-source/curation/runtime.json'),
    JSON.stringify({ assets: [] }),
  );
  return { root, dist };
}

test('a venue-cover derivative without format fails closed', () => {
  const { root, dist } = curationFixture();
  assert.throws(() => buildCuration(root, dist), /Invalid curation derivative/);
});

test('a venue-cover derivative with format keeps its data URL', () => {
  const { root, dist } = curationFixture({ format: 'image/webp' });
  const result = buildCuration(root, dist);
  assert.ok(result.inlineMedia['cover-x'].startsWith('data:image/webp;base64,'));
});

test('--pulseboard as the last arg throws usage', () => {
  assert.throws(() => pulseboardOption(['0.15.0', '--pulseboard']), /Usage/);
});

test('--pulseboard followed by another flag throws usage', () => {
  assert.throws(() => pulseboardOption(['0.15.0', '--pulseboard', '--publish']), /Usage/);
});

test('an explicit --pulseboard dir without .git throws instead of falling back', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-pulseboard-'));
  assert.throws(() => findPulseboard(dir), /Pulseboard checkout not found/);
});

test('an explicit --pulseboard checkout resolves, and an absent flag stays ambient', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-pulseboard-'));
  fs.mkdirSync(path.join(dir, '.git'));
  assert.equal(findPulseboard(dir), path.resolve(dir));
  assert.equal(pulseboardOption(['0.15.0', '--publish']), undefined);
  assert.equal(pulseboardOption(['0.15.0', '--pulseboard', dir]), dir);
});
