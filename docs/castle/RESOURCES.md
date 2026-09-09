# Castle resource map

The user supplied `alibi-castle/` in the original Alibi checkout. The per-file
[inventory](resource-inventory.json) records every input file, byte count, SHA-256,
supplied-checksum comparison and disposition. Input stays separate from the working app.
The inventory contains 69 files (6,671,776 bytes); all 68 supplied checksums match.

## Read these in order

1. [Production strategy](STRATEGY.md): the owner brief, reconciliation, delivery sequence,
   authority and acceptance. It supersedes the prototype's assumptions about current Alibi.
2. [World bible](design/WORLD-BIBLE.md): the persistent 32-location estate, room identities,
   mood, thinking methods, secrets and Quiet Wing purpose.
3. [Story bible — spoilers](design/STORY-BIBLE-SPOILERS.md): the complete five-act proposal,
   characters, chronology, record requirements and limits on what may be inferred.
4. [Progression and quests](design/PROGRESSION-AND-QUESTS.md): familiarity, evidence, access,
   ownership, hints and non-grinding progression. Compare implementation to these intentions.
5. [Museum editorial plan](design/MUSEUM-EDITORIAL.md): sources, history/legend/model labels,
   exhibit rhythm, future curatorial work and methods to transfer back into the mystery.
6. [Deferred systems](design/DEFERRED-SYSTEMS.md): detailed #29–37 companion, Blender,
   seed, garden, building, palette and realm work, with dependency and acceptance contracts.
7. [Art and motion](design/ART-AND-MOTION.md): visual production prompts, geometry, comfort
   rules, film direction and expansion ideas. [QA](design/QA.md) distinguishes the prototype
   receipts from the production evidence we must collect.

The ten preserved design/contract files are snapshots of the supplied proposal, including
its dated status claims. They are not executable policy or a current deployment receipt.
[CHAPTERS.md](CHAPTERS.md) bridges that longer story bible to the native chapter's records.

## Code and contract disposition

| Supplied resource | Native use |
| --- | --- |
| `src/world.js`, `src/puzzles.js`, `src/engine.js` | Authored records and pure rules adapted by original PRs #39–42 into `src/castle/`; prototype localStorage ownership is not imported |
| `src/art.js` | Editable deterministic SVG scene geometry, used to restore original Wrenmere identity |
| `src/app.js`, `src/index.html`, `src/style.css` | Interaction and visual references; the native Alibi root retains routing, worker and update ownership |
| [world-catalogue.json](design/world-catalogue.json) | Exact proposed catalogue snapshot; native `rooms.mjs`/`content.mjs` remain runtime authority |
| [estate-host.ts](design/estate-host.ts) | Proposed interface, preserved as design evidence; actual host methods must be derived from `activities.js` and `app.js` |
| [INTEGRATION.md](design/INTEGRATION.md) | Dated integration recommendations, not a patch or evidence of current APIs |

## Media and previews

The media folder totals 1,252,546 bytes: twelve editable room/map SVGs; four duplicate
film-scene SVGs; a 1280×720, 18-second silent H.264 prologue; poster; captions and transcript.
Scene geometry can be used in the optional castle download. The video belongs behind
deliberate play and is excluded from initial JavaScript and automatic scene caching.

`PLAY-WRENMERE.html` embeds the film for a portable demo; `PLAY-WRENMERE-LITE.html` omits it.
`DESIGN-BOOK.html` is an illustrated reference. `ALIBI-CASTLE-MASTER.md` collects material
also preserved in the individual design documents; `AGENT-PROMPT.md` is a historical handoff
prompt. None is a second production app or a replacement for current repository instructions.

`tools/build.cjs` builds the standalone demo; `tools/render-film.py` documents the original
SVG/Pillow/CairoSVG/FFmpeg production process. Production uses Alibi's native hashed builder.
No private player data, third-party videos, paid stock, commercial game artwork or font
files were supplied. The proposal's `NOTICE.md` does not choose a source licence for Alibi.
That owner decision remains in [HUMAN_TODO.md](../../HUMAN_TODO.md).

## Evidence disposition

`verification/REPORT.json`, checksums, screenshots and the `tests/` scripts are historical
prototype receipts. Its 23 logic tests and two sets of 60 browser controls do not prove
real-origin persistence, current app integration, hosted updates or physical phones.
Production evidence comes from the native test suites and dated release receipts. Never
copy a prototype test count into a release claim without running the relevant native gate.
