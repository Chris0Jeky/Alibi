'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const helper = path.join(root, 'tools/android-native-diagnostic-excerpt.py');
const line = (message) => `10-29 03:27:51.000  123  123 I AlibiNativeSmoke: ${message}`;
function excerpt(input) {
  const dir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'native-excerpt-'));
  const inputPath = path.join(dir, 'input');
  fs.writeFileSync(inputPath, input);
  const fd = fs.openSync(inputPath, 'r');
  try {
    return spawnSync('python3', [helper], { stdio: [fd, 'pipe', 'pipe'], encoding: 'utf8' });
  } finally {
    fs.closeSync(fd);
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
test('failure excerpt prints only structured timing and stack traces', () => {
  const input = [
    line(
      'eval=11 stage=settings.click timeout-ms=10 submit-ms=0 ui-dispatch-ms=1 ui-return-ms=2 callback-ms=-1 heartbeat-ms=3 heartbeat-age-ms=7',
    ),
    line('eval=11 stage=settings.click main-state=RUNNABLE'),
    line(
      'eval=11 stage=settings.click main[0]=android.graphics.HardwareRenderer.nSyncAndDrawFrame(Native Method)',
    ),
    line(
      'eval=11 stage=settings.click main[2]=android.graphics.HardwareRenderer.syncAndDrawFrame(HardwareRenderer.java:1)',
    ),
    line('condition=1 stage=boot.ready begin-ms=5 expression=secret-expression'),
    line('condition=2 stage=settings.ready timeout-ms=123 polls=9'),
    line(
      'eval=12 stage=condition=2 stage=settings.ready/poll=3 timeout-ms=10 submit-ms=0 ui-dispatch-ms=1 ui-return-ms=2 callback-ms=-1 heartbeat-ms=3 heartbeat-age-ms=7',
    ),
    line('eval=11 stage=secret_stage callback-ms=12'),
    line('eval=11 stage=settings.click main[1]=secret.stackSecret(secret.java:12)'),
    line('eval=11 stage=settings.click timeout-ms=10 secret-payload'),
    '10-29 03:27:51.000  123  123 I OtherTag: secret-other',
    line('eval=11 stage=settings.click callback-ms=11'),
  ].join('\n');
  const r = excerpt(input);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /timeout-ms=10/);
  assert.match(r.stdout, /main-state=RUNNABLE/);
  assert.match(r.stdout, /condition=2 stage=settings.ready timeout-ms=123 polls=9/);
  assert.match(r.stdout, /android\.graphics\.HardwareRenderer\.nSyncAndDrawFrame/);
  assert.match(r.stdout, /android\.graphics\.HardwareRenderer\.syncAndDrawFrame/);
  assert.match(r.stdout, /callback-ms=11/);
  assert.match(r.stdout, /stage=condition=2 stage=settings.ready\/poll=3/);
  assert.match(r.stdout, /main\[1\]=unlisted frame/);
  assert.doesNotMatch(r.stdout, /secret/);
});
test('failure excerpt is bounded by 40 lines and 8192 bytes', () => {
  const r = excerpt(
    Array.from({ length: 100 }, (_, i) =>
      line(`eval=${i} stage=settings.click callback-ms=${'1'.repeat(1100)}`),
    ).join('\n'),
  );
  assert.equal(r.status, 0, r.stderr);
  assert.ok(r.stdout.split('\n').filter(Boolean).length > 0);
  assert.ok(r.stdout.split('\n').filter(Boolean).length <= 40);
  assert.match(r.stdout, /eval=99 /);
  assert.ok(Buffer.byteLength(r.stdout) <= 8192);
  const short = excerpt(
    Array.from({ length: 100 }, (_, i) =>
      line(`eval=${i} stage=settings.click callback-ms=10`),
    ).join('\n'),
  );
  assert.equal(short.status, 0, short.stderr);
  assert.equal(short.stdout.split('\n').filter(Boolean).length, 40);
  assert.match(short.stdout, /eval=99 /);
});
test('cleanup emits excerpt only on failure and retains original exit even if logging fails', () => {
  const smoke = fs.readFileSync(path.join(root, 'tools/run-android-smoke.sh'), 'utf8');
  const start = smoke.indexOf('cleanup() {');
  const end = smoke.indexOf('\ntrap cleanup EXIT', start);
  assert.ok(start >= 0 && end > start);
  const cleanup = smoke.slice(start, end);
  const run = (status, failLogger = false) => {
    const dir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'native-cleanup-'));
    try {
      return spawnSync(
        'bash',
        [
          '-c',
          `
set -euo pipefail
OUT="$1"; ROOT="$2"; SAMPLE="$3"; EMU_PID=999999
${cleanup}
trap cleanup EXIT
kill() { return 0; }
${failLogger ? 'timeout() { return 42; }' : 'timeout() { printf "%s\\n" "$SAMPLE"; }'}
exit "$4"
`,
          'test',
          dir,
          root,
          line('eval=11 stage=settings.click main-state=RUNNABLE'),
          String(status),
        ],
        { encoding: 'utf8' },
      );
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  };
  const failed = run(17);
  assert.equal(failed.status, 17);
  assert.match(failed.stdout, /main-state=RUNNABLE/);
  const passed = run(0);
  assert.equal(passed.status, 0);
  assert.doesNotMatch(passed.stdout, /main-state/);
  const logFailure = run(19, true);
  assert.equal(logFailure.status, 19);
});
