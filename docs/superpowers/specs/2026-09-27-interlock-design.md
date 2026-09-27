# Interlock: advanced spatial reasoning studies

Source: owner request of 27 September 2026, issue #422, parent #161.
Baseline main: `896bb6dea893e0c8c7f414315e928cd2c2a3a0a3`; uploaded ZIP tree:
`459d75c2aa0cdfca4ca43f92d0f00405d970a45e`. The original 510 official puzzles, including Night,
Vault and the separate Archive/Borough challenges, are not new work in this collection.

## Outcome and architecture

Deliver twelve studies each for Tents & Trees, Aquariums, Signal Paths, Number Trails and
Tidal Bridges. Interlock Gardens contains 24; Interlock Routes contains 36. Reduce quantity
rather than admit ambiguous, repetitive or unverified boards. The data and editorial receipts
remain in separate files, but share one content PR because the budget and catalogue gates apply
to the combined payload. The codec prerequisite is isolated in #425; content and controls in #427.

Reuse existing offline Night candidate recipes, independent family oracles, production reducers
and the official registry. Retain original seeds, static selected definitions and proof receipts.
The new offline boundary imposes acceptance thresholds, rejects symmetric reskins and selects
structurally varied candidates before board-specific editorial review. It does not claim that
an automated selector is a human editor. No search is added to the game or hint workers.

An engine rewrite would spend effort on rules rather than content. Larger boards would increase
touch/search costs without necessarily improving reasoning. Both alternatives are rejected.
Use supported dimensions: 7x7 Tents/Aquariums/Signal Paths, 6x6 Trails and 9x9 Bridges. Existing
family artwork is sufficient; new media would consume delivery budget without clarifying play.

## Curation contract

- Tents: ten branching trees, five shared candidate squares, three multi-tent quotas per axis,
  and no more than one zero quota per axis. Review competing one-to-one tree assignments.
- Aquariums: nine tanks, four spanning at least three rows, four partial waterlines and six
  nontrivial totals per axis. Review whole layers, not independent wet squares.
- Signal Paths: no locked tiles, eight junctions and reciprocal-only propagation leaves a choice.
  Review local fits that do not establish full-network connection.
- Trails: at most six anchors, an interval of twelve moves, twenty turns and two intervals longer
  than Manhattan distance. Review competing space reservations and late approaches.
- Bridges: sixteen islands, nineteen sightlines, two crossing pairs, three unused routes and six
  doubles. Review component exits before saturating nearby islands.

These are minimum structural thresholds, not calibrated human difficulty scores. Expert/Master
are provisional editorial estimates; omit guessed solve times and no-guess claims. Follow
`docs/CALIBRATION.md`: player ratings and measured solve data first; owner playtests flagged
puzzles only. Physical Android/TalkBack remains a separate acceptance category.

Reject D4 symmetry equivalents against all compatible prior families and siblings, including
trail reversal, network encoding equivalence and tank relabelling. Each board has an individual
title, structural distinction, clue-coordinate reasoning route and tempting mistake to reconsider.

## Proof, preservation and delivery

Require production validation, bounded native uniqueness, a separately implemented solver,
exact answer agreement, immutable reducer replay and a hash of the entire final definition.
Authoring notes and proofs are not runtime downloads. Pin all thirty prior packs, legacy content
and challenge inputs by SHA-256; append without reordering them or changing saves/revisions.

The initial payload was only 23 bytes below its ceiling at intake. #425 adds a deterministic
repeated-string dictionary to the existing build-only codec. Exact JSON values, key/array order,
listing checks and independent mutable objects must remain unchanged. Gardens stays initial;
Routes joins the existing one precached deferred chunk. Never raise delivery/cache budgets.
Unminified estimates are diagnostic only; exact-head minified builds own budget evidence.

## Controls and non-goals

Exercise every registered Interlock board at 390 and 1440 pixels through actual controls:
mutation, undo, redo, guarded restart, full solve, saved completion, reopen and offline reload.
Fail selection on missing, empty, duplicate or escaping packs. Record source SHA and artifacts.
Source tests, built-origin controls, CI, human calibration and physical devices are distinct.

No new engine, save owner, schema, rule, hint strategy, external copied puzzles, dependencies,
telemetry, paid assets, release bump, deployment or automatic merge.

## Live reconciliation

`fe12be2` added the calibration policy without changing engines/content. During publication,
`7677ced` merged the separate 0.15.0 release. The diff is recorded for follow-up integration;
its release metadata and budget adjustments must be preserved, not replaced by the ZIP.
The concurrent formatter fix `68aeba7` on #425 is retained in #427's merge ancestry.
