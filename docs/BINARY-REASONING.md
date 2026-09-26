# Sun & Moon reasoning

## Current maintenance checkpoint: 25 September 2026

PR #329 continues #327. Its old stacked PR #328 closed when the merged #324 base
branch was deleted; the preserved binary branch now targets main. The uploaded
`c2e86011` snapshot was reconciled to main `9c4e7a33` with an exact tree match.
The latest integration retains main `93cc5fa99c15814c4cbfccac5b5515b5c2ab2660`,
including Night Gardens, shared typography and the approved radius mapping.
Current-main STATE history is preserved. This is not a release or deployment.

## Local alternatives, not answer lookup

The preceding row-first balance/triple helper can suggest a symbol that immediately
violates a perpendicular constraint after an incorrect entry. On binary-03, place a
moon at C3: the old helper suggests a sun at B3 despite the column rule. The corrected
helper reports that neither symbol fits B3 and asks the player to recheck marks.

Visit unknown individual squares, then rows and columns with exactly two unknown
squares. Test the two or four assignments on copied cells using the existing binary
validator. Keep only the small masks for allowed assignments. Propose a value only
when all allowed alternatives agree. Counts, triples, distinct lines and perpendicular
constraints are checked together. No allowed alternatives means conflict advice without
a move value; no local deduction means the existing general-strategy fallback.

There is no recursive puzzle search, guessing fallback, stored-answer read or automatic
move. Reasoning is conditional on current marks, not proof that every earlier guess is
correct or that the complete puzzle remains solvable. The maximum number of validator
calls is `1 + 2n² + 8n`, at most 193 for the supported 8x8 maximum. Candidate sets never
contain more than two cells. Hypothetical cells do not become saves.

## Explanation correction in this refresh

The preceding PR selected one rejection reason, preferring a distinct-line message.
That did not explain all rejected alternatives in the two-square witness: one is
rejected by the symbol quota and another by the distinct-line rule. The refresh lists
the distinct validator messages from the excluded assignments, once each. There are
only three binary rule messages. This preserves the chosen cell, value, trial order,
validation bound and conflict behavior while making the displayed justification fuller.
The new row/transposed-column regression requires both reasons without repetition and
a message below 240 characters for those witnesses. It fails on the preceding PR and
passes with the correction.

## Evidence and its limits

Against reconciled main, six of the preceding eight binary tests fail. All nine binary
tests pass with this source, as do all 25 shared, Tents and Lantern reasoning tests:
34 focused tests, zero failures. Independent complete-board enumeration finds 40
compatible answers for each row/column witness; every answer agrees with the proposed
move. Deterministic samples verify 1,493 deductions against compatible completions and
2,050 arbitrary locally legal positions. Official-catalogue walks check 458 deductions
with throwing solution getters, immutable Hint calls, preserved givens and real reducers.
These are bounded samples, not exhaustive proofs for every board size.

## Size correction without weaker explanations

The fuller explanations originally measured 130,336 application gzip bytes. The
existing A1 formatter was duplicated in core clients. It now lives in `C.at`, while
Assist and Bridges retain their public facades. Insights and three application
labels use that same formatter. A fixture checks 749 cells over ten board sizes
through the core, Assist and Bridges paths. No displayed text, hint rule, value,
trial order, call bound, standalone network-hint dependency, or save field changes.
The asset catalogue refresh only updates its thirteen existing app.js fingerprints.

The exact pre-integration tree `33473c07c7244643511bced1a3e47b126d4b8b4c`, published
at `d615b717`, measures 130,294 gzip bytes and passes the existing 130,304-byte
ceiling. The earlier binary branch replay measured 130,352 on the same baseline.
No cap, compression setting, assertion or required check was relaxed. The ten-byte
margin is narrow; the fresh integration must pass the actual emitted-byte check.
Earlier records of 130,048 bytes predate the separately merged Cabinet restore fix.

All 38 focused checks pass, including reasoning, coordinate and asset catalogue
checks. Fresh complete local verification passes formatting and web/Android preview
builds, with 553 Node tests passing and two failing: missing `@capacitor/core` and
missing `uuid` in the downloaded public-tool subset. These are environment limits,
not passing tests; no test is skipped or waived. Both Quiet Wing suites were run
directly after the earlier chained attempt stopped and passed. A complete normal
npm installation and exact-head CI are necessary for acceptance. The added Night
catalogue and CSS integration are not certified by the pre-integration local count.

A fixed-input one-shot job (run 36160777983) checked the patch SHA-256, seven allowed
paths and every output blob before publishing only immutable Git blobs. It did not
commit, move refs, merge, deploy or execute project code. The connected maintainer
then published the verified tree and restored the original read-only verification
workflow atomically. The final source diff has no helper, permission expansion or
change to `.github/workflows/check.yml`. That publication job is not a test receipt.

`tests/browser_binary_hints.py` retains the 390px/1440px twelve-step Hint/symbol/cell/Undo
walk and wrong-C3 conflict recovery. Local Chromium launches, but this environment blocks
navigation to the local origin with `ERR_BLOCKED_BY_ADMINISTRATOR`; no new local real-control
pass is claimed. Older head `835b051260` passed hosted reasoning run 36067988069.
Those historical 26 binary and 44 Tents/Lantern
interactions do not certify this refreshed head.

## Continuation and merge gate

Keep #329 draft until complete exact-head Verify, reasoning, Picture Logic and Android
checks pass and a fresh independent review is recorded. Inspect every failure; the local
size pass is not an integration or browser pass. Recheck current main, final head, mergeability and head
age immediately before merging. The existing reasoning workflow retains source-formatting
output, screenshots and receipts for all three families.

Keep #161 and `HUMAN_TODO.md` q-8 open for human explanation quality, difficulty calibration,
physical touch and TalkBack acceptance. Puzzle IDs, revisions, givens, save formats,
reveals and the other puzzle rules are unchanged. Vault authoring profiles must be
recertified when their production hint procedure changes; a method label alone does
not establish that stored profile receipts remain current.
