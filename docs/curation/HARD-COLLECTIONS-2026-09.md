# Hard collections: authoring and acceptance

## Brief and baseline

The owner requested substantially more carefully designed gameplay levels on 25 September
2026, prioritising high difficulty. This extends #161, not the castle chronology or the
active Sun & Moon hint work in #329. Source baseline: main
`9190cdd7ccbc5aa4f98cf77a3346cbce899bfc1f`, tree
`236107167e34b63479ce1f386b9d4dab12c6b71c`. The supplied ZIP reproduces that tree exactly.
It contains 382 official puzzles in 23 packs. Most requested families have only one Expert
and one Master/Grandmaster study. Picture Logic already received six new 15 x 15 boards;
this wave therefore targets the other eight requested families.

## Chosen architecture

Author offline, curate, then commit immutable JSON through `content/official-packs.json`.
Use existing engines, renderers, save identities and the separately hashed official-data
bundle. Generation and proof tools stay outside the browser. Do not regenerate published
packs. Existing imports remain bounded to 150 puzzles and 3 MiB.

Three alternatives were considered. Runtime procedural generation offers volume but adds
latency, repeatability and quality risks at play time. Reusing external puzzle sites creates
rights and provenance work without improving the current authored-content seam. Additive,
original, statically verified collections make every definition reviewable and preserve
all existing controls, offline behaviour and pinned saves. The third approach is selected.

## Collections

| Issue | Source pack | Target | Editorial direction |
| --- | --- | ---: | --- |
| #338 | `content/extra/night-gardens.json` | 18 | Six Lanterns, six Tents, six Aquariums; intersecting constraints rather than isolated local clues |
| #339 | `content/extra/night-routes.json` | 18 | Six Signal Paths, six Number Trails, six Bridges; junctions, long anchor intervals and global connectivity |
| #340 | `content/extra/night-symbols.json` | 12 | Six Sun & Moon and six Futoshiki; sparse givens, both axes and connected order constraints |

The target is not a quota. Reject invalid, equivalent or weak candidates even when that
reduces the count. Titles describe standalone studies, not new canonical Wrenmere evidence.
No Gentle/Steady filler is planned. Expert and Master are provisional editorial selections;
Grandmaster is not a default label for large or sparsely clued boards. Human calibration
may change ratings through an explicitly reviewed metadata/revision decision.

## Curation contract

Each accepted board needs an original topology, a named intended reasoning route and
concrete structural observations. Search effort is retained only as a solver-cost receipt,
never as a human difficulty score. Omit `minutes`; do not fabricate playtest participants,
completion times, enjoyment or no-guess guarantees.

Reject duplicates under square symmetries, binary colour exchange, trail reversal,
aquarium tank-ID renaming and irrelevant network tile rotations. Geometry-only comparisons
are deliberately conservative for placements and Bridges: changing only counts or labels
on the same shape is insufficient for this wave. Futoshiki solution patterns also reject
symbol relabelings. These checks do not prove every possible Latin-square isomorphism.

Use existing supported sizes: Binary 8, Futoshiki up to 7, placement/network families up
to 7, Trails up to 7, Bridges up to its current engine bound. Size is a usability constraint,
not a difficulty measurement. Every collection must vary its structural profile, not use
six copies of one opening pattern.

## Evidence pipeline

1. Validate definitions with production `AlibiCore`.
2. Solve to a limit of two with the production bounded solver; reject budget exhaustion.
3. Independently enumerate with `tests/helpers/family-studies-oracle.cjs`. The oracle must
   agree on exactly one semantic answer, not simply validate the stored answer.
4. Replay the answer through production reducers, checking input immutability and final completion. Browser tests separately cover Undo.
5. Record definition SHA-256, topology key, native/independent counts and structural metrics.
   A changed definition invalidates its receipt. Metrics are reproducible, not hand-typed claims.
6. Compare all existing source-pack and legacy hashes with the pinned 382-puzzle baseline.
7. Build and run the full existing checks without loosening code, data, offline or import
   budgets. Exercise each added board through actual production controls at 390 and 1440px.
8. Keep machine correctness, browser geometry, physical touch/TalkBack and human difficulty
   as separate evidence categories. A green solver cannot sign off the latter two.

The new authoring helpers are not runtime hints. They may read answers for certification;
`src/insights.js` still must not. Do not feed authoring receipts or solution diagrams into
unsolved thumbnails, hints, imports or player-visible answer notes.

## Implementation sequence

The work runs inline in the supplied, isolated source snapshot. Publish focused drafts,
then inspect exact-head GitHub Actions. No merge or deployment is part of this request.

- [x] Reconcile ZIP and live main; inspect active issues/PRs and existing quality contracts.
- [x] Seed non-duplicating children #338, #339 and #340 under #161.
- [x] Add test-first structural deduplication and definition-bound quality receipts. Use the
  existing independent oracles, not a second runtime solver. Test mirrored boards, renamed
  tanks, rotated network encodings, wrong answers and changed receipt hashes.
- [ ] Author the three packs separately; retain deterministic seeds, selected candidates,
  per-board reasoning notes and explicit human-review questions in editorial sidecars.
- [ ] Add each pack to the registry with content-specific contracts. Scope the old exact-count
  test to its published prefix, while new preservation tests protect every baseline byte.
- [ ] Reuse the existing advanced-study browser runner by importing it for the new collections
  rather than duplicating its real-control implementation. Preserve its default nine-study coverage.
- [ ] Run focused source tests, build/full checks where available, then exact-head CI. Keep
  every failure and unavailable check visible in PR handoffs and `docs/STATE.md`.

## Review focus

Particular risks: semantic network rotations, Tents tree matching versus tent-layout uniqueness,
aquarium gravity and tank renaming, Trails with multiple valid routes, Bridges edge ordering,
and cheap solver search being misrepresented as difficult human reasoning. Test these seams
before reviewing flavour text. The separate authoring process must never change a published
source file as a side effect of a normal build.

No new assets are necessary to play these levels. Existing native board rendering remains
the visual authority. Board screenshots/contact sheets are review evidence, not required
downloads or spoiler-bearing card art. Source is original work for this repository, not a
claim that a public puzzle website grants a reuse licence.

## Remaining human acceptance

`HUMAN_TODO.md` q-8 and #161 remain open. Sample two levels per family, including a proposed
Master, with both experienced and occasional players. Record actual solve routes, stalls,
misleading wording and use of hints before adjusting tiers. Physical Android/TalkBack gates
remain with #2/#13/#118/#131; viewport emulation cannot close them. No publication is implied.
