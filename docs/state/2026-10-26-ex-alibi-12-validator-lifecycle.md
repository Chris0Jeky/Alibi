# Validator worker lifecycle coverage - ex-alibi-12

## Changed

Added `tests/validator-lifecycle.test.cjs`, exercising the actual `inWorker` adapter extracted
from `src/app.js`. Covers success, validation refusal, worker errors with/without a message,
a silent-worker timeout, late events, a subsequent retry, unsupported workers, and external
source loading/failure. Tests use deterministic timers and Worker/URL doubles; they do not
mount the player or claim browser persistence coverage. No production behavior, published
content, dependency versions, gate files, or project-wide STATE was changed.

Starting branch: `sol/ex-alibi-12`; starting HEAD: `0ecce535f08585711f7e2ea26ee870882888cffd`.
Live queue inspection found only #579 open; recent merges #764 through #768 already covered save
maintenance, Club recovery/Borough bests, Scene diagnostics, and transfer recovery. This
slice avoids those changes. No Git writes, publication, or deployment were performed.

## Verified

- `npm.cmd ci --no-audit --no-fund`: 136 pinned packages installed; no lockfile changes.
- Clean baseline `npm.cmd run verify`: exit 0; 2,117 Node tests, 2,099 passed, 18 skipped,
  zero failures; Quiet Wing engine and 123 storage-contract assertions passed.
- `node --test tests/validator-lifecycle.test.cjs tests/validator-loader.test.cjs tests/validator-worker.test.cjs tests/validator-limits.test.cjs`:
  30/30 passed, including all eight added lifecycle tests.
- Four source mutants, stored only under ignored `node_modules/`, each produced exit 1:
  timeout resolves instead of rejects (1 failure); omitted termination (6 failures);
  omitted Blob URL revocation (6 failures); removed late-message guard (2 failures).
  None cancelled or timed out the test runner. Unmodified production source passed again.
- `npm.cmd run format:check`: exit 0.
- Post-edit `node tests/quiet-wing/engines.cjs` and `node tests/quiet-wing/contracts.cjs`:
  both exit 0; the latter reports 123 assertions.
- `py -3 node_modules/validator-mutation-probe.py` reproduces the four deliberate failures;
  all source copies/logs are ignored. Actual `src/app.js` remained untouched.
- `py -3 node_modules/validator-browser-probe.py`: four real Chromium Worker cases passed
  (success, refusal, worker script error, silence). Each terminated the worker and revoked
  its Blob URL once. The actual silent-worker deadline rejected after 25,009 ms.
  The disposable localhost server serves only a blank synthetic page; it injects the actual
  source adapter with synthetic worker programs. This is not full-app UI/storage acceptance.
  Probe scripts/JSON/logs are in ignored `node_modules/`; no external build outputs survive.

## NOT verified

- Post-edit `node --test --test-concurrency=2 tests/*.test.cjs tests/*.test.mjs`:
  2,125 tests, 2,093 passed, 18 skipped, 14 failed. Every failure is in Android build/content
  tests and reports `Android builds require a clean source tree.` These passed in the clean
  baseline; all eight new tests passed. This is not a claimed green post-edit full gate.

The commit-identity prerequisite (`node tools/check-test-build.cjs`) correctly rejects
uncommitted test changes. Baseline artifacts are clean-HEAD artifacts. The coordinator must
commit the scoped files before rerunning `npm.cmd run verify`; no gate was bypassed or edited.
No hosted CI, physical device, deployment, or production save mutation is claimed.

## Residual risk

The added Node tests execute the production function with controlled browser API doubles.
They protect request settlement/cleanup and the requested deadline, rather than simulating
browser scheduling or measuring memory reclaimed by a browser. Source extraction asserts
both function boundaries so a moved/renamed adapter fails visibly.

`HUMAN_TODO.md` remains unchanged. Physical Android/TalkBack, affected-device freeze retesting,
Quiet Wing/Wrenmere acceptance, publisher/signing, and the retiring Sites-origin work retain
their existing owner/runtime gates. This test-only change closes none of those items.

Coordinator resume: commit only the test and this handoff, then run `npm.cmd run verify`
from this worktree before publishing one ready-for-review PR. The committed-source checks
must remain enabled. No review, CI, push, merge, or deployment is claimed by this receipt.
