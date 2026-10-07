# Issue 476 — pending AbortError before explicit abort

2026-10-07, worktree `correctness-476-20261007`, branch `codex/backlog-476-20261007`.

## Scope

`origin/main` via #558 already serializes overlapping fixture transactions and covers the restoring admission guard, including activity throws from the older base. This slice only fills the remaining fixture gap: an explicit `abort()` delivers `AbortError` to every still-pending request callback before the transaction abort event. That includes an in-flight `get` and a `get` whose transaction has not started. Success callbacks still run before `complete`. An aborted transaction does not complete. The coordinator corrected the worker omission: pending request errors bubble to `transaction.onerror` and registered error listeners before abort, unless `stopPropagation()` is called. `preventDefault()` does not suppress bubbling. No `src/club.js` change. No production defect was shown.

## Measured

Baseline, fixture unchanged, new test only:


ode --test --test-name-pattern "explicit abort delivers pending" tests/restore-ordering.test.cjs`

Exit 1. 1 failed. Actual order was `['active-abort', 'blocked-abort']` (no request errors).

After the fixture change, on the committed test file:


ode --test tests/restore-ordering.test.cjs`

Exit 0. 18 passed, 0 failed, `duration_ms` 1616.9876. The new order is in-flight `AbortError`, that transaction's abort, blocked `AbortError`, then that transaction's abort. The unrelated writer still commits. An earlier post-fix run of the same 18 tests also passed (`duration_ms` 3763.0793) before indentation-only wrapping.


pm.cmd ci` was not run. The test uses Node built-ins only; nothing failed for a missing dependency. 
ode_modules/prettier` is absent, so format:check was not run. New lines were kept within the repo print width of 100 except comments already styled like the file.

## Residuals

Not a browser IndexedDB emulator: database-level bubbling and `put` request objects are not modeled. No native Chromium re-probe, full 
pm test`, or hosted CI. `docs/STATE.md` and `HUMAN_TODO.md` were not edited. `HUMAN_TODO.md` remains the human-action file.

## Coordinator correction and proof

The worker reached its 25-turn ceiling after committing. The pending-abort regression was strengthened to expect transaction error callbacks; it failed before the correction (two callbacks absent). After adding bounded request-to-transaction event propagation and a preventDefault/stopPropagation regression, node --test tests/restore-ordering.test.cjs tests/club-storage.test.cjs passes 32/32. git diff --check passes. Semantics checked against [IndexedDB 3.0 abort algorithm](https://www.w3.org/TR/IndexedDB/#abort-transaction): pending request error events bubble before transaction abort.

Muse lane creation was refused: current host kraspyon differs from registered owner desktop-ihkoojs. No bypass or Muse job ran. Restricted independent Grok review remains pending; full format/CI/real-browser checks remain publication gates.

## Independent review and final format

Restricted Grok 4.7 high read-only review ended normally: no blocker, 6 turns, session 01a1141d-8e6e-7fc3-bbb3-90e0e74751b6, $0.16156324. Non-blocking coverage suggestion: explicitly record the stopped second request callback. Declined further fixture expansion in this bounded slice; the existing ordering regression proves both running and queued request errors, and the stopPropagation regression proves error-listener suppression. This residual is reported for PR triage.

Coordinator subsequently ran npm.cmd ci and Prettier, corrected formatting only, and reran restore-ordering plus Club-storage: 32/32 pass. No review logic boundary changed.
