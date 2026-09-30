# tst-challenges: pin the challenge registry trust boundary

## Target
`src/challenges.js` `create()` (lines ~39-55) and `validateRequirements`
(lines ~294-317): the trust boundary between curated challenge packs and the
launcher. Orchestrator-verified today: zero test references to
`validateRequirements`, duplicate-id/revision rejection, or borough
requirements-shape rejection. The module loads in Node
(`require('../src/challenges.js')`); follow the harness in
`tests/challenge-library.test.cjs` (runtime catalogue via
`tools/challenge-catalogue.cjs`, `{quiet, club}` engines).

## Behaviours to cover (extend `tests/challenge-library.test.cjs` in place —
do not invent a second harness)
Read `create()` first and pin its actual contract; at minimum:
1. Duplicate challenge ids rejected; `revision !== 1` rejected; malformed
   curated IDs rejected; 0 or >128 entries rejected; missing engine for a
   family rejected (whatever `create()` enforces — if it enforces NOTHING
   today, write the tests to document current acceptance and report that as
   the finding instead of changing `src/`).
2. `validateRequirements` borough shape: wrong keys, bad building/neighbour
   names, out-of-range minimumNeighbors/count, >3 entries, duplicates —
   pin accept/reject per the implementation.
3. Borough adjacency counting edge: off-by-one/wrap at row edges (i±1).

## Constraints
- Test-only change: do NOT modify `src/`, `tools/`, or `content/`.
- If any behaviour above is already pinned elsewhere in `tests/`, cite the
  file:line and do not duplicate it.
- If `create()` accepts malformed input with no check, that is a finding to
  REPORT (with the failing-input table), not to fix here.

## Proving check
`node --test tests/challenge-library.test.cjs`
Repo gates that must stay green: `npm.cmd run format:check`.
