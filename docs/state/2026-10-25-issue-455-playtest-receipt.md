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

Resume at that checkpoint: Git writes and network access were prohibited for this repair. The README is
resolved on disk but remains unmerged in the index. The coordinator must stage the
resolution and edits, finish the merge commit, then rerun `npm.cmd run verify` from a
clean tree and qualify that exact published head before merge. No staging, commit,
push, or merge was performed here.

## PR #759: reconcile incoming story-mode parity tests (2026-10-25)

Changed: removed the conflict markers in `tests/browser_case_workbench.py`, retaining
both the receipt helpers and main's `non_prose_controls` / `compare_modes` helpers and
their call sites. An AST comparison confirms both parity helpers match main exactly.
The incoming application and authoring changes were preserved. Adversarial review of
the PR's collector, preview hooks, clipboard flow, bounds and CSP found no additional
blocking defect; the existing late-consent repair remains covered.

Tested working tree: branch HEAD `b8eeda6bc921ac1416654caa1c066d55a07c8581`, incoming
`origin/main` / `MERGE_HEAD` `7a7640ddaf23d4f49f253cda5d9a47a2a2914b7a`.
Commands ran from this `alibi-455` worktree with Node 24.13.1 and Python 3.14.3.

Verified:

- `node --test tests/case*.test.cjs`: 141 passed, zero failed, one Unix named-pipe
  test skipped on Windows. Log: `test-results/case-workbench/pr759-case-tests.log`.
- `PYTHONUTF8=1 py -3 tests/browser_case_workbench.py`: passed in Chromium
  151.0.7922.34. Both mode-parity and receipt contexts ran; zero external requests
  or script errors. Log: `test-results/case-workbench/pr759-browser.log`.
- Case-workbench workflow's Prettier check over `tools/case-*.cjs`, `tools/cases/*.js`,
  `tools/cases/*.css` and `tests/case-*.test.cjs`: passed with the installed CLI.
  Log: `test-results/case-workbench/pr759-case-format.log`.
- Regenerated receipt screenshots in both themes at 320 px and 1280 px; inspected
  phone lamplight and desktop daylight. The browser asserts no horizontal overflow
  in all four combinations. Evidence remains ignored under `test-results/`.
- `npm.cmd run verify`: repository formatting and web build passed; Android packaging
  refused the dirty merge tree with `Android builds require a clean source tree.`
  Exit 1; the full Node suite did not run. Log: `test-results/case-workbench/pr759-verify.log`.
- `git diff --check`: passed. Conflict markers are removed from the working files.

NOT verified: clean committed-tree full gate, hosted CI/review state, physical device,
screen reader, real clipboard permission handling, or a human playtest. Network access
and Git writes were prohibited. The full gate is **not green**.

Residual risk: incomplete/reasoning rejections remain a shape heuristic, and assistance
before consent is excluded. [HUMAN_TODO.md](../../HUMAN_TODO.md) is unchanged; no owner
acceptance or human observation is inferred.

Resume: `tests/browser_case_workbench.py` remains unmerged in the index because staging
is prohibited. The coordinator must stage the resolved file and this handoff, finish
the pending merge commit, then rerun `npm.cmd run verify` from the clean committed tree
and qualify the resulting published head. No staging, commit, push or merge was performed.


## PR #759 independent source review and follow-up (2026-10-26)

Reviewed GitHub head `83ba9963b6b54ca0c74ad63f5d84c9705684f5c3` against main
`7a7640ddaf23d4f49f253cda5d9a47a2a2914b7a`, including all nine changed files and
unresolved thread `PRRT_kwDOURuAf86wFk08`. The earlier repair correctly preserves
completion and repeat-check classification, but leaves prior assistance represented only
by a disclaimer: showing help before consent still yields `assisted: false`.

Changed:

- Snapshot a per-stage `priorAssistance` flag at consent from the preview's help exposure
  state. This contributes to `assisted` without importing pre-consent event counts. Hiding
  an answer, discarding a receipt or restarting gameplay does not make prior help unseen.
  Reload begins a new page with no retained exposure. Collector recorders remain no-ops
  while off; the ordinary preview tracks only stage help exposure, never a timeline.
- Snapshot the collector's stage ID array so caller mutation cannot erase visited rows;
  returned report arrays and rows are already independent snapshots.
- Invalidate pending clipboard callbacks on discard/restart/new consent. Discard now says
  clipboard copies remain and an already requested copy may finish, rather than promising
  that nothing was copied. No automatic clipboard write was added.
- Extend collector and actual-control browser regressions, plus a minimal DOM/event fixture
  executing the real preview source for deterministic delayed clipboard promises.

Verified locally (Linux, Node 24.22.1):

- Before fixes: two collector regressions failed (prior assistance `false`, mutated stage
  list lost both visited rows); seven existing collector tests passed.
- Before clipboard fix: DOM regressions failed on the false discard assurance and late copy
  success replacing `Preview restarted.` After the fix all three DOM/event tests pass.
- Final `node --test tests/case*.test.cjs` with subprocess access: **147 passed**, zero
  failures or skips, including all three DOM/event regressions. The case-workbench
  Prettier check, `git diff --check` and Python compilation also passed.
- The standard Node runner needs subprocess access in this environment. An initial sandbox
  case run gave 140/144 with four CLI probe failures caused by `spawnSync` EPERM; the same
  standard `node --test tests/case*.test.cjs` with subprocess access passed all 144 before
  adding the three DOM tests. No test assertions or gates were relaxed.

Reviewed boundaries: source identity comes from the validated case's existing source hash;
CSP still hash-pins every executable script with `connect-src 'none'`. Reports retain only
allowlisted counts/state, modes, identity, bounded observation and fixed limitations. The
500-event cap reports truncation; subsequent outcomes/counts may be incomplete. The
incomplete/reasoning split remains a shape heuristic. Existing save domains, dependencies,
application budgets and published content are unchanged.

NOT verified locally: actual browser/layout/accessibility/real clipboard permissions or a
human playtest. Available Playwright Chromium downloads returned invalid empty archives;
new actual-control tests are authored but need exact-head hosted execution. The DOM fixture
proves event/promise behavior only. This reviewer authored the follow-up fixes; they require
another independent review and current-head CI before merge. Full integration verification
and publication belong to the coordinator. No GitHub mutation was performed here.

[HUMAN_TODO.md](../../HUMAN_TODO.md) remains authoritative for physical Android, TalkBack,
owner acceptance and other external gates. No human observation or issue #455 closure is
claimed by these synthetic tests.
