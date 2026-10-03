# Afterlight workshop pictures

Ten original 15 by 15 Picture Logic drawings, distributed as one optional
Workshop pack. This continues the gameplay/content expansion in #161 without
adding to the startup catalogue or consuming Interlock's blocked delivery budget.

## Play the pack

Obtain `content/workshop/afterlight-pictures.json` from this source revision.
In Alibi, open **The workshop**, choose **Puzzle packs**, and import that file.
The existing worker checks the entire pack before adding it to this device.
The normal library, solving, undo/redo, hints, completion and backup flows apply.
The JSON is data, not a plugin, and does not load images or external assets.
This is a manual import, not automatic official installation or deployment.

The 510 previously published definitions keep their exact payloads and remain
the official catalogue. These ten become custom puzzles only after import.
No origin, save owner, database version, import limit or numeric budget changes.

## Authored collection

| Study | Drawing and reasoning focus | Editorial tier |
| --- | --- | --- |
| 01 | Filigree lantern: separate the handle, frame and pierced centre | Expert |
| 02 | Slit in the dome: cross the roof opening, windows and displaced vane | Expert |
| 03 | Last river skiff: distinguish unequal sails from mast, hull and water | Tricky |
| 04 | Two stairwell windows: resolve hollow frames against repeated treads | Expert |
| 05 | Alternating herb: retain gaps between staggered leaves and the pot | Tricky |
| 06 | Reader at dusk: separate the diagonal lamp arm from the book and light marks | Tricky |
| 07 | Cabinet moth: the differently pierced wings cannot be mirrored | Expert |
| 08 | Tilted orrery: reconcile the ring, diagonal, sphere and plinth | Expert |
| 09 | Narrow hourglass: the two internal bowl gaps differ | Tricky |
| 10 | Twin-window kettle: distinguish inset gaps, handle, spout and shelf | Tricky |

All tiers are **provisional editorial estimates**, not measured human difficulty.
The collection has no promised solve times. Machine node counts are not player
ratings. Calibration follows the project's data-first direction in
`HUMAN_TODO.md` and `docs/CALIBRATION.md`; physical-device and TalkBack acceptance
remain separate. Earlier statements that ten pictures were being packaged were
not a publication receipt. This is the recovered, newly authored deliverable.

## Reproducibility and review

`content/curation/editorial/afterlight-blueprints.json` retains every explicit
pixel row, the intended drawing and a board-specific reasoning focus. It contains
no random seed search, imported commercial puzzle, runtime generator or external
asset. The compiler derives row and column clues from those fixed pixels. It requires
all ten study IDs, then uses the production pack validator to check metadata,
rules and bounded uniqueness before any output write. A rejected compile leaves
the previous pack unchanged; fixed membership is not a substitute for validation.

```sh
node tools/curation/afterlight-pictures.cjs --check
node --test tests/afterlight-*.test.cjs
```

`--write` regenerates the reviewed JSON during authoring. Never run it over an
already-published definition and keep revision 1 after changing its rules.
Changes to accepted rules require new revisions and compatibility review.

Ten of twelve original trial drawings were retained. The folded dispatch was
ambiguous; the west-stair key was unique but stalled the production line-deduction
route. Neither rejected candidate was admitted or randomly patched into solvability.
The checked-in ten have two agreeing solution counters and a full 225-step
answer-independent deduction path each. A getter trap forbids the hint engine
from reading the solution. Every returned step is checked against the independent
answer and applied through the production reducer to completion.

Tests also verify exact blueprint-to-pack bytes, malformed/sparse pixels,
corrupted-answer refusal, duplicate IDs, rotation/reflection novelty against all
compatible official and Workshop pictures, and the unchanged 510-definition
prefix. This establishes bounded mechanical correctness, not enjoyment or an
independent editorial approval. Source inspection can reveal offline answers.

The focused command currently runs 53 source/readiness/authoring cases, including
eight membership, fifteen metadata/CLI and two fixed-pack-identity regressions. Real CLI fixtures cover
missing studies, malformed titles and headers, unsupported difficulty and an
ambiguous drawing. They require validation errors, not missing-module failures,
and verify the previous output bytes survive. A valid CLI compile must reproduce
the exact accepted pack. The shared fixture copies the real production validator,
not a replacement validator, into an isolated temporary repository.

## Browser gate and continuation

The read-only Afterlight lane imports the JSON through the real Workshop UI and
plays all ten boards at 390 and 1440 CSS pixels. It checks real controls, geometry,
undo/redo, confirmed restart, IndexedDB completion and offline reload. The source
head, pack digest, screenshots and complete coverage receipt are retained. A
missing scenario or failed setup fails the lane; no skipped-board success.

Before merge, require final-head full verification, the twenty browser scenarios,
independent review and the repository's aging gate. Do not treat the source tests
or this document as a successful browser run. Optional distribution stays explicit;
a future collection installer belongs to #433, not an unreviewed startup change.
