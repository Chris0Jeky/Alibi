# Issue #761 — durable Club stamps

## Outcome

Lantern Duel’s “A seat at the table” and Pocket Borough’s “Town planner” stamps now survive the
100-record Club journal limit. `record()` promotes progress for records it is about to evict into
the existing optional `state.cleared` list. The profile continues to recognize valid older saves
from their remaining typed records, and the save validator accepts the new `duel:` and `borough:`
markers while keeping the marker-list bound at 202. Older saves without `cleared` remain valid.

The source worktree began at synthetic local commit `2ed30b65df7a21f427cdb85a1e595ef939a2c18d`,
with tree `085314d4003f169edb91955ccc402832c3c5c3d3`, representing the provided GitHub `main`
baseline `7a7640ddaf23d4f49f253cda5d9a47a2a2914b7a`.

## Changed files

- `src/club.js` promotes prefixes only for records removed by the journal cap. Its shared lookup
  keeps Duel and Borough progress tied to record type while room progress continues to use record
  ID prefixes.
- `src/backup-validation.js` allows the two standalone markers and retains the previous 200
  numeric-prefix capacity plus those two marker slots (202 total).
- `tests/club-solved-durable.test.cjs` covers real completed Duel and Borough engine states,
  pruning after 100 later records, earned profile stamps, rejection of unrelated record IDs,
  legacy saves, and the full 202-marker validation bound.
- `tests/browser_tic_tac_toe.py` seeds a synthetic 100-row legacy journal through the explicit
  `AlibiClub.reviewBackup` confirmation: 98 later Tic-Tac-Toe rows followed by older Duel and
  Borough completions. It then plays two distinct local Tic-Tac-Toe wins through browser controls,
  checks each pruning/promotion step and both profile stamps, and verifies the markers after a
  real-origin offline reload. These are synthetic records, not human play.

## Evidence

The new regression failed before the implementation: after the later records pruned the match and
town results, the Duel marker check returned `false` instead of `true`; the validator also rejected
`duel:` and `borough:` as “Invalid solved rooms.” With the fix, the focused Club suites pass:

```text
node -e "require('./tests/club-solved-durable.test.cjs'); require('./tests/club-result-retention.test.cjs'); require('./tests/club-borough-seed.test.cjs')"
25 tests passed, 0 failed
```

`python -m py_compile tests/browser_tic_tac_toe.py` and `git diff --check` pass for the added
real-origin journal/profile scenario. The browser fixture was not executed locally; hosted exact-build
CI must exercise it.

Prettier checks for the three changed JavaScript files and `git diff --check` pass. A local web
build completed before the final regex compatibility tightening as build `36f07c3990dc`; its
`javascriptGzipBytes` measurement was **135,105**, 33 bytes above the existing strict ceiling of
135,072. The exact committed source was not rebuilt locally after that small tightening, so the
coordinator should remeasure it during integration. No build threshold was raised. The standard
`npm run build:web` invocation hit the sandbox’s `spawnSync git EPERM`, so the same repository
builder was invoked directly with the verified baseline SHA and `sourceDirty: true` supplied for
its build identity. The complete build graph and size measurement completed; this is not a claim
that the standard command succeeded under the sandbox.

## Not verified

The full `npm run verify`, full Node suite, browser/storage lanes, hosted CI, and hosted behavior were
not run in this worktree. The new browser regression was syntax-checked but not run locally because
no browser is available; the coordinator owns exact-build real-origin/offline CI qualification.
Synthetic journal rows do not represent human play. No physical-device behavior was tested.

## Remaining scope and gates

Pocket Borough personal-best rows still come from the capped journal records. Retaining a score,
seed, and date per town would require a separate bounded per-seed record policy and corresponding
save validation; that storage change is not included. As a result, old leaderboard rows and the
total-town count can still disappear after journal pruning even though the “Town planner” stamp
remains collected.

`HUMAN_TODO.md` q-2 physical Android acceptance remains open. q-11 still calls for the combined
physical session after release, including the q-2, q-4, q-7, and q-8 device checks. This persistence
change does not close those owner gates.
