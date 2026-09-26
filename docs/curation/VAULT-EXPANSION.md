# Vault expansion: playable content and retained identities

Owner follow-up, 25 September 2026. Parent #161; work packages #345–#348.

## Baseline and layering

Main remains `9190cdd7ccbc5aa4f98cf77a3346cbce899bfc1f` (382 puzzles).
The previous Night stack is #341 → #342 → #343 → #344 (430 puzzles).
Its corrected head `9ed960cb7cc2571cf2da522e76994ce97d7b944a` passes the
six reported CI workflows, including Night study controls. This corrects the
previous handoff: its earlier failure was a stale 382-total assertion, not Rollup.

Logic collections build on that stack. Games Room changes retain main's existing
engine/save contracts. Do not merge or deploy these proposals automatically.

## Scope

| Work | Target | Acceptance beyond a working stored answer |
| --- | ---: | --- |
| Sun & Moon, Sudoku, Lanterns, Futoshiki | 20 each | Native and independent unique answers; selected boards outlast the documented elementary procedure; distinct structures and per-board editorial notes |
| Archive Heist vault rooms | 24 | Three or four interacting crates; independently verified minimum pushes above the old progression; legal reference routes and immutable original rooms |
| Pocket Borough planning contracts | 12 | Different neighbourhood requirements combined with attainable score targets; original seeds and production replay evidence |
| Lantern Duel | Four strengths | The selected bounded search depth reaches the worker; legacy depth four, saves, records, undo and stale-response cancellation remain correct |
| Block Cabinet | Fresh restart | Confirmed restart changes the seed; explicit seed entry remains repeatable; cancel, protected saves and completed records remain intact |

Counts are selection targets, not permission to publish weak candidates. Keep
rejected candidates outside official registries. Titles do not add canonical
Wrenmere story facts. Difficulty tiers remain provisional and `minutes` is omitted.

## Logic authoring

Reuse the existing Night sketchers and certificate machinery. Add an independent
Sudoku enumerator using bit masks, and an answer-free profile of naked/hidden
singles. Futoshiki profiles add inequality-range propagation; Sun & Moon and
Lantern profiles identify the exact production elementary-hint procedure used.
A stalled procedure is evidence about that procedure, not proof of human hardness,
optimality, or a complete no-guess solving route. Store those distinctions.

New definitions receive original IDs and revision one. Preserve the complete
Night proposal and all published source bytes. Check structural equivalence
against the entire integrated catalogue, including sibling packs, not only main.
Sudoku canonicalization covers square symmetries and digit renaming; it does not
claim exhaustive band/stack isomorphism detection.

## Deeper planning games

Archive vaults use the existing trusted challenge registry and production
`warehouse.fromMap`. They do not replace or renumber the nine ordinary rooms.
Reverse push-space exploration finds candidates; forward breadth-first search
certifies minimum pushes. A separate 0/1 walking-state search checks selected
certificates. Compare minimum pushes with independent-crate goal-assignment
bounds to screen out simple hauling. Reference goal departures are route
observations, not a claim every winning route must depart that goal.

Pocket Borough keeps the current seed/deck/scoring engine unchanged. Optional
bounded requirements measure actual neighbourhoods (for example, homes next to
gardens or cafes serving two homes), not only generic score. The existing challenge
objective and starting-state hash bind those requirements. Old definitions without
requirements retain exactly the same save identity. Reference beam search proves
attainability, never an optimal town; deterministic greedy comparisons are advisory.

A source registry should replace duplicated build-time challenge file lists.
Trusted release-owned challenge capacity is bounded independently of the unchanged
150-puzzle player-import cap. Keep the existing 59 challenge definitions intact.

## Delivery and verification

No new runtime generator, network opponent, save owner, imported puzzle source,
or paid asset. Reuse native board art. Maintain the existing code, initial transfer,
offline, optional-wing and data budgets; collection growth must not silently
increase them. If packing or lazy boundaries need adjustment, prove exact runtime
value preservation and count all added loader/data bytes.

Source-only tests, exact-head builds, actual controls at phone/desktop widths,
and physical-device/human acceptance are separate gates. The isolated authoring
container lacks npm dependencies; a read-only CI authoring job can export the
pinned public build tools and lockfile hash for local verification. It cannot push,
merge, deploy, change repository permissions or approve its own output.

Human difficulty and explanation review remain #161 / HUMAN_TODO q-8. Physical
Android, large text, touch and TalkBack acceptance remain their existing owner gates.
