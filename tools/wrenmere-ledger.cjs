'use strict';
// Authoring diagnostics, not a semantic proof or player-data authority.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const digest = (value) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const refOf = (record) => `${record.id}@${record.revision}`;
const idOK = (id) => typeof id === 'string' && /^[a-z][a-z0-9.-]*$/.test(id);
const text = (value) => typeof value === 'string' && !!value.trim();
const list = (value) => Array.isArray(value) && Array.from(value).every(text);

function checkLedger(ledger, { readSource, lock } = {}) {
  const errors = [],
    unresolved = [];
  const add = (message, advisory = false) => (advisory ? unresolved : errors).push({ message });
  const sourceReader = readSource || ((file) => fs.readFileSync(path.join(root, file), 'utf8'));
  function checkSource(source, label) {
    try {
      if (
        !source ||
        !text(source.file) ||
        !text(source.excerpt) ||
        !/^(?:docs|src)\/[a-zA-Z0-9._/-]+$/.test(source.file) ||
        source.file.split('/').includes('..') ||
        !sourceReader(source.file).includes(source.excerpt)
      )
        add(`${label}: source excerpt missing or changed.`);
    } catch {
      add(`${label}: source file unavailable.`);
    }
  }
  if (!ledger || ledger.format !== 'wrenmere-ledger' || ledger.version !== 1)
    throw Error('Unknown ledger format or version.');
  for (const key of ['entities', 'records', 'events', 'ordering', 'conclusions'])
    if (!Array.isArray(ledger[key])) throw Error(`Missing ledger ${key}.`);
  const entities = new Map(),
    aliases = new Map(),
    records = new Map(),
    events = new Map();
  for (const e of ledger.entities) {
    if (
      !e ||
      !idOK(e.id) ||
      !['person', 'place'].includes(e.type) ||
      !text(e.name) ||
      !list(e.aliases)
    ) {
      add('Invalid entity or aliases.');
      continue;
    }
    if (entities.has(e.id)) add(`Duplicate entity ${e.id}.`);
    entities.set(e.id, e);
    checkSource(e.source, e.id);
    if (e.source?.excerpt !== e.name) add(`${e.id}: entity source must preserve its exact name.`);
    for (const name of [e.name, ...e.aliases]) {
      const key = name.trim().normalize('NFKC').toLocaleLowerCase('en-US');
      if (aliases.has(key) && aliases.get(key) !== e.id)
        add(`Alias ${name} conflates ${aliases.get(key)} and ${e.id}.`);
      else aliases.set(key, e.id);
    }
  }
  for (const r of ledger.records) {
    if (
      !r ||
      !idOK(r.id) ||
      !Number.isSafeInteger(r.revision) ||
      r.revision < 1 ||
      !['published', 'proposed'].includes(r.status) ||
      !text(r.kind) ||
      !r.source ||
      !text(r.source.file) ||
      !text(r.source.excerpt) ||
      !list(r.people) ||
      !list(r.places) ||
      !list(r.uncertainty)
    ) {
      add('Invalid record, revision, source or uncertainty.');
      continue;
    }
    const key = refOf(r);
    if (records.has(key)) add(`Duplicate record revision ${key}.`);
    records.set(key, r);
    for (const [field, type] of [
      ['people', 'person'],
      ['places', 'place'],
    ])
      for (const id of r[field])
        if (entities.get(id)?.type !== type) add(`${key}: unknown ${type} ${id}.`);
    if (lock && !Object.hasOwn(lock, key)) add(`${key}: revision is not recorded in the lock.`);
    else if (lock && lock[key] !== digest(r)) add(`${key}: revision reused for changed record.`);
    checkSource(r.source, key);
  }
  if (lock)
    for (const key of Object.keys(lock))
      if (!records.has(key)) add(`${key}: locked revision is missing.`);
  for (const e of ledger.events) {
    if (
      !e ||
      !idOK(e.id) ||
      !['published', 'proposed'].includes(e.status) ||
      !Number.isInteger(e.year) ||
      e.year < 1 ||
      e.year > 9999 ||
      !idOK(e.period) ||
      ![e.earliest, e.latest].every(
        (n) => n === null || (Number.isInteger(n) && n >= 0 && n < 1440),
      ) ||
      (e.earliest !== null && e.latest !== null && e.earliest > e.latest)
    ) {
      add(`${e?.id || 'Event'}: invalid chronology interval.`);
      continue;
    }
    if (events.has(e.id)) add(`Duplicate event ${e.id}.`);
    events.set(e.id, e);
    if (!records.has(e.source)) add(`${e.id}: source ${e.source} is missing.`);
    else if (e.status === 'published' && records.get(e.source).status !== 'published')
      add(`${e.id}: published event cites proposed ${e.source}.`);
    if (e.premises !== undefined) {
      if (!list(e.premises)) add(`${e.id}: invalid additional premises.`);
      else
        for (const ref of e.premises) {
          if (!records.has(ref)) add(`${e.id}: premise ${ref} is missing.`);
          else if (e.status === 'published' && records.get(ref).status !== 'published')
            add(`${e.id}: published event cites proposed premise ${ref}.`);
        }
    }
  }
  const edges = new Map([...events.keys()].map((id) => [id, []]));
  const samePeriod = [];
  for (const relation of ledger.ordering) {
    const a = events.get(relation?.before),
      b = events.get(relation?.after);
    if (!a || !b) {
      add(`Chronology reference missing: ${relation?.before} / ${relation?.after}.`);
      continue;
    }
    edges.get(a.id).push(b.id);
    if (a.year === b.year && a.period === b.period) samePeriod.push([a, b]);
    if (
      a.year > b.year ||
      (a.year === b.year &&
        a.period === b.period &&
        a.earliest !== null &&
        b.latest !== null &&
        a.earliest >= b.latest)
    )
      add(`${a.id} before ${b.id}: chronology contradicts the stated intervals.`);
  }
  const visiting = new Set(),
    visited = new Set();
  function visit(id) {
    if (visiting.has(id)) {
      add(`Chronology cycle at ${id}.`);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const next of edges.get(id)) visit(next);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of edges.keys()) visit(id);
  // Propagate strict ordering through shared-period bounds. Unknown times remain open.
  const bounds = new Map(
    [...events.values()].map((e) => [e.id, [e.earliest ?? 0, e.latest ?? 1439]]),
  );
  for (let pass = 0; pass < events.size; pass++) {
    let changed = false;
    for (const [a, b] of samePeriod) {
      const left = bounds.get(a.id),
        right = bounds.get(b.id);
      const nextLeft = Math.min(left[1], right[1] - 1),
        nextRight = Math.max(right[0], left[0] + 1);
      changed ||= nextLeft !== left[1] || nextRight !== right[0];
      left[1] = nextLeft;
      right[0] = nextRight;
    }
    if (!changed) break;
  }
  for (const [id, [earliest, latest]] of bounds)
    if (earliest > latest) add(`${id}: chronology constraints contradict the stated intervals.`);
  const conclusions = new Set();
  for (const c of ledger.conclusions) {
    if (
      !c ||
      !idOK(c.id) ||
      !['published', 'proposed', 'unresolved'].includes(c.status) ||
      !text(c.interpretation) ||
      !Array.isArray(c.premises) ||
      !list(c.requires) ||
      !c.roleKinds ||
      typeof c.roleKinds !== 'object' ||
      !list(c.counterexamples) ||
      !c.counterexamples.length ||
      !list(c.questions) ||
      !c.questions.length
    ) {
      add('Invalid conclusion or missing counterexample/question.');
      continue;
    }
    if (conclusions.has(c.id)) add(`Duplicate conclusion ${c.id}.`);
    conclusions.add(c.id);
    const roles = new Set();
    for (const premise of c.premises) {
      if (!premise || !text(premise.role) || !records.has(premise.ref)) {
        add(`${c.id}: premise ${premise?.ref} is missing.`);
        continue;
      }
      if (c.status === 'published' && records.get(premise.ref).status !== 'published')
        add(`${c.id}: published conclusion cites proposed ${premise.ref}.`);
      if (
        !list(c.roleKinds[premise.role]) ||
        !c.roleKinds[premise.role].includes(records.get(premise.ref).kind)
      ) {
        add(`${c.id}: premise role ${premise.role} has unsupported record kind.`);
        continue;
      }
      roles.add(premise.role);
    }
    for (const role of c.requires) {
      if (!list(c.roleKinds[role]) || !c.roleKinds[role].length)
        add(`${c.id}: role ${role} has no allowed record kind.`);
      if (!roles.has(role))
        add(`${c.id}: missing premise role ${role}.`, c.status === 'unresolved');
    }
    if (c.status === 'unresolved') {
      for (const p of c.premises)
        if (records.get(p?.ref)?.status === 'proposed')
          add(`${c.id}: ${p.ref} is a proposed source description, not published evidence.`, true);
    }
    for (const question of c.questions) add(`${c.id}: ${question}`, true);
  }
  return { errors, unresolved, publishable: false };
}
module.exports = { checkLedger, digest };
if (require.main === module) {
  try {
    if (process.argv.length !== 2) throw Error('Usage: node tools/wrenmere-ledger.cjs');
    const ledger = JSON.parse(
      fs.readFileSync(path.join(root, 'docs/castle/wrenmere-ledger.json'), 'utf8'),
    );
    const lock = JSON.parse(
      fs.readFileSync(path.join(root, 'docs/castle/wrenmere-ledger-lock.json'), 'utf8'),
    );
    const report = checkLedger(ledger, { lock });
    console.log('Wrenmere ledger diagnostic (not editorial approval)');
    for (const { message } of report.errors) console.log(`ERROR: ${message}`);
    for (const { message } of report.unresolved) console.log(`UNRESOLVED: ${message}`);
    console.log(
      `${report.errors.length} errors; ${report.unresolved.length} unresolved. Human editorial review required.`,
    );
    if (report.errors.length) process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
