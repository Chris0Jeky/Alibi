'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const D = require('../src/discovery-entitlements.js');

const puzzle = (id, revision = 1, extra = {}) => ({
  id,
  revision,
  type: 'binary',
  title: `${id} revision ${revision}`,
  size: 4,
  rows: [2, 2, 2, 2],
  cols: [2, 2, 2, 2],
  ...extra,
});

function source(definitions, extra = {}) {
  const list = Array.isArray(definitions) ? definitions : [definitions];
  const first = list[0];
  const packKey = extra.packKey || 'alibi-starter';
  return {
    schema: 1,
    sourceKey: extra.sourceKey || `catalogue:${first.id}`,
    kind: extra.kind || 'catalogue',
    authority: extra.authority || 'official',
    packKey,
    contentId: first.id,
    rewardEligible: extra.rewardEligible ?? true,
    revisions: list.map((definition) => ({
      schema: 1,
      revision: definition.revision,
      contentKey: `${packKey}:${definition.id}@${definition.revision}`,
      definitionFingerprint: D.fingerprint(definition),
    })),
  };
}

const requires = (sourceKey) => ({ schema: 1, op: 'source', sourceKey });
const all = (...terms) => ({ schema: 1, op: 'all', terms });
const any = (...terms) => ({ schema: 1, op: 'any', terms });
const entitlement = (entitlementKey, category, prerequisite) => ({
  schema: 1,
  entitlementKey,
  category,
  prerequisite,
});

function receipt(registration, occurredAt, revision = registration.revisions[0].revision) {
  const version = registration.revisions.find((item) => item.revision === revision);
  return {
    schema: 1,
    receiptKey: `receipt:${registration.sourceKey}`,
    sourceKey: registration.sourceKey,
    contentKey: version.contentKey,
    revision,
    occurredAt,
    evidence: {
      schema: 1,
      kind: 'first-completion',
      recordKey: `${registration.contentId}@${revision}`,
    },
  };
}

function apply(state, sources, definitions, receipts, expectedGeneration = state.generation) {
  return D.apply(state, { sources, definitions, receipts }, expectedGeneration);
}

test('fingerprints are stable across object key order and sensitive to edited content', () => {
  const a = { id: 'one', revision: 1, nested: { b: 2, a: 1 } };
  const b = { nested: { a: 1, b: 2 }, revision: 1, id: 'one' };
  assert.equal(D.fingerprint(a), D.fingerprint(b));
  assert.notEqual(D.fingerprint(a), D.fingerprint({ ...a, revision: 2 }));
});

test('bootstrap emits only exact registered first completions and deduplicates revisions', () => {
  const sceneV1 = puzzle('scene-01', 1);
  const sceneV2 = puzzle('scene-01', 2, { title: 'Reviewed scene' });
  const bridge = puzzle('bridge-01', 1, { type: 'bridges' });
  const registrations = [source([sceneV1, sceneV2]), source(bridge)];
  const runs = [
    {
      schemaVersion: 1,
      key: 'scene-01@2',
      puzzle: sceneV2,
      firstCompletedAt: '2026-09-10T10:00:00Z',
      completedAt: '2026-09-10T10:00:00Z',
    },
    {
      schemaVersion: 1,
      key: 'scene-01@1',
      puzzle: sceneV1,
      firstCompletedAt: '2026-09-01T09:00:00Z',
      completedAt: '2026-09-01T09:00:00Z',
    },
    {
      schemaVersion: 1,
      key: 'bridge-01@1',
      puzzle: bridge,
      firstCompletedAt: null,
      completedAt: '2026-09-03T12:00:00Z',
    },
    {
      schemaVersion: 1,
      key: 'unsolved@1',
      puzzle: puzzle('unsolved'),
      firstCompletedAt: null,
      completedAt: null,
    },
    {
      schemaVersion: 1,
      key: 'scene-01@2-import',
      puzzle: { ...sceneV2, title: 'Edited imported copy' },
      firstCompletedAt: '2026-08-01T00:00:00Z',
      completedAt: '2026-08-01T00:00:00Z',
    },
    {
      schemaVersion: 2,
      key: 'future@1',
      puzzle: puzzle('future'),
      firstCompletedAt: '2026-08-01T00:00:00Z',
    },
  ];
  const before = JSON.stringify(runs);
  const receipts = D.bootstrapCatalogueReceipts(runs, registrations);
  assert.equal(JSON.stringify(runs), before);
  assert.deepEqual(
    receipts.map((item) => item.receiptKey),
    ['receipt:catalogue:bridge-01', 'receipt:catalogue:scene-01'],
  );
  assert.equal(receipts[1].revision, 1);
  assert.equal(receipts[1].occurredAt, '2026-09-01T09:00:00.000Z');
  assert.equal(receipts[1].evidence.recordKey, 'scene-01@1');
});

test('a trusted receipt creates one category-separated grant and durable outbox item', () => {
  const definition = puzzle('scene-01');
  const registration = source(definition);
  const reward = entitlement(
    'cosmetic:observatory-brass',
    'cosmetic',
    requires(registration.sourceKey),
  );
  const event = receipt(registration, '2026-09-01T09:00:00Z');
  const before = D.emptyState();
  const result = apply(before, [registration], [reward], [event]);
  assert.deepEqual(before, D.emptyState());
  assert.equal(result.state.generation, 1);
  assert.deepEqual(result.state.receipts, [
    { ...event, occurredAt: '2026-09-01T09:00:00.000Z' },
  ]);
  assert.equal(result.state.owned.length, 1);
  assert.equal(result.state.owned[0].category, 'cosmetic');
  assert.equal(result.state.outbox.length, 1);
  assert.deepEqual(result.grants, result.state.outbox);
});

test('receipt order and prerequisite term order cannot change a grant', () => {
  const a = source(puzzle('a'));
  const b = source(puzzle('b'));
  const ra = receipt(a, '2026-09-01T09:00:00Z');
  const rb = receipt(b, '2026-09-02T09:00:00Z');
  const left = entitlement(
    'room:archive',
    'room-access',
    all(requires(b.sourceKey), requires(a.sourceKey)),
  );
  const right = entitlement(
    'room:archive',
    'room-access',
    all(requires(a.sourceKey), requires(b.sourceKey)),
  );
  const first = apply(D.emptyState(), [a, b], [left], [ra, rb]).state;
  const second = apply(D.emptyState(), [b, a], [right], [rb, ra]).state;
  assert.deepEqual(first, second);
  assert.equal(first.owned[0].grantedAt, '2026-09-02T09:00:00.000Z');
  assert.deepEqual(first.owned[0].receiptKeys, [ra.receiptKey, rb.receiptKey]);
});

test('any prerequisites choose a deterministic satisfied witness', () => {
  const a = source(puzzle('a'));
  const b = source(puzzle('b'));
  const ra = receipt(a, '2026-09-02T09:00:00Z');
  const rb = receipt(b, '2026-09-01T09:00:00Z');
  const reward = entitlement(
    'skill:comparison',
    'skill-progress',
    any(requires(b.sourceKey), requires(a.sourceKey)),
  );
  const state = apply(D.emptyState(), [a, b], [reward], [ra, rb]).state;
  assert.deepEqual(state.owned[0].receiptKeys, [ra.receiptKey]);
  assert.equal(state.owned[0].grantedAt, '2026-09-02T09:00:00.000Z');
});

test('sequential any receipts converge regardless of arrival order', () => {
  const a = source(puzzle('a'));
  const b = source(puzzle('b'));
  const ra = receipt(a, '2026-09-02T09:00:00Z');
  const rb = receipt(b, '2026-09-01T09:00:00Z');
  const reward = entitlement(
    'skill:comparison',
    'skill-progress',
    any(requires(b.sourceKey), requires(a.sourceKey)),
  );
  const reduce = (events) =>
    events.reduce(
      (state, event) => apply(state, [a, b], [reward], [event]).state,
      D.emptyState(),
    );
  const first = reduce([ra, rb]);
  const second = reduce([rb, ra]);
  assert.deepEqual(first, second);
  assert.deepEqual(first.owned[0].receiptKeys, [ra.receiptKey]);
  assert.deepEqual(first.outbox, first.owned);
});

test('acknowledged any grants reconcile evidence without reopening delivery', () => {
  const a = source(puzzle('a'));
  const b = source(puzzle('b'));
  const ra = receipt(a, '2026-09-02T09:00:00Z');
  const rb = receipt(b, '2026-09-01T09:00:00Z');
  const reward = entitlement(
    'skill:comparison',
    'skill-progress',
    any(requires(b.sourceKey), requires(a.sourceKey)),
  );
  const initial = apply(D.emptyState(), [a, b], [reward], [rb]).state;
  const acknowledged = D.acknowledge(
    initial,
    [initial.outbox[0].grantId],
    initial.generation,
  );
  const reconciled = apply(acknowledged, [a, b], [reward], [ra]).state;
  assert.deepEqual(reconciled.owned[0].receiptKeys, [ra.receiptKey]);
  assert.equal(reconciled.outbox.length, 0);
});

test('local imports can be recorded but cannot satisfy reward prerequisites', () => {
  const importedDefinition = puzzle('imported-one');
  const local = source(importedDefinition, {
    sourceKey: 'local:imported-one',
    kind: 'local-import',
    authority: 'local',
    packKey: 'user-pack',
    rewardEligible: false,
  });
  const reward = entitlement('cosmetic:local-copy', 'cosmetic', requires(local.sourceKey));
  const result = apply(
    D.emptyState(),
    [local],
    [reward],
    [receipt(local, '2026-09-01T09:00:00Z')],
  );
  assert.equal(result.state.receipts.length, 1);
  assert.equal(result.state.owned.length, 0);
  assert.throws(
    () =>
      apply(
        D.emptyState(),
        [{ ...local, rewardEligible: true }],
        [reward],
        [receipt(local, '2026-09-01T09:00:00Z')],
      ),
    /local sources cannot grant entitlements/i,
  );
});

test('a later completion revision cannot mint the same entitlement twice', () => {
  const v1 = puzzle('scene-01', 1);
  const v2 = puzzle('scene-01', 2, { title: 'Reviewed scene' });
  const registration = source([v1, v2]);
  const reward = entitlement(
    'cosmetic:scene-keepsake',
    'cosmetic',
    requires(registration.sourceKey),
  );
  const first = apply(
    D.emptyState(),
    [registration],
    [reward],
    [receipt(registration, '2026-09-01T09:00:00Z', 1)],
  ).state;
  const replay = apply(
    first,
    [registration],
    [reward],
    [receipt(registration, '2026-09-10T09:00:00Z', 2)],
  );
  assert.equal(replay.state.receipts.length, 1);
  assert.equal(replay.state.owned.length, 1);
  assert.equal(replay.state.outbox.length, 1);
  assert.equal(replay.state.generation, first.generation);
  assert.deepEqual(replay.grants, []);
});

test('acknowledgement removes only the outbox record and is idempotent', () => {
  const registration = source(puzzle('scene-01'));
  const reward = entitlement('cosmetic:keepsake', 'cosmetic', requires(registration.sourceKey));
  const applied = apply(
    D.emptyState(),
    [registration],
    [reward],
    [receipt(registration, '2026-09-01T09:00:00Z')],
  ).state;
  const grantId = applied.outbox[0].grantId;
  const acknowledged = D.acknowledge(applied, [grantId], applied.generation);
  assert.equal(acknowledged.generation, 2);
  assert.equal(acknowledged.outbox.length, 0);
  assert.equal(acknowledged.owned.length, 1);
  const repeated = D.acknowledge(acknowledged, [grantId], acknowledged.generation);
  assert.deepEqual(repeated, acknowledged);
  const replay = apply(
    repeated,
    [registration],
    [reward],
    [receipt(registration, '2026-09-01T09:00:00Z')],
  );
  assert.deepEqual(replay.state, repeated);
  assert.deepEqual(replay.grants, []);
});

test('stale generations fail closed for receipt application and acknowledgement', () => {
  const registration = source(puzzle('scene-01'));
  const reward = entitlement('room:study', 'room-access', requires(registration.sourceKey));
  assert.throws(
    () =>
      apply(
        D.emptyState(),
        [registration],
        [reward],
        [receipt(registration, '2026-09-01T09:00:00Z')],
        1,
      ),
    D.ConflictError,
  );
  assert.throws(() => D.acknowledge(D.emptyState(), [], 1), D.ConflictError);
});

test('removed content and definitions never revoke an existing entitlement', () => {
  const registration = source(puzzle('scene-01'));
  const reward = entitlement('room:study', 'room-access', requires(registration.sourceKey));
  const applied = apply(
    D.emptyState(),
    [registration],
    [reward],
    [receipt(registration, '2026-09-01T09:00:00Z')],
  ).state;
  const acknowledged = D.acknowledge(
    applied,
    [applied.outbox[0].grantId],
    applied.generation,
  );
  const afterRemoval = apply(acknowledged, [], [], [], acknowledged.generation);
  assert.deepEqual(afterRemoval.state, acknowledged);
  assert.equal(afterRemoval.state.owned[0].entitlementKey, 'room:study');
});

test('future schemas, unknown fields and tampered provenance are preserved by rejection', () => {
  const registration = source(puzzle('scene-01'));
  const reward = entitlement('room:study', 'room-access', requires(registration.sourceKey));
  const event = receipt(registration, '2026-09-01T09:00:00Z');
  assert.throws(
    () => D.validateState({ ...D.emptyState(), schema: 2 }),
    /unsupported state schema/i,
  );
  assert.throws(
    () => D.validateState({ ...D.emptyState(), futureField: true }),
    /unknown state field/i,
  );
  assert.throws(
    () => apply(D.emptyState(), [registration], [reward], [{ ...event, schema: 2 }]),
    /unsupported receipt schema/i,
  );
  assert.throws(
    () =>
      apply(
        D.emptyState(),
        [registration],
        [reward],
        [{ ...event, contentKey: 'other-pack:scene-01@1' }],
      ),
    /receipt provenance does not match/i,
  );
});

test('bounds and expression depth fail before mutating the caller state', () => {
  const state = D.emptyState();
  state.receipts = Array(D.LIMITS.receipts + 1).fill(null);
  const before = JSON.stringify(state);
  assert.throws(() => D.validateState(state), /too many receipts/i);
  assert.equal(JSON.stringify(state), before);

  let expression = requires('catalogue:scene-01');
  for (let i = 0; i <= D.LIMITS.expressionDepth; i++) expression = all(expression);
  const registration = source(puzzle('scene-01'));
  assert.throws(
    () =>
      apply(
        D.emptyState(),
        [registration],
        [entitlement('room:study', 'room-access', expression)],
        [],
      ),
    /prerequisite is too deeply nested/i,
  );
});
