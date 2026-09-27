# Rooms after closing: six original playable rehearsals

Implementation under #460/#466, stacked on foundation PR #480. This is a self-contained experimental anthology, not a new official pack, production save format or deployed Wrenmere chapter. The research remains in #478. All existing live content, identifiers, saves, origins and byte ceilings are untouched.

## Build and play

Node 22, no npm installation needed for this standalone builder:

```sh
node tools/escape-preview.cjs rooms-after-closing.html content/escape-rooms/tidekeeper-workshop.json content/escape-rooms/printmaker-cabinet.json content/escape-rooms/moonseed-conservatory.json content/escape-rooms/herbarium-lift.json content/escape-rooms/counterweight-loft.json content/escape-rooms/clockmaker-rehearsal.json
```

Open the newly created HTML. The builder refuses an existing output, duplicate room IDs, more than twelve inputs, invalid sources or a room whose finite model is not completely verified recoverable. Choose a new filename for rebuilding. It embeds fixed scripts/styles under a hash-only CSP, uses text nodes for authored strings and makes no external requests.

**Progress, notes and drafts are memory-only. Switching rooms preserves them during the session; refreshing or closing the document resets all of them.** The page discloses this. It deliberately does not write to any production storage. There are no timers, accounts, analytics, extra media or external fonts. Offline source contains solutions, so source inspection is not an anti-cheat boundary.

## Content and scope

| Room | Reasoning and mechanism | Reachable states / successful-or-no-op edges |
| --- | --- | --- |
| Tidekeeper's Workshop | Ordering and fixed-offset calibration meet at a reversible handle/clutch mechanism | 49 / 325 |
| Printmaker's Cabinet | Ordering, mirrored transfer and registration produce a new proof, then a route ordering | 120 / 733 |
| Moonseed Conservatory | Reusable prism and overlapping shutter patterns with complete numbered-bed observations | 33 / 185 |
| Herbarium Lift | Pairwise mass equations, two-bracket constraint and accession chronology | 30 / 161 |
| Counterweight Loft | Shared balance, a persistent safety latch and later reuse of a single tool | 405 / 4294 |
| Clockmaker's Rehearsal | Bounded cyclic alignment, reusable spring, tension and routing | 11 / 47 |

All 648 reachable states in these declared models retain a route to completion. The 5745 counted edges include valid no-op actions; they are not a count of human solutions. Independent enumeration in tests reconstructs the transition graph separately and compares counts, projections and effects. Wrong inputs remain no-ops. All actions are reachable. These are finite-model facts, not a proof of human clue comprehension or difficulty.

The first pair implements #466's room sources. Moonseed and Herbarium advance two of #472's three rooms; Rain Collector is still a treatment. Counterweight advances one #473 room; Clockmaker advances one #474 room. The other six of the research's twelve treatments remain unimplemented. Do not close the anthology epics or describe all twelve as shipped.

## Player and authoring seams

The player provides an object directory, selected-object observations, labelled native controls, visible state changes, independent per-room sessions, 64-change undo, current-room restart confirmation, scratch notes, per-action orientation/constraint/method hints and separate worked-solution disclosure. Story mode and Daylight/Lamplight do not change truth or progression. Narrow screens use an object selector rather than a cramped spatial canvas. This is the semantic baseline for a future scene, not a claim of finished illustrated-room art.

A render epoch makes stale detached controls inert. Wrong attempts retain text and do not enter undo history. Completion is terminal in the reducer but can deliberately be undone. A room's source is copied into its session so later author-object edits cannot change an active run. Returned snapshots cannot modify private session state.

`escape-preview.cjs` validates all sources and their entire model before producing HTML. `escape-session.cjs` supplies memory-only per-room state. The DOM uses the existing foundation projection, not a second rule engine. Hidden observations stay absent and action availability does not disclose successful configurations. Hints do not read answer/check/effect fields, but their prose still needs editorial review.

## Clue evidence and limitations

`tests/escape-content.test.cjs` independently derives launch/job orders, offsets, sorted route stamps, shutter masks, masses, balance partitions and bounded cycle alignments. It exercises alternative action orders, reusable items, persistent printed evidence and recovery after undoing a setup. `anthology-review.json` binds the complete room bytes, revision and specific self-review description to those checks. A changed source must trigger renewed clue/visibility/model review; blindly changing a digest would invalidate the purpose.

Several state representations are intentionally abstract: bracket arrangements are grouped instead of independently movable weights; Clockmaker accepts a derived turn count instead of modeling sixty individual ticks; successful deduction inputs become transitions in recovery analysis. This permits proof within existing bounds without claiming a physical simulator. No room has been human-calibrated as Expert or Master. Increasing depth and illustration should follow observed play, not cosmetic difficulty labels.

## Verification

```sh
node --test tests/escape-*.test.cjs
python -m pip install -r requirements-dev.txt
python -m playwright install chromium
python tests/browser_escape_rooms.py
```

The last command normally loads the actual generated file offline. It plays all six rooms at 320x780, 1280x900 and 844x390, including wrong inputs, help/reveal, notes, room changes, undo, stale detached events, restart/cancel and fresh-document reset. It checks zero external requests/page errors and hostile authored text. The workflow records exact source head, generated HTML, model/source receipts, screenshots, formatter diagnostics, browser receipt and full verify output.

Local Node verification: 93 passed after recorded failing tests. Local DOM-only Chromium verification: 18 room/viewport cases passed. This uses the explicitly labelled `ESCAPE_DOM_ONLY=1` mode because normal file navigation is policy-blocked locally. It is not file transport, real-origin persistence, physical-device or human acceptance. Current-head CI must supply normal file-mode and full application evidence. Local npm cache lacks a dependency and registry DNS failed; local full build/formatter is not claimed. The workflow never modifies or publishes source.

## Remaining promotion work

No new production route, save, deployment or automatic collection installation is included. #467/#47 own spatial inspector integration; #442 owns a named existing save authority with revision pinning, CAS, old/future saves, lifecycle disposal, backup/import and recovery; #433 owns optional delivery. Those gates cannot be inferred from this memory-only player. #468/#469/#470 retain independent editorial, spoiler/accessibility and physical-device review. Current-head CI, independent review and repository aging precede any merge.
