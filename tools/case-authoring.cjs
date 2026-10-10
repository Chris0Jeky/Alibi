'use strict';
const fs = require('node:fs');
const crypto = require('node:crypto');

const LIMITS = Object.freeze({
  bytes: 262144,
  records: 64,
  steps: 16,
  claims: 64,
  bundles: 8,
  citations: 8,
  prose: 1800,
  title: 120,
});
const ID = /^[a-z][a-z0-9-]{0,47}$/;
const VERDICTS = Object.freeze(['supported', 'contradicted', 'not-established']);
const LEVELS = ['orientation', 'constraint', 'method'];
function fail(at, message) {
  throw new TypeError(`${at}: ${message}`);
}
function shape(value, keys, at) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  )
    fail(at, 'expected a JSON object');
  for (const key of Object.keys(value))
    if (!keys.includes(key)) fail(`${at}.${key}`, 'unknown field');
  for (const key of keys) if (!Object.hasOwn(value, key)) fail(`${at}.${key}`, 'missing field');
}
function text(value, at, max = LIMITS.prose) {
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    fail(at, `expected nonempty text of at most ${max} UTF-16 code units`);
}
function prose(value, at) {
  shape(value, ['storyOn', 'storyOff'], at);
  text(value.storyOn, `${at}.storyOn`);
  text(value.storyOff, `${at}.storyOff`);
}
function list(value, min, max, at) {
  if (!Array.isArray(value) || value.length < min || value.length > max)
    fail(at, `expected ${min}..${max} entries`);
  for (let i = 0; i < value.length; i++) {
    if (!Object.hasOwn(value, i)) fail(`${at}[${i}]`, 'sparse arrays are not JSON data');
  }
}
function id(value, at) {
  if (typeof value !== 'string' || !ID.test(value)) fail(at, 'invalid ID');
}
function register(value, seen, at) {
  id(value, at);
  if (seen.has(value)) fail(at, 'duplicate ID');
  seen.add(value);
}
function refs(value, min, max, at) {
  list(value, min, max, at);
  const seen = new Set();
  for (const [i, ref] of value.entries()) register(ref, seen, `${at}[${i}]`);
}

// This validates JSON structure and source visibility, never the truth of prose.
function validateCase(value) {
  shape(
    value,
    ['format', 'id', 'revision', 'title', 'intro', 'ending', 'provenance', 'records', 'steps'],
    'case',
  );
  if (value.format !== 'postern-case-1') fail('case.format', 'unsupported format');
  id(value.id, 'case.id');
  if (!Number.isSafeInteger(value.revision) || value.revision < 1)
    fail('case.revision', 'expected a positive safe integer');
  text(value.title, 'case.title', LIMITS.title);
  text(value.provenance, 'case.provenance');
  prose(value.intro, 'case.intro');
  prose(value.ending, 'case.ending');
  list(value.records, 1, LIMITS.records, 'case.records');
  list(value.steps, 1, LIMITS.steps, 'case.steps');
  const recordIds = new Set(),
    stepIds = new Set(),
    claimIds = new Set();
  let claims = 0;
  value.records.forEach((record, i) => {
    const at = `case.records[${i}]`;
    shape(record, ['id', 'title', 'kind', 'source', 'at', 'text'], at);
    register(record.id, recordIds, `${at}.id`);
    id(record.at, `${at}.at`);
    text(record.title, `${at}.title`, LIMITS.title);
    text(record.source, `${at}.source`);
    prose(record.text, `${at}.text`);
    if (!['record', 'observation', 'model'].includes(record.kind))
      fail(`${at}.kind`, 'unknown record kind');
  });
  value.steps.forEach((step, i) => {
    const at = `case.steps[${i}]`;
    shape(step, ['id', 'title', 'prompt', 'requires', 'claims', 'hints', 'workedAnswer'], at);
    register(step.id, stepIds, `${at}.id`);
    text(step.title, `${at}.title`, LIMITS.title);
    prose(step.prompt, `${at}.prompt`);
    refs(step.requires, 0, LIMITS.steps, `${at}.requires`);
    list(step.claims, 1, LIMITS.claims, `${at}.claims`);
    claims += step.claims.length;
    if (claims > LIMITS.claims) fail('case.steps', `total claims exceeds ${LIMITS.claims}`);
    step.claims.forEach((claim, j) => {
      const ca = `${at}.claims[${j}]`;
      shape(claim, ['id', 'text', 'answer', 'evidence'], ca);
      register(claim.id, claimIds, `${ca}.id`);
      prose(claim.text, `${ca}.text`);
      if (!VERDICTS.includes(claim.answer)) fail(`${ca}.answer`, 'unknown verdict');
      list(claim.evidence, 1, LIMITS.bundles, `${ca}.evidence`);
      const bundles = new Set();
      claim.evidence.forEach((bundle, k) => {
        const ba = `${ca}.evidence[${k}]`;
        refs(bundle, 1, LIMITS.citations, ba);
        const key = [...bundle].sort().join(' ');
        if (bundles.has(key)) fail(ba, 'duplicate evidence bundle');
        bundles.add(key);
      });
    });
    list(step.hints, 3, 3, `${at}.hints`);
    step.hints.forEach((hint, j) => {
      const ha = `${at}.hints[${j}]`;
      shape(hint, ['level', 'text', 'records'], ha);
      if (hint.level !== LEVELS[j]) fail(`${ha}.level`, `expected ${LEVELS[j]}`);
      prose(hint.text, `${ha}.text`);
      refs(hint.records, 0, LIMITS.citations, `${ha}.records`);
    });
    shape(step.workedAnswer, ['text', 'records'], `${at}.workedAnswer`);
    prose(step.workedAnswer.text, `${at}.workedAnswer.text`);
    refs(step.workedAnswer.records, 1, LIMITS.citations, `${at}.workedAnswer.records`);
  });
  const steps = new Map(value.steps.map((s) => [s.id, s]));
  const records = new Map(value.records.map((r) => [r.id, r]));
  value.records.forEach((r, i) => {
    if (!steps.has(r.at)) fail(`case.records[${i}].at`, 'unknown owning step');
  });
  value.steps.forEach((s, i) => {
    for (const req of s.requires)
      if (!steps.has(req)) fail(`case.steps[${i}].requires`, 'unknown prerequisite');
  });
  const ancestry = new Map(),
    visiting = new Set();
  function ancestors(stepId) {
    if (ancestry.has(stepId)) return ancestry.get(stepId);
    if (visiting.has(stepId)) fail(`case.steps.${stepId}.requires`, 'prerequisite cycle');
    visiting.add(stepId);
    const result = new Set([stepId]);
    for (const req of steps.get(stepId).requires)
      for (const parent of ancestors(req)) result.add(parent);
    visiting.delete(stepId);
    ancestry.set(stepId, result);
    return result;
  }
  for (const step of value.steps) ancestors(step.id);
  function visible(ids, step, at) {
    for (const ref of ids) {
      if (!records.has(ref)) fail(at, `unknown record ${ref}`);
      if (!ancestry.get(step.id).has(records.get(ref).at))
        fail(at, `record ${ref} is not visible in this step`);
    }
  }
  value.steps.forEach((step, i) => {
    const at = `case.steps[${i}]`;
    step.claims.forEach((claim, j) =>
      claim.evidence.forEach((bundle, k) =>
        visible(bundle, step, `${at}.claims[${j}].evidence[${k}]`),
      ),
    );
    step.hints.forEach((hint, j) => visible(hint.records, step, `${at}.hints[${j}].records`));
    visible(step.workedAnswer.records, step, `${at}.workedAnswer.records`);
  });
  return {
    caseId: value.id,
    revision: value.revision,
    records: value.records.length,
    steps: value.steps.length,
    claims,
    scope: 'structure-only',
  };
}
function parseCase(source) {
  if (typeof source !== 'string') fail('source', 'expected UTF-8 text');
  const sourceBytes = Buffer.byteLength(source, 'utf8');
  if (sourceBytes > LIMITS.bytes) fail('source', `exceeds ${LIMITS.bytes} bytes`);
  let definition;
  try {
    definition = JSON.parse(source);
  } catch {
    fail('source', 'invalid JSON');
  }
  const report = validateCase(definition);
  return {
    definition,
    receipt: {
      ...report,
      sourceBytes,
      sourceSha256: crypto.createHash('sha256').update(source, 'utf8').digest('hex'),
    },
  };
}
function readCase(file) {
  const fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NONBLOCK || 0));
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile()) fail('source', 'expected a regular file');
    if (stat.size > LIMITS.bytes) fail('source', `exceeds ${LIMITS.bytes} bytes`);
    const buffer = Buffer.alloc(LIMITS.bytes + 1);
    let count = 0;
    while (count < buffer.length) {
      const got = fs.readSync(fd, buffer, count, buffer.length - count, null);
      if (!got) break;
      count += got;
    }
    if (count > LIMITS.bytes) fail('source', `exceeds ${LIMITS.bytes} bytes`);
    let source;
    try {
      source = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(
        buffer.subarray(0, count),
      );
    } catch {
      fail('source', 'invalid UTF-8');
    }
    return parseCase(source);
  } finally {
    fs.closeSync(fd);
  }
}
module.exports = { LIMITS, VERDICTS, validateCase, parseCase, readCase };
if (require.main === module) {
  try {
    if (process.argv.length !== 3)
      throw new Error('Usage: node tools/case-authoring.cjs <case.json>');
    console.log(JSON.stringify(readCase(process.argv[2]).receipt, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
