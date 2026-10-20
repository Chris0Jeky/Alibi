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

function verifyMarkdownLinks(repository, relative, real, text) {
  const errors = [];
  const visible = stripCode(text);
  function validateLink(raw) {
    const target = linkTarget(raw);
    if (!target || target.startsWith('#')) return;
    if (/^https:\/\//i.test(target) || /^mailto:/i.test(target)) return;
    if (/^[a-z][a-z0-9+.-]*:/i.test(target)) {
      errors.push(`${relative} uses a non-HTTPS or unsupported link: ${target}.`);
      return;
    }
    let decoded;
    try {
      decoded = decodeURIComponent(target.split('#')[0]);
    } catch {
      errors.push(`${relative} contains an invalid encoded link: ${target}.`);
      return;
    }
    if (!decoded) return;
    const resolved = path.resolve(path.dirname(real), decoded);
    if (!resolved.startsWith(repository + path.sep) || !fs.existsSync(resolved)) {
      errors.push(`${relative} links to a missing local target: ${target}.`);
      return;
    }
    if (!fs.realpathSync(resolved).startsWith(repository + path.sep)) {
      errors.push(`${relative} links outside the repository: ${target}.`);
    }
  }
  for (const match of visible.matchAll(LINK)) validateLink(match[1]);
  for (const match of visible.matchAll(REFERENCE_LINK)) validateLink(match[1] || match[2]);
  return errors;
}

function readWorkspaceFile(root, relative, expected, label) {
  const errors = [];
  let repository;
  try {
    repository = fs.realpathSync(root);
  } catch {
    return { text: null, real: null, errors: [`Cannot resolve the repository root for ${label}.`] };
  }
  const normalized = normalizePath(relative);
  if (!normalized) {
    return { text: null, real: null, errors: [`Unsafe ${label} path: ${relative}.`] };
  }
  const filename = path.resolve(repository, normalized);
  if (!filename.startsWith(repository + path.sep) || !fs.existsSync(filename)) {
    return { text: null, real: null, errors: [`${label} is missing: ${normalized}.`] };
  }
  if (!fs.lstatSync(filename).isFile()) {
    return { text: null, real: null, errors: [`${label} must be a regular file: ${normalized}.`] };
  }
  const real = fs.realpathSync(filename);
  if (!real.startsWith(repository + path.sep)) {
    return { text: null, real: null, errors: [`${label} escapes the repository: ${normalized}.`] };
  }
  const text = fs.readFileSync(real, 'utf8');
  if (text.includes('\0')) errors.push(`${label} contains a NUL byte: ${normalized}.`);
  if (expected !== undefined && text !== expected) {
    errors.push(`${label} does not match the selected head commit: ${normalized}.`);
  }
  return { text, real, errors, repository };
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
  errors.push(...verifyMarkdownLinks(repository, normalized, real, text));
  return errors;
}

function verifyDocuments(root, paths) {
  const errors = [];
  for (const relative of paths) errors.push(...verifyDocument(root, relative));
  return errors;
}

const PACKAGE_VERSION = /^\d+\.\d+\.\d+$/;
const README_VERSION_MARKER = '<publication-version>';
const README_QUALIFYING_EVENTS = new Set(['pull_request', 'push']);

function packageVersion(text, label, errors) {
  if (typeof text !== 'string' || !text.trim()) {
    errors.push(`${label} is unavailable.`);
    return null;
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    errors.push(`${label} is not valid JSON.`);
    return null;
  }
  if (!parsed || typeof parsed.version !== 'string' || !PACKAGE_VERSION.test(parsed.version)) {
    errors.push(`${label} has no supported source package version.`);
    return null;
  }
  return parsed.version;
}

function extractReadmePublicationFields(text, label) {
  const errors = [];
  if (typeof text !== 'string' || !text.trim() || text.includes('\0')) {
    return {
      errors: [`${label} is empty, unavailable, or not plain text.`],
      version: null,
      normalized: null,
    };
  }
  const lines = text.split(/(?<=\n)/);
  const content = lines.map((line) => line.replace(/\r?\n$/, ''));
  const normalized = [...lines];
  const versions = [];

  function oneLine(predicate, description) {
    const matches = content
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => predicate(line));
    if (matches.length !== 1) {
      errors.push(`${label} must contain exactly one ${description}; found ${matches.length}.`);
      return null;
    }
    return matches[0];
  }

  function replaceLine(index, body, original) {
    const ending = lines[index].slice(content[index].length);
    normalized[index] = body + ending;
    if (original !== undefined && !content[index].includes(original)) {
      errors.push(`${label} has an ambiguous ${original} field.`);
    }
  }

  const sourceLine = oneLine(
    (line) => line.startsWith('Source package '),
    'source package status line',
  );
  if (sourceLine) {
    const match = sourceLine.line.match(/^Source package \*\*(\d+\.\d+\.\d+)\*\*\.(.*)$/);
    const links = [
      ...sourceLine.line.matchAll(/\[release record\]\(docs\/RELEASE-(\d+\.\d+\.\d+)\.md\)/g),
    ];
    if (!match) errors.push(`${label} has an ambiguous source package status line.`);
    else {
      const version = match[1];
      versions.push(version);
      if (links.length !== 1) {
        errors.push(
          `${label} must contain exactly one source release record link in its status line.`,
        );
      } else {
        versions.push(links[0][1]);
        if (links[0][1] !== version) {
          errors.push(`${label} source package version and release link do not match.`);
        }
      }
      let rewritten = sourceLine.line.replace(
        `Source package **${version}**`,
        `Source package **${README_VERSION_MARKER}**`,
      );
      if (links.length === 1) {
        rewritten = rewritten.replace(
          `[release record](docs/RELEASE-${links[0][1]}.md)`,
          `[release record](docs/RELEASE-${README_VERSION_MARKER}.md)`,
        );
      }
      replaceLine(sourceLine.index, rewritten);
    }
  }

  const shippedLine = oneLine(
    (line) => line.startsWith('**Shipped in source at '),
    'shipped status line',
  );
  if (shippedLine) {
    const match = shippedLine.line.match(/^\*\*Shipped in source at (\d+\.\d+\.\d+)\.\*\*(.*)$/);
    const links = [
      ...shippedLine.line.matchAll(
        /\[(\d+\.\d+\.\d+) release record\]\(docs\/RELEASE-(\d+\.\d+\.\d+)\.md\)/g,
      ),
    ];
    if (!match) errors.push(`${label} has an ambiguous shipped status line.`);
    else {
      const version = match[1];
      versions.push(version);
      if (links.length !== 1) {
        errors.push(`${label} must contain exactly one shipped release record link.`);
      } else {
        versions.push(links[0][1], links[0][2]);
        if (links[0][1] !== version || links[0][2] !== version) {
          errors.push(`${label} shipped version and release link do not match.`);
        }
      }
      let rewritten = shippedLine.line.replace(
        `**Shipped in source at ${version}.**`,
        `**Shipped in source at ${README_VERSION_MARKER}.**`,
      );
      if (links.length === 1) {
        rewritten = rewritten.replace(
          `[${links[0][1]} release record](docs/RELEASE-${links[0][2]}.md)`,
          `[${README_VERSION_MARKER} release record](docs/RELEASE-${README_VERSION_MARKER}.md)`,
        );
      }
      replaceLine(shippedLine.index, rewritten);
    }
  }

  const releaseListLine = oneLine(
    (line) => line.startsWith('- [') && line.includes('release record'),
    'release record list link',
  );
  if (releaseListLine) {
    const match = releaseListLine.line.match(
      /^- \[(\d+\.\d+\.\d+) release record\]\(docs\/RELEASE-(\d+\.\d+\.\d+)\.md\)$/,
    );
    if (!match) errors.push(`${label} has an ambiguous release record list link.`);
    else {
      versions.push(match[1], match[2]);
      if (match[1] !== match[2]) {
        errors.push(`${label} release record label and target do not match.`);
      }
      const rewritten = releaseListLine.line
        .replace(`[${match[1]} release record]`, `[${README_VERSION_MARKER} release record]`)
        .replace(`docs/RELEASE-${match[2]}.md`, `docs/RELEASE-${README_VERSION_MARKER}.md`);
      replaceLine(releaseListLine.index, rewritten);
    }
  }

  if (versions.some((version) => !PACKAGE_VERSION.test(version))) {
    errors.push(`${label} contains an unsupported publication version.`);
  }
  const uniqueVersions = [...new Set(versions)];
  if (uniqueVersions.length > 1) {
    errors.push(`${label} publication status versions and links are inconsistent.`);
  }
  return {
    errors,
    version: uniqueVersions.length === 1 ? uniqueVersions[0] : null,
    normalized: normalized.join(''),
  };
}

function verifyReleaseReceipt(root, version, receiptText) {
  const errors = [];
  const relative = `docs/RELEASE-${version}.md`;
  if (typeof receiptText !== 'string' || !receiptText.trim()) {
    return [`The matching release record is unavailable: ${relative}.`];
  }
  const heading = new RegExp(`^# ${version.replaceAll('.', '\\.')}[:\\t ]`, 'm');
  if (!heading.test(receiptText)) {
    errors.push(`${relative} does not identify source version ${version}.`);
  }
  if (!/^## Published:\s+\S.+$/m.test(receiptText)) {
    errors.push(`${relative} has no published release receipt heading.`);
  }
  const sourceSha = receiptText.match(FULL_SHA)?.[0];
  if (!sourceSha || !validSha(sourceSha)) errors.push(`${relative} has no valid full source SHA.`);
  if (!BUILD_ID.test(receiptText)) errors.push(`${relative} has no 12-character build ID.`);
  const publicRelease = `https://github.com/Chris0Jeky/Alibi/releases/tag/v${version}`;
  if (!receiptText.includes(`](${publicRelease})`)) {
    errors.push(`${relative} has no matching public release link.`);
  }
  errors.push(...verifyDocument(root, relative));
  return errors;
}

function validateReadmePublication(
  root,
  { baseReadme, headReadme, basePackage, headPackage, headReceipt },
) {
  const errors = [];
  const baseVersion = packageVersion(basePackage, 'Base package.json', errors);
  const headVersion = packageVersion(headPackage, 'Head package.json', errors);
  if (basePackage !== headPackage) errors.push('package.json changed in a README-only comparison.');
  if (baseVersion && headVersion && baseVersion !== headVersion) {
    errors.push('The source package version changed in a README-only comparison.');
  }

  const baseFields = extractReadmePublicationFields(baseReadme, 'Base README.md');
  const headFields = extractReadmePublicationFields(headReadme, 'Head README.md');
  errors.push(...baseFields.errors, ...headFields.errors);
  if (
    baseFields.normalized !== null &&
    headFields.normalized !== null &&
    baseFields.normalized !== headFields.normalized
  ) {
    errors.push('README.md changes outside recognized publication version and link fields.');
  }
  if (headVersion && headFields.version && headFields.version !== headVersion) {
    errors.push(`README.md source version does not match package.json version ${headVersion}.`);
  }

  const readmeWorkspace = readWorkspaceFile(root, 'README.md', headReadme, 'README.md');
  const packageWorkspace = readWorkspaceFile(root, 'package.json', headPackage, 'package.json');
  errors.push(...readmeWorkspace.errors, ...packageWorkspace.errors);

  if (headVersion) {
    const relative = `docs/RELEASE-${headVersion}.md`;
    const receiptWorkspace = readWorkspaceFile(root, relative, headReceipt, 'Release receipt');
    errors.push(...receiptWorkspace.errors);
    errors.push(...verifyReleaseReceipt(root, headVersion, headReceipt));
  }
  if (readmeWorkspace.real && readmeWorkspace.repository) {
    errors.push(
      ...verifyMarkdownLinks(
        readmeWorkspace.repository,
        'README.md',
        readmeWorkspace.real,
        headReadme || '',
      ),
    );
  }
  return { errors: [...new Set(errors)], version: headVersion };
}

function readGitFile(cwd, ref, relative) {
  try {
    return execFileSync('git', ['show', `${ref}:${relative}`], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    return null;
  }
}

function gitFileMode(cwd, ref, relative) {
  try {
    const output = execFileSync('git', ['ls-tree', '-z', ref, '--', relative], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const entries = output.split('\0').filter(Boolean);
    if (entries.length !== 1) return null;
    const match = entries[0].match(/^(\d{6}) (blob) [0-9a-f]{40}\t(.+)$/i);
    if (!match || match[3] !== relative) return null;
    return { mode: match[1], type: match[2] };
  } catch {
    return null;
  }
}

function qualifyReadmeAtRefs(root, base, head, cwd = process.cwd()) {
  const errors = [];
  const baseReadme = readGitFile(cwd, base, 'README.md');
  const headReadme = readGitFile(cwd, head, 'README.md');
  const basePackage = readGitFile(cwd, base, 'package.json');
  const headPackage = readGitFile(cwd, head, 'package.json');
  const readmeModes = [gitFileMode(cwd, base, 'README.md'), gitFileMode(cwd, head, 'README.md')];
  if (readmeModes.some((entry) => !entry || entry.type !== 'blob' || entry.mode !== '100644')) {
    errors.push('README.md must remain a regular, non-executable Git file in both revisions.');
  }
  const versionErrors = [];
  const version = packageVersion(headPackage, 'Head package.json', versionErrors);
  errors.push(...versionErrors);
  const headReceipt = version ? readGitFile(cwd, head, `docs/RELEASE-${version}.md`) : null;
  const validated = validateReadmePublication(root, {
    baseReadme,
    headReadme,
    basePackage,
    headPackage,
    headReceipt,
  });
  errors.push(...validated.errors);
  return { errors: [...new Set(errors)], version: validated.version };
}

function classifyQualifiedChangeSet(paths, comparison, qualification) {
  const result = classifyPaths(paths, comparison);
  if (
    result.mode === 'full' &&
    Array.isArray(paths) &&
    paths.length === 1 &&
    paths[0] === 'README.md' &&
    README_QUALIFYING_EVENTS.has(comparison.eventName) &&
    comparison.baseKnown &&
    validSha(comparison.base) &&
    validSha(comparison.head)
  ) {
    if (!qualification || qualification.errors.length) {
      return {
        mode: 'full',
        reason:
          'README publication qualification failed: ' +
          `${qualification?.errors?.[0] || 'No content qualification was supplied.'}`,
        paths: result.paths,
      };
    }
    return {
      mode: 'publication-docs',
      reason:
        'Only README publication status fields changed for source package ' +
        `${qualification.version}, with its matching published release record.`,
      paths: result.paths,
    };
  }
  return result;
}

function classifyChangeSet(paths, comparison, root = process.cwd()) {
  const result = classifyPaths(paths, comparison);
  if (
    result.mode !== 'full' ||
    !Array.isArray(paths) ||
    paths.length !== 1 ||
    paths[0] !== 'README.md' ||
    !README_QUALIFYING_EVENTS.has(comparison.eventName) ||
    !comparison.baseKnown ||
    !validSha(comparison.base) ||
    !validSha(comparison.head)
  ) {
    return result;
  }
  const qualification = qualifyReadmeAtRefs(root, comparison.base, comparison.head, root);
  return classifyQualifiedChangeSet(paths, comparison, qualification);
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
  const result = classifyChangeSet(paths, comparison);
  if (verify) {
    if (result.mode !== 'publication-docs') {
      throw new Error(`Fast verification refused: ${result.reason}`);
    }
    execFileSync('git', ['diff', '--check', comparison.base, comparison.head], {
      stdio: 'inherit',
    });
    const errors = verifyDocuments(
      process.cwd(),
      result.paths.filter((relative) => isPublicationPath(relative)),
    );
    if (result.paths.includes('README.md')) {
      errors.push(...qualifyReadmeAtRefs(process.cwd(), comparison.base, comparison.head).errors);
    }
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
  classifyQualifiedChangeSet,
  classifyPaths,
  isPublicationPath,
  normalizePath,
  resolveComparison,
  validateReadmePublication,
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
