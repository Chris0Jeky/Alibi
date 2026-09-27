'use strict';
(function (root) {
  const verdicts = ['supported', 'contradicted', 'not-established'];
  // Definition must already have passed case-authoring. This is not an import validator.
  function context(definition, completed, stepId) {
    const steps = new Map(definition.steps.map((s) => [s.id, s]));
    if (!Array.isArray(completed) || completed.length > steps.size) throw new TypeError('Invalid completion state');
    const done = new Set();
    for (const id of completed) {
      if (!steps.has(id) || done.has(id)) throw new TypeError('Invalid completion state');
      done.add(id);
    }
    for (const id of done) {
      if (!steps.get(id).requires.every((req) => done.has(req))) throw new TypeError('Invalid completion prerequisites');
    }
    const step = stepId === undefined ? null : steps.get(stepId);
    if (stepId !== undefined && (!step || !step.requires.every((req) => done.has(req)))) throw new TypeError('Unknown or locked step');
    return { steps, done, step };
  }
  function visible(steps, step) {
    const ids = new Set();
    function visit(id) {
      if (ids.has(id)) return;
      ids.add(id);
      for (const req of steps.get(id).requires) visit(req);
    }
    visit(step.id);
    return ids;
  }
  function mode(storyOn) {
    if (typeof storyOn !== 'boolean') throw new TypeError('Invalid story mode');
    return storyOn ? 'storyOn' : 'storyOff';
  }
  function available(definition, completed) {
    const { done } = context(definition, completed);
    return definition.steps.filter((s) => s.requires.every((req) => done.has(req))).map((s) => s.id);
  }
  function project(definition, completed, stepId, storyOn) {
    const key = mode(storyOn);
    const { steps, step } = context(definition, completed, stepId);
    const owners = visible(steps, step);
    return {
      id: step.id, title: step.title, prompt: step.prompt[key],
      records: definition.records.filter((r) => owners.has(r.at)).map((r) => ({ id: r.id, title: r.title, kind: r.kind, source: r.source, text: r.text[key] })),
      claims: step.claims.map((c) => ({ id: c.id, text: c.text[key] })),
      hints: step.hints.map((h) => ({ level: h.level, text: h.text[key], records: [...h.records] })),
    };
  }
  function submit(definition, completed, stepId, answers) {
    const { step, done } = context(definition, completed, stepId);
    const previous = definition.steps.filter((s) => done.has(s.id)).map((s) => s.id);
    const invalid = () => ({ ok: false, completed: previous, errors: [{ claimId: null, code: 'submission' }] });
    if (!Array.isArray(answers) || answers.length !== step.claims.length) return invalid();
    const selected = new Map();
    for (const answer of answers) {
      if (!answer || Object.getPrototypeOf(answer) !== Object.prototype || Object.keys(answer).length !== 3 || !['id', 'verdict', 'citations'].every((k) => Object.hasOwn(answer, k))) return invalid();
      if (!step.claims.some((c) => c.id === answer.id) || selected.has(answer.id)) return invalid();
      selected.set(answer.id, answer);
    }
    const errors = [];
    for (const claim of step.claims) {
      const answer = selected.get(claim.id);
      if (!verdicts.includes(answer.verdict) || answer.verdict !== claim.answer) errors.push({ claimId: claim.id, code: 'verdict' });
      const refs = answer.citations;
      const valid = Array.isArray(refs) && refs.length >= 1 && refs.length <= 8 && refs.every((r) => typeof r === 'string') && new Set(refs).size === refs.length;
      if (!valid || !claim.evidence.some((bundle) => bundle.length === refs.length && bundle.every((r) => refs.includes(r)))) errors.push({ claimId: claim.id, code: 'citations' });
    }
    if (errors.length) return { ok: false, completed: previous, errors };
    done.add(step.id);
    return { ok: true, completed: definition.steps.filter((s) => done.has(s.id)).map((s) => s.id), errors: [] };
  }
  function hint(view, index) {
    if (!Number.isInteger(index) || index < 0 || index >= view.hints.length) throw new RangeError('Invalid hint index');
    const h = view.hints[index];
    return { level: h.level, text: h.text, records: [...h.records] };
  }
  function worked(definition, completed, stepId, storyOn) {
    const key = mode(storyOn);
    const { step } = context(definition, completed, stepId);
    return { text: step.workedAnswer.text[key], records: [...step.workedAnswer.records] };
  }
  const api = { available, project, submit, hint, worked };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PosternCaseSession = Object.freeze(api);
})(globalThis);
