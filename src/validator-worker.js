self.onmessage = (e) => {
  try {
    let value;
    const m = e.data;
    if (m.type === 'challenge-run') {
      if (typeof m.text !== 'string' || m.text.length > 3 * 1024 * 1024)
        throw Error('Challenge save exceeds the import limit.');
      value = AlibiChallenges.create(ALIBI_CHALLENGE_DATA, {
        quiet: QWEngine,
        club: AlibiClubEngines,
      }).validateRun(JSON.parse(m.text));
    } else if (m.type === 'combined-backup') {
      const data = JSON.parse(m.text);
      const manifest = data?.manifest,
        fullManifest = ['cabinet', 'club', 'quiet'],
        coreManifest = ['cabinet', 'club'];
      if (
        !data ||
        data.format !== 'alibi-all-saves' ||
        data.schema !== 1 ||
        (JSON.stringify(manifest) !== JSON.stringify(fullManifest) &&
          JSON.stringify(manifest) !== JSON.stringify(coreManifest)) ||
        !data.sections ||
        Object.keys(data.sections).some((k) => !manifest.includes(k)) ||
        !manifest.every((k) => Object.hasOwn(data.sections, k)) ||
        (manifest.length === 3 && !data.sections.quiet) ||
        (manifest.length === 2 &&
          (!Array.isArray(data.warnings) ||
            !data.warnings.some((warning) => /quiet wing/i.test(String(warning)))))
      )
        throw Error('Unknown combined backup. The file and all device saves are unchanged.');
      const validators = AlibiBackupValidation(AlibiCore, ALIBI_CATALOG, () => AlibiClubEngines, 4);
      validators.validateBackup(data.sections.cabinet);
      validators.validateSave(data.sections.club);
      if (data.sections.quiet) {
        if (
          data.sections.quiet.kind !== 'alibi-quiet-wing-backup' ||
          data.sections.quiet.schema !== 1
        )
          throw Error('Unknown Quiet Wing backup. Nothing was restored.');
        QWStore.validate(data.sections.quiet.state);
      }
      value = data;
    } else if (m.type === 'cabinet-backup') {
      value = AlibiBackupValidation(AlibiCore, ALIBI_CATALOG).validateBackup(
        m.text ? JSON.parse(m.text) : m.value,
      );
    } else if (m.type === 'club-backup') {
      value = AlibiBackupValidation(AlibiCore, null, () => AlibiClubEngines, 4).validateSave(
        m.text ? JSON.parse(m.text) : m.value,
      );
    } else if (m.type === 'quiet-state') {
      value = QWStore.validate(m.value);
    } else if (m.type === 'quiet-import') {
      const data = JSON.parse(m.text);
      if (data.kind === 'alibi-realm')
        value = { isRealm: true, next: QWEngine.validateScene(data) };
      else if (data.kind === 'alibi-quiet-wing-backup' && data.schema === 1)
        value = { isRealm: false, next: QWStore.validate(data.state) };
      else throw Error('This is not an Alibi Quiet Wing backup or realm.');
    } else if (m.type === 'pack') value = AlibiCore.validatePack(m.pack, true);
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
