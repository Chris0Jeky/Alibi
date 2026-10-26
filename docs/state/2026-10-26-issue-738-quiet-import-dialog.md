# Issue #738: Quiet Wing import owns its dialog dismissal

Based on integrated local commit `c9c8436`. Changes only Quiet Wing's import confirmation
handler and its focused regression fixture. No schema, dependency, save-format or budget
threshold change; no production startup application source change.

## Review of remaining findings

- Item 1 is a protected-load/usability case, not acceptance of malformed `runs: []` as usable
  Club state. Both main's and the integrated base's loader call strict `validateSave`; that
  validator rejects arrays. A found stored save that fails validation is left untouched and
  loads a temporary protected session. The optional load-only normalization proposal remains
  unimplemented; no malformed-data compatibility policy was changed here.
- Item 3 remains: Add missing constructs a full merged backup and Cabinet restore revises all
  rows, including unchanged rows. A stale tab therefore fails closed with a save conflict.
  Preserving unchanged rows requires a separate expected-snapshot/revision policy review;
  this slice leaves the new revision fences intact.
- Item 5 is confirmed: all review dialogs reuse `#modal`, so an earlier import completing
  after another review opened could close that newer review. Dismissal now checks that the
  current `#confirm-import` element is the confirmation belonging to the completing handler.
  Its committed state/history update and normal owned-dialog dismissal remain intact.
- Item 4's realm-history failure and button retry coverage are already repaired in the base:
  history is pushed only after `S.replace` succeeds, and the existing contract tests assert
  history/redo preservation and button re-enablement on rejection. The issue's malformed
  draft recovery comment is also handled by the existing export/restore validation work.

## Evidence

- Authoritative issue body and its comment were read through GitHub during this review.
- Regression first, executing the real `reviewImport` source: both full-wing and realm
  late-completion cases failed (`close` called once instead of zero). Both ordinary owned
  dialog cases already passed. After the one-line guard, **4/4 passed**.
- `node --test tests/quiet-import-dialog.test.cjs tests/club-save-validation.test.cjs`:
  **12 passed**, zero failures/skips, Node 24.22.1.
- `node tests/quiet-wing/contracts.cjs`: **123 assertions passed**, including realm rejection,
  retry enablement and restore-once behavior. These are simulated handler/storage fixtures.
- Changed-file Prettier check and `git diff --check`: passed.
- Isolated Quiet Wing app transformed with the build's esbuild options (`minify: true`,
  `target: es2022`): 84,386 -> 84,412 minified bytes (+26); 30,443 -> 30,450 gzip (+7).
  Source is +38 bytes. These are isolated app figures, not complete delivery-budget proof.

NOT verified: complete integrated build/budget, actual browser/modal scheduling, native
clipboard, real IndexedDB durability, physical phone or TalkBack. Exact-head hosted/full
qualification and independent review of this authored guard remain required. The normal
application code sources are untouched, but generated configuration/hash effects must still
be measured in integration. [HUMAN_TODO.md](../../HUMAN_TODO.md) remains authoritative for
owner/physical-device acceptance. No issue closure or human acceptance is claimed here.
