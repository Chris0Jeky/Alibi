'use strict';
(function (root) {
  const LIMITS = Object.freeze({
    bytes: 262144,
    variables: 8,
    values: 6,
    states: 4096,
    objects: 16,
    actions: 48,
    observations: 8,
    prose: 1800,
    title: 120,
    answer: 64,
  });
  const token = /^[a-z][a-z0-9-]{0,31}$/;
  const fail = (at, why) => {
    throw new TypeError(`${at}: ${why}`);
  };
  function object(value, at) {
    if (!value || Object.getPrototypeOf(value) !== Object.prototype)
      fail(at, 'expected JSON object');
  }
  function shape(value, fields, at) {
    object(value, at);
    for (const key of Object.keys(value))
      if (!fields.includes(key)) fail(`${at}.${key}`, 'unknown field');
    for (const key of fields) if (!Object.hasOwn(value, key)) fail(`${at}.${key}`, 'missing field');
  }
  function text(value, at, max = LIMITS.prose) {
    if (typeof value !== 'string' || !value.trim() || value.length > max)
      fail(at, `expected nonempty text <=${max} code units`);
  }
  function prose(value, at) {
    shape(value, ['storyOn', 'storyOff'], at);
    text(value.storyOn, `${at}.storyOn`);
    text(value.storyOff, `${at}.storyOff`);
  }
  function list(value, min, max, at) {
    if (!Array.isArray(value) || value.length < min || value.length > max)
      fail(at, `expected ${min}..${max} entries`);
    for (let i = 0; i < value.length; i++) if (!Object.hasOwn(value, i)) fail(at, 'sparse array');
  }
  function id(value, at) {
    if (typeof value !== 'string' || !token.test(value)) fail(at, 'invalid id');
  }
  function matches(condition, state) {
    return Object.keys(condition).every((key) => state[key] === condition[key]);
  }
  function initial(d) {
    return Object.fromEntries(d.variables.map((v) => [v.id, v.initial]));
  }
  function validate(d) {
    shape(
      d,
      [
        'format',
        'id',
        'revision',
        'title',
        'provenance',
        'intro',
        'ending',
        'solution',
        'variables',
        'objects',
        'actions',
        'goal',
      ],
      'room',
    );
    if (d.format !== 'postern-escape-1') fail('room.format', 'unsupported format');
    id(d.id, 'room.id');
    if (!Number.isSafeInteger(d.revision) || d.revision < 1)
      fail('room.revision', 'positive safe integer required');
    text(d.title, 'room.title', LIMITS.title);
    text(d.provenance, 'room.provenance');
    for (const key of ['intro', 'ending', 'solution']) prose(d[key], `room.${key}`);
    list(d.variables, 1, LIMITS.variables, 'room.variables');
    list(d.objects, 1, LIMITS.objects, 'room.objects');
    list(d.actions, 1, LIMITS.actions, 'room.actions');
    const ids = new Set(),
      domains = new Map();
    function register(value, at) {
      id(value, at);
      if (ids.has(value)) fail(at, 'duplicate id');
      ids.add(value);
    }
    let stateSpace = 1;
    d.variables.forEach((v, i) => {
      const at = `room.variables[${i}]`;
      shape(v, ['id', 'values', 'initial'], at);
      register(v.id, `${at}.id`);
      list(v.values, 2, LIMITS.values, `${at}.values`);
      const values = new Set();
      for (const value of v.values) {
        id(value, `${at}.values`);
        if (values.has(value)) fail(`${at}.values`, 'duplicate value');
        values.add(value);
      }
      if (!values.has(v.initial)) fail(`${at}.initial`, 'unknown value');
      domains.set(v.id, values);
      stateSpace *= values.size;
      if (stateSpace > LIMITS.states) fail('room.variables', 'state space exceeds 4096');
    });
    function condition(value, at, nonempty = false) {
      object(value, at);
      if (Object.keys(value).length > LIMITS.variables) fail(at, 'too many state fields');
      if (nonempty && !Object.keys(value).length) fail(at, 'must not be empty');
      for (const [key, val] of Object.entries(value)) {
        if (!domains.has(key) || !domains.get(key).has(val))
          fail(`${at}.${key}`, 'unknown variable or value');
      }
    }
    const objects = new Set();
    d.objects.forEach((o, i) => {
      const at = `room.objects[${i}]`;
      shape(o, ['id', 'title', 'when', 'text', 'observations'], at);
      register(o.id, `${at}.id`);
      objects.add(o.id);
      text(o.title, `${at}.title`, LIMITS.title);
      condition(o.when, `${at}.when`);
      prose(o.text, `${at}.text`);
      list(o.observations, 0, LIMITS.observations, `${at}.observations`);
      o.observations.forEach((entry, j) => {
        const where = `${at}.observations[${j}]`;
        shape(entry, ['when', 'text'], where);
        condition(entry.when, `${where}.when`);
        prose(entry.text, `${where}.text`);
      });
    });
    d.actions.forEach((a, i) => {
      const at = `room.actions[${i}]`;
      shape(a, ['id', 'object', 'label', 'when', 'check', 'set', 'input', 'answer', 'hints'], at);
      register(a.id, `${at}.id`);
      if (!objects.has(a.object)) fail(`${at}.object`, 'unknown object');
      text(a.label, `${at}.label`, LIMITS.title);
      condition(a.when, `${at}.when`);
      condition(a.check, `${at}.check`);
      condition(a.set, `${at}.set`, true);
      if (typeof a.input !== 'boolean') fail(`${at}.input`, 'expected boolean');
      if (a.input) {
        text(a.answer, `${at}.answer`, LIMITS.answer);
        if (a.answer !== a.answer.trim().toUpperCase())
          fail(`${at}.answer`, 'must be trimmed uppercase');
      } else if (a.answer !== null) fail(`${at}.answer`, 'input-free action requires null');
      list(a.hints, 3, 3, `${at}.hints`);
      a.hints.forEach((h, j) => prose(h, `${at}.hints[${j}]`));
    });
    condition(d.goal, 'room.goal', true);
    if (matches(d.goal, initial(d))) fail('room.goal', 'initial state already completed');
    return {
      roomId: d.id,
      revision: d.revision,
      stateSpace,
      objects: d.objects.length,
      actions: d.actions.length,
    };
  }
  function checkState(d, state) {
    shape(
      state,
      d.variables.map((v) => v.id),
      'state',
    );
    for (const v of d.variables)
      if (!v.values.includes(state[v.id])) fail(`state.${v.id}`, 'unknown value');
  }
  // The definition is validated at the authoring boundary. Never mutate caller state.
  function transition(d, state, actionId, input) {
    checkState(d, state);
    const result = (code, next = state) => ({ ok: code === 'applied', code, state: { ...next } });
    if (matches(d.goal, state)) return result('complete');
    const a = d.actions.find((entry) => entry.id === actionId);
    const o = a && d.objects.find((entry) => entry.id === a.object);
    if (!a || !matches(o.when, state) || !matches(a.when, state)) return result('locked');
    if (a.input ? typeof input !== 'string' || input.length > LIMITS.answer : input !== null)
      return result('invalid');
    if (a.input && input.trim().toUpperCase() !== a.answer) return result('incorrect');
    if (!matches(a.check, state)) return result('mechanism');
    const next = { ...state, ...a.set };
    if (d.variables.every((v) => state[v.id] === next[v.id])) return result('unchanged');
    return result('applied', next);
  }
  function project(d, state, storyOn) {
    checkState(d, state);
    if (typeof storyOn !== 'boolean') fail('story', 'expected boolean');
    const mode = storyOn ? 'storyOn' : 'storyOff',
      won = matches(d.goal, state);
    return {
      won,
      objects: d.objects
        .filter((o) => matches(o.when, state))
        .map((o) => ({
          id: o.id,
          title: o.title,
          text: o.text[mode],
          observations: o.observations
            .filter((n) => matches(n.when, state))
            .map((n) => n.text[mode]),
          actions: won
            ? []
            : d.actions
                .filter((a) => a.object === o.id && matches(a.when, state))
                .map((a) => ({
                  id: a.id,
                  label: a.label,
                  input: a.input,
                  hints: a.hints.map((h) => h[mode]),
                })),
        })),
    };
  }
  const api = { LIMITS, validate, initial, transition, project };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PosternEscape = Object.freeze(api);
})(globalThis);
