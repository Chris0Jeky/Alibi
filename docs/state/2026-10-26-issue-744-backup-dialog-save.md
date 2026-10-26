# Issue #744: backup completion notice and pending workshop save

Scope: `src/app.js` follow-ups 3 and 4, against main `7a7640ddaf23d4f49f253cda5d9a47a2a2914b7a`
(local baseline `2ed30b6`). Storage revision/high-water and original-backup completion-note
copy are separate coordinator changes. No storage schema, dependencies or budget limits changed.

## Changed and why

- A completion notice's `onclose` callback now reloads only while the dialog is closed. A
  queued close event from an earlier dialog cannot reload a reopened notice; the callback
  remains available for its actual dismissal. Existing focus restoration already uses the
  same open-state guard. The immediate reload path without a completion note is unchanged.
- Retain the latest workshop `store.put` promise independently of the existing toast/error
  ownership catch. Cabinet export awaits it, refusing a pending/settled failure rather than
  silently exporting an older stored draft. A later successful edit permits another export.
  Export never retries a draft write, so it cannot overwrite another tab's newer draft.

The successful-write scenario is already ordered: `saveDraft` calls `store.put` synchronously;
the IndexedDB `meta` readwrite transaction is created before the export's later `meta`
readonly transactions. [IndexedDB 3.0 §2.7.2](https://www.w3.org/TR/IndexedDB/#transaction-scheduling)
requires the later overlapping reader to wait for that writer to finish. This is source/spec
analysis, not a local real-browser timing result. The confirmed failure is a rejected save
being swallowed before a seemingly successful export. Existing error messages and the
workshop's edit/export recovery controls are retained; export does not conceal that failure.

## Verified

- Regression first: 18 existing route/restore tests passed; three new regressions failed
  for stale-close reload, silently accepted settled draft failure, and silently accepted
  pending draft failure. All 21 then passed after the fix.
- Final focused command: `node --test tests/app-cabinet-export.test.cjs
  tests/workshop-ownership.test.cjs tests/backup-route-race.test.cjs
  tests/app-backup-import.test.mjs tests/storage-restore.test.cjs tests/storage.test.cjs`:
  **101 passed**, zero failures/skips, Node 24.22.1. Uses the real app helpers in VM fixtures,
  including the permanent dialog-close handler. Adjacent fixtures declare the added state.
- Prettier checks over all changed JavaScript/tests and `git diff --check`: passed.
- Controlled web build: `node tools/build.cjs` passed after explicitly removing generated
  output. Build `3354e48c882d`, baseline SHA with `sourceDirty: true`; this is a working-tree
  measurement, not an exact committed-source release qualification. Earlier attempts refused
  an existing generated identity; their exact cause was not established and they are not
  successful builds.

## Budget gate and limits

Measured application gzip: **135,075 bytes**, +22 against the coordinator's main measurement
135,053. The unchanged gate requires `< 135,072`, so **the application gzip budget fails**
(by 3 bytes at the ceiling, requiring at least 4 bytes reduction for a strict pass).
`node --test tests/budget.test.cjs` reports the application gzip subtest and parent as failed;
13 other tests pass. Initial code/content gzip is 203,973; boot gzip remains 4,977. No threshold
was changed here. Integration must resolve and remeasure this explicit gate before merge.
Build and budget logs are retained under the session's `evidence/backup-*.log`.

NOT verified: full repository/Android qualification, actual browser event scheduling,
real IndexedDB durability/cross-tab timing, or physical device/accessibility. Local Chromium
is unavailable; exact-head hosted browser and full CI remain gates. The fixture demonstrates
handler/promise behavior and deliberately does not claim browser timing or IDB acceptance.
Another independent reviewer must review these authored fixes. `tests/browser_backup_import.py`
is unchanged for coordinator integration. [HUMAN_TODO.md](../../HUMAN_TODO.md) remains authoritative
for physical Android, TalkBack and owner acceptance; none is closed by these synthetic checks.
