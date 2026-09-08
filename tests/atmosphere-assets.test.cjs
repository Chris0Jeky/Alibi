'use strict';
const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path'),
  crypto = require('node:crypto'),
  sharp = require('sharp');
test('atmosphere images match explicit museum rights and decoded source receipts', async () => {
  const root = path.resolve(__dirname, '..'),
    dir = path.join(root, 'assets-source/atmosphere');
  const ledger = JSON.parse(fs.readFileSync(path.join(dir, 'rights.json')));
  assert.equal(ledger.works.length, 3);
  const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
  for (const work of ledger.works) {
    const record = JSON.parse(fs.readFileSync(path.join(dir, work.id + '.record.json')));
    assert.equal(record.isPublicDomain, true);
    assert.equal(record.title, work.title);
    assert.equal(record.artistDisplayName, work.artist);
    const source = fs.readFileSync(path.join(dir, work.id + '.jpg')),
      built = fs.readFileSync(path.join(root, 'src/artwork', work.id + '.webp'));
    assert.equal(sha(source), work.original.sha256);
    assert.equal(sha(built), work.optimized.sha256);
    const decoded = await sharp(built).raw().toBuffer({ resolveWithObject: true });
    assert.equal(decoded.info.width, work.optimized.width);
    assert.equal(decoded.info.height, work.optimized.height);
    assert.ok(decoded.data.length > 10000);
  }
});
