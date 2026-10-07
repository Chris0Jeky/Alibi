# Issue 476 — pending AbortError before explicit abort

2026-10-07, worktree `correctness-476-20261007`, branch `codex/backlog-476-20261007`.

## Scope

`origin/main` via #558 already serializes overlapping fixture transactions and covers the restoring admission guard, including activity throws from the older base. This slice only fills the remaining fixture gap: an explicit `abort()` delivers `AbortError` to every still-pending request callback before the transaction abort event. That includes an in-flight `get` and a `get` whose transaction has not started. Success callbacks still run before `complete`. An aborted transaction does not complete and does not emit `transaction.onerror`. No `src/club.js` change. No production defect was shown.

## Measured

Baseline, fixture unchanged, new test only:

`node --test --test-name-pattern "explicit abort delivers pending" tests/restore-ordering.test.cjs`

Exit 1. 1 failed. Actual order was `['active-abort', 'blocked-abort']` (no request errors).

After the fixture change, on the committed test file:

`node --test tests/restore-ordering.test.cjs`

Exit 0. 18 passed, 0 failed, `duration_ms` 1616.9876. The new order is in-flight `AbortError`, that transaction's abort, blocked `AbortError`, then that transaction's abort. The unrelated writer still commits. An earlier post-fix run of the same 18 tests also passed (`duration_ms` 3763.0793) before indentation-only wrapping.

`npm.cmd ci` was not run. The test uses Node built-ins only; nothing failed for a missing dependency. `node_modules/prettier` is absent, so format:check was not run. New lines were kept within the repo print width of 100 except comments already styled like the file.

## Residuals

Not a browser IndexedDB emulator: request errors do not bubble to `transaction.onerror`, `preventDefault` is absent, and `put` is not a request object. No native Chromium re-probe, full `npm test`, or hosted CI. `docs/STATE.md` and `HUMAN_TODO.md` were not edited. `HUMAN_TODO.md` remains the human-action file.
