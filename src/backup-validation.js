/* Pure save validation shared by the UI and the bounded import worker. */
(function (G) {
  G.AlibiBackupValidation = function (C, starter, E, storyCount) {
    const keyFor = (p) => p.id + '@' + p.revision,
      clone = C.clone;
    function validSettings(s) {
      const out = {};
      for (const k of [
        'timer',
        'sound',
        'haptics',
        'reducedMotion',
        'contrast',
        'largeText',
        'autoCross',
      ])
        if (typeof s?.[k] === 'boolean') out[k] = s[k];
      if (['light', 'night', 'system'].includes(s?.theme)) out.theme = s.theme;
      return out;
    }
    function validateRun(r) {
      if (
        !r ||
        r.schemaVersion !== 1 ||
        typeof r.key !== 'string' ||
        r.key.length > 110 ||
        !Number.isInteger(r.rev) ||
        r.rev < 0
      )
        throw Error('Unsupported saved-game format.');
      const p = C.validateDefinition(r.puzzle);
      if (r.key !== keyFor(p)) throw Error('The save does not match its puzzle revision.');
      C.validateState(p, r.state);
      if (
        !Number.isInteger(r.moves) ||
        r.moves < 0 ||
        !Number.isInteger(r.hints) ||
        r.hints < 0 ||
        !Number.isFinite(r.elapsed) ||
        r.elapsed < 0 ||
        r.elapsed > 1e10 ||
        typeof r.note !== 'string' ||
        r.note.length > 5000 ||
        !Array.isArray(r.undo) ||
        r.undo.length > 100 ||
        !Array.isArray(r.redo) ||
        r.redo.length > 100
      )
        throw Error('Invalid save counters or history.');
      for (const s of [...r.undo, ...r.redo]) C.validateState(p, s);
      for (const k of ['updatedAt', 'completedAt', 'firstCompletedAt'])
        if (
          r[k] !== undefined &&
          r[k] !== null &&
          (typeof r[k] !== 'string' || r[k].length > 40 || !Number.isFinite(Date.parse(r[k])))
        )
          throw Error('Invalid save date.');
      if (typeof r.updatedAt !== 'string') throw Error('Missing save date.');
      return r;
    }
    function validateBackup(data) {
      if (
        !data ||
        data.format !== 'alibi-backup' ||
        data.schemaVersion !== 1 ||
        !Array.isArray(data.runs) ||
        data.runs.length > 3000 ||
        !Array.isArray(data.packs) ||
        data.packs.length > 100
      )
        throw Error('Unsupported backup format. Nothing was changed.');
      const runs = data.runs.map((r) => validateRun(C.clone(r))),
        custom = data.packs.map((p) => C.validatePack(p, false));
      if (
        new Set(runs.map((r) => r.key)).size !== runs.length ||
        new Set(custom.map((p) => p.id)).size !== custom.length
      )
        throw Error('Duplicate records in this backup.');
      const ids = [
        ...starter.puzzles.map((p) => p.id),
        ...custom.flatMap((p) => p.puzzles.map((p) => p.id)),
      ];
      if (new Set(ids).size !== ids.length)
        throw Error('A custom pack collides with the starter catalogue.');
      const preferences = { seen: [], favorites: [] };
      if (data.preferences) {
        if (Array.isArray(data.preferences.seen))
          preferences.seen = data.preferences.seen.filter((t) => C.TYPES.includes(t));
        if (Array.isArray(data.preferences.favorites))
          preferences.favorites = data.preferences.favorites
            .filter((x) => typeof x === 'string' && x.length < 90)
            .slice(0, 3000);
      }
      return { ...data, runs, packs: custom, settings: validSettings(data.settings), preferences };
    }
    function validateSave(v) {
      if (
        !v ||
        v.schema !== 1 ||
        !v.settings ||
        !v.runs ||
        !Array.isArray(v.records) ||
        v.records.length > 120 ||
        JSON.stringify(v).length > 400000
      )
        throw Error('This is not a supported Club save.');
      if (
        !['off', 'candidates', 'tidy'].includes(v.settings.assist) ||
        typeof v.settings.zen !== 'boolean' ||
        !(
          v.settings.pinned === null ||
          (Number.isInteger(v.settings.pinned) &&
            v.settings.pinned >= 0 &&
            v.settings.pinned < storyCount)
        ) ||
        !Number.isInteger(v.visit) ||
        !Number.isInteger(v.lastHero)
      )
        throw Error('Invalid Club preferences.');
      for (const [key, r] of Object.entries(v.runs)) {
        if (
          ![
            'duel',
            'borough',
            'archive',
            'tictactoe',
            'blockcabinet',
            'regiongardens',
            'dominoes',
          ].includes(key) ||
          !r ||
          (r.rulesVersion !== undefined && r.rulesVersion !== 1) ||
          !Array.isArray(r.log) ||
          r.log.length > 3000 ||
          !Array.isArray(r.redo) ||
          r.redo.length > 3000
        )
          throw Error('Invalid game history.');
        if (key === 'duel') {
          if (!['bot', 'local'].includes(r.mode)) throw Error('Invalid match type.');
          let s = E().reversi.initial();
          for (const i of [...r.log, ...r.redo.slice().reverse()]) s = E().reversi.move(s, i);
        }
        if (key === 'tictactoe') {
          if (!['bot', 'local'].includes(r.mode)) throw Error('Invalid match type.');
          E().tictactoe.replay([...r.log, ...r.redo.slice().reverse()]);
        }
        if (key === 'borough') E().borough.replay(r.seed, [...r.log, ...r.redo.slice().reverse()]);
        if (key === 'archive') {
          let s = E().warehouse.initial(r.level);
          for (const d of [...r.log, ...r.redo.slice().reverse()]) {
            const next = E().warehouse.move(s, d);
            if (next === s) throw Error('Invalid archive history.');
            s = next;
          }
        }
        if (key === 'regiongardens')
          E().regionGardens.replay(r.level, [...r.log, ...r.redo.slice().reverse()]);
        if (key === 'blockcabinet') {
          if (typeof r.seed !== 'string' || !/^[A-Za-z0-9_-]{1,32}$/.test(r.seed))
            throw Error('Invalid Block Cabinet seed.');
          E().blockCabinet.replay(r.seed, [...r.log, ...r.redo.slice().reverse()]);
        }
        if (key === 'dominoes') {
          if (typeof r.seed !== 'string' || !/^[A-Za-z0-9_-]{1,32}$/.test(r.seed))
            throw Error('Invalid domino seed.');
          E().dominoes.replay(r.seed, [...r.log, ...r.redo.slice().reverse()]);
        }
      }
      for (const r of v.records)
        if (
          !r ||
          typeof r.id !== 'string' ||
          r.id.length > 100 ||
          ![
            'duel',
            'borough',
            'archive',
            'tictactoe',
            'blockcabinet',
            'regiongardens',
            'dominoes',
          ].includes(r.type) ||
          typeof r.label !== 'string' ||
          r.label.length > 100 ||
          !Number.isFinite(r.score) ||
          typeof r.date !== 'string' ||
          r.date.length > 40
        )
          throw Error('Invalid record.');
      if (
        v.settings.api !== undefined &&
        (typeof v.settings.api !== 'string' || v.settings.api.length > 2048)
      )
        throw Error('Invalid API setting.');
      if (!Array.isArray(v.stamps) || v.stamps.length > 100 || v.stamps.some((x) => x !== 'zen'))
        throw Error('Invalid stamp book.');
      return clone(v);
    }
    return { validSettings, validateRun, validateBackup, validateSave };
  };
})(globalThis);
