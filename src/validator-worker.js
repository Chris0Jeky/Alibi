self.onmessage = (e) => {
  try {
    let value;
    const m = e.data;
    if (m.type === 'pack') value = AlibiCore.validatePack(m.pack, true);
    else if (m.type === 'generate') value = AlibiCore.createSceneDraft(m.options);
    else if (m.type === 'draft') {
      const p = AlibiCore.clone(m.puzzle);
      if (
        p.type !== 'scene' ||
        p.size !== 5 ||
        !Array.isArray(p.people) ||
        p.people.length !== 5 ||
        !Array.isArray(p.clues) ||
        p.clues.length > 40 ||
        !Array.isArray(p.rooms) ||
        p.rooms.length !== 25 ||
        !Array.isArray(p.objects) ||
        p.objects.length > 12
      )
        throw Error('Invalid edited scene dimensions.');
      for (const room of new Set(p.rooms)) {
        const cells = p.rooms.map((v, i) => (v === room ? i : -1)).filter((i) => i >= 0),
          seen = new Set([cells[0]]),
          q = [cells[0]];
        while (q.length)
          for (const j of AlibiCore.extras.adj(q.pop(), 5))
            if (p.rooms[j] === room && !seen.has(j)) {
              seen.add(j);
              q.push(j);
            }
        if (seen.size !== cells.length)
          throw Error(
            'Each room must be a connected area. Join its painted squares before verifying.',
          );
      }
      const result = AlibiCore.solve(p, null, 2, 250000);
      if (result.solutions.length === 0)
        throw Error('No solution fits this draft. Revisit the room layout, furniture or clues.');
      if (result.solutions.length > 1)
        throw Error('More than one solution fits. Add another clue or restrict the layout.');
      p.solution = result.solutions[0];
      value = AlibiCore.validateDefinition(p);
    } else throw Error('Unsupported validation request.');
    self.postMessage({ ok: true, value });
  } catch (error) {
    self.postMessage({ ok: false, error: error.message });
  }
};
