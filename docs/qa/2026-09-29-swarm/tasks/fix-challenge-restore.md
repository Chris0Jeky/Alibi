# fix-challenge-restore: let explicit restore replace a protected challenge save

## Reproduction
1. Create a store via `AlibiChallengeStore.create(registry)` (module exports
   the factory at `src/challenge-storage.js:254`; reuse the registry harness
   from `tests/challenge-library.test.cjs` and the fake-IDB fixture pattern
   from `tests/storage.test.cjs`).
2. Seed a corrupt record for id `X` (bad `schema`), then `read(X)`: throws
   `Saved challenge record is unsupported and was preserved` and
   `validateRecord` (`src/challenge-storage.js:23-36`) adds `X` to
   `protectedIds`.
3. `restore(validatedRunForX)` (line 247, `write(run, true)` with a
   registry-validated run) throws `This challenge save is protected and was
   preserved` at line 151, which has no `restoring` exception. The validated
   recovery is unrestorable without a page reload (which clears the in-memory
   set). The `recovery:` retention in `cas()` (lines 221-222) never runs.

## Exact change
In `src/challenge-storage.js` `write()`, line 151:
`if (protectedIds.has(id))` becomes
`if (protectedIds.has(id) && !restoring)`.
Nothing else: `cas()` already retains the replaced record at `recovery:+id`
on the restoring path, satisfying pre-restore recovery; non-restore writes to
protected ids stay refused; session-mode restore still throws (line 157).

## Tests that must fail first (RED on unpatched code)
New `tests/challenge-restore.test.cjs`, reusing the `tests/storage.test.cjs`
fake-IDB fixture (no new harness, no new deps). Note: `tests/challenge-storage.test.cjs`
also exists — read it first and reuse its fixture instead if equivalent:
- corrupt-read then `restore(validated)` succeeds; subsequent `read` returns
  the restored run (RED: old code throws protected);
- replaced bytes are retained under the raw `recovery:+id` key — assert via a
  raw store read, since the `recovery()` accessor re-validates and throws on
  corrupt bytes (RED: old code writes no recovery key);
- non-restore `write()` to a protected id is still refused;
- `restore()` in session mode still throws the transactional-storage error.

## Proving check
`node --test tests/challenge-restore.test.cjs tests/challenge-library.test.cjs`
Repo gates that must stay green: `npm.cmd run format:check`.
Size-neutral one-condition change. Do not touch `dist/`, IDs, or revisions.
