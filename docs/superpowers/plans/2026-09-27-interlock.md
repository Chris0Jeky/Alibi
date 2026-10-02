# Interlock implementation and continuation plan

Refs #422, #425, #427. Spec: `../specs/2026-09-27-interlock-design.md`.
Static official data uses existing Node/CommonJS engines, independent offline oracles,
Python/Playwright real controls and exact-head GitHub Actions. No new dependencies.

## Completed source deliverables

- [x] Reconstruct the uploaded ZIP and match its tree to authoritative main `896bb6d`.
- [x] Inspect existing content, PRs and issues; preserve the 510-puzzle prefix and challenges.
- [x] Add test-first, fail-closed eligibility and deterministic structural-diversity selection.
- [x] Reject missing/stale/nonunique/budget-exhausted proofs and symmetric reskins.
- [x] Add 12 Tents and 12 Aquarium studies with seeds and individual editorial notes.
- [x] Add 12 Signal Paths, 12 Trails and 12 Bridges with the same proof contract.
- [x] Certify final definitions with native and independent solvers and reducer replays.
- [x] Register Gardens initially and Routes in the existing deferred chunk.
- [x] Isolate lossless repeated-prose encoding in prerequisite draft #425.
- [x] Add registry-driven real-control verification and nine selection regressions.
- [x] Publish both packs, tests, notes, proof receipts and this plan in draft #427.
- [x] Preserve the concurrent codec formatter fix instead of force-pushing over it.

## Evidence boundaries and remaining acceptance

Source collection tests passed 10/10 over all 60 boards; codec tests passed 4/4 and browser
selection passed 9/9. These are source-level runs, not browser-play or minified-build claims.
Local npm installation failed with registry EAI_AGAIN. CI formatter diagnostics are retained
as artifacts and were applied without modifying checked-out CI source.

- [ ] Reconcile the separate 0.15.0 release/main changes without reverting them.
- [ ] Obtain final-head `npm run verify`, minified delivery budgets and Android payload results.
- [ ] Obtain actual-control passes for every board at 390 and 1440 pixels, including offline reload.
- [ ] Inspect representative unsolved/completed screenshots; repair geometry/interaction failures.
- [ ] Record final SHAs, CI links, failures and any follow-up issue in the PR and #422.
- [ ] Independent review before merge. Self-review must not be represented as independent review.

Use `node --test tests/interlock-*.test.cjs tests/official-data-codec.test.cjs` and
`python -m unittest discover -s tests -p test_interlock_selection.py -v` for focused checks.
The `Interlock study controls` workflow checks out the exact PR head, records it and runs the
full build before testing real controls. A source pass or an older green run cannot replace it.

## Human acceptance and merge order

Follow `docs/CALIBRATION.md`: real player ratings and solve data first, owner playtests flagged
boards only. Provisional tiers stay provisional until then. Physical Android/TalkBack comfort
is separate. No completed human test is claimed.

Review #425 before #427. After a verified merge of the prerequisite, retarget/reconcile #427
against main and obtain new final-head checks. Never relax a budget to finish the collection.
Record this work in the next canonical `docs/STATE.md` update without overwriting concurrent
release receipts. This plan is a continuation guide, not a release or deployment receipt.
