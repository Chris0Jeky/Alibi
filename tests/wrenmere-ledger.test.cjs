'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { checkLedger, digest } = require('../tools/wrenmere-ledger.cjs');

function fixture() {
  return {
    format: 'wrenmere-ledger',
    version: 1,
    entities: [
      {
        id: 'iona',
        type: 'person',
        name: 'Iona Bell',
        aliases: ['Iona'],
        source: { file: 'docs/a.txt', excerpt: 'Iona Bell' },
      },
      {
        id: 'mara',
        type: 'person',
        name: 'Mara Vale',
        aliases: ['Mara'],
        source: { file: 'docs/a.txt', excerpt: 'Mara Vale' },
      },
    ],
    records: [
      {
        id: 'margin',
        revision: 1,
        status: 'published',
        kind: 'testimony',
        source: { file: 'docs/a.txt', excerpt: 'unsigned note' },
        people: ['mara'],
        places: [],
        uncertainty: ['unsigned'],
      },
      {
        id: 'signed',
        revision: 1,
        status: 'proposed',
        kind: 'signed-comparison',
        source: { file: 'docs/a.txt', excerpt: 'signed comparison' },
        people: ['iona'],
        places: [],
        uncertainty: ['not published'],
      },
    ],
    events: [
      {
        id: 'departure',
        status: 'published',
        year: 1911,
        period: 'flood-night',
        earliest: 1260,
        latest: 1260,
        source: 'margin@1',
      },
      {
        id: 'bell',
        status: 'published',
        year: 1911,
        period: 'flood-night',
        earliest: 1270,
        latest: 1270,
        source: 'margin@1',
      },
    ],
    ordering: [{ before: 'departure', after: 'bell' }],
    conclusions: [
      {
        id: 'author',
        status: 'proposed',
        interpretation: 'Iona is a possible author.',
        premises: [
          { ref: 'margin@1', role: 'unsigned' },
          { ref: 'signed@1', role: 'comparison' },
        ],
        requires: ['unsigned', 'comparison'],
        roleKinds: { unsigned: ['testimony'], comparison: ['signed-comparison'] },
        counterexamples: ['Another person could write it.'],
        questions: ['Who wrote it?'],
      },
    ],
  };
}
const source = () => 'unsigned note and signed comparison Iona Bell Mara Vale';
const check = (value, lock) => checkLedger(value, { readSource: source, lock });
const messages = (r) => r.errors.map((x) => x.message).join('\n');

test('valid explicitly supported records have no structural errors', () => {
  const ledger = fixture();
  assert.deepEqual(check(ledger).errors, []);
});
test('chained ordering catches impossible intervals even when each edge alone is possible', () => {
  const ledger = fixture();
  ledger.events.push({
    id: 'unknown',
    status: 'proposed',
    year: 1911,
    period: 'flood-night',
    earliest: null,
    latest: null,
    source: 'signed@1',
  });
  ledger.ordering = [
    { before: 'bell', after: 'unknown' },
    { before: 'unknown', after: 'departure' },
  ];
  assert.match(messages(check(ledger)), /chronology constraints contradict/i);
});
test('aliases cannot silently identify two different people', () => {
  const ledger = fixture();
  ledger.entities[1].aliases.push('IONA');
  assert.match(messages(check(ledger)), /alias.*iona/i);
});
test('an attribution without its comparison premise is visibly unresolved', () => {
  const ledger = fixture();
  ledger.conclusions[0].premises.pop();
  assert.match(messages(check(ledger)), /author.*missing.*comparison/i);
  ledger.conclusions[0].premises.push({ ref: 'margin@1', role: 'comparison' });
  assert.match(messages(check(ledger)), /author.*comparison.*kind/i);
});
test('invalid and contradictory chronological bounds are rejected', () => {
  const ledger = fixture();
  ledger.events[0].earliest = 1280;
  assert.match(messages(check(ledger)), /departure.*interval/i);
  ledger.events[0].latest = 1280;
  assert.match(messages(check(ledger)), /departure.*bell.*contradict/i);
  ledger.ordering.push({ before: 'bell', after: 'departure' });
  assert.match(messages(check(ledger)), /chronology cycle/i);
});
test('a reused revision with changed record contents is rejected', () => {
  const ledger = fixture();
  const lock = { 'margin@1': digest(ledger.records[0]), 'signed@1': digest(ledger.records[1]) };
  ledger.records[0].uncertainty = ['removed uncertainty'];
  assert.match(messages(check(ledger, lock)), /margin@1.*revision.*reused/i);
});
test('duplicate revision keys, missing references and changed source excerpts are reported', () => {
  const ledger = fixture();
  ledger.records.push(structuredClone(ledger.records[0]));
  ledger.conclusions[0].premises[0].ref = 'absent@1';
  ledger.records[1].source.excerpt = 'not in source';
  const text = messages(check(ledger));
  assert.match(text, /duplicate.*margin@1/i);
  assert.match(text, /absent@1.*missing/i);
  assert.match(text, /signed@1.*source/i);
});

test('a published event cannot use a proposed additional premise', () => {
  const ledger = fixture();
  ledger.events[0].premises = ['signed@1'];
  assert.match(messages(check(ledger)), /departure.*published.*proposed.*signed@1/i);
});

test('malformed unresolved premises produce readable errors without crashing the report', () => {
  const ledger = fixture();
  ledger.conclusions[0].status = 'unresolved';
  ledger.conclusions[0].premises.push(null);
  assert.match(messages(check(ledger)), /author.*premise.*missing/i);
});

test('checked-in source ledger preserves the two required proof gaps', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const root = path.resolve(__dirname, '..');
  const data = JSON.parse(fs.readFileSync(path.join(root, 'docs/castle/wrenmere-ledger.json')));
  const lock = JSON.parse(
    fs.readFileSync(path.join(root, 'docs/castle/wrenmere-ledger-lock.json')),
  );
  const report = checkLedger(data, { lock });
  assert.deepEqual(report.errors, []);
  const messages = report.unresolved.map((x) => x.message).join('\n');
  assert.match(messages, /ch2-margin-author.*missing premise role signed-comparison/i);
  assert.match(messages, /ch2-mara-route.*missing premise role independent-sighting/i);
  assert.equal(report.publishable, false);
});

test('entity names retain the supplied story bible and published room registry wording', async () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const root = path.resolve(__dirname, '..');
  const data = JSON.parse(fs.readFileSync(path.join(root, 'docs/castle/wrenmere-ledger.json')));
  const bible = fs.readFileSync(
    path.join(root, 'docs/castle/design/STORY-BIBLE-SPOILERS.md'),
    'utf8',
  );
  const { default: rooms } = await import('../src/castle/rooms.mjs');
  for (const entity of data.entities) {
    if (entity.type === 'person') assert.ok(bible.includes(entity.name), entity.name);
    else assert.equal(rooms.find((room) => room.id === entity.id)?.name, entity.name, entity.id);
  }
});
