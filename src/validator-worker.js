const sceneShape = (puzzle) => {
  const p = AlibiCore.clone(puzzle);
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
      throw Error('Each room must be a connected area. Join its painted squares before verifying.');
  }
  return p;
};
// Runs one solve and swaps the solver's generic budget refusal for the caller's honest message.
const bounded = (run, message) => {
  try {
    return run();
  } catch (error) {
    throw /budget/.test(error.message) ? Error(message) : error;
  }
};
self.onmessage = (e) => {
  try {
    let value;
    const m = e.data;
    const parse = (text) => {
      try {
        return JSON.parse(text);
      } catch {
        throw Error('That file is not valid JSON. The file and all device saves are unchanged.');
      }
    };
    if (m.type === 'castle-backup' || m.type === 'castle-restore') {
      if (typeof m.text !== 'string' || new TextEncoder().encode(m.text).length > 512 * 1024)
        throw Error('Castle backup exceeds the 512 KiB import limit.');
      if (m.type === 'castle-restore') {
        if (m.record !== undefined) AlibiCastleValidation.validateRecord(m.record);
        value = AlibiCastleValidation.prepareRestore(parse(m.text), m.current, m.replace);
      } else value = AlibiCastleValidation.validateBackup(parse(m.text));
    } else if (m.type === 'challenge-run' || m.type === 'challenge-restore') {
      if (typeof m.text !== 'string' || new TextEncoder().encode(m.text).length > 3 * 1024 * 1024)
        throw Error('Challenge save exceeds the 3 MiB import limit.');
      const registry = AlibiChallenges.create(ALIBI_CHALLENGE_DATA, {
        quiet: QWEngine,
        club: AlibiClubEngines,
      });
      value = registry.validateRun(parse(m.text));
      if (m.type === 'challenge-restore') {
        let existingValid = false;
        try {
          const record = m.record;
          if (record.schema === 1 && Number.isSafeInteger(record.revision) && record.revision > 0)
            existingValid = registry.validateRun(record.run).challengeId === value.challengeId;
        } catch {}
        value = { run: value, existingValid };
      }
    } else if (m.type === 'combined-backup') {
      if (typeof m.text !== 'string' || new TextEncoder().encode(m.text).length > 20 * 1024 * 1024)
        throw Error('Combined backup exceeds the 20 MB import limit.');
      const data = parse(m.text);
      const manifest = data?.manifest,
        supported = [
          ['cabinet', 'club'],
          ['cabinet', 'club', 'quiet'],
          ['cabinet', 'club', 'castle'],
          ['cabinet', 'club', 'quiet', 'castle'],
        ],
        sameSections = (keys) =>
          Array.isArray(manifest) &&
          manifest.length === keys.length &&
          keys.every((k) => manifest.includes(k));
      if (
        !data ||
        data.format !== 'alibi-all-saves' ||
        data.schema !== 1 ||
        !supported.some((keys) => sameSections(keys)) ||
        !data.sections ||
        Object.keys(data.sections).some((k) => !manifest.includes(k)) ||
        !manifest.every((k) => Object.hasOwn(data.sections, k)) ||
        (manifest.includes('quiet') && !data.sections.quiet) ||
        (!manifest.includes('quiet') &&
          (!Array.isArray(data.warnings) ||
            !data.warnings.some((warning) => /quiet wing/i.test(String(warning)))))
      )
        throw Error('Unknown combined backup. The file and all device saves are unchanged.');
      const validators = AlibiBackupValidation(AlibiCore, ALIBI_CATALOG, () => AlibiClubEngines, 4);
      const cabinet = validators.validateBackup(data.sections.cabinet);
      const club = validators.validateSave(data.sections.club);
      let quiet = data.sections.quiet;
      if (data.sections.quiet) {
        if (
          data.sections.quiet.kind !== 'alibi-quiet-wing-backup' ||
          data.sections.quiet.schema !== 1
        )
          throw Error('Unknown Quiet Wing backup. Nothing was restored.');
        quiet = { ...data.sections.quiet, state: QWStore.validate(data.sections.quiet.state) };
      }
      let castle = data.sections.castle;
      if (manifest.includes('castle'))
        castle = AlibiCastleValidation.validateBackup(data.sections.castle);
      value = {
        ...data,
        sections: {
          ...data.sections,
          cabinet,
          club,
          ...(data.sections.quiet ? { quiet } : {}),
          ...(manifest.includes('castle') ? { castle } : {}),
        },
      };
    } else if (m.type === 'cabinet-backup') {
      if (typeof m.text === 'string' && new TextEncoder().encode(m.text).length > 16 * 1024 * 1024)
        throw Error('Backup exceeds the 16 MB safety limit.');
      value = AlibiBackupValidation(AlibiCore, ALIBI_CATALOG).validateBackup(
        m.text ? parse(m.text) : m.value,
      );
    } else if (m.type === 'club-backup') {
      if (typeof m.text === 'string' && new TextEncoder().encode(m.text).length > 1 * 1024 * 1024)
        throw Error('Club backup exceeds the import limit.');
      value = AlibiBackupValidation(AlibiCore, null, () => AlibiClubEngines, 4).validateSave(
        m.text ? parse(m.text) : m.value,
      );
    } else if (m.type === 'quiet-state') {
      value = QWStore.validate(m.value);
    } else if (m.type === 'quiet-import') {
      // Byte-accurate 1 MiB cap; keep the cap and message in sync with reviewImport.
      if (typeof m.text !== 'string' || new TextEncoder().encode(m.text).length > 1 * 1024 * 1024)
        throw Error('Quiet Wing import exceeds the 1 MiB import limit.');
      const data = parse(m.text);
      if (data.kind === 'alibi-realm')
        value = { isRealm: true, next: QWEngine.validateScene(data) };
      else if (data.kind === 'alibi-quiet-wing-backup' && data.schema === 1)
        value = { isRealm: false, next: QWStore.validate(data.state) };
      else throw Error('This is not an Alibi Quiet Wing backup or realm.');
    } else if (m.type === 'scene-draft-import') {
      if (typeof m.text !== 'string' || new TextEncoder().encode(m.text).length > 256 * 1024)
        throw Error('Draft file exceeds the 256 KiB import limit.');
      const data = parse(m.text);
      if (data?.format !== 'alibi-scene-draft' || data.schema !== 1)
        throw Error('This is not an Alibi Scene Maker draft. Your current draft is unchanged.');
      // Shape only: an unsolvable draft is fine. A file never supplies the answer, so the author
      // solution is a placeholder (person i on square i) until the draft is verified.
      try {
        const people = Array.isArray(data.draft?.people) ? data.draft.people : [];
        value = AlibiCore.validateSceneDraft({
          ...data.draft,
          solution: Object.fromEntries(people.map((x, i) => [x?.id, i])),
        });
      } catch {
        throw Error('This Scene Maker draft file is damaged. Your current draft is unchanged.');
      }
    } else if (m.type === 'pack') value = AlibiCore.validatePack(m.pack, true);
    else if (m.type === 'generate') value = AlibiCore.createSceneDraft(m.options);
    else if (m.type === 'draft') {
      const p = sceneShape(m.puzzle);
      const result = AlibiCore.solveDefinition(p, 2, 250000);
      value = {
        solutions: result.solutions.map((solution) => {
          const checked = AlibiCore.validateSceneDraft({ ...p, solution });
          if (!AlibiCore.sceneComplete(checked, { placements: checked.solution }))
            throw Error('The draft check returned an invalid arrangement.');
          if (result.solutions.length === 1) AlibiCore.validateDefinition(checked);
          return checked.solution;
        }),
      };
      if (!result.solutions.length) {
        // One aggregate ceiling covers verification and diagnosis. Exhaustion throws the solver's
        // budget refusal, so no partial conflict or suggestion is ever reported.
        let left = 250000 - result.nodes,
          core = p.clues.map((_, i) => i);
        const fits = (keep) =>
          bounded(() => {
            const r = AlibiCore.solveDefinition(
              { ...p, clues: keep.map((j) => p.clues[j]) },
              1,
              left,
            );
            left -= r.nodes;
            return r.solutions.length > 0;
          }, 'No arrangement fits, and the conflicting clues could not be identified within the search limit.');
        const layoutFits = fits([]);
        if (layoutFits)
          for (const i of core.slice()) {
            const rest = core.filter((j) => j !== i);
            if (!fits(rest)) core = rest;
          }
        value.diagnosis = layoutFits ? { kind: 'clues', clues: core } : { kind: 'layout' };
      }
    } else if (m.type === 'audit') {
      // One 250,000-node ceiling covers the uniqueness proof and every clue-removal solve.
      const p = sceneShape(m.puzzle);
      let left = 250000;
      const count = (clues) =>
        bounded(() => {
          const r = AlibiCore.solveDefinition({ ...p, clues }, 2, left);
          left -= r.nodes;
          return r.solutions.length;
        }, 'The audit reached its search limit before checking every clue. No clue was marked.');
      if (count(p.clues) !== 1)
        throw Error('Verify the draft first; the audit needs exactly one solution.');
      value = {
        redundant: p.clues.flatMap((_, i) =>
          count(p.clues.filter((_, j) => j !== i)) === 1 ? [i] : [],
        ),
      };
    } else throw Error('Unsupported validation request.');
    self.postMessage({ ok: true, value });
  } catch (error) {
    self.postMessage({ ok: false, error: error.message });
  }
};
