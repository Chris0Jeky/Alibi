const fs = require('node:fs');
const { spawn, spawnSync } = require('node:child_process');
const { StringDecoder } = require('node:string_decoder');

const APT_SOURCE_FILE = '/etc/apt/sources.list.d/ubuntu.sources';
const MAX_OUTPUT_LINE = 64 * 1024;
const APT_NUMERIC_KEYS = [
  'Acquire::http::Dl-Limit',
  'Acquire::https::Dl-Limit',
  'Acquire::http::Timeout',
  'Acquire::https::Timeout',
  'Acquire::Retries',
];
const PROXY_ENV_NAMES = [
  'HTTP_PROXY',
  'http_proxy',
  'HTTPS_PROXY',
  'https_proxy',
  'ALL_PROXY',
  'all_proxy',
  'NO_PROXY',
  'no_proxy',
];

function parseArgs(argv) {
  const options = {
    phase: null,
    timeoutSeconds: 480,
    graceSeconds: 20,
    sourcesFile: APT_SOURCE_FILE,
    aptConfigCommand: 'apt-config',
    aptConfigArgs: [],
    command: null,
  };

  const valueOptions = new Map([
    ['--phase', 'phase'],
    ['--timeout-seconds', 'timeoutSeconds'],
    ['--grace-seconds', 'graceSeconds'],
    ['--apt-sources-file', 'sourcesFile'],
    ['--apt-config-command', 'aptConfigCommand'],
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') {
      options.command = argv.slice(index + 1);
      break;
    }
    if (arg === '--apt-config-arg') {
      if (!argv[index + 1]) throw new Error('missing value for --apt-config-arg');
      options.aptConfigArgs.push(argv[index + 1]);
      index += 1;
      continue;
    }
    const option = valueOptions.get(arg);
    if (!option || !argv[index + 1]) throw new Error('invalid or incomplete option');
    options[option] = argv[index + 1];
    index += 1;
  }

  const timeoutSeconds = Number(options.timeoutSeconds);
  const graceSeconds = Number(options.graceSeconds);
  if (!options.phase || !/^[A-Za-z0-9._-]{1,80}$/.test(options.phase)) {
    throw new Error('a short phase name is required');
  }
  if (!Number.isFinite(timeoutSeconds) || timeoutSeconds < 0.01 || timeoutSeconds > 3600) {
    throw new Error('timeout must be between 0.01 and 3600 seconds');
  }
  if (!Number.isFinite(graceSeconds) || graceSeconds < 0.01 || graceSeconds > 120) {
    throw new Error('grace must be between 0.01 and 120 seconds');
  }
  if (!options.command?.length || !options.command[0])
    throw new Error('a command after -- is required');
  return { ...options, timeoutSeconds, graceSeconds };
}

function formatSeconds(seconds) {
  return Number.isInteger(seconds) ? String(seconds) : String(Number(seconds.toFixed(3)));
}

function readAptDiagnostics({ sourcesFile, aptConfigCommand, aptConfigArgs }) {
  const sourceHosts = new Set();
  try {
    const sourceText = fs.readFileSync(sourcesFile, 'utf8');
    for (const line of sourceText.split(/\r?\n/)) {
      const match = line.match(/^\s*URIs?\s*:\s*(.+)$/i);
      if (!match) continue;
      for (const source of match[1].trim().split(/\s+/)) {
        try {
          const parsed = new URL(source);
          if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            sourceHosts.add(parsed.hostname.toLowerCase());
          }
        } catch {
          // Only syntactically valid HTTP(S) source hostnames are reported.
        }
      }
    }
  } catch {
    // A missing source file is useful context, but should not mask the setup command.
  }

  let configText = '';
  let configAvailable = false;
  try {
    const config = spawnSync(aptConfigCommand, [...aptConfigArgs, 'dump'], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024,
      timeout: 1000,
      windowsHide: true,
    });
    if (!config.error && config.status === 0 && typeof config.stdout === 'string') {
      configText = config.stdout;
      configAvailable = true;
    }
  } catch {
    // Never print raw apt-config output or errors; diagnostics are intentionally allowlisted.
  }

  const numericSettings = new Map();
  let httpProxy = false;
  let httpsProxy = false;
  if (configAvailable) {
    for (const line of configText.split(/\r?\n/)) {
      const setting = line.match(/^\s*([^\s]+)\s+"([^"]*)"\s*;\s*$/);
      if (!setting) continue;
      const [, key, value] = setting;
      if (APT_NUMERIC_KEYS.includes(key)) {
        numericSettings.set(key, /^\d+$/.test(value) ? value : 'invalid');
      }
      if (/^Acquire::http::Proxy(?:-Auto-Detect)?$/i.test(key)) {
        httpProxy ||= /Proxy-Auto-Detect$/i.test(key) || (value !== '' && !/^DIRECT$/i.test(value));
      }
      if (/^Acquire::https::Proxy(?:-Auto-Detect)?$/i.test(key)) {
        httpsProxy ||=
          /Proxy-Auto-Detect$/i.test(key) || (value !== '' && !/^DIRECT$/i.test(value));
      }
    }
  }

  const proxyEnv = PROXY_ENV_NAMES.map(
    (name) => `${name}=${process.env[name] ? 'present' : 'absent'}`,
  );
  const sourceSummary = sourceHosts.size ? [...sourceHosts].sort().join(', ') : 'unavailable';
  const settingsSummary = configAvailable
    ? APT_NUMERIC_KEYS.map((key) => `${key}=${numericSettings.get(key) || 'unset'}`).join('; ')
    : 'unavailable';

  return [
    `APT source hosts: ${sourceSummary}`,
    `APT numeric settings (allowlisted): ${settingsSummary}`,
    `APT proxies (presence only): HTTP=${!configAvailable ? 'unavailable' : httpProxy ? 'present' : 'absent'}; HTTPS=${!configAvailable ? 'unavailable' : httpsProxy ? 'present' : 'absent'}`,
    `Proxy environment (presence only): ${proxyEnv.join('; ')}`,
  ];
}

function makeRedactor() {
  const proxyValues = [
    ...new Set(PROXY_ENV_NAMES.map((name) => process.env[name]).filter(Boolean)),
  ];
  const proxySecrets = new Set(proxyValues);
  for (const value of proxyValues) {
    try {
      const parsed = new URL(value);
      for (const component of [parsed.username, parsed.password]) {
        const decoded = component ? decodeURIComponent(component) : '';
        if (decoded.length >= 3) proxySecrets.add(decoded);
      }
    } catch {
      // Non-URL proxy forms are still redacted as complete values above.
    }
  }
  const orderedSecrets = [...proxySecrets].sort((left, right) => right.length - left.length);

  return (text) => {
    let safe = text;
    for (const value of orderedSecrets) safe = safe.split(value).join('[redacted proxy]');
    return safe.replace(
      /([A-Za-z][A-Za-z0-9+.-]*:\/\/)[^\s/@'"<>]+@[^\s'"<>]+/g,
      '$1[redacted URL]',
    );
  };
}

function pipeRedacted(stream, destination, redact) {
  const decoder = new StringDecoder('utf8');
  let pending = '';
  let discardingLongLine = false;

  const lineEnd = (text) => {
    const newline = text.indexOf('\n');
    const carriageReturn = text.indexOf('\r');
    const index = [newline, carriageReturn]
      .filter((candidate) => candidate >= 0)
      .sort((left, right) => left - right)[0];
    if (index === undefined) return -1;
    return index + (text[index] === '\r' && text[index + 1] === '\n' ? 2 : 1);
  };

  const writeText = (text, final = false) => {
    let remaining = pending + text;
    pending = '';
    while (remaining) {
      if (discardingLongLine) {
        const end = lineEnd(remaining);
        if (end < 0) return;
        remaining = remaining.slice(end);
        discardingLongLine = false;
        continue;
      }

      const end = lineEnd(remaining);
      if (end < 0) {
        if (remaining.length > MAX_OUTPUT_LINE) {
          destination.write('[redacted overlong installer output line]\n');
          discardingLongLine = true;
        } else if (final) {
          destination.write(redact(remaining));
        } else {
          pending = remaining;
        }
        return;
      }

      if (end > MAX_OUTPUT_LINE) {
        destination.write('[redacted overlong installer output line]\n');
        remaining = remaining.slice(end);
      } else {
        destination.write(redact(remaining.slice(0, end)));
        remaining = remaining.slice(end);
      }
    }
  };

  stream.on('data', (chunk) => {
    writeText(decoder.write(chunk));
  });
  stream.on('end', () => {
    writeText(decoder.end(), true);
  });
}

function runCommand({
  command,
  phase,
  timeoutSeconds,
  remainingSeconds,
  graceSeconds,
  startedAt,
  started,
}) {
  return new Promise((resolve) => {
    const redact = makeRedactor();
    let launchError = null;
    const elapsedSeconds = () => Number(process.hrtime.bigint() - started) / 1e9;
    const timeoutArgs = [
      '--signal=TERM',
      `--kill-after=${formatSeconds(graceSeconds)}s`,
      // GNU timeout treats zero as disabled; rounding must never remove the bound.
      `${formatSeconds(Math.max(0.001, remainingSeconds))}s`,
      ...command,
    ];
    const child = spawn('timeout', timeoutArgs, {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    pipeRedacted(child.stdout, process.stdout, redact);
    pipeRedacted(child.stderr, process.stderr, redact);
    child.on('error', (error) => {
      launchError = error.code || 'unknown';
    });
    child.on('close', (code, signal) => {
      const elapsed = elapsedSeconds();
      // KILL of timeout's process group is a signal in Node, not necessarily exit 137.
      const timedOut =
        ([124, 137].includes(code) || signal === 'SIGKILL') && elapsed >= timeoutSeconds;
      const detail = launchError
        ? `could not start timeout utility (${launchError})`
        : timedOut
          ? `timed out after ${formatSeconds(timeoutSeconds)}s (SIGTERM, then SIGKILL after ${formatSeconds(graceSeconds)}s if needed)`
          : signal
            ? `ended by signal ${signal}`
            : `exit=${code}`;
      process.stdout.write(
        `setup phase=${phase} started_at=${startedAt} elapsed=${elapsed.toFixed(1)}s ${detail}\n`,
      );
      resolve(launchError ? 127 : timedOut ? 124 : signal ? 1 : (code ?? 1));
    });
  });
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch {
    process.stderr.write(
      'Usage: node tools/ci-setup-phase.cjs --phase NAME [--timeout-seconds N] [--grace-seconds N] -- COMMAND [ARG...]\n',
    );
    process.exitCode = 2;
    return;
  }

  const startedAt = new Date().toISOString();
  const started = process.hrtime.bigint();
  process.stdout.write(
    `setup phase=${options.phase} budget=${formatSeconds(options.timeoutSeconds)}s grace=${formatSeconds(options.graceSeconds)}s started_at=${startedAt}\n`,
  );
  for (const diagnostic of readAptDiagnostics(options)) process.stdout.write(`${diagnostic}\n`);
  const diagnosticElapsed = Number(process.hrtime.bigint() - started) / 1e9;
  const remainingSeconds = Math.max(0, options.timeoutSeconds - diagnosticElapsed);
  if (remainingSeconds === 0) {
    process.stderr.write(`setup phase=${options.phase} timed out before the command started\n`);
    process.stdout.write(
      `setup phase=${options.phase} started_at=${startedAt} elapsed=${diagnosticElapsed.toFixed(1)}s timed out after ${formatSeconds(options.timeoutSeconds)}s\n`,
    );
    process.exitCode = 124;
    return;
  }

  process.exitCode = await runCommand({
    command: options.command,
    phase: options.phase,
    timeoutSeconds: options.timeoutSeconds,
    remainingSeconds,
    graceSeconds: options.graceSeconds,
    startedAt,
    started,
  });
}

main().catch(() => {
  process.stderr.write('setup phase failed in its diagnostic wrapper\n');
  process.exitCode = 1;
});
