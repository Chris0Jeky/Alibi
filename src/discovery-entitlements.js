/* Pure discovery-receipt and entitlement rules. Persistence adapters own atomic writes. */
(function (G) {
  'use strict';

  const SCHEMA = 1;
  const LIMITS = Object.freeze({
    sources: 1024,
    sourceRevisions: 64,
    definitions: 1024,
    receipts: 4096,
    stateEntries: 2048,
    prerequisiteTerms: 32,
    expressionDepth: 8,
    bootstrapRuns: 4096,
    text: 240,
  });
  const SOURCE_KINDS = new Set(['catalogue', 'challenge', 'story', 'local-import']);
  const AUTHORITIES = new Set(['official', 'registered', 'local']);
  const CATEGORIES = new Set(['evidence', 'room-access', 'cosmetic', 'skill-progress']);
  const EVIDENCE_KINDS = new Set(['first-completion', 'completion', 'registered-event']);
  const ID = /^[A-Za-z0-9][A-Za-z0-9._:/@-]*$/;

  class ConflictError extends Error {
    constructor() {
      super('Entitlement state changed in another tab. Reload before writing.');
      this.name = 'ConflictError';
    }
  }

  const copy = (value) => JSON.parse(JSON.stringify(value));

  function object(value, label) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw Error(`${label} must be an object.`);
    return value;
  }

  function exact(value, fields, label) {
    object(value, label);
    const allowed = new Set(fields);
    for (const key of Object.keys(value)) {
      if (!allowed.has(key)) throw Error(`Unknown ${label} field "${key}".`);
    }
  }

  function schema(value, label) {
    if (value !== SCHEMA) throw Error(`Unsupported ${label} schema. Preserve it unchanged.`);
  }

  function text(value, label, pattern = false) {
    if (
      typeof value !== 'string' ||
      value.length < 1 ||
      value.length > LIMITS.text ||
      (pattern && !ID.test(value))
    )
      throw Error(`${label} is invalid.`);
    return value;
  }

  function semanticKey(value, label, prefix) {
    const checked = text(value, label, true);
    if (`${prefix}${checked}`.length > LIMITS.text) throw Error(`${label} is too long.`);
    return checked;
  }

  function iso(value, label) {
    if (typeof value !== 'string') throw Error(`${label} must be an ISO timestamp.`);
    const time = Date.parse(value);
    if (!Number.isFinite(time)) throw Error(`${label} must be an ISO timestamp.`);
    return new Date(time).toISOString();
  }

  function optionalIso(value) {
    try {
      return value ? iso(value, 'Completion time') : null;
    } catch {
      return null;
    }
  }

  function stable(value) {
    if (value === null || typeof value === 'boolean' || typeof value === 'string')
      return JSON.stringify(value);
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) throw Error('Definitions may contain only finite numbers.');
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
    if (value && typeof value === 'object') {
      return `{${Object.keys(value)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${stable(value[key])}`)
        .join(',')}}`;
    }
    throw Error('Definitions may contain only JSON values.');
  }

  function fingerprint(value) {
    const valueText = stable(value);
    let first = 0xcbf29ce484222325n;
    let second = 0x84222325cbf29ce4n;
    const prime = 0x100000001b3n;
    for (let index = 0; index < valueText.length; index++) {
      const code = BigInt(valueText.charCodeAt(index));
      first = BigInt.asUintN(64, (first ^ code) * prime);
      second = BigInt.asUintN(64, (second ^ (code + BigInt(index & 255))) * prime);
    }
    return first.toString(16).padStart(16, '0') + second.toString(16).padStart(16, '0');
  }

  function validateRevision(value) {
    exact(
      value,
      ['schema', 'revision', 'contentKey', 'definitionFingerprint'],
      'source revision',
    );
    schema(value.schema, 'source revision');
    if (!Number.isInteger(value.revision) || value.revision < 1)
      throw Error('Source revision must be a positive integer.');
    const definitionFingerprint = text(
      value.definitionFingerprint,
      'Definition fingerprint',
    );
    if (!/^[0-9a-f]{32}$/.test(definitionFingerprint))
      throw Error('Definition fingerprint is invalid.');
    return {
      schema: SCHEMA,
      revision: value.revision,
      contentKey: text(value.contentKey, 'Content key', true),
      definitionFingerprint,
    };
  }

  function validateSource(value) {
    exact(
      value,
      [
        'schema',
        'sourceKey',
        'kind',
        'authority',
        'packKey',
        'contentId',
        'rewardEligible',
        'revisions',
      ],
      'source',
    );
    schema(value.schema, 'source');
    const sourceKey = semanticKey(value.sourceKey, 'Source key', 'receipt:');
    const kind = text(value.kind, 'Source kind');
    const authority = text(value.authority, 'Source authority');
    if (!SOURCE_KINDS.has(kind)) throw Error('Source kind is unsupported.');
    if (!AUTHORITIES.has(authority)) throw Error('Source authority is unsupported.');
    if (typeof value.rewardEligible !== 'boolean')
      throw Error('Source reward eligibility must be explicit.');
    if ((kind === 'local-import' || authority === 'local') && value.rewardEligible)
      throw Error('Local sources cannot grant entitlements.');
    if (!Array.isArray(value.revisions) || value.revisions.length < 1)
      throw Error('A source needs at least one registered revision.');
    if (value.revisions.length > LIMITS.sourceRevisions)
      throw Error('A source has too many registered revisions.');
    const revisions = value.revisions.map(validateRevision).sort((a, b) => a.revision - b.revision);
    const revisionIds = new Set();
    const contentKeys = new Set();
    for (const revision of revisions) {
      if (revisionIds.has(revision.revision)) throw Error('A source revision is duplicated.');
      if (contentKeys.has(revision.contentKey)) throw Error('A source content key is duplicated.');
      revisionIds.add(revision.revision);
      contentKeys.add(revision.contentKey);
    }
    return {
      schema: SCHEMA,
      sourceKey,
      kind,
      authority,
      packKey: text(value.packKey, 'Pack key', true),
      contentId: text(value.contentId, 'Content ID', true),
      rewardEligible: value.rewardEligible,
      revisions,
    };
  }

  function validateSources(values) {
    if (!Array.isArray(values)) throw Error('Sources must be an array.');
    if (values.length > LIMITS.sources) throw Error('Too many sources.');
    const list = values.map(validateSource).sort((a, b) => a.sourceKey.localeCompare(b.sourceKey));
    const byKey = new Map();
    const contentKeys = new Set();
    const bootstrap = new Map();
    for (const source of list) {
      if (byKey.has(source.sourceKey)) throw Error('A source key is duplicated.');
      byKey.set(source.sourceKey, source);
      for (const revision of source.revisions) {
        if (contentKeys.has(revision.contentKey)) throw Error('A content key is registered twice.');
        contentKeys.add(revision.contentKey);
        if (source.kind === 'catalogue' && source.rewardEligible) {
          const key = [
            source.contentId,
            revision.revision,
            revision.definitionFingerprint,
          ].join('\u0000');
          if (bootstrap.has(key)) throw Error('A catalogue definition is registered twice.');
          bootstrap.set(key, { source, revision });
        }
      }
    }
    return { list, byKey, bootstrap };
  }

  function validateEvidence(value) {
    exact(value, ['schema', 'kind', 'recordKey'], 'receipt evidence');
    schema(value.schema, 'receipt evidence');
    const kind = text(value.kind, 'Evidence kind');
    if (!EVIDENCE_KINDS.has(kind)) throw Error('Evidence kind is unsupported.');
    return {
      schema: SCHEMA,
      kind,
      recordKey: text(value.recordKey, 'Evidence record key', true),
    };
  }

  function validateReceipt(value) {
    exact(
      value,
      [
        'schema',
        'receiptKey',
        'sourceKey',
        'contentKey',
        'revision',
        'occurredAt',
        'evidence',
      ],
      'receipt',
    );
    schema(value.schema, 'receipt');
    const sourceKey = semanticKey(value.sourceKey, 'Receipt source key', 'receipt:');
    const receiptKey = text(value.receiptKey, 'Receipt key', true);
    if (receiptKey !== `receipt:${sourceKey}`)
      throw Error('Receipt key must be stable for its semantic source.');
    if (!Number.isInteger(value.revision) || value.revision < 1)
      throw Error('Receipt revision must be a positive integer.');
    return {
      schema: SCHEMA,
      receiptKey,
      sourceKey,
      contentKey: text(value.contentKey, 'Receipt content key', true),
      revision: value.revision,
      occurredAt: iso(value.occurredAt, 'Receipt time'),
      evidence: validateEvidence(value.evidence),
    };
  }

  function receiptOrder(left, right) {
    return (
      left.occurredAt.localeCompare(right.occurredAt) ||
      left.contentKey.localeCompare(right.contentKey) ||
      left.evidence.recordKey.localeCompare(right.evidence.recordKey)
    );
  }

  function normalizeReceipts(values, limit = LIMITS.receipts) {
    if (!Array.isArray(values)) throw Error('Receipts must be an array.');
    if (values.length > limit) throw Error('Too many receipts.');
    const byKey = new Map();
    for (const raw of values) {
      const value = validateReceipt(raw);
      const previous = byKey.get(value.receiptKey);
      if (!previous || receiptOrder(value, previous) < 0) byKey.set(value.receiptKey, value);
    }
    return [...byKey.values()].sort((a, b) => a.receiptKey.localeCompare(b.receiptKey));
  }

  function validateExpression(value, depth = 0) {
    if (depth > LIMITS.expressionDepth) throw Error('Prerequisite is too deeply nested.');
    object(value, 'Prerequisite');
    if (value.op === 'source') {
      exact(value, ['schema', 'op', 'sourceKey'], 'prerequisite');
      schema(value.schema, 'prerequisite');
      return {
        schema: SCHEMA,
        op: 'source',
        sourceKey: text(value.sourceKey, 'Prerequisite source key', true),
      };
    }
    if (value.op !== 'all' && value.op !== 'any')
      throw Error('Prerequisite operator is unsupported.');
    exact(value, ['schema', 'op', 'terms'], 'prerequisite');
    schema(value.schema, 'prerequisite');
    if (!Array.isArray(value.terms) || value.terms.length < 1)
      throw Error('A prerequisite group needs at least one term.');
    if (value.terms.length > LIMITS.prerequisiteTerms)
      throw Error('A prerequisite has too many terms.');
    const unique = new Map();
    for (const term of value.terms) {
      const checked = validateExpression(term, depth + 1);
      unique.set(stable(checked), checked);
    }
    return {
      schema: SCHEMA,
      op: value.op,
      terms: [...unique.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([, term]) => term),
    };
  }

  function validateDefinition(value) {
    exact(value, ['schema', 'entitlementKey', 'category', 'prerequisite'], 'entitlement');
    schema(value.schema, 'entitlement');
    const category = text(value.category, 'Entitlement category');
    if (!CATEGORIES.has(category)) throw Error('Entitlement category is unsupported.');
    return {
      schema: SCHEMA,
      entitlementKey: semanticKey(value.entitlementKey, 'Entitlement key', 'grant:'),
      category,
      prerequisite: validateExpression(value.prerequisite),
    };
  }

  function validateDefinitions(values) {
    if (!Array.isArray(values)) throw Error('Entitlements must be an array.');
    if (values.length > LIMITS.definitions) throw Error('Too many entitlement definitions.');
    const list = values
      .map(validateDefinition)
      .sort((a, b) => a.entitlementKey.localeCompare(b.entitlementKey));
    const keys = new Set();
    for (const value of list) {
      if (keys.has(value.entitlementKey)) throw Error('An entitlement key is duplicated.');
      keys.add(value.entitlementKey);
    }
    return list;
  }

  function validateGrant(value, label) {
    exact(
      value,
      [
        'schema',
        'grantId',
        'entitlementKey',
        'category',
        'receiptKeys',
        'grantedAt',
      ],
      label,
    );
    schema(value.schema, label);
    const entitlementKey = text(value.entitlementKey, 'Grant entitlement key', true);
    const category = text(value.category, 'Grant category');
    if (!CATEGORIES.has(category)) throw Error('Grant category is unsupported.');
    const grantId = text(value.grantId, 'Grant ID', true);
    if (grantId !== `grant:${entitlementKey}`) throw Error('Grant ID does not match entitlement.');
    if (!Array.isArray(value.receiptKeys) || value.receiptKeys.length < 1)
      throw Error('A grant needs at least one receipt.');
    if (value.receiptKeys.length > LIMITS.prerequisiteTerms)
      throw Error('A grant has too many receipts.');
    const receiptKeys = [
      ...new Set(value.receiptKeys.map((key) => text(key, 'Grant receipt key', true))),
    ].sort();
    if (receiptKeys.length !== value.receiptKeys.length) throw Error('A grant repeats a receipt.');
    return {
      schema: SCHEMA,
      grantId,
      entitlementKey,
      category,
      receiptKeys,
      grantedAt: iso(value.grantedAt, 'Grant time'),
    };
  }

  function validateState(value) {
    exact(value, ['schema', 'generation', 'receipts', 'owned', 'outbox'], 'state');
    schema(value.schema, 'state');
    if (!Number.isSafeInteger(value.generation) || value.generation < 0)
      throw Error('State generation is invalid.');
    if (!Array.isArray(value.receipts)) throw Error('State receipts must be an array.');
    if (value.receipts.length > LIMITS.receipts) throw Error('Too many receipts.');
    const receipts = value.receipts.map(validateReceipt).sort((a, b) =>
      a.receiptKey.localeCompare(b.receiptKey),
    );
    if (new Set(receipts.map((item) => item.receiptKey)).size !== receipts.length)
      throw Error('State contains duplicate receipts.');
    if (!Array.isArray(value.owned) || !Array.isArray(value.outbox))
      throw Error('State grants must be arrays.');
    if (value.owned.length > LIMITS.stateEntries || value.outbox.length > LIMITS.stateEntries)
      throw Error('State contains too many grants.');
    const owned = value.owned
      .map((item) => validateGrant(item, 'owned grant'))
      .sort((a, b) => a.entitlementKey.localeCompare(b.entitlementKey));
    const outbox = value.outbox
      .map((item) => validateGrant(item, 'outbox grant'))
      .sort((a, b) => a.grantId.localeCompare(b.grantId));
    const ownedKeys = new Set();
    const ownedIds = new Set();
    for (const grant of owned) {
      if (ownedKeys.has(grant.entitlementKey) || ownedIds.has(grant.grantId))
        throw Error('State contains a duplicate owned grant.');
      ownedKeys.add(grant.entitlementKey);
      ownedIds.add(grant.grantId);
    }
    const outboxIds = new Set();
    const ownedById = new Map(owned.map((grant) => [grant.grantId, grant]));
    for (const grant of outbox) {
      if (outboxIds.has(grant.grantId)) throw Error('State contains a duplicate outbox grant.');
      outboxIds.add(grant.grantId);
      const owner = ownedById.get(grant.grantId);
      if (!owner || stable(owner) !== stable(grant))
        throw Error('Outbox grant does not match owned entitlement.');
    }
    const receiptKeys = new Set(receipts.map((item) => item.receiptKey));
    for (const grant of owned) {
      if (grant.receiptKeys.some((key) => !receiptKeys.has(key)))
        throw Error('Owned entitlement refers to a missing receipt.');
    }
    return { schema: SCHEMA, generation: value.generation, receipts, owned, outbox };
  }

  function emptyState() {
    return { schema: SCHEMA, generation: 0, receipts: [], owned: [], outbox: [] };
  }

  function matchReceipt(receipt, source) {
    if (!source || source.sourceKey !== receipt.sourceKey) return false;
    return source.revisions.some(
      (revision) =>
        revision.revision === receipt.revision && revision.contentKey === receipt.contentKey,
    );
  }

  function verifyIncoming(receipts, sources) {
    for (const receipt of receipts) {
      const source = sources.byKey.get(receipt.sourceKey);
      if (!source) throw Error('Receipt source is not registered.');
      if (!matchReceipt(receipt, source)) throw Error('Receipt provenance does not match source.');
    }
  }

  function mergeReceipts(current, incoming) {
    const merged = normalizeReceipts([...current, ...incoming]);
    return { receipts: merged, changed: stable(merged) !== stable(current) };
  }

  function evaluate(expression, available) {
    if (expression.op === 'source') {
      const receipt = available.get(expression.sourceKey);
      return receipt
        ? { satisfied: true, receiptKeys: [receipt.receiptKey] }
        : { satisfied: false, receiptKeys: [] };
    }
    const results = expression.terms.map((term) => evaluate(term, available));
    if (expression.op === 'all') {
      if (results.some((result) => !result.satisfied))
        return { satisfied: false, receiptKeys: [] };
      return {
        satisfied: true,
        receiptKeys: [...new Set(results.flatMap((result) => result.receiptKeys))].sort(),
      };
    }
    const choices = results
      .filter((result) => result.satisfied)
      .sort((left, right) =>
        left.receiptKeys.join('\u0000').localeCompare(right.receiptKeys.join('\u0000')),
      );
    return choices[0] || { satisfied: false, receiptKeys: [] };
  }

  function requireGeneration(state, expectedGeneration) {
    if (expectedGeneration !== state.generation) throw new ConflictError();
  }

  function nextGeneration(value) {
    if (value >= Number.MAX_SAFE_INTEGER) throw Error('State generation is exhausted.');
    return value + 1;
  }

  function apply(state, change, expectedGeneration = state?.generation) {
    const current = validateState(state);
    requireGeneration(current, expectedGeneration);
    exact(change, ['sources', 'definitions', 'receipts'], 'entitlement change');
    const sources = validateSources(change.sources);
    const definitions = validateDefinitions(change.definitions);
    const incoming = normalizeReceipts(change.receipts);
    verifyIncoming(incoming, sources);
    const merged = mergeReceipts(current.receipts, incoming);
    const available = new Map();
    for (const receipt of merged.receipts) {
      const source = sources.byKey.get(receipt.sourceKey);
      if (source?.rewardEligible && matchReceipt(receipt, source))
        available.set(source.sourceKey, receipt);
    }
    const owned = current.owned.map(copy);
    const outbox = current.outbox.map(copy);
    const ownedByKey = new Map(owned.map((grant, index) => [grant.entitlementKey, index]));
    const outboxById = new Map(outbox.map((grant, index) => [grant.grantId, index]));
    const receiptsByKey = new Map(merged.receipts.map((receipt) => [receipt.receiptKey, receipt]));
    const grants = [];
    let reconciled = false;
    for (const definition of definitions) {
      const result = evaluate(definition.prerequisite, available);
      if (!result.satisfied) continue;
      const grantedAt = result.receiptKeys
        .map((key) => receiptsByKey.get(key).occurredAt)
        .sort()
        .at(-1);
      const grant = {
        schema: SCHEMA,
        grantId: `grant:${definition.entitlementKey}`,
        entitlementKey: definition.entitlementKey,
        category: definition.category,
        receiptKeys: result.receiptKeys,
        grantedAt,
      };
      const ownedIndex = ownedByKey.get(definition.entitlementKey);
      if (ownedIndex !== undefined) {
        const previous = owned[ownedIndex];
        if (previous.category === definition.category && stable(previous) !== stable(grant)) {
          owned[ownedIndex] = grant;
          const outboxIndex = outboxById.get(grant.grantId);
          if (outboxIndex !== undefined) outbox[outboxIndex] = copy(grant);
          reconciled = true;
        }
        continue;
      }
      if (owned.length >= LIMITS.stateEntries || outbox.length >= LIMITS.stateEntries)
        throw Error('Entitlement state has reached its grant limit.');
      owned.push(grant);
      outbox.push(copy(grant));
      grants.push(copy(grant));
      ownedByKey.set(definition.entitlementKey, owned.length - 1);
      outboxById.set(grant.grantId, outbox.length - 1);
    }
    if (!merged.changed && !reconciled && grants.length === 0)
      return { state: current, grants: [] };
    const next = validateState({
      schema: SCHEMA,
      generation: nextGeneration(current.generation),
      receipts: merged.receipts,
      owned,
      outbox,
    });
    return { state: next, grants };
  }

  function acknowledge(state, grantIds, expectedGeneration = state?.generation) {
    const current = validateState(state);
    requireGeneration(current, expectedGeneration);
    if (!Array.isArray(grantIds)) throw Error('Grant acknowledgements must be an array.');
    if (grantIds.length > LIMITS.stateEntries) throw Error('Too many grant acknowledgements.');
    const ids = new Set(grantIds.map((id) => text(id, 'Grant acknowledgement', true)));
    const outbox = current.outbox.filter((grant) => !ids.has(grant.grantId));
    if (outbox.length === current.outbox.length) return current;
    return validateState({
      ...current,
      generation: nextGeneration(current.generation),
      outbox,
    });
  }

  function bootstrapCatalogueReceipts(runs, sourceValues) {
    if (!Array.isArray(runs)) throw Error('Saved runs must be an array.');
    if (runs.length > LIMITS.bootstrapRuns) throw Error('Too many saved runs to bootstrap.');
    const sources = validateSources(sourceValues);
    const receipts = [];
    for (const run of runs) {
      if (!run || run.schemaVersion !== 1 || typeof run.key !== 'string') continue;
      const definition = run.puzzle;
      if (
        !definition ||
        typeof definition !== 'object' ||
        Array.isArray(definition) ||
        typeof definition.id !== 'string' ||
        !Number.isInteger(definition.revision)
      )
        continue;
      const first = optionalIso(run.firstCompletedAt);
      const completed = first || optionalIso(run.completedAt);
      if (!completed) continue;
      let definitionFingerprint;
      try {
        definitionFingerprint = fingerprint(definition);
      } catch {
        continue;
      }
      const match = sources.bootstrap.get(
        [definition.id, definition.revision, definitionFingerprint].join('\u0000'),
      );
      if (!match) continue;
      let recordKey;
      try {
        recordKey = text(run.key, 'Saved run key', true);
      } catch {
        continue;
      }
      receipts.push({
        schema: SCHEMA,
        receiptKey: `receipt:${match.source.sourceKey}`,
        sourceKey: match.source.sourceKey,
        contentKey: match.revision.contentKey,
        revision: match.revision.revision,
        occurredAt: completed,
        evidence: {
          schema: SCHEMA,
          kind: first ? 'first-completion' : 'completion',
          recordKey,
        },
      });
    }
    return normalizeReceipts(receipts);
  }

  const api = {
    SCHEMA,
    LIMITS,
    ConflictError,
    fingerprint,
    emptyState,
    validateState,
    bootstrapCatalogueReceipts,
    apply,
    acknowledge,
  };
  G.AlibiDiscoveryEntitlements = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
