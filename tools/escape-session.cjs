'use strict';
(function (root) {
  const S = typeof module === 'object' && module.exports
    ? require('./escape-state.cjs') : root.PosternEscape;
  function createRoomSession(source) {
    S.validate(source);
    const definition = structuredClone(source);
    let state = S.initial(definition);
    const history = [];
    return Object.freeze({
      view(storyOn) { return S.project(definition, state, storyOn); },
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
      undoDepth() { return history.length; },
      restart() { state = S.initial(definition); history.length = 0; },
    });
  }
  const api = { createRoomSession };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PosternEscapeSession = Object.freeze(api);
})(globalThis);
