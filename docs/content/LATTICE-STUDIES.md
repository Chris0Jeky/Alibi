# Lattice Workshop studies

Owner continuation, 27 September 2026. Refs #431 and #161; independent of Interlock #427.
Baseline main: `339f9e0e65aa0413f9a0dbdcdd7f3b84e67ff0f7`, which merged delivery prerequisite #425.

## Play the collection

Download `content/workshop/lattice-studies.json`, then open Alibi's Workshop, select Pack desk,
and choose the JSON pack. The existing bounded import validates the 24 puzzles and stores the
collection locally. The definitions then use normal play, undo, restart, save and backup paths.
Import on each device where the collection is wanted; this is not an account or sync feature.
The separate [opening guide](LATTICE-GUIDE.md) contains optional clue-level spoilers.

## Design and editorial selection

Twelve Lanterns and twelve Futoshiki studies, all 7x7. The retained boards are original offline
recipe candidates, selected for constraint interaction and structural variety rather than bulk
seed count. Six givens per Futoshiki, horizontal and vertical inequalities and turning chains of
four or five cells constrain a still substantial unresolved region. Lanterns combine sparse
numbered walls with crossing sightlines and coupled lighting alternatives.

Selection rejects structural symmetries against published compatible content and the selected
siblings. Every board has a stable revision-1 ID, distinct title, retained seed, machine certificate
and an opening grounded in visible clues. The opening calculation is tested with access to the
solution forbidden. It produces justified bounds and candidate sets, not a complete solving trace.
The guide explains how to continue combining those constraints without publishing a full answer.

All 24 Expert labels are provisional editorial estimates. An elementary solver stopping with
unresolved cells is not a human rating and does not prove guessing is necessary. No invented solve
times, human playtests or no-guess guarantees. Imported packs are not official puzzle identities,
so official rating receipts cannot silently calibrate them. Gather explicit feedback; apply
`docs/CALIBRATION.md` after a separately reviewed promotion. Physical checks remain in
`HUMAN_TODO.md` and `docs/PHONE-SESSION.md`.

## Why optional rather than another startup pack

The 60-study Interlock CI artifact at `1ede1313` measured 205,054 initial gzip bytes under a
205,248-byte ceiling and 11,825 deferred gzip bytes under 12,288. Simply adding another initial
or deferred official pack would exhaust that headroom. This collection uses the existing
Workshop importer instead: no runtime loader, generator, save owner, new dependency, remote
media or raised budget. It does not change the built-in catalogue count. All existing official
sources, IDs/revisions and release data are untouched. Future official promotion is a separate
measured delivery decision, not implied by merging this optional source pack.

## Files and validation plan

- `content/workshop/lattice-studies.json`: 18,509-byte playable static JSON.
- `content/curation/editorial/lattice-studies.json`: seed, exact-definition proof, opening and
  elementary-profile receipts for all 24 boards. Not bundled in runtime downloads.
- `tools/curation/lattice-evidence.cjs`: offline opening/eligibility/certificate boundary, reusing
  the existing recipes, independent family oracles and production reducers.
- `tests/lattice-studies.test.cjs`: all-board regeneration, native/independent uniqueness,
  immutable reducer completion, symmetry rejection, answer-free openings and import validation.
- `tests/browser_lattice_studies.py`: actual Workshop file import and all 24 boards at 390/1440px;
  undo, redo, guarded restart, complete solve, IndexedDB save and offline reopen. Fails unless
  all 48 puzzle/viewport cases finish. Screenshots and receipt remain CI artifacts.
- `.github/workflows/lattice-controls.yml`: exact-head checkout, full verify and real-origin
  browser acceptance with read-only permissions. Failed commands remain failures, not warnings.

## Source evidence and continuation

The final-data local source run passed all six tests, no skips, in 54.30 seconds. This includes
24 reproduced native/independent certificates, reducer replays and production pack validation.
Published data and editorial blob hashes match the tested local bytes. Browser script syntax
passes, but the local managed Chromium policy blocks navigation; it was not bypassed. Local npm
registry resolution also failed. Neither limitation is a browser or build pass.

Remaining: exact-head full CI and 48 actual-control cases, screenshot inspection, independent
editorial review and real player feedback. The PR discussion records current CI separately from
this source receipt. No merge, release or deployment is performed. Source completion is not
human calibration or physical Android/TalkBack acceptance.
