const plain = (value) => value && Object.getPrototypeOf(value) === Object.prototype;
const match = (mask, state) => [...mask].every((c, i) => c === '.' || c === state[i]);

// Compiled from the pinned room model. A trail contains at most 64 undo states and the current one.
export function validateEscape(state, contracts) {
  if (!Object.hasOwn(state, 'escapeRooms')) return;
  const fail = () => {
    throw Error('Unknown or invalid escape room progress. Original notebook preserved.');
  };
  if (!plain(state.escapeRooms)) fail();
  for (const [id, record] of Object.entries(state.escapeRooms)) {
    if (!Object.hasOwn(contracts, id) || !plain(record)) fail();
    const [revision, sha, sizes, goal, bitmap, rules] = contracts[id];
    const { trail, drafts, hints } = record;
    if (
      Object.keys(record).length !== 5 ||
      record.revision !== revision ||
      record.sha !== sha ||
      !Array.isArray(trail) ||
      trail.length < 1 ||
      trail.length > 65 ||
      Object.keys(trail).length !== trail.length ||
      !plain(drafts) ||
      !plain(hints)
    )
      fail();
    const reached = atob(bitmap);
    let prior;
    for (const snapshot of trail) {
      if (typeof snapshot !== 'string' || snapshot.length !== sizes.length) fail();
      let n = 0;
      for (let i = 0; i < sizes.length; i++) {
        const value = snapshot.charCodeAt(i) - 48;
        if (value < 0 || value >= sizes[i]) fail();
        n = n * sizes[i] + value;
      }
      // Entering the goal always keeps the preceding move in Undo.
      if (
        !(reached.charCodeAt(n >> 3) & (1 << (n & 7))) ||
        (prior === undefined && match(goal, snapshot))
      )
        fail();
      if (
        prior !== undefined &&
        (snapshot === prior ||
          match(goal, prior) ||
          !rules.some(
            (rule) =>
              rule &&
              match(rule[0], prior) &&
              [...rule[1]].every((c, i) => snapshot[i] === (c === '.' ? prior[i] : c)),
          ))
      )
        fail();
      prior = snapshot;
    }
    const action = (key) =>
      String(Number(key)) === key && Object.hasOwn(rules, key) ? rules[key] : null;
    for (const [key, text] of Object.entries(drafts))
      if (!action(key)?.[2] || typeof text !== 'string' || text.length > 64) fail();
    for (const [key, stage] of Object.entries(hints))
      if (!action(key) || !Number.isInteger(stage) || stage < 1 || stage > 3) fail();
  }
}
