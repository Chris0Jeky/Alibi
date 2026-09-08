const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const audioRoot = path.join(root, 'assets-source', 'library', 'audio');
const cataloguePath = path.join(audioRoot, 'catalogue.json');
const catalogue = JSON.parse(fs.readFileSync(cataloguePath, 'utf8'));

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

assert.equal(catalogue.assets.length, 24, 'catalogue has 20 cues and 4 loops');
assert.equal(catalogue.assets.filter((a) => a.category === 'ambient').length, 4);
assert.equal(catalogue.assets.filter((a) => a.category !== 'ambient').length, 20);
assert.equal(catalogue.defaults.autoplay, false);

for (const asset of catalogue.assets) {
  assert.equal(asset.status, 'proposed', `${asset.id} remains a proposed recording asset`);
  assert.ok(
    ['current', 'proposed'].includes(asset.existing_event_status),
    `${asset.id} preserves the existing event audit status`,
  );
  for (const [kind, relative] of Object.entries(asset.derivatives)) {
    assert.equal(path.isAbsolute(relative), false, `${asset.id} ${kind} path is portable`);
    assert.equal(relative.includes('..'), false, `${asset.id} ${kind} path does not escape root`);
    const file = path.join(root, relative);
    assert.equal(fs.existsSync(file), true, `${asset.id} ${kind} exists`);
    const expected =
      kind === 'wav_master' ? asset.metadata.master_sha256 : asset.metadata[`${kind}_sha256`];
    assert.equal(sha256(file), expected, `${asset.id} ${kind} hash receipt matches`);
    if (kind !== 'wav_master') {
      const probe = spawnSync(
        'ffprobe',
        ['-v', 'error', '-show_entries', 'format=duration:stream=codec_name', '-of', 'json', file],
        { encoding: 'utf8' },
      );
      assert.equal(probe.status, 0, `${asset.id} ${kind} is ffprobe-decodable: ${probe.stderr}`);
      const decoded = JSON.parse(probe.stdout);
      assert.ok(decoded.streams?.length, `${asset.id} ${kind} has a decoded stream`);
      assert.ok(decoded.format?.duration, `${asset.id} ${kind} has a duration`);
    }
  }
  assert.ok(asset.metadata.duration_ms > 200, `${asset.id} has duration`);
  assert.ok(asset.metadata.rms_dbfs < -20, `${asset.id} remains calm`);
  assert.ok(
    asset.metadata.spectral.energy_above_20_hz_pct > 95,
    `${asset.id} has audible-band energy above 20 Hz`,
  );
  assert.ok(asset.metadata.spectral.sub20_energy_pct < 5, `${asset.id} has limited subsonic energy`);
  assert.ok(asset.metadata.spectral.dc_dbfs < -60, `${asset.id} has no large DC component`);
  if (asset.category === 'ambient') {
    assert.equal(asset.metadata.loop.deterministic, true);
    assert.equal(asset.metadata.loop.seam_sample_delta, 0);
    assert.ok(asset.metadata.duration_ms >= 16000 && asset.metadata.duration_ms <= 22000);
  }
}

const preview = fs.readFileSync(path.join(audioRoot, 'preview.html'), 'utf8');
assert.equal(preview.includes('autoplay'), false, 'preview does not autoplay');
assert.equal((preview.match(/<audio controls preload="none"/g) || []).length, 24);
assert.equal(fs.existsSync(path.join(audioRoot, 'evidence', 'waveform-contact.png')), true);
console.log(
  'asset-audio: 24 assets, hashes, levels, seam receipts, preview controls and ffprobe derivatives pass',
);
