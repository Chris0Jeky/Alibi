const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { render } = require('../../tools/ci-browser-origin-shadow.cjs');

const workflow = fs.readFileSync(path.join(__dirname, '../../.github/workflows/check.yml'), 'utf8');
const shadow = fs.readFileSync(
  path.join(__dirname, '../../.github/workflows/browser-origin-shadow.yml'),
  'utf8',
);
const commands = (script) =>
  script.split('\n').filter((line) => /(?:^| )python tests\/browser_/.test(line));

test('serial and all four shards retain the original browser commands and environment', () => {
  const baseline = workflow
    .replaceAll('\r\n', '\n')
    .split('      - name: Exercise real IndexedDB and offline play\n')[1]
    .split('\n      - name:')[0]
    .split('        run: |\n')[1]
    .split('\n')
    .map((line) => line.slice(10))
    .join('\n');

  const serial = render(workflow, 'serial');
  const shards = ['1', '2', '3', '4'].map((shard) => render(workflow, shard));
  assert.equal(serial, baseline + '\n');
  assert.equal(commands(serial).length, 57);
  assert.deepEqual(shards.flatMap(commands), commands(serial));
  for (const shard of shards) {
    assert.match(shard, /^npm start > \/tmp\/alibi-server\.log 2>&1 &\n/);
    assert.ok(commands(shard).length > 0);
  }
  assert.equal(shards.filter((shard) => shard.includes('node tools/serve-assets.cjs')).length, 1);
  assert.match(shards[3], /node tools\/serve-assets\.cjs[\s\S]+python tests\/browser_assets\.py/);
});

test('missing, duplicate or changed baseline commands stop script generation', () => {
  const source = '          python tests/browser_origin.py';
  const changes = ['', source + '\n' + source, source.replace('python', 'python3')];
  for (const replacement of changes) {
    assert.throws(
      () => render(workflow.replace(source, replacement), '1'),
      /real-origin step changed/,
    );
  }
  assert.throws(() => render(workflow, '5'), /unknown shadow shard/i);
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
