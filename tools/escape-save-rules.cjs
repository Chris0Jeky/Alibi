'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { read } = require('./escape-authoring.cjs');
const S = require('./escape-state.cjs');

module.exports = function saveRules(root) {
  const dir = path.join(root, 'content/escape-rooms');
  const pins = JSON.parse(fs.readFileSync(path.join(dir, '../escape-room-pins.json'), 'utf8'));
  return Object.fromEntries(
    Object.entries(pins).map(([id, sha]) => {
      const { definition: d, receipt } = read(path.join(dir, id + '.json'));
      if (d.id !== id || receipt.sourceSha256 !== sha)
        throw Error(`Pinned escape source changed: ${id}`);
      const sizes = d.variables.map((v) => v.values.length);
      const encode = (state) =>
        d.variables
          .map((v) => (Object.hasOwn(state, v.id) ? v.values.indexOf(state[v.id]) : '.'))
          .join('');
      const index = (state) =>
        [...encode(state)].reduce((n, value, i) => n * sizes[i] + Number(value), 0);
      const initial = S.initial(d);
      const states = new Map([[index(initial), initial]]);
      for (const state of states.values())
        for (const a of d.actions) {
          const next = S.transition(d, state, a.id, a.answer);
          if (next.ok && !states.has(index(next.state))) states.set(index(next.state), next.state);
        }
      const bitmap = Buffer.alloc(Math.ceil((Math.max(...states.keys()) + 1) / 8));
      for (const n of states.keys()) bitmap[n >> 3] |= 1 << (n & 7);
      const rules = d.actions.map((a) => {
        const guards = [d.objects.find((o) => o.id === a.object).when, a.when, a.check];
        const required = Object.assign({}, ...guards);
        return guards.every((g) => Object.keys(g).every((k) => g[k] === required[k]))
          ? [encode(required), encode(a.set), Number(a.input)]
          : null;
      });
      return [id, [d.revision, sha, sizes, encode(d.goal), bitmap.toString('base64'), rules]];
    }),
  );
};
