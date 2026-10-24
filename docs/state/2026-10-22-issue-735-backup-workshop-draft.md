# Preserve unfinished workshop drafts in Cabinet backups (#735)

Branch: `fix/735-backup-workshop-draft`.
Original committed implementation: `add17886d2d6c83699c8613784aa2046cb1b868a`,
`fix: preserve workshop drafts in Cabinet backups (#735)`.
The review fixes below were later committed as `73fd7e0b` (`fix: keep backup restores
usable with workshop drafts (#735 review)`). The evidence under Verified was recorded
against the working tree before that commit; hosted `verify` covers the committed head.

## Changed

Root cause: `Store.export()` read only settings and preferences from metadata,
omitting the persisted `meta/workshop-draft`. Neither restore path transferred it.
Cabinet and combined exports both obtain their Cabinet section from this method.

Backups now optionally include `workshopDraft: { puzzle }`. The Cabinet
`schemaVersion` remains 1 and the combined envelope `schema` remains 1. Older
backups without the field still import. Older app code accepts the extra field
but ignores it during restore; it cannot recover the draft from a new backup.
No breaking schema/version change is required.

The shared backup validator calls the existing `validateSceneDraft` shape validator
inside both bounded worker import routes. It accepts unfinished, unsolvable edits
without applying publication/solution requirements and rejects malformed drafts.
Existing byte/time limits are unchanged.

Restore reads the local draft in its existing read/write transaction. A missing
local draft receives the incoming draft; an identical local draft is untouched.
A different local draft no longer refuses the entire restore (F1, HIGH). Both
Add missing and Replace preserve it and restore other data according to their
existing rules. An old backup leaves the local draft untouched. The atomic
pre-restore recovery backup retains the previous device data and local
`workshopDraft`, plus the incoming draft as `unappliedWorkshopDraft` when different.
The existing Recovery copy action downloads this JSON with both drafts available;
the extra field is retained recovery data, not an instruction to replace a draft.

Restore returns a note when it skips the incoming draft. The app presents it in
a completion dialog with Download recovery copy and Reload Alibi actions. Closing
or escaping also reloads, preventing the old in-memory Cabinet from remaining
active after dismissal. The merge snapshot conflict check still includes the
stored draft and refuses genuine changes after that snapshot.

Export now validates the stored draft (F2, MEDIUM). An invalid draft is omitted
and listed as `workshop-draft` in `damaged.meta`, leaving stored bytes untouched
and the backup importable. Add missing captures the raw draft separately for its
conflict snapshot when export has omitted it, avoiding a false concurrent-edit
refusal without putting damaged data back in the imported backup.

F3 (LOW, optional) is unchanged. `saveDraft()` has no pending-save handle to await
in `cabinetBackup()`; adding and coordinating one exceeds the trivial fix requested.

## Verified

- Original implementation evidence at `add17886`: `npm ci --no-audit --no-fund`
  exited 0 (136 packages); the initial 24-test selection had 6 failing-first
  regressions, and its final 35-test storage/validation/worker selection passed.
  Its recorded build was `0a3c754acb2c`. Those are historical results, not proof
  of the uncommitted review fixes.
- Failing-first F1/F2: `node --test tests/storage-restore.test.cjs tests/backup-route-race.test.cjs`:
  exit 1; 27 tests, 23 passed, 4 failed against the original implementation.
  Failures reproduce both different-draft restore paths, omitted completion
  feedback, and an invalid draft poisoning export.
- Three additional failing-first checks each exited 1 with one failing test: notice
  dismissal must reload; a damaged draft omitted by export must remain in the
  merge conflict snapshot; replacing the open restore dialog must not queue a
  close event that reloads before the notice can be read. Each passed after its
  corresponding correction.
- Focused storage/UI selection: the same two-file command exited 0;
  28 tests passed, 0 failed, cancelled, skipped or todo.
- After the final dialog-order correction, `node --test tests/backup-route-race.test.cjs`:
  exit 0; 18 tests passed, 0 failed, cancelled, skipped or todo.
- `npm run format:check`: exit 0; all matched files use Prettier code style.
- `npm run build`: exit 0; version 0.15.2, build `d210d7adaa29`, 570 puzzles,
  307 files. The emitted identity correctly reports source SHA
  `add17886d2d6c83699c8613784aa2046cb1b868a` with `sourceDirty: true`;
  this is a build of the uncommitted review fixes, not the committed tree alone.
  Generated output was produced only by the build, never hand-edited.
- `node --test tests/backup-validation.test.cjs tests/storage-restore.test.cjs tests/validator-worker.test.cjs tests/storage.test.cjs`:
  exit 0; 41 tests passed, 0 failed, cancelled, skipped or todo; includes
  `PASS 58 storage contract assertions`. Worker tests read the final emitted build.
- `git diff --check`: exit 0.

## NOT verified

Full `npm run verify`, real-origin IndexedDB atomicity/rollback/concurrency, browser controls/visuals,
physical-device acceptance, hosted deployment, and GitHub/CI were not run in this
bounded task. Storage tests use the existing fake-IDB fixture; compiled-worker
tests exercise the emitted worker in a Node VM. UI tests execute the actual restore
function in a Node VM. No new commit or publication is claimed.

## Residual risk

The optional F3 export/save timing concern remains. Recovery is a single latest-
restore slot, replaced on the next successful restore; download it first to retain
an independent copy. There is no silent draft overwrite. Older apps ignore the
optional draft even in a new backup.
No source IDs, puzzle revisions, database version, or app version change.
[HUMAN_TODO.md](../../HUMAN_TODO.md) remains unchanged; existing physical-device
and owner acceptance items remain open.

## Budget reconciliation (2026-10-24)

After merging main at `1574a7a5`, hosted `verify` failed both startup budgets: application
JavaScript measured 134,954 gzip bytes against 134,944 and the precache shell 1,416,338 against
1,415,864 (main measures 134,709 / 1,414,769). Collapsing the backup draft shape guard to
`!data.workshopDraft?.puzzle` (equivalent for every JSON value) brings JavaScript to 134,932,
under its unchanged ceiling, and the shell to 1,416,210. The remaining 346-byte shell excess is
the required export validation, restore conflict/recovery fields and completion notice; the shell
ceiling gains a measured +384 bytes (38 left, not feature room). Local after the change:
`tests/budget.test.cjs` 15/15, backup-validation and validator-worker 27/27.
