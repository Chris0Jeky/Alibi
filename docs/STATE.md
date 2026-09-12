# Live development state

## Expert Aquarium copy and controls candidate, 2026-09-12 (not deployed)

`expert-aquarium-01@2` corrects three descriptions from six reservoirs to seven. Its ID, tank
layout, targets and solution are unchanged. A frozen revision-1 fixture and exact-field test
preserve the original definition; existing saved revision-1 runs continue from their pinned
snapshots. An old revision-1 URL without a saved run retains the existing revision-unavailable
message rather than silently starting a different definition.

Full verify passes 244 Node tests and supplementary suites. The new real-origin browser check
passes 20 assertions at 390/1440px: saved revision-1 continuation, revision-2 routing, setting,
lowering and draining waterlines, and completion through actual controls. CI now runs that check;
phone-size and desktop screenshots were inspected. Human difficulty and touch calibration remain
open in [HUMAN_TODO.md](../HUMAN_TODO.md) q-8. This addresses another bounded part of #100.

The retained one-off Expert proof is now a permanent browser suite for the other eleven pack
records. All 26 checks pass at 390/1440px, including actual-control completion, rejection of an
incorrect Witness conclusion and Bridges undo. CI runs both Expert control suites and retains
the new receipt directory. This proves interactions and outcomes, not human difficulty ratings.

## 0.11.2 release candidate, 2026-09-12 (not deployed)

Source `030f1c746275111c7e0dabf935453cedcf8447fc`, build `840cdae3fee4`, combines the
previous merged player fixes with completed Castle first-import deduplication (#141), cancelled
return-focus expiry (#79), the two current gallery diagrams (#89), and Quiet Wing timeout
diagnostics (#102). Standalone sound controls/copy (#86) were already implemented and are now
verified directly. Games Room keyboard/pan corrections and the casebook/witness/dossier copy
pass address further parts of #100; that broader issue remains open.

Full verify passes 243 Node tests and supplementary suites. Initial JavaScript is 127,524 gzip
bytes; all numeric budgets remain unchanged. The integrated local Edge checks pass 182 player
assertions, 92 real IndexedDB/service-worker assertions, Castle practice at 390/1280px, nine
Castle recovery scenarios, 72 Invitation assertions at 390/1440px, and Quiet Wing route focus
at 390/1440px. Component checks also pass 177 garden, 281 Dominoes and 84 Mahjong assertions.
Phone-size and desktop game/card/story screenshots were inspected. Independent reviews found
no remaining blocker; stale canonical gallery hashes found on the component branch were
regenerated for the combined source and covered by the full verification pass.

The first hosted Castle run exposed a test synchronization error: a deduplicated restore leaves
the textarea value unchanged while its review dialog is still open. The browser check now waits
for successful dialog closure before entering more notes; all nine recovery scenarios pass
locally with that correction. No save logic or preservation assertion was changed.

The malformed double-slash Quiet Wing test URL was a setup error, excluded from runtime
evidence. The canonical URL passes; synthetic timeouts prove diagnostics preserve the original
exception. CI now retains those diagnostics and both player-feedback report directories.

The existing primary still serves 0.11.1 and the fallback 0.11.0. Disposable HTTPS test profiles
on each origin contain a saved Binary move for post-publication update verification. Publication
and hosted results remain pending in [RELEASE-0.11.2.md](RELEASE-0.11.2.md).
[HUMAN_TODO.md](../HUMAN_TODO.md) physical-device and human acceptance items remain open.

## Games Room controls follow-up, 2026-09-12 (not deployed)

The next #100 slice gives each Lantern Garden its own transient pan key, preserves the
Dominoes chain pan while selecting a tile, and restores keyboard context after Dominoes moves
and Mahjong pair removal. Mahjong selection clears on route/state replacement. Blocked
Dominoes rounds now describe the lower-pip winner or equal-pip draw accurately.

The three new browser regressions fail against the previous build and pass after the changes:
177 garden assertions at 320/390/1440px, 281 Dominoes assertions including five complete legal
outcomes, and 84 Mahjong assertions at 390/1440px. These local Edge runs include offline saves;
phone-size and desktop screenshots were inspected. Build and Node suites pass at this slice.
The broader editorial/content follow-ups in #100 and physical acceptance in
[HUMAN_TODO.md](../HUMAN_TODO.md) remain open. No game definition or saved format changed.

## Player-fix checkpoint, 2026-09-12 (not deployed)

The mobile desk (#138) and Capacitor planning package (#137) are merged. The current player-fix
candidate combines Nonogram hint performance and clue sizing (#96), conservative notebook merge
deduplication (#80), normal Castle practice return focus (#79), and Lantern Gardens touch layout
(part of #100). Each implementation remains a separate commit in the integration history.

At source `2757111`, build `5a5dbe8bedc5` passes full verify: 242 Node tests and supplementary
suites, with initial JavaScript 127,377 gzip bytes and unchanged numeric budgets. Independent
enumeration matches all 4,178 clue profiles for lines of 1–15 cells. Integrated local-origin
browser runs pass: 159 garden assertions, 182 original player assertions, 92 real IndexedDB/
service-worker checks, all eight large-Nonogram board/width cases, Castle practice at 390/1280px,
and all eight Castle recovery scenarios. The local browser runs use installed Edge; hosted CI
runs the repository's Chromium matrix separately. No content definitions were regenerated.

At that earlier checkpoint, two navigation details remained: interrupted Castle returns could
leave a pending focus key (#79), and another garden could retain the previous pan (#100).
The 0.11.2 candidate above addresses both. Legacy
notebook sections without an end marker retain the conservative boundary described below.
Physical-phone, TalkBack, comfort and difficulty acceptance remain in
[HUMAN_TODO.md](../HUMAN_TODO.md). These are source/local-origin results, not a new hosted release.

## Lantern Gardens touch layout follow-up (not deployed)

Issue #100's narrow-screen garden board now reserves at least 44px per grid column and scrolls
within its panel, preserving the pan through moves and undo. The previous layout could give
buttons 44px bounds while placing them in narrower, overlapping tracks. All six boards pass
target-size, non-overlap, right-edge play, undo and pan checks at 320/390/1440px. The expanded
garden suite passes 159 assertions, the original player UI suite passes 182, and full source
verification passes with unchanged delivery caps. Phone-size and desktop screenshots were
inspected. Physical touch/TalkBack acceptance remains in [HUMAN_TODO.md](../HUMAN_TODO.md).

## Castle notebook merge candidate (not deployed)

Castle restore merge now labels each imported notebook section with exact start/end delimiters.
Repeating the same reviewed backup after later local notes keeps that section once, while changed
imports and ordinary local prose remain distinct. A legacy start-only section is deduplicated only
when it remains the notebook suffix; a legacy marker followed by later prose has no safe boundary,
so that prose is retained and the reviewed import is added as a new exact section. The existing
bounded worker, revision-conditional restore, atomic pre-restore recovery and 12,000-character
refusal remain the save authority.

## Capacitor transition architecture (planned; not deployed)

The proposed [Capacitor transition package](capacitor/README.md) records the Android-host route,
the five-domain first-transfer baseline, the separate integrated Cascade boundary and the required
owner/device gates under [program #120](https://github.com/Chris0Jeky/Alibi/issues/120). It adds no
active native project, SDK dependency, APK, store release or production identity. The browser PWA,
its two existing origins and their separate player data remain the current product.

## Wrenmere Desk mobile-first candidate (not deployed)

An opt-in `#/home?ux=house` presentation adds a single resume/start card, a labelled mobile dock, a compact finder with draft-based filter sheets, original SVG room components and an optional session-only deduction study. Existing game/save/preference owners remain unchanged. Includes the earlier unsubmitted desk foundation. See [UX entry point](ux/README.md), [component contracts](ux/MOBILE-COMPONENTS.md) and [verification limits](ux/VERIFICATION.md). Hosted checks and physical acceptance remain gates; this is not a production release or a canonical castle migration.

## Castle practice return-focus candidate (not deployed)

Returning to Wrenmere carries the originating puzzle key to the exact room shelf control once;
a missing starter or a later history/direct visit falls back to the Castle landmark. The key
is never persisted and does not alter saved-run data. The real-origin browser run at 390px and
1280px covers keyboard entry, implemented and planned rooms, replay/restart and one-time
consumption. Final combined verification is recorded with the player-fix checkpoint; the
initial-JavaScript budget cap remains unchanged.

## Block Cabinet integration candidate (not deployed)

A separately hashed optional surface now attaches to the original Club Block Cabinet rules and save queue. Cascade uses an independent versioned replay store, with a separate export and a bounded replay-validation worker. The initial loader is a small separate shell script; heavy game code and art load on entry. The integration honors the app-level reduced-motion setting. See [architecture](BLOCK-CABINET-ENGINE.md) and the browser acceptance suite. This is a review candidate, not a hosted release or physical Android acceptance.

## Block Cabinet engine candidate (not deployed)

The isolated engine/prototype branch adds tactile controls, deterministic Cascade rules and a separate experiment replay store. Its review fixes serialize experiment writes, protect fallback replacement imports, retain Classic demo state across lab switches, and keep semantic controls available without Canvas. See [engine architecture](BLOCK-CABINET-ENGINE.md). Production build integration is a separate stacked PR. Existing Block Cabinet rules and saves are unchanged. This candidate is not a native APK and has not passed physical Android acceptance.

Updated 2026-09-11. Git, CI and review threads take precedence over prose.

## 0.11.1 published

Published 2026-09-10 from `46a3eb1` (PR #83): the Observatory usage-sharing pilot, an opt-in control at
the end of the page that sends content-free action counts to the maintainer's collector, plus the Block
Cabinet origin-label accessibility fix from PR #105 that landed on `main` just before the deploy; nothing
else changes. Loaded after the page as an online-only asset, so the declared initial-JavaScript and
core offline-release budget caps remain unchanged even though the measured artifacts grew slightly.
[RELEASE-0.11.1.md](RELEASE-0.11.1.md) records the hosted checks, the first
consented payload and the withdrawal check on the Cloudflare primary; the Sites fallback stays on
0.11.0. The source release data now also names the Block Cabinet accessibility correction from PR
#105 for the next content rebuild; the documented primary still serves the earlier entry until
deployment. Remaining follow-ups (route and release hooks, control coverage in the browser
suites, the SUMMARY keydown exemption and the fallback wording of the privacy page) are in
[issue #106](https://github.com/Chris0Jeky/Alibi/issues/106). Human acceptance items in
[HUMAN_TODO.md](../HUMAN_TODO.md) are unchanged.

The standalone preview now omits unavailable room-sound controls and says that recorded sound is
available in the hosted edition; the hosted renderer still exposes the deliberate rain/waves
choice. Remaining #86 wording and ambience-semantics follow-ups are not folded into this slice.

The Games Room journal follow-up in issue #112 now shows every retained completed game on the
device rather than only the 20 newest records; the existing save keeps up to 100. The actual-control
browser matrix imports and renders 21 records, including the oldest entry beyond the former view.

## 0.11.0 published

All requested September feature slices are implemented. The current source has 355 cabinet
puzzles in thirteen families and nineteen packs, five casebooks, and eight Games Room games
plus the separate atlas. [The feedback queue](PLAYER-FEEDBACK-2026-09.md) records the adopted
interpretations; [the release receipt](RELEASE-0.11.0.md) separates publication from local proof.
PRs #84, #85, #87, #88, #91, #92, #94, #95, #97, #98 and #99 are merged with green checks.
PR #101 merged at `f1e71a042822822a7ff5e8df688945fcfa152b29` after both final CI runs passed.
Build `48a8bc3bc1ee` is published on both existing origins. The primary's 274 public files match
exactly; the fallback's 270 non-HTML files match exactly, and four HTML pages differ only by its
documented 938-byte hosting challenge. Each origin passes 92 storage/offline checks, the scene
cycle/hold and Nonogram assistance matrix, and 78 Mahjong checks at phone/desktop widths.
Actual 0.10.1-to-0.11.0 updates retain an extra pre-activation move, exact state and the pinned
definition through offline reload on both origins. See the release receipt for deployment IDs.

Late PR #95 review identified theft wording in three non-theft witness chapters. The correction
uses each record's authored action in statements, conclusions, validation and hints, retaining
legacy defaults. Positive, negative and either/or statements have focused regressions. Candidate
`48a8bc3bc1ee` passes formatting, build, all 177 Node tests and supplementary suites after refreshing
the generated catalogue's app-script fingerprints. The earlier catalogue failure was a stale
size/hash record, not a disabled assertion. The corrected casebook passes 62 actual-control
browser assertions at 390/1440px; all three witness statement layouts were visually inspected
with no horizontal overflow. The integrated release also passed full hosted CI before its final
main merge. A further one-off control proof completes all twelve new Expert records at both
widths, rejects a wrong witness answer and verifies Bridges undo: 26 checks, zero failures.
Difficulty labels remain provisional; this proof establishes playable controls, not calibration.

An earlier integrated build passed 176 Node tests and supplementary suites. The 32-suite
local browser matrix passed. Review then found a Mahjong completion score omitted from persisted
records; the narrow fix passes 78 Mahjong browser checks, the original Club suite and 92
real-origin checks against build `13fe27a36f2b`. Completion followed by offline reload now retains
the finite record and another game's saved run. Fixed catalogue-count assertions now
derive Sudoku, mystery-group and Binary totals from source registries as new content is added.
These failures were stale test expectations, not lost puzzles or runtime regressions. Cloudflare
dry-run validates 277 assets and no runtime bindings. Physical-phone, TalkBack, audio comfort,
narrative and difficulty acceptance remain open in [HUMAN_TODO.md](../HUMAN_TODO.md).

Earlier candidate `c50e19f8e184` also gives Mahjong its own matching-tile emblem (all nine Games
Room/playground illustrations are distinct at 390/1440px), with 182 UI and 78 Mahjong checks
passing after that change. Two unpublished Expert entries were strengthened: the Dossier target
is indirect and uniquely deduced; Bridges has five degree-valid candidates narrowed to one by
connectivity. Native and independent checks agree, independent review found no blocker, and all
twelve Expert family entries render at both widths. Human calibration is still open.

PR #94's first Quiet Wing keyboard-remount check timed out; the independent same-head push run
passed the whole suite. Canonical local diagnostics and one bounded failed-run retry also passed;
no runtime fix is inferred. Additional timeout diagnostics are tracked in #102.

The Block Cabinet follow-up in #93 is implemented: an occupied cell that is also a legal piece
origin now exposes both facts in its accessible label, with actual-control coverage at 390/1440px.
The Tic-Tac-Toe follow-up in #90 now guards unfinished winning-line highlights, exposes mode
selection with `aria-pressed`, preserves keyboard focus through the keeper reply, confirms mode
changes that would discard redo history, and renders completed game records in the Club journal.
The #96 Nonogram follow-up is implemented in current source: hint deduction and validation use
cached clue-compatible placements without reading the solution, and mobile zoom retains
clue-aware sizing. The all-four-board browser matrix proves 44px cells, panning, auto-cross,
undo/redo and offline reload at 320px and 390px; physical-phone and difficulty calibration
remain open in [HUMAN_TODO.md](../HUMAN_TODO.md). Other non-blocking review follow-ups remain
in #6, #86, #89, #100 and #102. Sites still controls response headers/MIME and its injected
challenge (#6); document CSP/referrer metadata remains intact. The dated slice notes below are
historical candidate checkpoints; their smaller counts and publication status describe their own
stage, not the current total.

The summary-keyboard follow-up in #106 now leaves puzzle keyboard handling alone while a native
`<summary>` has focus. The two-width feedback-discovery browser matrix proves ArrowRight and
Delete do not move focus into or erase the active puzzle; Observatory origin coverage and asset
cache decisions remain separate follow-ups.

Origin-migration follow-up #110 now has an explicit fallback inventory in DEPLOYMENT.md. The
cabinet, Games Room and Quiet Wing contract suites assert their exact localStorage keys and
preserve recovery bytes while retaining the existing refusal paths for blocked or newer storage.
This records migration acceptance boundaries; it does not implement an origin migration or claim
browser/Android acceptance.

## September feedback candidate, 2026-09-10

### Mahjong Solitaire candidate

A small twenty-tile layered table adds the eighth Games Room game. Seeded deals are constructed
with a solvable removal sequence; matching tiles must be uncovered and have an open horizontal
side. Replay, undo/redo, restart and offline saves pass 66 actual-control checks at 390/1440px,
including clearing all ten pairs and reopening a completed table. Integration preserves the
Games Room index and its eight game cards plus the atlas. Tiles stay at least 44px wide; narrow
screens pan the table. Full verify passes with 174 Node tests and supplementary suites.
The stylesheet cap grows from 32 to 33 KiB for the measured 32.2 KiB stylesheet; JavaScript,
engine, initial combined payload and total offline caps remain unchanged. Human/device playtesting
is still open in [HUMAN_TODO.md](../HUMAN_TODO.md). This is an undeployed candidate.

### Advanced family candidates

Twelve new definitions extend the provisional Expert shelf to all thirteen cabinet families,
alongside the three Expert Sudoku boards. The integrated catalogue has 355 unique puzzles.
Every added family passes native and independent uniqueness checks, and all twelve render at
390/1440px without page overflow. The Expert filter shows fifteen clearly provisional entries.
Full verify passes: 171 Node tests and supplementary suites, including unchanged download budgets.
Independent review found no HIGH blocker. Solver uniqueness is not human difficulty calibration;
sampling remains open in [HUMAN_TODO.md](../HUMAN_TODO.md). No hosted release is claimed here.

### Draw Dominoes candidate

Classic double-six draw dominoes adds a seventh Games Room game. Each side starts with seven
tiles, draws when blocked, passes only with an empty stock, and wins by emptying its hand or
having fewer pips when both sides are blocked. The offline keeper is deterministic and simple.
Independent review found no blocker; 1,000 seeded games conserved tiles and legal chains, and
500 completed rounds replayed identically. Thirty integrated browser checks pass at 390/1440px,
including undo, redo, seed confirmation and offline reload. All 169 other Node checks passed;
the budget check then passed after serving the original invitation SVG instead of a raster
derivative and simplifying tiny-screen Domino styles. Core/JS/CSS limits were not increased.
Human playtesting remains in [HUMAN_TODO.md](../HUMAN_TODO.md). No deployment is claimed.

### Longer casebook candidate

The unfinished invitation adds eight original, independently unique records and a fifth book,
bringing the cabinet to 343 puzzles. Its opening, chapter introductions, solved continuations
and epilogue pass 44 actual-control browser assertions at 390/1440px, including offline reload.
Original vector cover art is generated by `tools/invitation-art.cjs`; no external asset is used.
The chronology separates access from guilt and identifies the plate retriever separately from
the commissioner. Generic scene/witness completion text now reports the constraint result without
calling every answer a culprit. Puzzle-specific questions keep this story's deductions explicit.
Source validation and independent oracles cover all eight records. Human editorial/difficulty
acceptance remains open in [HUMAN_TODO.md](../HUMAN_TODO.md); this candidate is not deployed.

### Lantern Gardens candidate

Six original 6×6/7×7 region boards add the requested row/column/colour placement game.
Each has one lantern per row, column and lettered region, with no touching even diagonally.
The full board is partitioned into regions; empty squares are intentional in this interpretation.
Tap cycles lantern/exclusion/empty. Completion, undo/redo, level confirmation and offline saves
use the Club replay contract. Runtime layouts omit authoring answers. Independent enumeration
proves unique solutions and connected regions. Full source verify passes (162 Node tests plus
supplementary suites); 30 browser assertions pass at 390/1440px including completion and offline
reload. Physical-device and human difficulty acceptance remain in [HUMAN_TODO.md](../HUMAN_TODO.md).
This brings the candidate to six Games Room games; it is not yet deployed.

`codex/player-feedback-september` starts from `541ba1e`. The complete incremental queue is
in [PLAYER-FEEDBACK-2026-09.md](PLAYER-FEEDBACK-2026-09.md). Scene taps now cycle placement,
candidate, exclusion and board cross while preserving other annotations. Placed people's
candidates are hidden without deleting them. Hold menus have visible button equivalents.
Local evidence: full verify (150 Node tests plus supplementary suites), 182 original UI checks,
player-feedback suite at 390/1440px, the new seven-tap/hold/undo/offline matrix at both widths,
and 92 real-origin checks. Phone and desktop screenshots were inspected. The first origin run
overlapped a build that replaces `dist` and encountered a 404 during startup; the rerun against
the settled build passes. Do not rebuild the served output during browser suites.
Progress accounting now uses earned completion consistently: solving then Undo or Restart
retains Solved and excludes the record from In progress/Not started and the desk resume list.
The actual-control feedback suite proves solve → Undo → reload → filters → Restart at both
widths; the full Node gate passes. This is a local candidate, not a published release.
Larger puzzles, sound, discovery, case content and Games Room additions remain queued.
Nonograms now expose the existing reversible tidy projection beside Fill/Cross/Erase as
“Auto-cross completed lines.” The new browser matrix proves row crosses, premise removal,
manual-mark preservation, undo/redo and offline preference restoration. Scene menu labels
escape custom names, with a markup-name browser regression. Independent Luna reviews approved
progress and scene behavior after that escaping fix; an initially reported cycle-loop concern
was withdrawn after a correct-build remeasurement. New regression coverage runs in CI.
Human acceptance stays in [HUMAN_TODO.md](../HUMAN_TODO.md).

### Family-first browsing candidate

`codex/feedback-discovery` follows the first feedback slice in PR #84. Puzzle cards now lead
with distinct family diagrams and symbols; a small collection stamp follows the details.
Sudoku's 9×9 motif differs from Futoshiki, and Bridges depicts islands and links. No answer is
read by the art renderer. Room sound/motion/edition controls are behind a keyboard-operable
Room settings disclosure, whose open state survives background renders. Films remain farther
down the home page under “Optional short films.” Pocket Borough's plot/build enabled-state
transition passes; no specific functional defect was reproduced from the ambiguous report.

Local evidence: full verify with unchanged download budgets, 182 UI checks, 90 theatre checks,
library keyboard suite and new 390/1440px discovery/control matrix. Phone/desktop screenshots
were inspected; collection stamps moved below the artwork after the phone preview showed
they obscured the diagram. Audio quality is not addressed by this presentation slice; recorded
ambience sourcing is underway separately. Tic-tac-toe and 15×15 Nonograms are in isolated worker
checkouts. No new hosted release is claimed.
Independent review reproduced focus loss on the Room settings summary during background
refresh. A stable summary identity fixes it; the storage-event regression passes at both
widths, and the scoped artwork checks and download budget remain green.
Connector review also caught stale image assertions in the required asset browser suite and
the Quiet Wing's separate render path. Asset checks now assert family diagrams and collection
stamps; the Quiet Wing keeps its room link directly visible without a disclosure. The actual
asset/gallery suite and phone/desktop discovery suite pass. CI's prior red run failed on the
replaced image assertion; it was not a runtime or storage failure.

### Recorded ambience candidate

PR #84 is merged at `4d6feca`. PR #85 targets main after the focus fix. The next sound slice
removes main-room procedural noise and game tones. Optional CC0 window rain and beach waves
have checked-in sources, hashes and a reproducible FFmpeg recipe in `assets-source/ambience`.
The two optimized recordings total about 220 KiB and are excluded from the initial shell.
Play attempts to retain them for later offline use; unavailable audio stays silent. Volume,
stop and secondary settings remain explicit. Source licences are recorded; human listening,
physical-phone playback and hosted delivery are not yet verified.
Local evidence: full verify (152 Node tests plus supplementary suites), 96 theatre browser
checks and 92 real-origin checks. Rain/waves play, volume changes, downloaded offline playback
and unavailable-audio silence pass. Phone and desktop controls were visually inspected.
Independent review found no blocker; the standalone empty-selector/copy finding is tracked
as [issue #86](https://github.com/Chris0Jeky/Alibi/issues/86).

### Tic-Tac-Toe candidate

The Games Room now includes Tic-Tac-Toe against an exhaustive offline opponent or another
player on the same device. Legal replay validation, undo/redo, local records and backups extend
the existing Club contract. Original engine source remains readable; hosted Club and validator
worker bundles use the existing esbuild minifier to preserve the core download budget.
Full verify passes (152 Node tests plus supplementary suites), including 22,792 Club assertions.
The actual-control suite passes 17 checks with a real-origin offline reload; backup-worker
checks pass. Phone/desktop boards were visually inspected. Independent review is underway;
hosted delivery and physical-device acceptance remain pending in HUMAN_TODO.md.

### Larger Nonogram candidate

Four additive 15×15 boards bring the candidate catalogue to 332. Existing definitions and
revisions are unchanged; size15 is permitted only for Nonograms, while other bounds remain.
Independent row-pattern and production solvers prove uniqueness within the declared limits.
Large boards open enlarged, offer four pan buttons and retain visible clue margins in a bounded
scroll area. Phone/desktop controls, auto-crosses, undo and offline reload pass; screenshots were
inspected and clue text enlarged after the first preview. Full verify passes 154 Node tests plus
supplementary suites; the original 182 UI and 92 real-origin checks pass. Browser catalogue counts
now derive from the checked-in registry, including the additional custom-puzzle assertion.
The pure-engine review found no blocker. UI integration review and human difficulty sampling
remain pending. PR #85 is merged; recorded ambience is PR #87 and Tic-Tac-Toe is PR #88.

Three additive Expert 9×9 Sudoku boards bring the combined candidate to 335. Expert is a shared
validated difficulty label, displayed with four bars and an explicit provisional qualifier.
Independent uniqueness checks pass; production search uses 6,634–7,515 nodes versus 1,767 for
the hardest existing Tricky Sudoku. This is comparative machine evidence, not human calibration.
The integrated 155-test source gate, Expert filter/placement at 390/1440px, larger-grid regression
and library keyboard suite pass. The original books and published puzzle definitions remain intact.

### Block Cabinet candidate

The fifth Games Room engine is an original seeded 8×8 block-placement game. Each placement
draws a replacement tray piece; completed rows and columns clear together. No rotations,
timer or promise of endlessly solvable seeds is implied. Strict Club replay validation, undo,
redo and score records use the existing save contract. Full verify passes 159 Node tests plus
supplementary suites; 32 actual-control checks pass, including phone/desktop offline reload.
Both layouts were inspected, and backup-worker checks pass. Independent review and physical-device
acceptance remain pending.

## Focused QA 0.10.1 published

The patch preserves focused library cards through background rerenders (#75) and keeps
collection selectors usable from the keyboard, including the removed Show all escape (#71).
A controlled storage event reproduces BUTTON-to-BODY focus loss in the published 0.9.1 build;
the fixed build retains the same puzzle, viewport and Enter action. This isolates the rendering
defect without claiming the original hosted service-worker event sequence is known.

The authoring generator also preserves editorial puzzle/book order and complete catalogue
headers while appending new seeds (#69). Disposable regressions cover reordering, middle
insertion, custom metadata and duplicates. No published puzzle definition or save identity changes.
The combined 0.10.0 base and 0.10.1 metadata pass source verification (148 Node tests), 182 UI
checks, 53 library keyboard checks, 20 discovery checks and the narrow-layout matrix.
Independent reviews found no blocker. PR #81 merged at `900816a`; build `3161ffd2958c` is
published on both existing origins after all four final CI checks passed. Each origin passes
92 storage/offline checks, 53 library keyboard checks and the actual 0.10.0-to-0.10.1 save/update/
offline transition. The primary passes discovery and narrow-layout checks. Published file hashes
match, allowing only the documented fallback HTML challenge insertion. Issues #69, #71 and #75
are resolved; #72's focused CI artifact retention is verified and merged through PR #74.
See [RELEASE-0.10.1.md](RELEASE-0.10.1.md) and [HUMAN_TODO.md](../HUMAN_TODO.md).

## Wrenmere 0.10.0 published

PR #73 merged at `bcd95fdef4b47fb4b61a41b2c1385406aed57f2d`; build `5b0d056fe08b` is
published on both existing origins. All eighteen original draft-stack commits (#39–42) survive
alongside the 0.9.1 player fixes. Chapter I now has ten questions, twelve original scene
SVGs, consistent map layers, nearby doors, visible objects, an optional captioned prologue,
three museum label reviews and eight revisable evidence-linked hypotheses. The secret stair
stays absent from the map, directory and search until its deduction.

All 328 official puzzles feed thirteen room familiarity tracks with 39 starter links. Three
first solves reveal a small room detail; hints count and restarting retains earlier completion.
The adapter validates committed official definitions and passes metadata only. These discoveries
never award story evidence or cross-game entitlements.

Notebook import uses the bounded worker, reviewable merge/replace, an atomic pre-restore copy
and stale-record checks. The actual Save & update control rejects a protected notebook until
an exact export is explicitly acknowledged; the exported notes can then be recovered on the
new release. Cabinet, Club, Quiet Wing, challenge and castle state remain separate.

Full CI and independent review pass. Each hosted origin passes 92 storage/offline checks and
all five castle suites, including the complete chapter, recovery, investigation, media and
practice. Both actual 0.9.1 → 0.10.0 upgrades retain exact saved state and pinned definitions
through activation and offline reload. All release files match, with the documented hosting
challenge addition on fallback HTML. See [RELEASE-0.10.0.md](RELEASE-0.10.0.md). P2 follow-ups
#79/#80 cover exact starter focus and repeated note-section deduplication; no data was lost.

The supplied folder is mapped in [RESOURCES.md](castle/RESOURCES.md): 69 files, all 68 supplied
checksums matching, with complete design references preserved. Start with the [strategy](castle/STRATEGY.md),
[continuation records and proof graphs](castle/CONTINUATION.md), and [deferred pet/garden/city plan](castle/DEFERRED-REWARDS.md).
Chapters II–V and creative reward connections remain planned. [HUMAN_TODO.md](../HUMAN_TODO.md)
tracks physical Android, TalkBack, comfort and new-player acceptance, including castle q-7.

## Small-screen and keyboard QA 0.9.1 published

The 0.9.1 release addresses reproduced 320px large-text player overflow, tiny Desk assistant
controls and library-action focus loss. The expanded layout matrix includes full-size Sudoku,
scenes and aquariums, actual assistant controls and 44px targets. Player history includes the
patch. PR #70 merged at `8641b3e`; build `efb6b034ac62` is published on both existing origins.
Both full CI runs pass. Each host passes 92 storage/offline checks and the actual 0.9.0-to-0.9.1
save/update/offline transition. The primary passes discovery and narrow-layout matrices.
The hosted library pagination matrix exposed timing-dependent focus loss (#75); a controlled
background-render regression confirms focus loss, while the original hosted event sequence
remains unproven. Collection-settings
focus (#71) and focused CI artifact retention (#72) are separate tracked follow-ups.
See [RELEASE-0.9.1.md](RELEASE-0.9.1.md) for that historical release. Wrenmere 0.10.0 is recorded above.

Generator follow-up (#66): the development generator preserves checked-in puzzle definitions
and casebooks, including later editorial corrections and extra books absent from its seeds.
A disposable regression deliberately changes a chapter brief and adds an anthology, then proves
both survive generation. The runtime catalogue is unchanged. Hosted 0.9 release details follow.

Future editorial order and catalogue-header preservation are tracked separately in #69.

## Discovery and history 0.9.0 live; iterative QA continues

PR #65 merged at `92565a4a064c02dae00dd3bd80678ecaaaf91cd4`. Build `f0b367c654a4` is published on
both existing origins. Illustrated collection invitations, recent-feature cards and offline
version history are available from the desk/library/footer. Bridges direction, inherited crop
identifiers, Quiet Wing focus/motion and anthology framing fixes are integrated and published
(#9, #15, #36, #61, #62). The scoped Sharp override resolves #58 and installs under the CI runner's
npm 10.9.8 with zero audit findings. [CHANGELOG.md](../CHANGELOG.md) and GitHub releases include
the historical public versions, retaining their original source identities and receipts.

Both complete CI runs passed. Each live origin passed 92 storage/offline checks; the primary
passed 20 actual-control discovery/history checks at phone/desktop widths. The real 0.8.2-to-0.9.0
Save & update transition passed on both sites, preserving an extra move, exact state and pinned
definition through offline reload. This resolves the previously unverified fallback transition
tracked in #63; it does not establish the cause of the earlier timeout. See [RELEASE-0.9.0.md](RELEASE-0.9.0.md).

The ongoing strategy and remaining acceptance are in [POLISH-QA.md](POLISH-QA.md). The generator
follow-up above addresses #66. The separate active task **Explore Alibi castle expansion**
owns Wrenmere implementation and its checkout; do not duplicate or mutate that task's work.
Physical-device and owner acceptance stays in [HUMAN_TODO.md](../HUMAN_TODO.md).

## Player-feedback QA 0.8.2 live

The complete feedback slice and keyboard-focus follow-up are published on both existing origins.
PR #60 merged at `c42a3886ac1ca87cb666fe57b246f51a3e185213`; build `d4e57ffe54f5` is live.
Both complete exact-head CI runs pass. Each current live origin passes 92 storage/offline checks,
and the primary passes the player-feedback matrix at phone/desktop widths. The primary live
0.8.1-to-0.8.2 Save & update test preserves exact state and pinned definitions through offline reload.
The fallback probe timed out waiting for its update-ready signal; its old-to-new transition is
not certified. The initial fallback file sweep briefly received a 404 for the new app script;
a complete recheck matches every non-HTML asset. The connection to the timeout is plausible but
not proven by a worker trace. [Issue #63](https://github.com/Chris0Jeky/Alibi/issues/63) records this gap.
See [RELEASE-0.8.2.md](RELEASE-0.8.2.md). Anthology framing (#61), Quiet Wing/native-link focus (#62)
and physical-device acceptance in [HUMAN_TODO.md](../HUMAN_TODO.md) remain open.

CI recovery: repeated hosted attempts failed before app tests on a Google Chrome APT index
checksum mismatch ([#59](https://github.com/Chris0Jeky/Alibi/issues/59)). The candidate workflow
now pins Ubuntu 24.04 and uses its existing Ubuntu source definition for all APT calls, including
Playwright's dependency installation. Package verification and every test remain required.
Both complete exact-head runs passed, and [PR #57](https://github.com/Chris0Jeky/Alibi/pull/57)
merged at `3a36ce255104ffff961a2fbdc4f5f3ea54632b5b`. Issue #59 is resolved.
Build `653a01d17507` is published on both existing sites. Each passes 92 live-origin
storage/offline checks. All 254 primary public files match; all 250 fallback non-HTML files
match, and its four HTML files preserve the source plus the known 938-byte host challenge.
The attempted live 0.8.0-to-0.8.1 upgrade probe ended without a final receipt, so that exact
transition is not claimed verified. Full CI includes the two-release update suite.
See [RELEASE-0.8.1.md](RELEASE-0.8.1.md) for publication evidence.

The `codex/route-focus` 0.8.2 change gives internal page navigation a destination
focus target while preserving first-play modal focus, search editing and direct-load behavior.
Terra reproduced the defect and verified the fix at phone/desktop widths. Independent Luna review
found no blocker; two adjacent P2 focus paths were explicitly retained in issue #62.

`codex/player-qa` starts at `f3414f6`. Family-first browsing, visible collection-filter escape,
clearer rules and cell-note controls, placed-digit feedback, saved scene candidate initials and
independent board crosses, and dedicated casebook story pages address two players' feedback.
Four new unique 8×8 Sun & Moon boards bring the aggregate to 328 puzzles (27 Sun & Moon).
All earlier definitions, catalogue IDs/revisions and storage identities are preserved.

The owner reports two real players loved the game: successful early qualitative playtesting.
This does not certify the earlier Android incident or replace measured difficulty/accessibility
acceptance. [HUMAN_TODO.md](../HUMAN_TODO.md) remains open for those specific checks.

Plan and evidence: [PLAYER-QA.md](PLAYER-QA.md). Future narrative seed:
[FUTURE-CASES.md](FUTURE-CASES.md). Separate Wrenmere PRs #39–42 are not integrated.

## Theatrical edition 0.8.0 live

PR #26 merged as `adb4f5d` after both exact-head CI runs passed. Build `c8ea40a83be7` is live on
the existing Cloudflare primary and Sites fallback. Eight complete local
rooms combine original painted artwork, line emblems, weather, procedural room sound, five
source-verified photographic alternatives and four deliberately played films. The existing
interactive Field notes library remains available through its own optional pack. Delivery uses
nine verified enhancements and eight concurrent-safe cache slots. CSS minification preserves
all existing core/JS/CSS/Wing budgets. No published puzzle definitions or save identities change.

The 88 new theatre checks, 16 delivery checks, 182 puzzle UI checks, 92 real-origin checks,
66 curation checks, 158 Quiet Wing checks, Field notes and After Hours suites pass locally.
All five real photo endpoints returned the pinned WebP bytes through browser CORS checks.
Independent reviews and bounded fixes are recorded on PR #26. Both live origins pass 92 storage/
offline checks and the real 0.7-to-0.8 Save & update test with pinned puzzle state preserved.
All 254 primary public files match exactly; all 250 fallback non-HTML files match exactly, and
its four HTML files preserve the original content plus the host's challenge-script insertion.
The primary passes 88 theatre checks. Five photo providers pass CORS/fingerprint checks from both hosts.
The Sites fallback's missing response headers and generic WebP/Ogg/model MIME types remain #6;
its same-origin enhanced image is correctly rejected when providers are blocked, retaining the painting.
The corresponding primary-mirror theatre test is not claimed to pass on Sites.
Document CSP/referrer policy provides the supported document-level protection.

PR #26 closes #5, #12, #16, #18, #22, #23 and #28; #7 was superseded. Late nonblocking review
follow-up #36 preserves the Wing's separate motion choice when the root setting permits motion.
Root Reduce motion still suppresses animation. This limitation and physical-device acceptance
remain open; see [RELEASE-0.8.0.md](RELEASE-0.8.0.md) for the exact deployment receipts.

See [THEATRICAL-EDITION.md](THEATRICAL-EDITION.md), [ASSET-DELIVERY.md](ASSET-DELIVERY.md) and
[ONLINE-ASSETS.md](ONLINE-ASSETS.md). [HUMAN_TODO.md](../HUMAN_TODO.md) remains open for physical
Android, TalkBack, sensory quality, sustained performance, licensing and player judgement.

All sections below are historical checkpoints. The live release and current limitations are above.

## Adaptive delivery 0.7 source checkpoint (historical; merged in PR #27)

`codex/adaptive-assets` starts from `ae5d127` and implements the policy in
[ASSET-DELIVERY.md](ASSET-DELIVERY.md). Museum interludes retain complete 600px artwork in the
core and progressively decode verified 1600px detail from optional release files. The loader
supports one approved CORS mirror plus the same-origin copy, bounded requests/storage, a separate
image cache and a persistent compact-only preference. No external mirror is configured.
Quiet Wing pack downloads no longer hold the navigation/save-flush operation open.

Local build `ca81380b205a`: core 1,863,504 bytes, initial JavaScript 102,444 bytes gzip,
optional enhancement images 2,331,656 bytes; all existing budgets pass without increases.
Local verification: full format/build/Node gate, 182 puzzle UI checks, 92 real-origin checks,
66 curation checks, 18 two-tab update checks, and 16 new adaptive-delivery browser checks.
Phone-sized and desktop gallery screenshots were visually inspected. Node regressions additionally
cover CDN failure, invalid/oversized/partial responses, hashes, quota denial, timeouts and
nonblocking activity disposal. Evidence is under `tests/delivery-*.log` and `test-results/delivery/`.

The ready [PR #27](https://github.com/Chris0Jeky/Alibi/pull/27) contains two implementation/strategy
commits plus review reconciliation. Independent read-only review found no blockers; its low-risk
cross-tab optional-cache target race is tracked in [#28](https://github.com/Chris0Jeky/Alibi/issues/28).
This is source/local acceptance, not a new production deployment. Hosted CI, actual external-mirror
CORS and physical-device performance remain distinct gates. [HUMAN_TODO.md](../HUMAN_TODO.md),
particularly q-2/q-4, remains open; no subjective owner checks have been closed.

## Historical 0.7 deployment: Cloudflare primary, Sites fallback

Owner decision 2026-09-09: the main play URL is
**https://alibi-after-hours-preview.commit-atlas.workers.dev/**. The original
**https://alibi-puzzle-club.jeky-tck.chatgpt.site/** is the fallback. Preserve both existing origins;
saves are not shared or silently migrated. `wrangler.jsonc` owns primary deployment and
`.openai/hosting.json` owns the fallback. New links and GitHub metadata use Cloudflare.

Curation Cabinet 0.7.0, build `447f3b3b8ddc`, merged as `ad284c7` and deployed to Cloudflare
version `f69a51d1-d410-450f-859e-c9716093f482`. Both final source CI runs passed. Cloudflare passes
92 HTTPS persistence/offline checks, 66 curation checks and emitted-file hash/header verification.
Sites fallback version 5 also deployed successfully. Its actual 0.6.0-to-0.7.0 upgrade preserved
the saved move and pinned puzzle definition, followed by a successful offline reload.
See [RELEASE-0.7.0.md](RELEASE-0.7.0.md) for exact evidence,
limitations and rollback references. [HUMAN_TODO.md](../HUMAN_TODO.md) remains open.

## Curation Cabinet integration evidence

The isolated `codex/curation-cabinet` integrates the final asset commit `3dddb47`, 208 new core
puzzles in thirteen bounded packs, and 59 separately versioned challenges. All 116 published
puzzles and legacy fixtures are unchanged; the official aggregate contains 324 puzzles.
[CURATION.md](CURATION.md) records source identity, budgets and reproduction. Trusted editorial
notes bind by ID/revision; answer notes require completion, and unsolved cards use venue covers.
Four object-level Met Open Access images have recorded hashes, credits and 600px runtime copies.
The unavailable Monet candidate is documented. Difficulty remains provisional; absent times are
not replaced by fabricated estimates. Earlier film footage is explicitly dated to the 116-puzzle edition.

The challenge launcher is in the optional Quiet Wing, with validated fixed starts, replayed logs,
locked givens/prefixes and separate challenge backups. Restore uses the existing timed worker.
Independent review found a future-record overwrite and the fix now refuses writes both after
failed reads and inside the transaction; real IndexedDB tests prove preservation. Core/editorial
review found no blockers. The combined repository check, supplied 324 and 59 checkers, 182 new
mobile controls, 66 curation real-origin checks and every challenge mechanism at phone/desktop
widths pass. Visual inspection also caught missing challenge grid styling; explicit spatial
row/column assertions now cover grid mechanisms and the shipped phone/desktop queen board.
Linux CI exposed narrow navigation min-content overflow; phone rail labels now wrap within their
flex cells. Final-head CI and publication evidence will be recorded in the PR/release receipt.
Release closeout fixes #20 (Duel forcing-opening completion) and #21 (occupied warehouse goals),
adds coordinate/state names to queen and knight controls, retains challenge sessions across
Quiet Wing remounts, and awaits challenge writes before updates. Session/protected challenge
stores refuse updates until exported or resolved. Real-control regressions pass. The release
fixture now locates configuration after other globals, and keeps its disposable Chromium profile
short enough for Windows service-worker storage; all 18 two-release checks pass.
Challenge reads now wait for pending writes before remounting; the immediate-two-write regression
and focused independent review pass. Remaining backup-scope wording and Duel/Borough coordinate
labels are tracked in [#22](https://github.com/Chris0Jeky/Alibi/issues/22).

The remaining bundle inventory has been reconciled: all packs, challenge files, editorial JSON
and 17 venue/icon SVGs match the source; board/solution SVGs and the review studio are reference
material, and the sampler is for human playtesting. No required source payload remains unused.

This candidate does not certify human solve quality or the physical Android incident. Owner
checks remain in [HUMAN_TODO.md](../HUMAN_TODO.md). The original deployment identity is unchanged.

## Local integrated asset experience

`codex/asset-library` builds `a08ee0dba82d`, preserving the 116-puzzle definitions, engine and
save contracts. The produced asset families now have app bindings: Field notes at `#/quiet/folio`
offers 43 modules, three scenes, 32 companion expressions, 24 audio assets and eight film cuts.
Eight existing realm building types now use original library geometry. This pass also produces
four illustrated rooms, six distinct fictional club portraits, and three additional detail models.
The home invitation and Quiet Wing headers use the new imagery; actual companion actions use
the expression artwork while retaining animated 3D. Sounds are deliberate and stop on mute,
backgrounding and disposal. Single-file previews omit unavailable optional media explicitly.

Core offline pack: 1,259,087 bytes (103,722 fewer than the first asset pass); initial JS gzip:
111,373 bytes (15,891 fewer). The automatic optional wing is 2,189,871 bytes. Field notes has a
separate explicit 7,393,439-byte offline copy; films remain streaming-only. Existing budgets pass.
Source masters remain outside the distribution. Catalogue: 104 original designs/compositions,
80 reused designs and 331 derivatives. No push, deployment or new charges in this pass.

Verified: `npm run verify` (52 Node entries plus existing engine/storage contracts), 182 puzzle
controls, 106 Club controls, 156 Quiet Wing controls, 92 real-origin checks, 18 two-release update
checks, 40 Quiet Wing origin checks, 28 realm controls, 14 GPU/lifecycle checks, and 45 integrated
experience checks. Final desktop/phone-sized screenshots were inspected. Independent review's
single-file optional-media finding is fixed and regression-tested; its focused follow-up is clear.
Physical phones/TalkBack, auditory acceptance and external editor interoperability remain open.

See [EXPERIENCE-INTEGRATION.md](EXPERIENCE-INTEGRATION.md), the
[integration ledger](../assets-source/library/integration-ledger.json), and
[HUMAN_TODO.md](../HUMAN_TODO.md). The separate curation task owns `alibi-curation/` and
`.curation-worktrees/`; those inputs are preserved and are not part of this asset pass.

## First asset library pass (historical)

The first asset pass built `fac4d1d1ad6c` from the recorded 0.6.0 baseline. Twelve original
editorial vignette derivatives now illustrate selected puzzle cards; 31 distinct stamp silhouettes
retain the existing six Club and 25 Quiet Wing unlock predicates. Puzzle definitions, IDs, revisions,
engines and saves are unchanged. Zen hides decorative highlights; keyboard focus remains visible.
The reusable production library includes exact category/interface exports and lesson captures,
realm geometry and composed scenes, four layered companion state sets, locally synthesized audio
and authored HyperFrames films. These larger production assets stay outside the game build.

See [ASSET-LIBRARY.md](ASSET-LIBRARY.md), the machine-readable
[production ledger](../assets-source/library/production-ledger.json),
[coverage matrix](../assets-source/library/coverage.json) and
[catalogue](../assets-source/library/catalogue.json). Start `npm run assets:gallery` for the local
inspector on port 8790. All generation used local tools or unchanged existing assets; no new paid
submissions, purchases or credits were used. No push, PR, deployment or public publication is
authorized by this asset session. The hosted release section below describes the earlier release.

The local app passes verification, 182 puzzle UI checks, 106 Club checks, 156 Quiet Wing checks,
92 real-origin persistence/offline checks and 18 update checks. Source-library acceptance includes
actual controls, decoding, hashes, spoiler filtering, simulated mobile/desktop views and all 32
companion state previews. Final production checks and limits are recorded in the ledger.
Core offline pack is 1,362,809 bytes (+33,344); initial JS gzip is 127,264 (+2,126); optional Quiet
Wing is 1,977,995 (+51). Budgets were not changed, and core headroom is only about 340 bytes.
Auditory acceptance, physical phones/TalkBack, sustained device performance and external editor
interoperability remain unverified. [HUMAN_TODO.md](../HUMAN_TODO.md) stays open for those checks
and owner licence/name decisions. This local candidate does not certify the reported phone freeze.

## Hosted release 0.6.0

Build `f7c4ef0b6961` includes the source-integrated Quiet Wing, modular seeded city, animated
companions, four additional relaxing boards, expanded idle garden and three newly curated
museum artworks across Club, collection and conservatory. No published puzzle definitions,
public origins or database identities changed. PR #14 merged 30 incremental commits as `6696546`.
`npm run verify` passes; the visual-refresh suite passes 43 real-image/navigation/viewport checks.
Both final source CI runs passed at `8e76e23` (6m42s and 7m10s), with independent reviews and
the blocking backup-validation and ambiguous-storage-open findings resolved. Sites version 4
deployed successfully on 2026-09-08 at the original public origin. The actual installed-profile
upgrade from live build `134d93f3d854` preserved puzzle and Club town state, then reloaded offline.
See [RELEASE-0.6.0.md](RELEASE-0.6.0.md) for exact source, deployment, evidence and rollback details.
Physical-device gates remain in HUMAN_TODO.md; browser checks cannot certify the reported phone freeze.

Measured sizes: initial JavaScript 125,138 bytes gzip, core offline pack 1,329,465 bytes,
optional wing 1,977,944 bytes. Existing core/initial budgets pass; the optional 2,250 KiB budget
includes the renderer, models, three animated animals and museum assets. No runtime asset CDN.
Three Met originals and their public-domain records are retained under assets-source/atmosphere.
Adobe returned HTTP403, image generation failed connection, and AIC images challenged requests;
verified Met downloads supplied the final art without bypassing those services.

Residual review finding: [#15](https://github.com/Chris0Jeky/Alibi/issues/15), MEDIUM malformed
crop identifiers in hand-edited imports. Ordinary controls/saves do not create them. Physical
Android recovery, assistive technology and editor interoperability remain explicitly open.

Late review: combined backup parsing and all three section validators now run in the existing
25-second worker. Cabinet and Club validation share the same pure functions as normal reads;
the UI does not execute the optional activity merely to stage a backup. The browser regression
exercises successful staging, malformed input and a deliberately stalled worker with no writes.
The original real-origin recovery/update suite remains green. CI exposed an artwork test matching
the departing route's shared selector; destination-document visual checks now pass locally.
Additional MEDIUM preference, standalone-credit, slow-cache exit and unprimed offline combined
export findings are tracked in [#16](https://github.com/Chris0Jeky/Alibi/issues/16), with workarounds.
Ambiguous IndexedDB open failures, including timeouts, now remain protected instead of starting
a competing writable fallback. Only explicitly unavailable or denied IndexedDB can use the
existing fallback. Regression coverage verifies refusal, no fallback creation and exact recovery
of the original committed save after a successful retry.
CI reproduced a deferred garden image that never decoded on one Linux runner while the parallel
run passed. The single garden image now loads eagerly inside the already-lazy activity; its
browser decode assertion has a ten-second deadline and failure diagnostics. No optional activity
code or models are loaded on the cabinet by this change.

## Quiet Wing expansion (historical; superseded by 0.6/0.7 releases)

The owner has requested an end-to-end enhancement and deployment, beyond the source candidate.
See [QUIET-WING-EXPANSION.md](QUIET-WING-EXPANSION.md) for the full outstanding scope.
First layer: reproducible harbour/river/hillfort/woodland worlds up to 28 × 28 plots, preview before
replacement, castle/village/farm plans, routed roads and bridges, move/copy, area brushes and town
feedback. Existing 14 × 14 saves remain valid without migration. Whole edits undo together.
The next layer imports 24 CC0 models, adds six castle modules and assembles houses from separate
walls, windows, doors and roofs. Locally bundled WebGL adds lighting, cached soft shadows and
bounded water animation, with usable Canvas fallback during graphics-context loss. Source credits
are now versioned across release updates. Local build `5f6c84697208` passes `npm run verify`, ten
city/model tests, 28 actual city controls, 14 GPU lifecycle checks, all 156 Quiet Wing controls and
36 origin/restart/recovery checks. Phone, desktop and fallback screenshots were inspected.
Independent Terra high review found no defects. Physical performance remains unverified; local
headless rendering was slow enough to justify automatic ambient-motion pausing. Companions,
additional games, wider visual refresh and deployment remain active work; no expansion release
or physical test is claimed. The earlier source-candidate evidence below is historical.

Companion slice at build `26a3c7354c8b`: cat, fox and owl use locally bundled animated GLBs;
Nimbus is an original articulated model. All saved identities, nicknames, affection and strolls
use the existing state. Live affection labels now refresh immediately. The view falls back to
the existing illustration on download/WebGL failure or context loss, and disposes on navigation.
Local browser checks cover all four models/actions, reduced motion, hidden-page pause, offline
reload with names retained, route disposal and narrow viewport. All 156 existing Quiet Wing
controls and 36 origin/update/recovery checks pass with these changes. Desktop/phone portraits
were inspected. Independent Terra high review found no confirmed blockers. Optional offline pack
is 1,952,850 bytes; the initial script is 124,033 bytes gzip and core offline pack 1,159,001 bytes.
No external image requests, CSP relaxation or new database identity. Hosted/physical evidence
remains outstanding. Broader games, artwork and release work remain in the expansion plan.

Relaxing-games slice at `d778361bf3c9`: Tideglass has two finite colour-pouring boards with
symbol alternatives and bounded current-board search; Pressed Meadow and Beachcomber have
two illustrated pair boards with persistent reveals. Every new board completes through real
controls, undo/reload work, and all four completion records survive an offline reload. Four
focused reducer tests and `npm run verify` pass. Existing games retain their IDs and records.
New original botanical/coastal motifs are included locally. Phone/desktop captures inspected;
physical interaction and the final hosted release remain separate gates.

Garden slice at `4c2c4aabc558`: six seeds, a species collection, three reusable pressed-flower
slots, title and setting, batch sow/gather and a valid SVG postcard export. Original three growth
durations, planted timestamps and historical keepsake totals stay intact; historic species are
not invented. Node tests cover rollback clocks, bounded growth, one-time harvests, old saves and
arrangement validation. Sixteen actual browser checks cover controls, safe batch operations,
undo, SVG parsing, offline save/reload and narrow layout. Growth time is advanced only through
an explicitly labelled test fixture. `npm run verify` passes. No hosted/physical claim.

Road polish at `33ef49b1ea88`: shared paving follows neighbouring roads, gates and bridges,
with raised transitions to adjacent higher plots. Cliffs and row boundaries do not connect.
The new geometry regression, full verify, 28 city controls and 14 GPU/fallback checks pass.
Postcard inputs now have the same readable sizing and 44-pixel minimum as other touch controls.

## Quiet Wing source candidate (historical; superseded)

- **0.6.0-lab.1**, build `ba0a721c3f89`, on `codex/quiet-wing`. Seven incremental implementation/test
  commits precede the handoff commit. See [QUIET-WING.md](QUIET-WING.md) for source disposition,
  actual evidence, asset receipts and recovery. No Quiet Wing hosted release is claimed.
- Native `#/quiet/…` activity boundary, Shadow DOM isolation and disposal, root-owned updates,
  optional offline pack, future-save raw recovery and combined backup discovery with staged
  per-section restore. All existing puzzle/Club identities and both hosting configurations remain.
- All 209 delivered input hashes match. Four museum images fetched from official endpoints,
  public-domain flags verified, originals/receipts retained, optimized WebPs decoded and inspected.
  The downloaded Kenney 2.0 pack remains reference; only the supplied verified keeper sprite renders.
- Local checks pass: existing Node gate plus 95,459 parameterized Quiet Wing checks and 20 storage
  checks; 156 real-origin controls; 34 origin/restart/offline/update/recovery checks. Existing browser
  UI/Club/origin/expedition/restart/boot/update and local two-browser rooms all pass. Independent
  Terra high review found no blockers. Hosted CI state belongs to the PR, not a presumed success.
- Remaining gates: [#13](https://github.com/Chris0Jeky/Alibi/issues/13), affected Android freeze [#11](https://github.com/Chris0Jeky/Alibi/issues/11),
  physical TalkBack/gestures/performance, actual hosted preview/update/rollback, OBJ editor import,
  and human curation. [HUMAN_TODO.md](../HUMAN_TODO.md). Do not clear site data to recover.

## After Hours candidate

- Source milestone: **0.5.0-preview.1**, 116 preserved puzzles, thirteen original engines,
  four casebooks, three additional games and six Archive rooms. See [AFTER-HOURS-MAP.md](AFTER-HOURS-MAP.md).
- All 74 bundle delivery checksums match. Full source-file disposition is in the linked inventory.
- New: four desk editions, opt-in reversible assistance, game journal, Zen, Canvas harbour,
  separate Club storage with atomic recovery, lazy precached assets and optimized original art.
- Phone incident: owner confirms Android installation and initial play, then repeated freezes
  after The last service and other scenes. Indefinite storage open/transaction waits are fixed;
  exact device cause is unconfirmed. Recovery preserves progress. The physical retest remains open.
- Local verification: full Node gate passes, 182 original UI checks, 106 Club checks, 92 origin
  checks, 247 expedition checks. All 19 scenes survive real-control completion and reload; the
  restart suite also repeats The last service three times, restores Club data with a recovery copy,
  restarts the browser process and reloads offline. Six startup recovery checks verify that app-file refresh preserves IndexedDB, localStorage
  and unrelated caches; 18 two-tab update checks pass. CI re-runs these against the final candidate.
- Optional rooms: 89 serial protocol assertions plus two-browser local Wrangler acceptance,
  including a deliberately lost join response. Source is integrated; hosted service is not enabled.
- Cloudflare: authenticated existing account confirmed; static and room dry-runs pass.
  `wrangler.jsonc` selects a separate `alibi-after-hours-preview`; the original Sites origin remains.
  Publication and exact hosted evidence are recorded in the 0.5.0-preview.1 release receipt.
- Workflow: smaller present-tense commits on `codex/after-hours`, one independent review, green CI
  and merge with preserved history. Owner requested Luna xhigh / Terra high selection for this wave.
- Not verified: physical Android freeze resolution, TalkBack, physical two-device online rooms,
  Android/iOS native stores, human difficulty calibration. [HUMAN_TODO.md](../HUMAN_TODO.md).

## Previous Bellweather expedition

- Source milestone: **0.4.0**, build `75e0b6c45a12`, 116 puzzles, thirteen engines, four casebooks.
- Public repository: https://github.com/Chris0Jeky/Alibi
- Play origin: https://alibi-puzzle-club.jeky-tck.chatgpt.site
- Publication receipt: [0.4.0 release](https://github.com/Chris0Jeky/Alibi/releases/tag/v0.4.0).
  The receipt records the deployed source SHA, hosted acceptance and downloadable artifacts.
  If absent, publication is pending; the earlier 0.3.0 release remains the live receipt.
- New: four original illustrations, richer case files and chapter atmosphere, the six-record
  Bellweather investigation, and eight original Tidal bridges maps with a bounded engine.
- Bridges includes touch/keyboard controls, a miniature lesson, visible-count deductions, explicit
  reveals, save/import/offline integration and an independent brute-force test oracle.
- Save feedback now retains “Saving…” until all queued writes finish.
- All 102 earlier definitions are unchanged as JSON values, with stable IDs and revisions.
- Main requires green `verify` checks and resolved review conversations; force pushes, deletion
  and squash merging are disabled. Authority remains in `.agent-harness/tier.json`.

## Evidence

- `npm run verify`: 1,882 engine/content assertions, 27 storage assertions, 33 worker/build
  assertions, ten independent Bridges tests and seven hint/recovery regressions. All pass.
- Chromium: 182 isolated UI checks across thirteen families and four viewport widths;
  92 real-origin checks; 18 A/B update checks; 247 expedition checks. The expedition suite
  completes all fourteen new puzzles via real controls in a fresh 390px persistent profile.
- Expedition coverage includes double-bridge cycling, keyboard selection, undo/redo, a deliberately
  delayed save, committed-save reload, offline moves, incorrect accusations, lessons,
  six chapter revelations and the ending. Each run gets a fresh evidence folder.
- Independent Luna medium review found no confirmed blockers in the new engine, UI or narrative.
  A focused follow-up approved the pending-save counter. Stale-copy observations were corrected.
- Mobile home, case file and largest bridge chart were visually inspected. Clipped edge islands
  and low-contrast chapter text were corrected and the expedition suite rerun.
- Hosted CI and public-origin results belong in the release receipt. Physical Android,
  iOS, TalkBack and human difficulty calibration remain unverified.

## Earlier follow-up inventory (historical; current release status above)

1. Human-playtest Bellweather and Bridges; see [BELLWEATHER-CURATION.md](BELLWEATHER-CURATION.md).
2. [#1](https://github.com/Chris0Jeky/Alibi/issues/1): curate the earlier Briar House anthology.
3. [#2](https://github.com/Chris0Jeky/Alibi/issues/2): physical Android acceptance before packaging.
4. [#3](https://github.com/Chris0Jeky/Alibi/issues/3): estate registration and legacy contract follow-up.
5. [#5](https://github.com/Chris0Jeky/Alibi/issues/5): older release-report selection/cleanup limits.
6. [#6](https://github.com/Chris0Jeky/Alibi/issues/6): host ignores `_headers` and serves WebP as
   generic binary content. Browsers render the art; configured security/cache headers are not
   enforced by Sites. The provider also injects its own protection code.
7. [#7](https://github.com/Chris0Jeky/Alibi/issues/7): reconsider native artwork encoding dependency.

Start with `AGENTS.md` and [PROJECT-MAP.md](PROJECT-MAP.md). Preserve the play origin and saves.
Prefer bounded Luna work and lower effort for routine checks; the owner asked to reduce costly
subagents. No Astra children.

Owner decisions: [HUMAN_TODO.md](../HUMAN_TODO.md). No browser-publication input is outstanding.

Phone recovery follow-up: [issue #11](https://github.com/Chris0Jeky/Alibi/issues/11).
