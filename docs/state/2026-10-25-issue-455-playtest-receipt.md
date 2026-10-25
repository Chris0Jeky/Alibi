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

## PR #759 merge repair and review (2026-10-25)

Changed: resolved the README markers by keeping main's #443 semantic-model paragraph
and the #455 receipt section. Review reproduced a late-consent defect: a stage completed
before consent was reported as unfinished, and subsequent checks were counted as new
submissions. The collector and preview now retain the completion flag when starting or
visiting a stage, without importing earlier actions. Limitations explicitly say that counts
and assistance cover only actions after consent. The privacy wording now distinguishes
automatic collection from the tester-controlled observation.

Verified on Windows, Node 24.13.1, Python 3.14.3 and Chromium 151.0.7922.34:

- `node --test tests/case-playtest-receipt.test.cjs tests/case-preview.test.cjs`:
  11 passed. The new late-consent regression failed on the original collector before the fix.
- `node --test tests/case*.test.cjs`: 124 passed, zero failed, one Unix named-pipe test
  skipped on Windows. Includes main's semantic-model and Chapter One adapter tests.
- `tests/browser_case_workbench.py`: passed with local file transport and the receipt
  context offline. Added actual-control coverage for late consent, returning to a previously
  completed stage, rejected checks after completion, denied clipboard access, and reload
  returning collection to off. No external requests or script errors.
- Receipt screenshots inspected in daylight and lamplight at 320 px and 1280 px;
  no horizontal overflow. Generated evidence is ignored under `test-results/case-workbench/`.
- `npm.cmd run verify`: formatting and the web-build phase passed, then Android payload
  creation refused with `Android builds require a clean source tree.` The full gate is
  **not green**, and its Node test phase did not run. Log:
  `test-results/case-workbench/pr759-verify.log`.
- `git diff --check`: passed; README conflict markers removed. Main's other incoming
  files were preserved.

NOT verified: clean committed-tree full gate, hosted CI/reviews, physical device,
screen reader, real clipboard permission path, or a human playtest. The browser uses
labelled synthetic observations and stubbed clipboard success/failure.

Residual risk: incomplete/reasoning classifications remain a shape heuristic; earlier
help is excluded from `assisted`. [HUMAN_TODO.md](../../HUMAN_TODO.md) remains authoritative
for owner acceptance; no human item or issue #455 is closed by these checks.

Resume: Git writes and network access were prohibited for this repair. The README is
resolved on disk but remains unmerged in the index. The coordinator must stage the
resolution and edits, finish the merge commit, then rerun `npm.cmd run verify` from a
clean tree and qualify that exact published head before merge. No staging, commit,
push, or merge was performed here.
