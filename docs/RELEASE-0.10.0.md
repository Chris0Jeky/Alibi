# Alibi 0.10.0 · Welcome to Wrenmere

Published 2026-09-09 from `bcd95fdef4b47fb4b61a41b2c1385406aed57f2d` (PR #73).
Build `5b0d056fe08b`; 328 puzzles, thirteen families, four casebooks.
[Play the castle](https://alibi-after-hours-preview.commit-atlas.workers.dev/#/quiet/castle/map) ·
[Release and downloads](https://github.com/Chris0Jeky/Alibi/releases/tag/v0.10.0).

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

## Verified publication

The full source gate passes: 148 Node tests, existing engine/contract suites, 182 core UI
checks and six castle browser suites. Both complete [PR CI](https://github.com/Chris0Jeky/Alibi/actions/runs/34408193462)
and [push CI](https://github.com/Chris0Jeky/Alibi/actions/runs/34408190249), plus
[Castle CI](https://github.com/Chris0Jeky/Alibi/actions/runs/34408193429), pass at final head
`1b8ea968bac0c56f5f79c26fefc67d598ce09c60`. The merged build matches the CI build.
Independent fresh-context review found no confirmed defects. Two automated P2 findings were
reproduced and tracked: restoring the exact practice starter focus (#79), and duplicate imported
note sections after later local edits (#80). Existing notes remain intact; oversized merges
are refused before writes. No merge-blocking finding remains.

- Primary Worker version `aa26d476-6eb3-4256-800f-46fd8c087415`: all 271 public files match.
- Fallback Sites version 11, deployment `appgdep_6aa1d6f12b608191bf8f1201fe06063c`:
  all 267 non-HTML files match. Four HTML pages retain exact source plus the previously known
  938-byte hosting challenge script. Provider-controlled fallback security headers remain #6.
- Each actual HTTPS origin passes 92 storage/offline checks and all five hosted castle suites:
  complete chapter, recovery, investigation, exploration/media/offline and official practice.
  Simulated phone and desktop controls are distinguished from physical-device acceptance.
- Captions and deliberate native playback pass on both hosts. Fallback VTT and MP4 responses
  are respectively `text/vtt` and `video/mp4`; each file matches the release.
- Disposable saved games on both origins pass the actual 0.9.1 → 0.10.0 Check for updates /
  Save & update flow. An extra move before activation, exact board and pinned definition survive
  activation and offline reload. Castle-specific protected-session update recovery is separately
  proven by the same-origin synthetic A/B test; it is not misreported as a pre-existing live castle save.
- The three GitHub download asset sizes and SHA-256 digests match the published merged build.

The first full CI attempts exposed a stale release-history count (11 versus the new 12).
The test now follows the checked-in release catalogue; all 20 discovery/history controls pass.
The first hosted exploration offline reload returned `ERR_INTERNET_DISCONNECTED` after checking
only the optional pack. A worker-blocked fixture proves that pack readiness can precede core
installation. The test now explicitly waits for the root worker and `offlineReady` before
switching offline; both hosted exploration suites pass. This is a test precondition correction,
not a runtime change. Windows packaging required the installed Git Bash and its absolute archive
path syntax; the resulting 273-file archive was compared byte-for-byte before publication.

Build sizes: 160,605 bytes initial code/content gzip, 1,941,430 bytes core offline,
1,278,591 bytes optional castle assets and 29,976,700 bytes upload ZIP. No budget was relaxed.
Local evidence is archived in `test-results/wrenmere-0.10/` in the original Alibi checkout:
`release-0.10.0/` contains per-host reports and package/release digests; `live-update-0.10/`
contains actual upgrade receipts. Review, CI, local controls and finished-worker evidence are
retained alongside them. The [deployment procedure](DEPLOYMENT.md) remains unchanged.

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
