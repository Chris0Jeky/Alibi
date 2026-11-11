const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { render } = require('../../tools/ci-browser-origin-shadow.cjs');

const shadow = fs.readFileSync(
  path.join(__dirname, '../../.github/workflows/browser-origin-shadow.yml'),
  'utf8',
);
const commands = (script) =>
  script.split('\n').filter((line) => /(?:^| )python tests\/browser_/.test(line));

test('serial and all four shards retain the original browser commands and environment', () => {
  const serial = render('serial');
  const shards = ['1', '2', '3', '4'].map(render);
  // SHA-256 of the original cabinet block at f1329a25, including the servers and environment.
  assert.equal(
    createHash('sha256').update(serial).digest('hex'),
    '9bfed6e10dc625306466665e4e7c387815f8d76ee037d5cdcad1a2b11aa7c088',
  );
  assert.equal(commands(serial).length, 57);
  assert.equal(new Set(commands(serial).map((line) => line.split(' ').at(-1))).size, 57);
  assert.deepEqual(shards.flatMap(commands), commands(serial));
  for (const shard of shards) {
    assert.match(shard, /^npm start > \/tmp\/alibi-server\.log 2>&1 &\n/);
    assert.ok(commands(shard).length > 0);
  }
  assert.equal(shards.filter((shard) => shard.includes('node tools/serve-assets.cjs')).length, 1);
  assert.match(shards[3], /node tools\/serve-assets\.cjs[\s\S]+python tests\/browser_assets\.py/);
});

test('unknown slices do not render commands', () => {
  for (const slice of ['', '0', '5', '11', undefined]) {
    assert.throws(() => render(slice), /unknown browser origin shard/i);
  }
});

test('the manual workflow selects the serial control and all four shards once', () => {
  assert.match(shadow, /^on: workflow_dispatch\r?$/m);
  const matrices = [...shadow.matchAll(/^ {8}slice: \[(.+)\]\r?$/gm)];
  assert.deepEqual(
    matrices.map((match) => match[1].split(', ').map((slice) => slice.replaceAll("'", ''))),
    [['serial', '1', '2', '3', '4']],
  );
});

test('failed slices retain source, build and browser diagnostics without masking the failure', () => {
  const [run, diagnostics] = shadow.split('      - name: Gather local shadow diagnostics\n');
  assert.ok(diagnostics, 'the shadow workflow gathers failure evidence');
  const [gather, evidence] = diagnostics.split('      - name: Upload shadow failure evidence\n');
  assert.ok(evidence, 'the shadow workflow uploads failure evidence');
  assert.match(run, /bash -e "\$RUNNER_TEMP\/alibi-origin\.sh"/);
  assert.match(run, / > "\$RUNNER_TEMP\/alibi-origin-source\.txt"/);
  assert.doesNotMatch(shadow, /continue-on-error:/);
  for (const step of [gather, evidence]) {
    assert.match(step, /^        if: \$\{\{ failure\(\) \}\}$/m);
  }
  assert.match(evidence, /uses: actions\/upload-artifact@[0-9a-f]{40} # v4\b/);
  assert.match(
    evidence,
    /name: alibi-origin-failure-\$\{\{ matrix\.slice \}\}-attempt-\$\{\{ github\.run_attempt \}\}/,
  );
  for (const entry of [
    '/alibi-origin-source.txt',
    '/alibi-origin.sh',
    '/tmp/alibi-server.log',
    '/tmp/alibi-assets.log',
  ]) {
    assert.ok(gather.includes(entry), 'missing local diagnostic: ' + entry);
  }
  for (const entry of [
    'test-results/shadow-evidence/',
    'build-info.json',
    'dist/assets/alibi-platform-identity.*.js',
    'dist-android/android-build-identity.json',
    'test-results/browser-origin/browser-origin.json',
    'test-results/browser-origin/failure.png',
  ]) {
    assert.ok(evidence.includes(entry), 'missing failure evidence: ' + entry);
  }
});
