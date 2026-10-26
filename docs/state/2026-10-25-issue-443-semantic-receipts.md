# Issue #443: bounded semantic receipts

Worktree: `Alibi/.wt/alibi-443`, branch `sol/alibi-443`, base/HEAD
`4988d174b69346a6ba59fe7e1368513704d55d2a`. These changes are uncommitted for
the coordinator; no Git writes, PR publication or deployment were performed.

## Changed

Added `tools/case-model.cjs` with exhaustive classification of the supplied finite
model array and deterministic source-bound receipts. The receipt records case ID,
revision, exact source SHA-256/byte count, model ID/revision, assumptions, finite
domains, ceiling, count, verdicts and witnesses. Missing predicates or an explicitly
unsupported adapter never fall back to authored answers. Zero worlds and invalid
predicate results fail rather than certify a claim.

Blackout reuses its independently authored predicates. Its reviewed full source
hash stays pinned alongside the earlier premise digest. Negative controls change
one hearing clue, remove the exhaustive actor premise, move an interval boundary,
and change an ambiguous answer key. Documentation defines author responsibilities,
formal/editorial limits and the remaining #53/#76/#77 proof gaps; it changes no
chapter content, player behavior, save contract or official truth authority.

## Verified

All commands ran in this worktree with Node v24.13.1.

- Baseline: `node --test tests/case-blackout-model.test.cjs tests/case-authoring.test.cjs`
  passed 63/63, zero skips.
- Fails-without-fix: added the undefined-predicate regression to the original
  classifier, then ran `node --test tests/case-blackout-model.test.cjs`:
  13 passed, 1 failed, zero skips. Failure: `Missing expected exception`; the
  original classifier treated undefined as a contradiction. This was a behavioral
  failure, not a missing-module/setup failure.
- After implementation:
  `node --test tests/case-model.test.cjs tests/case-blackout-model.test.cjs tests/case-authoring.test.cjs`
  passed 77/77, zero skips.
- Final complete case-tooling suite: `node --test tests/case-*.test.cjs`:
  109 tests, 108 passed, zero failed, 1 skipped (existing Windows named-pipe test).
- `npm.cmd ci`: 136 packages installed, audit reported zero vulnerabilities;
  dependencies and lockfile unchanged.
- `npm.cmd run verify`: exit 1. Formatting passed, and the web build completed
  (570 puzzles, 13 families). Android derivation then refused the uncommitted tree:
  `Android builds require a clean source tree.` The full Node phase was not reached.
- `git diff --check`: passed.

## NOT verified

Full `npm.cmd run verify` is pending a coordinator commit. The existing Android
build and npm-test preflight require clean, committed source identities. This task
forbids Git writes, so neither the guard nor the source identity was bypassed.
No hosted CI, independent PR review, browser or physical-device result is claimed.
The touched seam is author tooling and tests, with no runtime changes.

## Residual risk

The helper cannot establish whether authors enumerated every admissible world or
translated prose correctly. Pure predicates, completeness, premise interpretation,
model revisions, citation minimality and editorial validity remain source-review
responsibilities. Capped/incomplete solver output must be reported unsupported.
No general theorem prover is introduced.

`HUMAN_TODO.md` remains unchanged; existing physical Android/TalkBack and other
owner acceptance items remain open. No owner decision is required for this slice.

Coordinator next step: review and commit the focused diff, then run
`npm.cmd run verify` on the clean committed head before opening/qualifying the PR.
Build artifacts and dependencies remain in the repository's normal ignored paths;
the temporary verification log was removed.
