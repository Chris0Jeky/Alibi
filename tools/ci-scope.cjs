#!/usr/bin/env node
'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const PUBLICATION_PATHS = [
  /^docs\/RELEASE-\d+\.\d+\.\d+\.md$/,
  /^docs\/STATE\.md$/,
  /^docs\/curation\/[A-Za-z0-9][A-Za-z0-9._-]*\.md$/,
];
const FULL_SHA = /\b[0-9a-f]{40}\b/;
const BUILD_ID = /\bbuild\s+`?[0-9a-f]{12}`?/i;
const LINK = /!?\[[^\]]*\]\(([^)]+)\)/g;
const REFERENCE_LINK =
  /^[ \t]{0,3}\[[^\]\r\n]+\]:[ \t]*(?:\r?\n[ \t]{0,3})?(?:<([^>\r\n]+)>|(\S+))/gm;

function normalizePath(value) {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.includes('\0') ||
    value.includes('\\')
  )
    return null;
  const normalized = value.replace(/^\.\//, '');
  if (path.posix.isAbsolute(normalized)) return null;
  const parts = normalized.split('/');
  if (parts.some((part) => part === '..' || part === '')) return null;
  return normalized;
}

function isPublicationPath(value) {
  const normalized = normalizePath(value);
  return normalized !== null && PUBLICATION_PATHS.some((pattern) => pattern.test(normalized));
}

function classifyPaths(paths, { eventName = 'pull_request', baseKnown = true } = {}) {
  const normalized = [];
  const invalid = [];
  for (const value of paths || []) {
    const item = normalizePath(value);
    if (item === null) invalid.push(String(value));
    else if (!normalized.includes(item)) normalized.push(item);
  }
  if (eventName === 'workflow_dispatch') {
    return {
      mode: 'full',
      reason: 'Manual runs always execute the full verification suite.',
      paths: normalized,
    };
  }
  if (!baseKnown) {
    return {
      mode: 'full',
      reason: 'The comparison base is unavailable or untrusted.',
      paths: normalized,
    };
  }
  if (invalid.length) {
    return { mode: 'full', reason: `Invalid changed path: ${invalid[0]}.`, paths: normalized };
  }
  if (!normalized.length) {
    return { mode: 'full', reason: 'No changed files were resolved.', paths: normalized };
  }
  const full = normalized.filter((item) => !isPublicationPath(item));
  if (full.length) {
    return {
      mode: 'full',
      reason: `Full verification required by ${full[0]}${
        full.length > 1 ? ` and ${full.length - 1} other file(s)` : ''
      }.`,
      paths: normalized,
    };
  }
  return {
    mode: 'publication-docs',
    reason: `Only ${normalized.length} publication/provenance document(s) changed.`,
    paths: normalized,
  };
}

function stripCode(text) {
  return text.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
}

function linkTarget(raw) {
  let target = raw.trim();
  if (target.startsWith('<') && target.includes('>')) {
    target = target.slice(1, target.indexOf('>'));
  } else {
    target = target.split(/\s+["']/)[0];
  }
  return target;
}

function verifyDocument(root, relative) {
  const errors = [];
  const normalized = normalizePath(relative);
  if (!normalized || !isPublicationPath(normalized)) {
    return [`Unsafe documentation path: ${relative}.`];
  }
  const repository = fs.realpathSync(root);
  const filename = path.resolve(repository, normalized);
  if (!filename.startsWith(repository + path.sep) || !fs.existsSync(filename)) {
    return [`Changed publication document is missing: ${normalized}.`];
  }
  if (!fs.lstatSync(filename).isFile()) {
    return [`Changed publication document must be a regular file: ${normalized}.`];
  }
  const real = fs.realpathSync(filename);
  if (!real.startsWith(repository + path.sep)) {
    return [`Changed publication document escapes the repository: ${normalized}.`];
  }
  const text = fs.readFileSync(real, 'utf8');
  if (!text.trim()) errors.push(`Publication document is empty: ${normalized}.`);
  if (/^docs\/RELEASE-/.test(normalized) && /\bPublished\b/i.test(text)) {
    if (!FULL_SHA.test(text)) {
      errors.push(`${normalized} says Published without a full source SHA.`);
    }
    if (!BUILD_ID.test(text)) {
      errors.push(`${normalized} says Published without a 12-character build ID.`);
    }
  }
  const visible = stripCode(text);
  function validateLink(raw) {
    const target = linkTarget(raw);
    if (!target || target.startsWith('#')) return;
    if (/^https:\/\//i.test(target) || /^mailto:/i.test(target)) return;
    if (/^[a-z][a-z0-9+.-]*:/i.test(target)) {
      errors.push(`${normalized} uses a non-HTTPS or unsupported link: ${target}.`);
      return;
    }
    let decoded;
    try {
      decoded = decodeURIComponent(target.split('#')[0]);
    } catch {
      errors.push(`${normalized} contains an invalid encoded link: ${target}.`);
      return;
    }
    if (!decoded) return;
    const resolved = path.resolve(path.dirname(real), decoded);
    if (!resolved.startsWith(repository + path.sep) || !fs.existsSync(resolved)) {
      errors.push(`${normalized} links to a missing local target: ${target}.`);
      return;
    }
    if (!fs.realpathSync(resolved).startsWith(repository + path.sep)) {
      errors.push(`${normalized} links outside the repository: ${target}.`);
    }
  }
  for (const match of visible.matchAll(LINK)) validateLink(match[1]);
  for (const match of visible.matchAll(REFERENCE_LINK)) validateLink(match[1] || match[2]);
  return errors;
}

function verifyDocuments(root, paths) {
  const errors = [];
  for (const relative of paths) errors.push(...verifyDocument(root, relative));
  return errors;
}

function validSha(value) {
  return typeof value === 'string' && /^[0-9a-f]{40}$/i.test(value) && !/^0+$/.test(value);
}

function changedPaths(base, head, cwd = process.cwd()) {
  if (!validSha(base) || !validSha(head)) {
    throw new Error('A valid base and head SHA are required.');
  }
  const output = execFileSync('git', ['diff', '--name-only', '--no-renames', '-z', base, head], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return output.split('\0').filter(Boolean);
}

function writeOutput(name, value) {
  const destination = process.env.GITHUB_OUTPUT;
  if (destination) {
    fs.appendFileSync(destination, `${name}=${String(value).replace(/[\r\n]/g, ' ')}\n`);
  }
}

function writeSummary(result) {
  const destination = process.env.GITHUB_STEP_SUMMARY;
  if (!destination) return;
  const title =
    result.mode === 'publication-docs' ? 'Publication/provenance fast path' : 'Full verification';
  fs.appendFileSync(
    destination,
    `### ${title}\n\n${result.reason}\n\nThe fast path checks diff hygiene, local links and published-receipt claim shape. It does not replace factual or independent review.\n`,
  );
}

function resolveComparison(env = process.env) {
  const eventName = env.ALIBI_EVENT_NAME || '';
  const base = env.ALIBI_BASE_SHA || '';
  const head = env.ALIBI_HEAD_SHA || '';
  return { eventName, base, head, baseKnown: validSha(base) && validSha(head) };
}

function main() {
  const verify = process.argv.includes('--verify-docs');
  const comparison = resolveComparison();
  let paths = [];
  if (comparison.baseKnown) {
    try {
      paths = changedPaths(comparison.base, comparison.head);
    } catch (error) {
      if (verify) throw error;
    }
  }
  const result = classifyPaths(paths, comparison);
  if (verify) {
    if (result.mode !== 'publication-docs') {
      throw new Error(`Fast verification refused: ${result.reason}`);
    }
    execFileSync('git', ['diff', '--check', comparison.base, comparison.head], {
      stdio: 'inherit',
    });
    const errors = verifyDocuments(process.cwd(), result.paths);
    if (errors.length) throw new Error(errors.join('\n'));
  } else {
    writeOutput('mode', result.mode);
    writeOutput('reason', result.reason);
  }
  writeSummary(result);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

module.exports = {
  changedPaths,
  classifyPaths,
  isPublicationPath,
  normalizePath,
  resolveComparison,
  verifyDocument,
  verifyDocuments,
};

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
