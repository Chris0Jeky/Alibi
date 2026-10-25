# Issue 455: local playtest receipt (branch sol/alibi-455)

Scope: an explicit, memory-only case-session receipt in the workbench preview (#455, parent #439).
Contract and trade-off: [cases README](../cases/README.md#playtest-receipt-455).

## Outcome

- `tools/case-playtest-receipt.cjs`: off-until-start collector with an allowlisted report, bounded events (500) and observation (500 chars), cancel/reset to off.
- `tools/cases/preview.js`: start, review (edit observation, read exact JSON and limitations), copy and discard controls; restart discards. Embedded by `tools/case-preview.cjs` under the existing hash-only CSP.

## Evidence (2026-10-25, Windows, Node 22, local Chromium via Playwright)

- `node --test tests/case-playtest-receipt.test.cjs tests/case-preview.test.cjs`: 10 passed. Without the module: 0 passed, 5 failed. Mutations: removing the consent guard fails 2 tests; folding repeat checks into submissions fails 1.
- `py -3 tests/browser_case_workbench.py`: passed, including the new consent flow at 320 px (counts on completed, abandoned and repeated stages, cancel copies nothing, copy only on the control, restart returns to off, no external requests). Dropping the submit hook fails it.
- `npm run verify`: see the PR evidence for the exact-head result.

## Limits

Simulated browser only; no physical device, screen reader or human tester. No human observation collected. Transmission is out of scope.
