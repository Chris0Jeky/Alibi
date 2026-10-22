# Preserve unfinished workshop drafts in Cabinet backups (#735)

Branch: `fix/735-backup-workshop-draft`.

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
A different local draft refuses the entire restore before any writes, in both
Add missing and Replace paths, with an export/resolve message. An old backup
leaves the current draft untouched. The pre-restore recovery copy includes any
existing draft, and the merge snapshot conflict check now includes the draft.

## Verified

- `npm ci --no-audit --no-fund`: exit 0; 136 packages added (run once).
- Failing-first: `node --test tests/storage-restore.test.cjs tests/backup-validation.test.cjs`:
  exit 1; 24 tests, 18 passed, 6 failed before production changes. Failures cover
  the missing round-trip draft, missing recovery field, absent conflict/snapshot
  guards, and validation passing through the unvalidated draft.
- `npm run format:check`: exit 0; all matched files use Prettier code style.
- `npm run build`: exit 0; version 0.15.2, build `0a3c754acb2c`, 570 puzzles,
  307 files. Generated output was produced only by the build, never hand-edited.
- `node --test tests/storage-restore.test.cjs tests/backup-validation.test.cjs tests/validator-worker.test.cjs`:
  exit 0; 35 tests, 35 passed, 0 failed, cancelled, skipped or todo. Includes both
  compiled-worker import routes, legacy backups, round-trip preservation,
  malformed-input rejection, recovery, same-profile retention, different-draft
  refusal, and a concurrent draft change after the merge snapshot.
- `git diff --check`: exit 0.

## NOT verified

Full `npm run verify`, real-origin IndexedDB rollback/concurrency, browser controls,
physical-device acceptance, hosted deployment, and GitHub/CI were not run in this
bounded task. Storage tests use the existing fake-IDB fixture; compiled-worker
tests exercise the emitted worker in a Node VM. The driver owns committing and
the full verification run.

## Residual risk

Different drafts intentionally block restoration until resolved; there is no
silent overwrite. Older apps ignore the optional draft even in a new backup.
No source IDs, puzzle revisions, database version, or app version change.
[HUMAN_TODO.md](../../HUMAN_TODO.md) remains unchanged; existing physical-device
and owner acceptance items remain open.

Intended commit: `Preserve workshop drafts in Cabinet backups`.
