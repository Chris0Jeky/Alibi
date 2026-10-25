'use strict';
const { parseCase } = require('./case-authoring.cjs');

// Author-test data only. Sorted JSON keeps witness selection independent of enumeration order.
function canonical(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string')
    return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) {
    const parts = [];
    for (let i = 0; i < value.length; i++) {
      if (!Object.hasOwn(value, i)) throw new TypeError('Sparse model data');
      parts.push(canonical(value[i]));
    }
    return `[${parts.join(',')}]`;
  }
  if (value && Object.getPrototypeOf(value) === Object.prototype)
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(',')}}`;
  throw new TypeError('Model data must be finite JSON values');
}

function boundedModels(models, maxModels) {
  if (!Number.isSafeInteger(maxModels) || maxModels < 1 || maxModels > 100000)
    throw new TypeError('maxModels must be an integer in 1..100000');
  if (!Array.isArray(models) || models.length > maxModels)
    throw new TypeError('Expected a complete model array within maxModels');
  if (!models.length) throw new Error('No admissible worlds; refusing vacuous proof');
  // Validate the array too: map alone would silently skip holes.
  canonical(models);
  return models
    .map(canonical)
    .sort()
    .map((text) => JSON.parse(text));
}

function classifyModels(models, predicate, maxModels = 10000) {
  const ordered = boundedModels(models, maxModels);
  if (typeof predicate !== 'function')
    return { verdict: 'unsupported-model', trueWitness: null, falseWitness: null };
  let trueWitness = null,
    falseWitness = null;
  for (const world of ordered) {
    const snapshot = canonical(world);
    const result = predicate(world);
    if (typeof result !== 'boolean') throw new TypeError('Predicate must return a boolean');
    if (canonical(world) !== snapshot) throw new TypeError('Predicate must not mutate a model');
    if (result && trueWitness === null) trueWitness = { model: world };
    if (!result && falseWitness === null) falseWitness = { model: world };
  }
  return {
    verdict:
      trueWitness && falseWitness ? 'not-established' : trueWitness ? 'supported' : 'contradicted',
    trueWitness,
    falseWitness,
  };
}

function createModelReceipt(source, model) {
  const { definition, receipt } = parseCase(source);
  if (
    model.caseId !== definition.id ||
    model.caseRevision !== definition.revision ||
    model.sourceSha256 !== receipt.sourceSha256
  )
    throw new Error(
      'Model binding differs from case ID, revision or source SHA-256; review the model',
    );
  if (
    typeof model.id !== 'string' ||
    !model.id.trim() ||
    !Number.isSafeInteger(model.revision) ||
    model.revision < 1
  )
    throw new TypeError('Model ID and positive revision are required');
  if (
    !Array.isArray(model.assumptions) ||
    !model.assumptions.length ||
    model.assumptions.some((s) => typeof s !== 'string' || !s.trim()) ||
    !model.bounds ||
    Object.getPrototypeOf(model.bounds) !== Object.prototype ||
    !Object.keys(model.bounds).length ||
    Object.values(model.bounds).some((domain) => !Array.isArray(domain) || !domain.length)
  )
    throw new TypeError('Explicit assumptions and finite bounds are required');
  const unsupported = model.models === null;
  // Even an unsupported adapter must declare its intended enumeration ceiling.
  boundedModels(unsupported ? [null] : model.models, model.maxModels);
  if (
    unsupported &&
    (typeof model.unsupportedReason !== 'string' || !model.unsupportedReason.trim())
  )
    throw new TypeError('An unsupported model requires a reason');
  const claims = definition.steps.flatMap((step) =>
    step.claims.map((claim) => {
      const predicate = Object.hasOwn(model.predicates || {}, claim.id)
        ? model.predicates[claim.id]
        : undefined;
      const result = unsupported
        ? { verdict: 'unsupported-model', trueWitness: null, falseWitness: null }
        : classifyModels(model.models, predicate, model.maxModels);
      return {
        stepId: step.id,
        claimId: claim.id,
        ...result,
        reason:
          result.verdict === 'unsupported-model'
            ? unsupported
              ? model.unsupportedReason
              : 'No independently authored predicate'
            : null,
        authoredAnswer: claim.answer,
        matchesAuthoredAnswer:
          result.verdict === 'unsupported-model' ? null : result.verdict === claim.answer,
      };
    }),
  );
  return {
    format: 'postern-case-model-1',
    scope: 'bounded-model-only',
    caseId: definition.id,
    caseRevision: definition.revision,
    sourceSha256: receipt.sourceSha256,
    sourceBytes: receipt.sourceBytes,
    model: {
      id: model.id,
      revision: model.revision,
      assumptions: JSON.parse(canonical(model.assumptions)),
      bounds: JSON.parse(canonical(model.bounds)),
      maxModels: model.maxModels,
    },
    modelCount: unsupported ? null : model.models.length,
    status: claims.some((c) => c.verdict === 'unsupported-model')
      ? 'unsupported-model'
      : claims.some((c) => !c.matchesAuthoredAnswer)
        ? 'answer-mismatch'
        : 'classified',
    claims,
  };
}

module.exports = { classifyModels, createModelReceipt };
