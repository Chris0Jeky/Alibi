# Eclipse Lab and Sun & Moon expansion

## Intent and authority

Chris requested 30 more Sun & Moon levels, related puzzles, researched variants with new logic and interactions, and a place to try experiments and leave ratings/feedback. He delegated design and implementation choices and authorized reviewed, passing merges. This design records the implementation choices made under that authorization.

## Approach

Three approaches were considered: changing the published binary family, shipping disconnected developer prototypes, and adding a separately loaded player lab alongside a new classic content pack. The lab is selected because the existing family and pinned saves retain their rules while players get discoverable, playable experiments. It uses the existing optional-activity lifecycle at `#/quiet/eclipse`; it does not replace the living atlas at `#/lab`.

Classic content adds 30 unique Sun & Moon definitions and 12 Futoshiki definitions through deferred official packs. A separate content worktree owns that change, proof receipts, editorial discovery and catalogue counts.

## Four playable experiments

Each experiment has eight authored, solver-checked levels at 4×4 and 6×6. These are prototypes with provisional difficulty, not human-calibrated releases.

| Mode | Rules and purpose |
| --- | --- |
| Constellation | Classic equal counts, no triples and distinct lines, plus marked adjacent same/opposite relationships. Teaches implication chains. |
| Eclipse | Classic rules plus relationships and overlapping 2×2 windows stating an exact sun count. Combines local and global deductions. |
| Harbour | Explicit row/column sun totals and numbered windows. No triple or distinct-line rule; teaches overlapping sums. |
| Switchback | Equal sun/moon counts and exact adjacent-change counts in each line. No triple or distinct-line rule; teaches run structure. |

Research considers Mirror Ledger and movable masks but defers them because side-by-side boards and dynamic clue frames increase explanation and phone-layout cost. The first four provide independently assessable gameplay.

## Player surface

The navigation and workshop link to the lab. Cards explain what changes and which familiar rules remain. A selected level shows its complete rules, textual clues, 44px controls, keyboard movement, named sun/moon/clear brushes, undo/redo, restart confirmation and a check action. Relationship groups can be filled in one explicit, undoable action; a clue lens highlights all cells belonging to the selected clue. No dragging or color distinction is required.

Hints reason from current clues and marks. They never inspect the authored solution. Completion checks all active constraints rather than comparing with a hidden answer. New levels use immutable IDs and revision 1. Experimental definitions and progress never enter the official catalogue or claim the main Cabinet backup includes them.

## Persistence and feedback

The lab has a bounded versioned local record and its own export/import. Stored boards pin the full puzzle definition. Unknown, malformed or future records are preserved and make persistence read-only; current work remains playable in memory and exportable. Concurrent changes are detected under Web Locks; environments without reliable lock support keep the session playable without pretending cross-tab writes are atomic. No automatic telemetry or network feedback is added.

Each level accepts an explicit 1–5 enjoyment rating, a difficulty impression and up to 2,000 characters of feedback. The interface says these stay on this device until exported or explicitly shared. Export is reviewable JSON. A prefilled GitHub issue link lets the player review and submit saved feedback; no automatic upload occurs. Player feedback can later decide which variants deserve promotion or more content.

## Delivery and constraints

Use plain ES modules and existing esbuild tooling; no new dependencies. The lab loads on entry through the existing optional-activity lifecycle, has a separate measured asset budget, and can cache its exact hashed assets through the existing service worker ownership scheme. Keep startup and core-shell budgets unchanged. Preserve Cabinet DB version 1, all published IDs/revisions, existing save stores and other origins. No production deployment is part of this repository pass; the release decision in HUMAN_TODO remains separate.

## Acceptance

- Pure model validation, bounded solver and an independent oracle prove unique semantic solutions; an exhausted search is indeterminate.
- Save tests cover corrupt/future data, fixed clues, revision pins, bounds, write denial and concurrent changes.
- Emitted UI tests use actual controls at 320/390/1280px, keyboard, undo, linked fills, clue selection, local ratings, export/import and missing storage.
- Existing Node/build, affected browser and exact-head GitHub workflows pass; an independent reviewer assesses changes before merge.
- Physical Android/TalkBack, enjoyment and difficulty remain unverified until actual players report them.
