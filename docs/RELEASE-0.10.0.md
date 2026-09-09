# Alibi 0.10.0 · Welcome to Wrenmere

Candidate, 2026-09-09. Independent review, exact-head CI, merged-source publication and
actual hosted upgrade checks remain pending. This file does not yet certify a live release.

Wrenmere turns the Quiet Wing into the entrance to a larger place: a countryside castle,
its puzzle museum and the first chapter of an estate mystery. The player visits ten locations,
solves ten questions, collects qualified evidence and discovers a secret route. The notebook
supports eight revisable hypotheses with citations to records the player has actually found.
The first chapter distinguishes what a clock and route prove from what remains unknown about
Mara's disappearance. Its ending opens the next investigation rather than inventing a verdict.

Twelve original supplied illustrations support consistent estate layers, room views, visible
objects and nearby doors. Named controls accompany spatial hotspots. The supplied silent
18-second prologue plays only on request, with native controls, captions and a transcript;
story-off and standalone play retain the manually controlled text interlude. Optional room
downloads report their readiness; unavailable artwork leaves the questions usable.

Three museum objects teach topology, magic squares and the Royal Game of Ur. Three label
reviews separate proof from historical legend and reconstruction; their completion reveals
Mara's small exhibition draft. Official source records and editorial limits are recorded in
[MUSEUM-SOURCES.md](castle/MUSEUM-SOURCES.md).

All 328 existing official puzzles contribute to thirteen room familiarity tracks. Thirty-nine
curated starter links return to an implemented room or the planned location's directory entry.
Three first solves reveal a room detail. Restarting retains prior completion; custom puzzles,
uncommitted edits and mismatched definitions cannot grant familiarity. These details grant no
story evidence or pet/garden/city entitlements.

The separate castle notebook uses bounded worker validation, reviewable merge/replace,
revision-conditional writes and an atomic pre-restore copy. Unknown saves remain protected.
An update requires saved state or explicit acknowledgement of an export of the exact protected
session. A cancelled download is never an acknowledgement. Combined settings exports identify
which independent stores they contain; restoration is not atomic across those stores.

No published puzzle definition, ID, revision or existing save-store identity changes. The
original eighteen commits from draft PRs #39–42 remain in history. The implementation is
integrated with the 0.9.1 player fixes. Castle assets remain an optional pack under the existing
96 KiB code limit; core installation does not download the film or castle scenes.

## Evidence to retain for publication

The local full gate, actual ten-question controls at 390/1280, real IndexedDB recovery,
evidence-board/curator controls, scene and film lifecycle, offline failure fallbacks, official
practice return/restart and the actual A/B Save & update controls passed during implementation.
Final reports must be tied to the reviewed source and actual hosted build before this candidate
section is replaced by a publication receipt. The release procedure is [DEPLOYMENT.md](DEPLOYMENT.md).

## Continued scope

The original 69-file resource map and eight complete design bibles are preserved in
[RESOURCES.md](castle/RESOURCES.md). The [strategy](castle/STRATEGY.md),
[chapter continuation](castle/CONTINUATION.md), and [deferred rewards](castle/DEFERRED-REWARDS.md)
provide proposed records, proof graphs, dialogue, room loops, receipt rules, asset budgets and
acceptance cases for the next implementation. Twenty-two other atlas locations and Chapters
II–V remain planned. Full bespoke scene layers, two additional room films, character portraits,
material-specific sound, Blender pets and connected garden/city rewards are not implemented
by this release.

Physical Android installation, TalkBack, first-time-player difficulty and story comfort are
human acceptance items in [HUMAN_TODO.md](../HUMAN_TODO.md), including castle q-7. Desktop and
emulated phone checks do not certify them.
