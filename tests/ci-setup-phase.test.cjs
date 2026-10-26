const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const HELPER = path.join(ROOT, 'tools', 'ci-setup-phase.cjs');
const SAFE_APT_CONFIG = [
  'Acquire::http::Dl-Limit "0";',
  'Acquire::https::Dl-Limit "0";',
  'Acquire::http::Timeout "30";',
  'Acquire::https::Timeout "45";',
  'Acquire::Retries "2";',
  'Acquire::http::Proxy "http://apt-user:apt-password@apt-proxy.internal:8080/";',
  'Acquire::https::Proxy "DIRECT";',
  'Authorization::Token "must-never-be-logged";',
].join('\n');

function runPhase({ timeoutSeconds = 2, graceSeconds = 0.1, childSource, env = {} }) {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-ci-setup-'));
  const sourcesFile = path.join(fixture, 'ubuntu.sources');
  const aptConfigScript = path.join(fixture, 'apt-config.cjs');
  const childScript = path.join(fixture, 'install-stub.cjs');
  fs.writeFileSync(
    sourcesFile,
    [
      'Types: deb',
      'URIs: https://source-user:source-password@archive.example.test/ubuntu?private=query',
      'Suites: noble noble-updates',
      'Components: main universe',
      '',
    ].join('\n'),
  );
  fs.writeFileSync(aptConfigScript, `process.stdout.write(${JSON.stringify(SAFE_APT_CONFIG)});\n`);
  fs.writeFileSync(childScript, childSource);

  const args = [
    HELPER,
    '--phase',
    'stub-dependency-install',
    '--timeout-seconds',
    String(timeoutSeconds),
    '--grace-seconds',
    String(graceSeconds),
    '--apt-sources-file',
    sourcesFile,
    '--apt-config-command',
    process.execPath,
    '--apt-config-arg',
    aptConfigScript,
    '--',
    process.execPath,
    childScript,
  ];
  const result = spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      HTTP_PROXY: '',
      http_proxy: '',
      HTTPS_PROXY: '',
      https_proxy: '',
      ...env,
    },
    timeout: 4000,
  });
  return { fixture, result, output: `${result.stdout || ''}${result.stderr || ''}` };
}

function removeFixture(fixture) {
  fs.rmSync(fixture, { recursive: true, force: true });
}

test(
  'a stalled dependency installer is stopped at its phase cap and reports elapsed time',
  { skip: process.platform !== 'linux' },
  () => {
    const { fixture, result, output } = runPhase({
      timeoutSeconds: 1,
      graceSeconds: 0.1,
      childSource: [
        "process.stdout.write('installer started\\n');",
        "process.on('SIGTERM', () => {});",
        'setInterval(() => {}, 1000);',
        'setTimeout(() => process.exit(0), 3000);',
      ].join('\n'),
    });
    try {
      assert.equal(result.error, undefined);
      assert.equal(result.status, 124, output);
      assert.match(output, /phase=stub-dependency-install/);
      assert.match(output, /timed out after 1s/);
      assert.match(output, /elapsed=\d+\.\d+s/);
      assert.match(output, /installer started/);
    } finally {
      removeFixture(fixture);
    }
  },
);

test(
  'a failed installer keeps its exit code and diagnostics expose only safe APT values',
  { skip: process.platform !== 'linux' },
  () => {
    const proxyValue = 'http://proxy-user:proxy-password@proxy.internal:3128';
    const { fixture, result, output } = runPhase({
      childSource: [
        'const proxy = process.env.HTTPS_PROXY;',
        'const split = Math.floor(proxy.length / 2);',
        "process.stderr.write('proxy=' + proxy.slice(0, split), () => {",
        "  process.stderr.write(proxy.slice(split) + '\\n', () => {",
        "    process.stderr.write('download failed: https://url-user:url-password@mirror.private/deb\\n');",
        "    process.stderr.write('x'.repeat(65536) + ' https://long-user:long-password@secret-host/deb\\n', () => process.exit(42));",
        '  });',
        '});',
      ].join('\n'),
      env: { HTTPS_PROXY: proxyValue, https_proxy: proxyValue },
    });
    try {
      assert.equal(result.error, undefined);
      assert.equal(result.status, 42, output);
      assert.match(output, /Acquire::http::Dl-Limit=0/);
      assert.match(output, /Acquire::https::Timeout=45/);
      assert.match(output, /Acquire::Retries=2/);
      assert.match(output, /archive\.example\.test/);
      assert.match(output, /HTTPS_PROXY=present/);
      assert.match(output, /APT proxies \(presence only\): HTTP=present/);
      assert.match(output, /exit=42/);
      for (const secret of [
        proxyValue,
        'proxy-user',
        'proxy-password',
        'proxy.internal',
        'url-user',
        'url-password',
        'mirror.private',
        'source-user',
        'source-password',
        'private=query',
        'apt-user',
        'apt-password',
        'apt-proxy.internal',
        'must-never-be-logged',
        'long-user',
        'long-password',
        'secret-host',
      ]) {
        assert.equal(output.includes(secret), false, `diagnostics leaked ${secret}`);
      }
      assert.match(output, /redacted overlong installer output line/);
    } finally {
      removeFixture(fixture);
    }
  },
);

test(
  'a successful dependency installer preserves its output and success status',
  { skip: process.platform !== 'linux' },
  () => {
    const { fixture, result, output } = runPhase({
      childSource: ["process.stdout.write('package setup complete\\n');", 'process.exit(0);'].join(
        '\n',
      ),
    });
    try {
      assert.equal(result.error, undefined);
      assert.equal(result.status, 0, output);
      assert.match(output, /package setup complete/);
      assert.match(output, /elapsed=\d+\.\d+s/);
    } finally {
      removeFixture(fixture);
    }
  },
);
