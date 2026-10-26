# Issue #738 items 1 and 3: protected Club salvage and Add-missing revisions

## Changed

Item 1 has a narrow load-only compatibility path. When an already stored Club save has `runs` as
an array of length zero with no own enumerable keys, startup shallow-copies the save, replaces only
that empty array with `{}`, and runs the existing strict `validateSave` on the complete copy. The
strict validator and import paths are unchanged: a Club backup that contains `runs: []` is still
rejected. Arrays with named enumerable properties and saves with any other invalid field stay
protected and are not normalized.

After a successful salvage, valid journal records and other validated fields are shown from the
copy in a protected temporary session. The stored IndexedDB row or local-storage bytes are left
untouched, writes are disabled, and the player-facing warning says the records are read-only and
can be exported to restore in another browser. The normalized state remains a valid Club export;
unknown top-level fields, including an optional validated `boroughBests` table when present in an
integrated source, are carried through the shallow copy.

Item 3 now preserves run revisions only for Add missing. The application passes the atomic expected
snapshot to `Store.restore` on that path; Replace calls it without an expected snapshot. Inside the
existing read-write transaction, Store preserves a revision only when the same-key current and
restored rows both validate and `AlibiCore.equal` says their complete content is identical. New or
changed rows still receive a revision above the existing device high-water floor. The full expected
snapshot comparison, recovery write, run replacement, floor update, and transaction atomicity stay
in place. Replace continues to bump revisions and invalidate old writers.

## Evidence

Both behavior regressions were added before runtime changes and failed against the base:

- The Club test began with a stored `runs: []` save containing a valid Borough record. Startup
  entered protected session mode, preserved the original local-storage bytes, but loaded an empty
  journal instead of the saved record.
- The Add-missing test began with Sudoku 01 at revision 7 and merged a new Sudoku 02 run. Store
  changed the unchanged Sudoku 01 row to revision 8, and the existing revision check rejected a
  stale tab's write to that otherwise unchanged row with `ConflictError`.

After the fixes:

- `node tests/club-save-validation.test.cjs`: 12/12 pass, including local-storage and IndexedDB
  salvage, no writes, valid export, preserved optional `boroughBests`, named-array-property refusal,
  malformed-field refusal, and unchanged strict backup validation.
- `node tests/storage-restore.test.cjs`: 31/31 pass. Add missing preserves the existing revision,
  successfully accepts a write from a tab holding that unchanged row, and bumps only the added row
  above an origin floor of 20 to revision 21. The floor stays 21 after that existing row is saved.
  Existing stale-snapshot refusal, Replace invalidation, recovery-copy, high-water reuse, and
  overflow regressions pass.
- `node --test tests/backup-validation.test.cjs tests/club-fresh-seed.test.cjs
  tests/storage-revision.test.cjs`: all three suites pass.
- Prettier checks for the four changed source/test files and `git diff --check` pass.

The Add-missing-only boundary was checked in `src/app.js`: `expected` is set from the current export
inside `if (!replace)`; Replace leaves it undefined. No app call mode or validation acceptance was
changed.

## Integration with the personal-best follow-up

This slice is composed after #765. Both startup additions are retained: protected salvage disables
writes before the existing Borough best-table migration runs on the validated in-memory copy.
The two salvage fixtures now carry a genuinely better saved result (13 versus the journal's 12)
so they verify preservation without contradicting the already-reviewed equal-score/date tie rule.
Original stored bytes and strict-validation assertions remain unchanged.

The existing real-control Cabinet backup fixture now checks the complete unchanged row and its
revision after Add missing, the added row's revision above the current device rows, and continued
revision invalidation after Replace. It adds assertions to the existing flow without retries or
extra waits. These browser assertions require hosted execution before merge.

Independent integration review also reproduced a related existing loader defect: a valid IndexedDB
save with `runs: {}` and a Duel journal record carrying a difficulty tried to validate that difficulty
before loading the game engine. It incorrectly fell into a protected empty session, including when
reloading an otherwise valid normalized recovery export. Startup now loads the engine when a Duel
record needs it. A real-source VM regression deletes the VM-global engine binding, tracks the actual
script loader, and was red before this guard; it checks healthy IndexedDB mode and retained records.
Unrelated record-only saves retain their existing engine-loading behavior.

## Measured build allowance

Clean runtime commit `aeadd7b746d263f15973952d5314c450443f80bf` built successfully as
`fa3f23424b5a` (`sourceDirty: false`): 135,755 application gzip bytes, 204,855 initial gzip bytes,
and 1,419,648 shell bytes. The 83 composed Club/backup/restore/revision regressions pass. The
unchanged budget suite failed only its application and shell ceilings, by 75 and 615.68 bytes.

This separate budget-and-evidence change adds 128 application gzip bytes and 704 shell bytes to
those ceilings, making them 135,808 and 1,419,736.32 respectively. It leaves 53 and 88.32 bytes
for source-identity/hash noise. The initial 220 KiB ceiling and all content/offline limits stay
unchanged. The final integrated full suite and hosted browser assertions remain merge gates.

## Not verified and residual risk

- The IndexedDB tests use a structured-clone fake, not a real browser database. Full `npm run
  verify`, the browser/IndexedDB workflow, hosted CI, and a full web build were not run in this
  slice; root owns integrated build/budget and final qualification.
- The malformed empty run list does not contain any run state to restore. This path surfaces only
  other strictly validated Club data in a protected session. The existing restore action requires
  healthy IndexedDB storage, so the protected tab cannot overwrite its own malformed original.
  The player can export a valid Club save and restore it in another healthy browser installation.
  This fix does not add an in-place destructive repair or remove the original malformed bytes.
- No physical device or human acceptance is claimed. `HUMAN_TODO.md` q-2 remains open for physical
  Android acceptance, and q-4 retains physical Quiet Wing checks. q-11 is the completed grouping
  for that later one-session plan; it does not close q-2/q-4 physical checks.
