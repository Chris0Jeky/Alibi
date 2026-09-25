# Sun & Moon reasoning

## Current maintenance checkpoint: 25 September 2026

PR #329 continues #327. Its old stacked PR #328 closed when the merged #324 base
branch was deleted; the preserved binary branch is now targeted at main. This refresh
reconciles the uploaded `c2e86011` snapshot to main `9c4e7a33`. The reconstructed main
Git tree matches `d60f5c3f9fa80e926584c8802db9daec3893a7db` exactly. Current main's
release/typography STATE history is retained instead of the stale branch preface.
This is source work, not a release or deployment.

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

The local `npm run verify` attempt passes formatting and web/Android preview builds.
Its Node stage records 551 passes and three failures: the unchanged application budget,
missing `@capacitor/core` for the native-flavor test, and missing `uuid` for the dependency
patch test. The latter two packages are absent from the downloaded public build-tool
subset; they are not treated as passing tests. The chained Quiet Wing commands do not
run when that Node stage fails; both were then run directly and passed. A normal complete
npm install remains necessary in CI.

The fresh local application measures 130,336 gzip bytes against current main's unchanged
strict ceiling of 130,304 bytes, so the budget still blocks merge. Replaying the preceding
PR source on the same main measured 130,352 bytes. No cap, gzip setting, assertion or
required check was relaxed. Earlier documents' 130,048-byte ceiling predates main's
independently merged Cabinet restore work and is not today's baseline.

`tests/browser_binary_hints.py` retains the 390px/1440px twelve-step Hint/symbol/cell/Undo
walk and wrong-C3 conflict recovery. Local Chromium launches, but this environment blocks
navigation to the local origin with `ERR_BLOCKED_BY_ADMINISTRATOR`; no new local real-control
pass is claimed. Older head `835b051260` passed hosted reasoning run 36067988069.
Those historical 26 binary and 44 Tents/Lantern
interactions do not certify this refreshed head.

## Continuation and merge gate

Keep #329 draft. Reduce actual emitted application size below the existing ceiling while
preserving explanations and semantics, then obtain complete exact-head Verify, reasoning,
Picture Logic and Android results and a fresh independent review. Inspect every failure,
not just the known budget failure. Recheck current main, final head, mergeability and head
age immediately before merging. The existing reasoning workflow retains source-formatting
output, screenshots and receipts for all three families.

Keep #161 and `HUMAN_TODO.md` q-8 open for human explanation quality, difficulty calibration,
physical touch and TalkBack acceptance. Puzzle IDs, revisions, givens, save formats,
reveals and the other puzzle engines are unchanged.
