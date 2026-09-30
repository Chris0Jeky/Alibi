# fix-storage-hardening: key capture, restore shape guard, fallback export

Three small, orchestrator-verified defects in `src/storage.js`. One worker,
existing storage fixtures (`node --test` adapter suite with transactional
IndexedDB fixtures and exact local fallback — follow that harness).

## 1. saveRun reads record.key across an async boundary (lines 190, 196, 203-205)
`os.get(record.key)` then, in `onsuccess`, `os.put({key: record.key, ...})`
re-reads the CALLER's object. Mutating/reusing `record.key` between call and
callback checks one key's revision but writes another key — silently
overwriting a different puzzle's save with a mismatched rev. (`next` is
already cloned; only the key is exposed.)
- Exact change: `const key = record.key;` once at the top of `saveRun` (after
  the revision-limit check) and use `key` in all three reads (IDB get, IDB
  put, fallback get/put). Behaviour identical when callers do not mutate.
- RED test: call `saveRun(record, rev)`, then synchronously mutate
  `record.key` before the promise settles; assert the write landed under the
  ORIGINAL key with `rev + 1` and no record exists under the mutated key.
  RED on old code (write follows the mutated key).

## 2. restore trusts backup shape (lines 255, 269-274)
Beyond `Array.isArray` checks, `restore` clear-and-rewrites with no
format/schema/key-shape check. The sole caller passes worker-validated data
today, but a programmer error or future caller would wipe device data with
`undefined` keys. Fail closed WITHOUT duplicating semantic validation:
- Exact change: before `runs.clear()`, require
  `backup.format === 'alibi-backup'`, `backup.schemaVersion === 1`,
  every run has a string `key`, every pack has a string `id`;
  else throw `Error('Unsupported backup format. Nothing was changed.')`
  (existing message; nothing is written before the check).
- Verify against `validateBackup`'s output shape first: everything it
  produces must pass this guard (no valid restore may start failing).
- RED test: `restore({runs: [{...no key}], packs: []})` rejects and a prior
  stored run is byte-identical afterwards. RED on old code (old code clears
  and writes the keyless record).

## 3. Fallback getAll throws on one damaged record (lines 121-135)
In `local` fallback mode a single corrupt JSON value makes `getAll` throw,
so `export()` — the recovery path the error message itself advises — fails
entirely even when every other save is valid.
- Exact change: in the `local` branch of `getAll`, skip values that fail
  `JSON.parse` (collect their keys) instead of throwing; device data is NOT
  modified (no delete/repair — unknown saves are never cleared).
  Add a code comment explaining the skip-vs-throw trade-off.
- Out of scope: surfacing skipped keys in the UI (needs product copy).
- RED test (local-fallback harness): seed one corrupt + one valid record;
  `getAll` returns the valid one and does not throw. RED on old code.

## Proving check
Run the repo's existing storage adapter suite file(s) plus any new cases in
place (extend the existing storage test file; do not invent a new harness).
Name the exact command in the summary; it must include the storage suite.
Repo gates that must stay green: `npm.cmd run format:check`.
Do not touch `dist/`, published IDs, or revisions. Near size-neutral.
