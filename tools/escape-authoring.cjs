'use strict';
const fs = require('node:fs');
const crypto = require('node:crypto');
const S = require('./escape-state.cjs');
const MAX_EDGES = S.LIMITS.states * S.LIMITS.actions;
function parse(source) {
  if (typeof source !== 'string') throw new TypeError('source: expected UTF-8 text');
  const sourceBytes = Buffer.byteLength(source, 'utf8');
  if (sourceBytes > S.LIMITS.bytes) throw new TypeError('source: exceeds 262144 bytes');
  let definition;
  try { definition = JSON.parse(source); } catch { throw new TypeError('source: invalid JSON'); }
  const report = S.validate(definition);
  return { definition, receipt: { ...report, sourceBytes,
    sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), scope: 'structure-only' } };
}
function read(file) {
  const fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NONBLOCK || 0));
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile()) throw new TypeError('source: expected regular file');
    if (stat.size > S.LIMITS.bytes) throw new TypeError('source: exceeds 262144 bytes');
    const buffer = Buffer.alloc(S.LIMITS.bytes + 1);
    let count = 0;
    while (count < buffer.length) {
      const n = fs.readSync(fd, buffer, count, buffer.length - count, null);
      if (!n) break; count += n;
    }
    if (count > S.LIMITS.bytes) throw new TypeError('source: exceeds 262144 bytes');
    let source;
    try { source = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(buffer.subarray(0, count)); }
    catch { throw new TypeError('source: invalid UTF-8'); }
    return parse(source);
  } finally { fs.closeSync(fd); }
}
function analyze(d, options = {}) {
  S.validate(d);
  if (!options || Object.getPrototypeOf(options) !== Object.prototype || Object.keys(options).some(k => !['maxStates','maxEdges'].includes(k)))
    throw new TypeError('options: expected only maxStates/maxEdges');
  const maxStates = Object.hasOwn(options, 'maxStates') ? options.maxStates : S.LIMITS.states;
  const maxEdges = Object.hasOwn(options, 'maxEdges') ? options.maxEdges : MAX_EDGES;
  for (const [key, value, bound] of [['maxStates', maxStates, S.LIMITS.states], ['maxEdges', maxEdges, MAX_EDGES]]) {
    if (!Number.isInteger(value) || value < 1 || value > bound) throw new TypeError(`options.${key}: out of bounds`);
  }
  const key = state => JSON.stringify(d.variables.map(v => state[v.id]));
  const isGoal = state => Object.keys(d.goal).every(k => state[k] === d.goal[k]);
  const start = S.initial(d), states = [start], index = new Map([[key(start), 0]]);
  const parents = [null], incoming = [[]], goals = [], used = new Set();
  let edges = 0;
  const incomplete = () => ({ status: 'inconclusive', scope: 'finite-model-only',
    reachableStates: states.length, edges, softlockCount: null, solution: null,
    softlockTrace: null, unreachableActions: null });
  for (let cursor = 0; cursor < states.length; cursor++) {
    const state = states[cursor];
    if (isGoal(state)) { goals.push(cursor); continue; }
    for (const action of d.actions) {
      const next = S.transition(d, state, action.id, action.answer);
      if (!next.ok && next.code !== 'unchanged') continue;
      if (edges >= maxEdges) return incomplete();
      edges++; used.add(action.id);
      const identity = key(next.state);
      let target = index.get(identity);
      if (target === undefined) {
        if (states.length >= maxStates) return incomplete();
        target = states.length; index.set(identity, target); states.push(next.state);
        parents.push({ from: cursor, action: action.id }); incoming.push([]);
      }
      incoming[target].push(cursor);
    }
  }
  const winning = new Set(goals), pending = [...goals];
  for (let i = 0; i < pending.length; i++) for (const previous of incoming[pending[i]]) {
    if (!winning.has(previous)) { winning.add(previous); pending.push(previous); }
  }
  function trace(target) {
    if (target === undefined) return null;
    const actions = [];
    while (parents[target]) { const p = parents[target]; actions.push(p.action); target = p.from; }
    return actions.reverse();
  }
  const firstTrap = states.findIndex((_, i) => !winning.has(i));
  return { status: firstTrap === -1 ? 'verified' : 'unsafe', scope: 'finite-model-only',
    reachableStates: states.length, edges, softlockCount: states.length - winning.size,
    solution: trace(goals[0]), softlockTrace: firstTrap < 0 ? null : trace(firstTrap),
    unreachableActions: d.actions.filter(a => !used.has(a.id)).map(a => a.id) };
}
module.exports = { parse, read, analyze };
if (require.main === module) {
  try {
    if (process.argv.length !== 3) throw new Error('Usage: node tools/escape-authoring.cjs <room.json>');
    const { definition, receipt } = read(process.argv[2]), model = analyze(definition);
    console.log(JSON.stringify({ ...receipt, model }, null, 2));
    process.exitCode = model.status === 'verified' ? 0 : model.status === 'unsafe' ? 2 : 3;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
