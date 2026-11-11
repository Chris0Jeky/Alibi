'use strict';
(function (root) {
  const S =
    typeof module === 'object' && module.exports
      ? require('./escape-state.cjs')
      : root.PosternEscape;
  function createRoomSession(source) {
    S.validate(source);
    const definition = structuredClone(source);
    let state = S.initial(definition);
    const history = [];
    const encode = (state) =>
      definition.variables.map((v) => v.values.indexOf(state[v.id])).join('');
    return Object.freeze({
      view(storyOn) {
        return S.project(definition, state, storyOn);
      },
      attempt(id, input) {
        const result = S.transition(definition, state, id, input);
        if (result.ok) {
          if (history.length === 64) history.shift();
          history.push(state);
          state = result.state;
        }
        return { ...result, state: { ...result.state } };
      },
      undo() {
        if (!history.length) return false;
        state = history.pop();
        return true;
      },
      undoDepth() {
        return history.length;
      },
      state() {
        return { ...state };
      },
      snapshot() {
        return [...history, state].map(encode);
      },
      // The Castle backup worker checks reachability and every undo transition first.
      restore(trail) {
        const states = trail.map((key) =>
          Object.fromEntries(definition.variables.map((v, i) => [v.id, v.values[key[i]]])),
        );
        state = states.pop();
        history.splice(0, history.length, ...states);
      },
      restart() {
        state = S.initial(definition);
        history.length = 0;
      },
    });
  }
  const api = { createRoomSession };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PosternEscapeSession = Object.freeze(api);
})(globalThis);
