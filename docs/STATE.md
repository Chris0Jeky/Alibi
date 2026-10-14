# Live development state

## 2026-10-14: tool buttons keep focus when the board redraws

A play control without an id stays focused when the board redraws. Cell notes and a number key are two of those controls. Pressing N still toggles cell notes. Placing a digit still changes the selected square.

An isolated desktop page showed the old behavior first: after N, focus moved to the page body. After the change, Cell notes stays focused on that desktop page and on a 390px phone page. Number key 2 stays focused after digit 1 is placed. A favorite button is matched by its puzzle id. Removing it from the favorites list returns focus to the page. The next favorite stays on the list. This merge also keeps the save-conflict guard. The asset catalogue records the combined `src/app.js` at 207,494 bytes. `tests/budget.test.cjs` passed on that local web build at 203,392 initial gzip bytes, under the existing 205,248 ceiling. That build was dirty and is not a hosted measurement. Physical devices remain in HUMAN_TODO.md.

## 2026-10-14: save conflicts freeze notes and an open paint stroke

Puzzle notes and a drag that is already on the board no longer keep changing the open run after the save conflict banner is up. The note field returns to the last saved text. An unfinished stroke returns to the board from before the drag. A stroke still cannot start while that banner is showing. Opening notes, and typing them while the save is healthy, stay as they were.

An isolated desktop page and a 390px phone page showed the old behavior first: the note became the typed text, and the interrupted nonogram stroke left the board changed. After the guard, both notes stay put and the board matches the pre-stroke state. A later press does not start a new stroke. That change recorded `src/app.js` at 206,364 bytes and a local web build of 203,234 initial gzip bytes, under the existing 205,248 ceiling. That build was dirty and is not a hosted measurement. Physical devices remain in HUMAN_TODO.md.

## 2026-10-14: board shortcuts leave Ctrl, Cmd and Alt alone

Play-board keyboard handling returns after the existing Ctrl+Z and Ctrl+Y cases when Ctrl, Cmd, or Alt is held. Those combinations no longer place a digit, move the selection, or toggle notes. Shift+Enter on a network tile is unchanged.

An isolated desktop Chromium page places digit 1, Ctrl+Z undoes it, and Ctrl+1 leaves the sudoku state unchanged without cancelling the key. The same page's existing bridge and network keyboard checks pass. `tests/budget.test.cjs` passed on that local web build at 203,163 initial gzip bytes, under the existing 205,248 ceiling. That build was dirty and is not a hosted measurement. Hosted checks at `f3e3a918` failed only the asset-catalogue size pin. That change alone recorded `src/app.js` at 205,965 bytes. Physical devices remain in HUMAN_TODO.md.

## 2026-10-14: storage contract cases

`tests/storage.test.cjs` was one async pass/fail blob under `node --test`. It is now four serial cases: local fallback, session fallback, rejected restore, and a newer IndexedDB. Every previous assertion is unchanged. A full run still records 58 assertions in `tests/storage-results.json`, and that file is written only when all four cases ran and passed. Breaking the local revision check fails that case and leaves the other three passing. Save behavior is unchanged. Issue 519 stays open for any remaining suite that is still one blob. Physical device checks remain in [HUMAN_TODO.md](../HUMAN_TODO.md).

## 2026-10-14: 0.15.2 artwork published

PR #659 merged as `030d5812198507793154568532bc059d5700980f`, closing #655 and
#658. The primary Cloudflare origin now serves 0.15.2, build `ae20e9724548`,
from that clean source; Worker `8ee83c79-94e8-4cd1-aa68-b31fecdd9a0a`.
The public v0.15.2 tag and all 16 release attachments match the qualified
source/artifact hashes. The 301 public files return HTTP200 with exact SHA256,
correct MIME/security headers and an unknown-path 404.

Startup headroom is 2,121 bytes (203,127 against 205,248); deferred content
is 11,490 against 12,288. Six Scene variations use the existing precached
deferred file; all 510 identities/revisions and pinned saves remain intact.
Three optional paintings and navigation/family pictograms are now available
on the primary site. The codec and ceilings remain unchanged.

All hosted acceptance/control lanes pass. Windows full verification passes
1,510 Node tests, Quiet Wing 581,847 assertions and 29 contracts; the merged
build passes focused32, UI187 and origin381. Vault controls pass801; hosted
paintings pass24, durability19, backup/restore32 and offline23. Actual
0.15.1 to 0.15.2 Save & update preserves two Sudoku moves and the pinned
definition, followed by a successful offline reload. Phone/desktop visuals
were inspected; these checks do not certify physical devices.

Pulseboard #231 is merged/deployed, schema5 and ready with Alibi admitted;
SDK3.3.1 remains pinned. Source, public file, collector and release receipts
are in [RELEASE-0.15.2.md](RELEASE-0.15.2.md). Packager scenario drift is
tracked in #661; the full current report is retained explicitly. Owned worker
evidence survives outside disposable worktrees in the artwork-0152 archive.
The prior 0.15.1 Worker is retained; rollback was not executed. Physical
Android/TalkBack and other owner conditions remain in
[HUMAN_TODO.md](../HUMAN_TODO.md).

## 2026-10-14: 0.15.2 release qualification

The release candidate fixes relative pictogram contours (#655) and regenerates
missing or corrupt painting derivatives from verified masters (#658). All 48
painting hashes and 32 derivatives reproduce without changing image bytes.
Six revision-1 Crime Scene variations use the existing precached deferred file:
424 definitions load initially and 86 remain available on demand and offline.
The unchanged codec saves 2,216 startup gzip bytes through that deferral.

The 0.15.2 candidate measures startup 203,125 against 205,248 (2,123 bytes
headroom), shell 1,406,272 against 1,412,792.32 and deferred content 11,490
against 12,288. Deferred delivery passes 16 real-control browser cases and the
focused offline origin checks; full final-head qualification remains pending.
Pulseboard registration is PR #231, with the pinned SDK still version 3.3.1.

Publication is pending final checks, review and collector readiness. The primary
still serves 0.15.1; the existing Worker is retained for rollback. Deployment,
same-origin save/update and public release receipts belong in
[RELEASE-0.15.2.md](RELEASE-0.15.2.md) after execution. Physical device and owner
conditions remain in [HUMAN_TODO.md](../HUMAN_TODO.md).

## 2026-10-14: artwork budget recovery

PR #650 merged as c800be5a; its complete README and motion-preview histories
are on main, and qualification tracker #653 is closed. The artwork integration
preserves the original #525/#643 and #521/#642 histories, all 60 painting-shelf
files and 29 pictogram SVG masters byte-for-byte. Three 320px paintings use
optional delivery on the Desk and Games Room; navigation and family pictograms
use the reviewed masters. Source vector studies remain proposed.

Removing unused old-home selectors saves 7,585 emitted CSS bytes without
changing any retained rule. Three numeric selection thresholds in the existing
official-content encoder recover startup gzip; the runtime decoder is identical.
No byte ceiling is changed. Combined runtime source 96db0a7e builds f61029df2828:
shell 1,406,273 against 1,412,792.32, startup 205,181 against 205,248. All 510
puzzle definitions, IDs/revisions and initial/deferred JSON order remain exact;
the only content-global additions are the three intended artwork delivery entries.

That clean source passes full Windows verify: 1,504 Node passes, zero failures,
three intentional filename skips, Quiet Wing 581,847 assertions and 29 contracts.
UI187, pictogram navigation52 and actual-origin375 pass. All 48 painting hashes
and 32 derivatives reproduce; Cloudflare dry-run passes. Muse's bounded encoder
worker completed successfully; both new regressions fail with the previous
encoder and pass with the tuned encoder. Independent Sol review found no
HIGH/CRITICAL blocker; future relative-contour compaction is tracked in #655.

The integration PR carries final head, browser/visual and hosted qualification.
Startup margin remains narrow. This is source qualification, with no production
release or deployment. Physical Android/TalkBack, publisher and other owner
conditions remain in [HUMAN_TODO.md](../HUMAN_TODO.md).

## 2026-10-14: bounded PR queue reconciliation

Budget-test PR #649 is merged as 3d041caf; stale completion-hook draft #426 is
closed as superseded by current main, with its branch/history preserved. The
candidate integrates the complete #648 pause-repair, #641 README and #647
source-preview histories using merge commits. State conflicts retain both
added records and the existing ledger. No release or deployment is implied.

Exact pause source 25bb3aae passes clean-source full Windows verify: 1,490 Node
passes, zero failures, three intentional filename skips, plus Quiet Wing
581,847 assertions and 29 contracts. Muse's renewed file-only review completes
with report_status=ok and integrity=ok, without findings. The final integration
retains that runtime byte-for-byte; clean both-target build, unchanged budgets,
focused checks and hosted qualification still bind at its final head.

The runtime painting candidate remains parked: composition 86bb60a9 measures
shell 1,412,963 against 1,412,792.32 (170.68 bytes over), startup 205,211 against
205,248. All painting masters/derivatives and source-preview records survive.
The Quiet Wing revision-limit repair also remains parked in composition:
17ef2af7 measures shell 1,412,948 (155.68 over), startup 204,268 (980 under).
Its standalone qualified source ac6a6783 passed 98 actual-origin browser checks,
import/engine/contracts and the same budget (1,412,778), but is not a safe
combined landing. No ceilings were increased or custom decoder introduced.

Other draft stacks retain their own budget, transfer-integrity, native,
editorial and dependency gates; #500's explicit human skim hold remains.
Physical Android/TalkBack, publisher and Sites-retirement conditions stay in
[HUMAN_TODO.md](../HUMAN_TODO.md). Source previews are not production artwork.

## 2026-10-14: pause accessibility and landscape repair (#648)

The pause-only inert wrapper now exists only while paused, preserving the
unpaused Bridges direct-child landscape grid. Resuming via Return or Escape
restores focus to the stable pause control. The new layout-parent assertion
fails on the previous head; hosted mobile failures also reproduce the missing
lower islands. Existing puzzle identities, saves and byte ceilings are unchanged.

Repair source passes 24 pause checks at phone/desktop sizes, all 18 real-origin
mobile cases and 187 UI cases; screenshots of the landscape board and focused
phone cover were inspected. The 26 focused Node cases and emitted budget pass;
web shell excluding official content is 1,412,764 bytes (28.32 under its ceiling).
The first full verify correctly refused the dirty Android source; clean-source
verification and renewed independent review are required at the final head.
Physical Android/TalkBack remains in [HUMAN_TODO.md](../HUMAN_TODO.md).
## 2026-10-12: README reconciled to the source

The root README was rewritten against the current tree. Counts come from
`content/official-packs.json` (30 packs, 510 puzzles, 430 initial, 80 deferred),
`content/casebooks.json` (five books), and `content/challenges/` (95). Family
names match `src/presentation.js`. Games Room cards match `src/club.js`. Package
version 0.15.1 matches `package.json` and the recorded Cloudflare receipt in
`docs/RELEASE-0.15.1.md`. On 12 October 2026 the primary origin's platform
identity script reported appVersion 0.15.1 and source
`98be800d0715a25695fe99480bb801fd30397220`. The Sites origin reported
appVersion 0.12.0. No runtime, content, save schema, or deployment change.
Local README link check: 52 relative links resolve; `src/artwork/bellweather.webp`
exists. Badge URLs returned HTTP 200. `npm ci` installed the lockfile.
`node tools/validate-pack.cjs examples/twelve-families.json` returned valid,
12 puzzles. `npm run build` emitted version 0.15.1, 510 puzzles, 13 types,
5 casebooks and 80 deferred puzzles. `npm start` served that build at
http://127.0.0.1:8787 and the homepage returned HTTP 200. Full `npm run verify`
was not rerun for this documentation edit.

## 14 October 2026: current-main source-only motion qualification

PR #647 source head d5da1b6378355a6adacdd30f22201fb2d1c1a90b is integrated
with current main 3d041caf61b46b54a1ba046a50132f760192d758, preserving both
commit histories and every earlier STATE block. Both preview folders are
byte-identical to that PR source. No runtime, catalogue, precache, dependency,
save, budget ceiling or deployment changes are introduced.

Fresh local checks: both preview controllers pass `node --check`, and
`node --test tests/asset-catalogue.test.cjs` passes 2/2 hash/count/spoiler cases.
Each existing `verify_preview.py` passes all 24 browser checks with zero page
errors or network requests. Initial pixels match the unchanged static SVG;
both loops have zero changed seam pixels. R2 phone/desktop images at 390/1440
were inspected. Reports and screenshots are retained in ignored
`test-results/motion-r1-current-main/` and `test-results/motion-r2-current-main/`.
The shared Python environment lacked Pillow, so its dependency was installed
only in ignored `test-results/motion-python-deps/`, without changing that environment.

Full gameplay/build, fresh encoded-export decoding, hosted qualification at
the integration head, deployment and physical-device acceptance were not rerun.
The prior independent source review and dated export/owner acceptance receipts
remain historical; HUMAN_TODO.md decisions and physical gates remain open.

## 13 October 2026: readable motion repair R2

Chris reported Alibi barely moved. R1 timing tests passed but perceptual delivery
failed: light variation was tiny and steam's18-unit movement was further scaled
by its authored0.7 parent. Retained live and decoded-frame evidence confirms the
timeline was running, rather than an accidentally paused/reduced-motion export.

The `motion-v2-readable-r2-20261013` sibling retains every R1 file and the exact
v2 static master. It adds anchored rigid flame movement, gradual local light
variation and taller rising/dissipating steam. Complete normal-speed live/video
playback at320px verifies stationary object geometry and readable displacement;
decoded-region regression rejects both old delivery and genuine all-still MP4s.
The illustrative export is24fps/192frames/8seconds; controls, complete initial
still, reduced motion and hidden/offscreen pause remain tested. Human motion
acceptance is separate. No runtime, catalogue, precache, budget or dependency
change; no merge/deployment and no unrelated owner choice is closed.

## 13 October 2026: provisional v2 source acceptance and optional motion draft

Chris provisionally accepted the immediately displayed v2 LAS workshop and Alibi
lantern renders, plus the responsive LAS card: “Yeah, I guess these are good enough
for being SVGs.” This does not accept the later failed coarse studies, pixel variant,
runtime deployment, licensing or merge. The proposed conversion pivot is stopped.
Earlier sources, painted assets and archives remain unchanged.

`assets-source/library/vector-pilot/motion-v2-20261013/index.html` compares an exact,
script-free copy of the lantern v2 master with a separate optional flame-light and
steam preview. Counters and the scene geometry remain stationary. Initial pixels
match the untouched inline SVG; Play/Pause, reduced motion, real offscreen handling
and rendered loop endpoints pass 24 browser checks at 390/1440 px. Hidden-document
handling is an explicit DOM-contract probe, not physical phone certification.
This addition changes no runtime/catalogue/precache/budget/dependency file. Build
emission and exact-head hosted gates are recorded in the draft PR. Existing owner
choices in HUMAN_TODO.md remain open.
## 13 October 2026: source material study 02

The original vector pilot is retained as a v1 study below the owner's quality bar.
The separate quality-02 native SVG adds modelled glass, brass, counters and leaves,
with an individual PNG and v1/v2/painted comparison page. It stays proposed and
outside runtime/precache. Phone/desktop rendering and lifecycle checks pass; this
is a visual checkpoint, not production acceptance. Painting integration is unchanged.

## 12 October 2026: optional painted-art pilot (unpublished)

This branch imports #525's source shelf and registers all sixteen paintings.
Only welcome desk, Lantern Duel and Pocket Borough use existing verified optional
320px delivery, with meaningful SVG fallbacks. The eight-slot cache and budgets
are unchanged; masters stay outside runtime/precache. The separate native-vector
lantern study remains proposed. See assets-source/library/vector-pilot/README.md.
Browser and exact-head evidence is in the draft PR. Combined #521 qualification,
physical-device checks and HUMAN_TODO.md owner decisions remain open. No deploy.
## 13 October 2026: pictogram default-branch reconciliation (draft, budget-blocked)

Current main is incorporated with original icon masters, generator safety tests and
unknown-key fallback preserved. The source catalogue records the actual merged
app bytes; both evidence histories are retained. Budget assertions and ceilings
are byte-exact current main, with no new increase. Existing pictogram, alias and
fallback contracts and formatting pass. A clean same-toolchain current-main build
passes the shell budget; this individual icon integration adds 895 shell bytes
and exceeds its ceiling by about 697 bytes. Startup still fits. Final clean-head
measurements and hosted results belong in the draft PR and reconciliation handoff.
This is separate from the prior combined painting-plus-icon startup limitation.
No art regeneration, budget relaxation, deployment or physical-device acceptance.

The deterministic 52-assertion isolated-document pictogram browser driver now runs
beside the existing UI suite in the full verification lane, with screenshots
retained in that lane's artifact. Its network-aborted scope does not require a
manual-only exemption and does not prove real-origin or physical-device behavior.
The earlier unchanged budget gate still stops that hosted lane before browser
execution; local browser evidence is reported separately, never as a hosted pass.

## 12 October 2026: isolated pictogram alias-safety repair (draft)

A child of draft #521 rejects pre-existing symlinks, Windows junctions and hard
links in generator inputs/outputs and --check. All six causal regressions fail
before and pass after repair; five original icon contracts and byte-exact normal
write/check runs pass. See PICTOGRAM-ALIAS-SAFETY.md. The source draft's conflicts
with main, physical-device acceptance and HUMAN_TODO.md decisions remain open.
No merge or deployment; repository gate results are in the child draft PR.

## Club pictogram draft (unreleased): 1 October 2026

Branch `art/club-pictograms-20261001` integrates original club stationery pictograms into the
existing inline icon table. Thirteen families now have distinct masters, including Bridges;
Games, Quiet Wing and Castle have table, leaf and battlement destination icons on phone and
desktop. Labels, routes, controls, gameplay symbols, save contracts and Sudoku unknown-key
fallback remain unchanged. The 29 standalone masters and reproducible hash receipts stay
outside runtime/precache; provenance and commands are in
`assets-source/library/club-pictograms/README.md`. No raster or branding change.

Same-machine baseline at `3ce84ca`: JS 134,285 -> 134,677 gzip; core shell excluding official
content 1,409,653 -> 1,410,547 bytes. Two trims removed a redundant garden alias and joined
identically styled adjacent contours; only these two ceilings rise by measured, 64-byte-rounded
+448 / +896. Total offline, CSS and initial-payload ceilings remain fixed.
Verification is recorded in the draft PR after the clean-source Android/full verify gate and
isolated phone/desktop browser checks. Not deployed; physical-device/TalkBack acceptance and
the owner decisions in `HUMAN_TODO.md` remain open.

## 2026-10-14: PR #640 merged with the budget recovery

Main `030d5812` (0.15.2 release, with the artwork budget recovery that brought the shell back under
the 1,412,792.32 ceiling) is merged into the PR branch, which clears the shell-budget parking recorded
below; the revision-precision guard itself is unchanged. The checkpoint below predates this merge.

## 2026-10-12: Quiet Wing revision precision guard parked at the shell budget

Quiet Wing rejects unsafe integer revisions on load/import and refuses writes
or restores once its revision cannot advance safely. The database and save
schema stay unchanged; original records and previous recovery remain available.
The baseline reproduced two synthetic atomic-IDB writers succeeding at the same
unsafe revision, with the stale writer overwriting the first. Both boundary
regressions failed on unchanged source. The repair passes 43 storage assertions,
581,856 pure-engine assertions and five import-worker tests, including the final
safe increment, protected overflow originals, fallback byte retention and legacy
revision defaults. Independent review found no HIGH/CRITICAL defect. A clean
build at b4a880b1 emits web build 01295f2621a2. The eight real-origin boundary
cases at 390/1280 pass 58 checks with zero page errors: actual edits, stale-tab
refusal, import/restore refusal, raw recovery export and reload preserve originals.
Phone and desktop screenshots were inspected.

Qualification is parked after three distinct shell-budget attempts. Emitted
core bytes excluding official content are 1,412,795 against the unchanged
1,412,792.32 ceiling (2.68 bytes over). The first full Node run also hit the
unchanged Windows file-symlink EPERM; it was not fully green. The first origin
run passed its existing prefix but stopped on a phone-hidden desktop field;
the scoped retry uses the existing mobile name dialog. The full origin suite's
remaining tail and hosted final gate are not certified. No merge, deployment or
physical acceptance is inferred; see [HUMAN_TODO.md](../HUMAN_TODO.md). The separate
localStorage interleaving issue #596 remains open.

## 2026-10-14: PR #639 merged with the budget recovery

Main `59f47e90` (artwork budget recovery, shell 1,406,273 against the 1,412,792.32 ceiling) is merged into
the PR branch, which clears the shell-budget failure recorded below; the Borough seed repair itself is
unchanged. The checkpoint below predates this merge.

## 2026-10-14: PR #639 third landing checkpoint

Current main `3d041caf` merged cleanly into the retained PR branch. The 21
focused backup/Borough tests pass. Fresh web/Android builds still measure
1,412,794 shell bytes against the unchanged 1,412,792.32 ceiling; the budget
test fails. No new source repair or ceiling change was made. This third land
turn parks the PR pending a separately scoped byte-compliant repair and fresh
full/hosted verification. Existing review dispositions stand; physical checks
remain in [HUMAN_TODO.md](../HUMAN_TODO.md).

## 2026-10-12: PR #639 Borough seed repair

The landing repair preserves finite numeric Borough seeds without rewriting saved
values, and refuses missing, null, empty and non-seed values. Replay retains the
engine's existing character and length validation. All 21 focused backup/seed
tests pass; the existing numeric-history test failed before the repair.

All four failing hosted workflows at the original head report the numeric-seed
regression and the release-shell budget assertion. The exact main base
`1ee2de7c` measures 1,412,593 shell bytes and 132,870 JavaScript gzip bytes.
The compact repair measures 1,412,793 shell bytes (+200) and 132,891 JavaScript
gzip bytes (+21) before commit; clean source `045c44ca` measures 1,412,794 and
132,892 respectively. Both exceed the strict 1,412,792.32-byte shell limit.
Three trim attempts exhausted this turn's budget; the ceiling is unchanged.
Full verification at `045c44ca` passes formatting and both-target build, then
reports 1,490 passes, three skips and two failures: the budget and the unrelated
Windows file-symlink EPERM in `workshop-catalogue.test.cjs`. One independent
Luna xhigh review found no blocker in the seed repair. The PR is not ready to
land; release-budget repair and green hosted checks remain required. Physical
acceptance remains in [HUMAN_TODO.md](../HUMAN_TODO.md).

## 2026-10-12: automatic Voices flush test qualification

PR #638 adds four source-harness cases for automatic eligibility-gated flush
triggers, including standalone and mismatched origins and an eligible control.
Its four initial hosted jobs fail on the new test's Prettier formatting;
qualification is correcting that cause without changing runtime or test logic.
One independent read-only review found no HIGH/CRITICAL defect. The null-selector
harness covers slotless renders; it does not certify fallback Settings/Privacy
chunk loading or actual delivery. The corresponding P2 review concern was
classified once and declined for this formatting repair. All four gate cases and the existing queue suite pass. Removing only kick's
eligibility guard in a copied-source fixture fails all three negative cases
while the eligible control passes. PR #638 merged as 1ee2de7c after all four hosted
checks passed at 461d2860, with the current main/Git merge base confirmed as
d9eb071e and the non-blocking P2 thread classified and resolved. Physical acceptance
remains in [HUMAN_TODO.md](../HUMAN_TODO.md).

## 2026-10-12: bounded Challenge recovery export

PR #635 merged as eadee7a6 after all nine hosted checks passed, preserving the
committed-restore protection repair. The recovery export repair keeps ordinary
playable pre-restore exports and offers a distinctly labeled raw recovery
archive for corrupt, future-version or mismatched originals. Original record
and recovery metadata remain intact; raw archives are not playable imports.
Explicit restore also retains falsy JSON originals instead of losing them
through a truthiness check.

Raw serialization refuses non-JSON values and uses a conservative escaping
and traversal budget with a 3 MiB file ceiling. It can refuse smaller archives;
refused records remain stored. The baseline has eight passing and six failing
source cases; the formatted repair passes all 42 focused ownership/storage/export
cases. Clean source d2d59bb8 builds web 050812f7ebec and passes 14 actual
recovery/restore/reload scenarios at 390/1280, 184 UI checks, the existing
Challenge controls fixture and all 375 full real-origin checks with no page
errors. Phone success and desktop refusal screenshots were inspected. The two
Quiet Wing bare-assert suites pass separately. The full Node run has 1,481
passes, three skips and one unchanged Windows file-symlink EPERM, so it is not
full local green. One independent read-only review found no blocking defects.
PR #637 merged as d9eb071e after all nine hosted checks passed at 4b4f6e43;
automatic Codex review completed without findings. No deployment or physical Android/provider
acceptance is claimed; see [HUMAN_TODO.md](../HUMAN_TODO.md).

## 2026-10-12: Challenge restore protection repair

An explicit Challenge restore now clears only the restored challenge's old
protection flag after the replacement transaction commits. Previously, a
corrupt read followed by a successful restore left subsequent moves unable
to save until reload. The original record remains under `recovery:<id>`;
failed restores and other protected challenge IDs remain protected.

The new persistence regression fails on the previous source and passes with
the repair; all 19 focused restore/storage/revision/lifecycle cases pass.
Clean source 2b4ffcc5 builds web 7c2cad8d1c5a and passes the extended real
IndexedDB Challenge fixture at 390/1280 plus all 375 full real-origin checks,
without page errors. Formatting and both-target build pass. The full Node
run has 1,474 passes, three skips and one unchanged Windows file-symlink
EPERM; it does not reach the subsequent bare-assert Quiet Wing suites and
is not full local green. One independent read-only review found no defects.
All nine hosted checks passed for [PR #635](https://github.com/Chris0Jeky/Alibi/pull/635),
which merged as eadee7a6.
No deployment or physical Android/TalkBack acceptance is claimed; remaining
owner actions are in [HUMAN_TODO.md](../HUMAN_TODO.md).

## 2026-10-11: qualified overnight integration and preview

PR #633 merged as 73017566 after all seven reported hosted checks passed.
It preserves #630/#631/#632 and their independent reviews. Together with
#594/#592/#607/#610/#608/#614/#609/#624/#625/#629, this is eleven qualified
merge operations; source PRs marked merged with an integration are not extra
operations. The combined source passes 55 focused Node cases, 129 Voices
assertions, 104 Theatre assertions, 184 UI checks and 18 real-origin mobile
cases. The earlier full local run retains one pre-existing Windows symlink
EPERM and three intentional skips; it is not full local green.

Exact clean PR source d443146e builds web 0178f7a4c92f and Android browser-preview
artifact d3be963b. Existing Worker version a5e7aeea-016c-4ba0-94f7-63d09424e380
is a version preview, not a primary promotion. Its 18 emitted/budget/archive
cases, 12 HTTPS response/byte checks, 55 shared-path and 26 unknown-path browser
checks, and two 320px mobile cases pass. Six primary response samples are
unchanged. CSS gzip is 34,451 bytes under 34,464; shell is 1,412,594 bytes under
1,412,792.32. The registered 0.15.1 SDK pin passes; fresh read-only collector
readiness is HTTP 200, schema 5, ready and Alibi admitted, matching the existing
owner receipt. No collector deployment or migration occurred.

The existing invitation-timing test now pins 30 days minus one millisecond and
nine additional completions as ineligible, retaining the positive 30-day/ten-
completion and new-release controls. Runtime and saved formats are unchanged.

Finished Muse drafts through wave 433 are preserved on explicitly unqualified
checkpoint branches. Duplicate guard expansions and compatibility tightenings
were declined. Required proof artifacts and checksums survive outside removed
owned trees; the occupied primary and foreign/legacy dirty trees were untouched.
PRs #617/#618 remain parked for measured budget failures and current conflicts;
#579/#593 retain transfer-integrity gates. Native, creative and other draft
stacks retain their own gates. Physical Android/TalkBack, signing, publisher and
editorial acceptance remain in [HUMAN_TODO.md](../HUMAN_TODO.md).

## 2026-10-11: third qualified integration candidate

This candidate preserves the reviewed source heads of #630 (c7e7e5e8),
#631 (84a0cfb5) and #632 (5c5d4a42), based on main d6ed7571. The eight changed
runtime/tool/test files match their reviewed sources exactly. Only STATE had
merge conflicts; the full base ledger and all three added records are retained.
A faulty external merge helper briefly dropped ledger text in an unpublished
intermediate commit; the complete ledger was reconstructed before qualification.
Fresh combined interaction/history review found no HIGH/CRITICAL defect.
Clean source b14fcbad builds web 9a90ccfb2311 / Android artifact 3bcb41ab and
passes formatter, 55 focused Node cases, 129 Voices assertions, 104 Theatre
assertions, 184 UI checks and all 18 real-origin mobile cases without page
errors. Existing emitted budgets pass. Source-specific baseline/guard controls
and phone/desktop views remain recorded in the original PRs. Exact-head hosted
qualification remains pending. No primary release, collector readiness or
physical-device acceptance is inferred; see [HUMAN_TODO.md](../HUMAN_TODO.md).

## 2026-10-11: reset candidate refreshed against qualified integration

PR #629 merged as d6ed7571 after all seven reported hosted checks succeeded.
It preserves #571/#561/#626/#578/#590/#628 source histories. The reset candidate
now includes that main commit; the only merge conflict was this state ledger,
and both qualified records are retained below. Prior reset review still applies
to the unchanged queue and Privacy logic. Clean refreshed source 30b97488
(web c0197a1e2ce1 / Android artifact 718cd5a2) passes formatter, 47 focused
Node cases, 129 Voices assertions, 184 UI checks and all 18 real-origin mobile
cases with no page errors. The unchanged emitted budgets pass. The prior
375-case storage proof remains scoped to source 609c1ff4; storage code did not
change in this base refresh. Exact-head hosted qualification remains pending. Conservative failure feedback when
storage reads and removal both fail is recorded as a MEDIUM limitation: page-only
key rotation works, but durable removal cannot be confirmed. No primary release
or physical-device acceptance is inferred; see [HUMAN_TODO.md](../HUMAN_TODO.md).

## 2026-10-11: survey-key reset failure candidate

Resetting the survey key now returns an explicit failure when storage refuses
key removal, and the Privacy status reports that failure instead of promising a
new key. A narrow regression refuses only key removal while queue writes remain
available; it preserves the stored key and the respondent read. All 29 queue
cases pass. The same new assertion fails against the previous implementation
(1 instead of false), with the other 28 cases passing. Successful zero-answer
and answer-removal resets retain their existing controls. An actual Privacy
button failure/recovery control is added to the existing Voices browser suite;
clean source 609c1ff4 builds web 6912ac1775d9 / Android artifact 1d339606.
Formatter and 47 focused Node cases, 129 Voices browser assertions, 184 UI
checks and 375 real-origin storage checks pass with no page errors. A disposable
compiled guard-removal control fails specifically at the new failure-status
assertion; the source retains successful reset and new-key controls. Phone,
desktop and the actual failure status are inspected. Fresh independent review
found no HIGH/CRITICAL defect. Hosted exact-head qualification remains pending.
Queue deletion order is unchanged: a failed key removal is not an atomic rollback
or collector-side deletion. No physical-device acceptance is inferred; see
[HUMAN_TODO.md](../HUMAN_TODO.md).

## 2026-10-11: configured release-checkout lookup

Release preparation now checks PULSEBOARD_REPO and the direct Pulseboard
sibling before deriving a linked-worktree sibling from Alibi Git. A valid
configured checkout works when Alibi is a source archive without .git. A
disposable real filesystem regression fails on the previous eager Git probe
(five existing cases pass, one new case fails); all six pass after the fix.
The same case checks direct-sibling lookup and refusal of an invalid explicit
path. Existing release-record and Windows symlink failure controls remain.
No collector checkout, release version, registration, publication or deployment
was changed. Broader qualification and independent review remain pending;
[HUMAN_TODO.md](../HUMAN_TODO.md) retains release/device owner gates.

## 2026-10-11: stopped room sound reports its actual state

The existing reduced/hidden stop step now runs before refreshing Theatre status
and controls. Choosing Still the room stops playback and clears its displayed
Playing message immediately; the redundant final sound-button loop is removed.
One assertion extends the existing actual-control suite. The original qualified
build fails that assertion after successful playback and audio disposal. Clean
source 5201b392 builds web d188a296c490 / Android artifact 3e6139c1 and passes
formatter, 18 focused Node cases, 104 Theatre assertions, 184 UI checks and
all 18 real-origin mobile cases without page errors. Both phone and desktop
views show Room sound off and no stale playback status. Fresh independent
review found no HIGH/CRITICAL defect. Exact-head hosted qualification remains
pending; no physical preference-change or primary release is claimed.
[HUMAN_TODO.md](../HUMAN_TODO.md) retains owner/device gates.

## 2026-10-11: second qualified integration candidate

This candidate preserves the reviewed source histories of #571 (1a2e8557,
including #561), #626 (d9a44960), #578 (c79d878d), #590 (1d504464) and
#628 (285df3dc), based on main f8d5093e. It combines dated handoff preservation,
numeric Borough backup validation, individually named audio assertions,
touch guidance and actual Theatre control regressions. Content, tools and dependencies match the previously qualified #590 source
56c5be27 byte-for-byte. The refreshed #590 hosted mobile gate exposed 320-pixel
overflow and an obstructed disclosure click. An isolated comparison reproduces
the overflow and removes it by bounding clipped keyboard help to the existing
one-pixel screen-reader geometry; both disclosure controls pass locally.
The CSS fix is qualified on clean source bbf56404 (web e0e0db826344,
Android artifact 6bd34d92). Formatter, 74 focused Node cases with audio decoding,
37 keyboard/AX checks, 55 core checks, 102 Theatre checks, all 18 real-origin
mobile cases and 184 UI checks pass. Phone/desktop and 320-pixel disclosure
views are inspected. CSS gzip is 34,451 against the unchanged 34,464 ceiling;
shell is 1,412,662 against 1,412,792.32. Fresh combined and fix-diff independent
reviews found no HIGH/CRITICAL defect. Source-specific controls and reviews
remain recorded in their PRs; exact-head hosted gates remain pending.
The initial local mobile helper formed a double-slash URL and failed readiness;
its interrupted run is not a passing suite. The corrected real-origin suite
passes both cases from the actual hosted failure without a flaky dismissal. No source PR merge or primary deployment is claimed.
[HUMAN_TODO.md](../HUMAN_TODO.md) retains physical Android/TalkBack acceptance
and the existing release and owner gates.

## 2026-10-11: recovered dated handoffs

The original 3 October ledger is retained byte-for-byte in
[STATE-HISTORY-2026-10-03.md](STATE-HISTORY-2026-10-03.md), alongside the
[Workshop discovery receipt](qa/2026-10-03-workshop-discovery.md) and
[4 October recovery receipt](qa/2026-10-04-gameplay-recovery.md).
The original continuation index remains in preserved commit
[cb823f37](https://github.com/Chris0Jeky/Alibi/blob/cb823f37e0af2851ed9f0f17656cf3b8eed116c3/docs/STATE.md).
These dated records preserve their observations and pending gates; they do not
assert current PR status or repeat their historical checks on today's head.
Source merges are not a deployment.
The [3 October goal closeout](https://github.com/Chris0Jeky/Alibi/blob/9c7bcf8f3bdf2ce3eb5104fc0f41231915f17fb2/docs/STATE.md)
and its [planner](qa/2026-10-02-goal/PLANNER.md) and
[orchestrator](qa/2026-10-02-goal/ORCHESTRATOR.md) retain that session's
submission and cleanup receipts as historical evidence.

Continuation references remain [PROJECT-MAP.md](PROJECT-MAP.md),
[Workshop discovery](gameplay/WORKSHOP-DISCOVERY.md), its
[implementation plan](superpowers/plans/2026-10-03-workshop-discovery.md), and
[HUMAN_TODO.md](../HUMAN_TODO.md). Historical #404, #389 and #433 follow-ups
remain subject to live issue state and their own acceptance evidence.

## 2026-10-11: challenge save ownership regression

The existing launcher harness now checks that a valid published challenge save
is refused when opening another challenge, with the original input preserved.
The same-challenge acceptance control remains intact. Eight launcher/lifecycle
cases pass; removing the ownership guard causes the new case to fail with
"Missing expected exception". Fresh independent review found no HIGH/CRITICAL
finding. This test-only change merged as f8d5093e in #625 after all six
reported exact-head hosted checks succeeded.
[HUMAN_TODO.md](../HUMAN_TODO.md) retains physical Android/TalkBack acceptance.

## Current overnight checkpoint, 2026-10-11

PRs #594, #592, #607, #610, #608, #614 and #609 have merged with exact-head hosted
successes, independent review and recorded merge receipts. PR #624 merged as
666cbb79 with all 22 hosted checks green. GitHub also marks its eleven source
PRs merged at that commit; issues #604 and #619 are closed. #625 then
merged as f8d5093e, the current main at this handoff recovery checkpoint.
The integration preserves the reviewed commits from #609, #611, #581,

#576, #591, #612, #613, #615, #616, #621, #622 and #623. Combined interaction
review found no HIGH/CRITICAL defect. Exact-head CI and current candidate-host
qualification are recorded in PR #624; this is not a primary release claim.
The first combined hosted build exceeded the unchanged shell ceiling by 316.68
bytes. All 15 failed jobs identify that budget assertion; one artifact-upload
failure follows its skipped browser step. The existing esbuild minifier now
compacts the worker in a private scope; emitted-worker assertions exercise its
actual fetch/install behavior instead of depending on internal variable names.
Clean source 6b8b152a builds to web dbb4e386dde2 and measures 1,412,571 shell
bytes, 221.32 below the unchanged ceiling. Its local full run passes 1,440 cases
with three intentional skips and the pre-existing Windows symlink EPERM failure;
22 focused emitted-worker/budget cases pass. Castle hosted browser checks reach
their update fixture, which still expected an unminified variable name. The
fixture now replaces exactly one serialized release value. Clean source
15c37582 builds to web 9dd71793721b / Android 1bc8c397 and passes 39 focused
emitted-worker/budget/identity cases, both Quiet Wing suites, 375 real-origin
checks across all 16 scenarios, 184 UI checks and 18 two-release update checks.
There are no browser page errors. Phone/desktop recovery views are inspected;
physical Android/TalkBack remains distinct. Subsequent checkpoint edits change
only this evidence record. Clean source 72843be8 builds web ce33c615123e /
Android 444d158d; its existing-Worker candidate 1178c5d6 passes 11 HTTPS
response/byte checks and 81 hosted navigation checks. Six sampled primary
responses retain their pre-upload status/hash. Current-host receipts are in
PR #624; the primary was not promoted.

The corrected #581 Cloudflare candidate dd0417dc at clean source 5e57390b,
web 0c967f93134f, passed 11 HTTPS response/byte checks and 81 real-origin
navigation checks, including canonical 404 handling. All six sampled primary
responses retain their pre-upload status/hash; the primary was not promoted.
#623 clean source f29df3c1 passed its build/budget and 35 actual-origin
failed-CAS/navigation/broadcast checks. Its later metadata-only commit refreshes
13 source catalogue references after a demonstrated hosted digest failure.

#617 and #618 remain parked on the unchanged offline shell budget: measured
excesses are 204.68 and 502 bytes respectively despite bounded functional proof.
Nested Miniflare still carries the older Sharp dependency; #609 patches the
direct dependency only. Physical Android/TalkBack, collector readiness, signing,
publisher and editorial acceptance remain in [HUMAN_TODO.md](../HUMAN_TODO.md).
Entries below retain their historical candidate evidence; this checkpoint
supersedes their old pending labels. The primary checkout remains untouched.

## 2026-10-11: replayable Borough backup compatibility regression

A numeric Borough seed with a real replayed move remains accepted by the existing
engine and backup validator. One regression checks the complete accepted save
and unchanged input. All 15 backup-validation cases pass; a disposable copy with
the worker-proposed string-only seed guard fails specifically with "Invalid Pocket
Borough seed." The incompatible production guard is not included. Independent
read-only review found no HIGH/CRITICAL defect. This pins engine/backup semantics;
actual restore transactions and historical UI generation are not newly verified.
Exact-head hosted CI remains required before merge. Owner/device gates remain in
[HUMAN_TODO.md](../HUMAN_TODO.md).

## 2026-10-11: Lantern Duel response ordering candidate (#604)

Poll and move completions retain room identity and accept only safe integer versions
at least as new as the accepted snapshot. Equal versions keep its board and joined
state; newer versions replace it. Four red regressions reproduce rewinds and invalid
version acceptance; 22 focused Node cases pass after repair. A real-origin delayed
response scenario is added, with execution and emitted build evidence pending.
This layers on #608's API credential binding. Physical/two-device multiplayer and
deployment acceptance remain unverified; see [HUMAN_TODO.md](../HUMAN_TODO.md).

## 2026-10-11: offline navigation recovery candidate (#581)

This unmerged candidate preserves online host responses and uses the current
release's cached styled 404 only after a rejected navigation fetch. Actual HTTPS
candidate193660ee/webb29349567707 passed11 byte/status checks and55 shared-path
browser checks; sampled primary responses matched the pre-upload baseline.
Its unknown-path browser scenario found the host's canonical `/404` treated as
a shell route after `/404.html` redirects. Three source regressions reproduce
that defect; excluding only canonical404 from the shell matcher makes35 source
worker cases pass. Normal shell paths, aliases, assets, API exclusions and unknown
save protection remain intact. Fixed emitted/native/HTTPS and current-head hosted
qualification remain required. The first candidate version is not production.

## 2026-10-11: House and standalone feedback gate regressions

Two additional cases reuse the existing House and Voices harnesses: the letter
with incomplete observations cannot solve the study, and standalone official
completion screens receive neither rating nor survey slots. Removing each guard
fails its assertion. All 47 combined cases and formatting pass. Voices artifact
fixtures come from an existing build; fresh emitted/browser/hosted proof has not
run for this test-only slice. No production behavior changes.

## 2026-10-11: preserve inactive failed-save snapshots (#619)

Cabinet broadcast refreshes now stop after their asynchronous read when a sticky
save error exists. This preserves recoverable cached edits after navigation, also
when the read began before the failed CAS save. Clean inactive refreshes and the
active-snapshot guards remain covered. Two regressions fail before the change;
all seven handler cases pass after it, and an early-only guard fails the race case.
Clean source f29df3c1 builds web f8e782ab9288 and its Android browser-preview
artifact; all eight source/budget cases pass. The real-origin scenario passes
35 checks at phone and desktop widths using actual CAS refusal, navigation and
broadcasts, with no page errors. Both recovery layouts were inspected. Hosted
CI remains pending; physical-device acceptance is separate.
Inactive catalogue refreshes remain paused until reload while the error persists.
[HUMAN_TODO.md](../HUMAN_TODO.md) retains physical Android/TalkBack acceptance.

## 2026-10-11: Lantern Duel credential host binding (#605)

Room seats and pending idempotent retries capture the full normalized API address.
Polls and moves refuse before fetch after API settings change, including a Club
restore or a failed create/join at another address. Room response fields cannot
replace the captured address or credential; saved session seats retain that binding.
Existing same-host polling, moves and lost-reply retries remain supported.
Four behavioral regressions reproduce the original credential exposure. Focused
Club source checks pass; emitted builds, real-origin restore controls and fresh
independent review are pending. Network tests use synthetic intercepted hosts.
[HUMAN_TODO.md](../HUMAN_TODO.md) retains physical Android/TalkBack acceptance.

## 2026-10-11: quarantined Cabinet revision guard (#599)

The IndexedDB save transaction now distinguishes an absent row from a present
unknown envelope before accepting revision CAS. Future schemas, missing/unsafe
revisions, mismatched envelope/value keys and rows rejected by the application's
full run validator refuse without replacing recovery bytes. Validation occurs on
the row read inside the CAS transaction. Known revision-zero backup runs remain writable, preserving the existing
nonnegative revision format. No puzzle IDs, database version or byte limits change.
The original guard failed six focused cases; the corrected storage/revision/
restore/recovery selection passes 44 cases plus 58 legacy storage assertions.
Three malformed-content regressions fail before the review fix and pass after it.
Actual-origin autosave/reload regressions cover future and malformed known-schema
rows; browser, emitted-build, hosted exact-head and fix review gates remain pending.
[HUMAN_TODO.md](../HUMAN_TODO.md) retains physical Android/TalkBack acceptance.

## 2026-10-07: older backlog wave

Eight Grok 4.7 high worker tasks and two GPT 6.1 Sol medium coordinators produced
fix PRs #587 (mobile QA readiness/diagnostics), #588 (Desk heading scale),
#589 (restore fixture abort errors), #590 (accessible touch keyboard help), and #591 (practice counts and complete content identity).
The #389 Android identity mismatch found in review was red-proved and corrected;
the final Android build, artifact check and budget pass. Muse refused both lane starts
because the registry assigns this repository to another host; no swarm ran.

PR #588 merged as ea47351a after seven exact-head CI passes and independent review. Other fixes retain their pending or parked gates.

Focused Node and Chromium proof is recorded in
[WAVE.md](qa/2026-10-07-backlog/WAVE.md). Local full UI failures remain recorded; #590 also exceeds
the unchanged CSS gzip ceiling by five bytes and has an unwired browser helper.
Its four CI failures were investigated; both defects remain explicit park conditions.
CI/review, combined budget and
merge gates remain explicit. #347's implementation is present with specific
coverage gaps; #401 requires its upstream SDK hook; #407 and #220 retain owner
decisions. No deployment or physical-device approval was inferred.
[HUMAN_TODO.md](../HUMAN_TODO.md) remains authoritative.

## 2026-10-11: Club backup guard regressions

Four source tests cover a minimal accepted Club save, an Archive no-op replay,
an otherwise replayable 3001-move history, and 121 records below the byte cap.
They use the real validator and engines. Each archive/history/record guard removal
makes its corresponding test fail; the unchanged validator passes all four.
No production code or save format changes. Independent review and hosted exact-head
verification remain pending. [HUMAN_TODO.md](../HUMAN_TODO.md) retains device acceptance.

## 7 October 2026: cabinet fallback safety candidate

Base main: `cde5f56cb02dea6471972a1fe85b0724a01e75a5`.
This branch is an unmerged candidate, not a published release or deployment.
The prior state is preserved byte-for-byte in
[STATE-BEFORE-STORAGE-READONLY-2026-10-07.md](STATE-BEFORE-STORAGE-READONLY-2026-10-07.md)
using its existing Git blob `c52c61ed95817ef9f343530271515efdeeafb3e0`.
Its historical release evidence and older lane notes remain available there.

Refs #554. The candidate takes the issue's explicit fail-closed option:
localStorage cabinet run writes are read-only, even with Web Locks. Reads,
export, old/future records and the existing error surface remain. Session CAS
compares and writes without an intervening await; IndexedDB remains unchanged.
The application retains its existing first-save-error behavior, rather than
adding an implicit session overlay or a new durable save owner.

The new source suite reproduces 17 failures and one passing control on the old
storage, then passes all 18 after repair. The 35-case storage/revision/restore/
recovery/update selection passes, retaining 58 legacy assertions with explicit
local-write expectation changes. Browser wiring adds two passing cases.
Local dependencies and native navigation remain unavailable; no local full
build or browser pass is claimed. Exact-head CI, all unchanged byte ceilings,
52 native/emitted-app scenarios, independent review and aging are merge gates.
The first CI receipt and bootstrap-size repair are recorded in the QA note;
the storage owner remains eager and fully counted in the existing bootstrap.
Details: [storage policy and evidence](qa/STORAGE-READONLY-2026-10-07.md).

## Related work, not implicitly qualified

- #585 has a retained native two-success counterexample. A later diagnostic-only
  green run did not change the storage implementation and is not a repair.
  This candidate is based directly on main, not on #585 or its parent #581.
- #581's offline navigation has separate current-base, browser and review gates.
- #593's bounded attempted-domain rollback repair does not qualify #579's
  multi-domain save transfer. Same-domain concurrency, semantic validation and
  inherited parent budget increases remain separate blockers.
- Main already includes #587's mobile QA startup/diagnostics and #589's fixture
  AbortError ordering changes. Their merges are source landings, not a new
  deployment or physical-device acceptance claim.

## Preserved human and release boundaries

[HUMAN_TODO.md](../HUMAN_TODO.md) remains authoritative for physical Android,
TalkBack, publishing, origin and other owner gates. No database version,
published puzzle identity, numerical budget or production deployment is changed.
Use the exact current PR head and its artifacts rather than historic counts
when qualifying a merge. Do not discard the previous state or failed receipts.

### Block Cabinet phone action hierarchy candidate, 2026-09-17

The historical candidate and proving checks remain in the linked gameplay-base archive;
physical Android touch, TalkBack, comfort review and human acceptance stay open.
Neither newer source proofs nor browser screenshots turn that candidate into a device signoff.

## 2026-10-11: active Cabinet broadcast revision candidate (#601)

This checkout owns only `src/app.js`, `tests/app-broadcast-revision.test.cjs` and
this note. The BroadcastChannel `saved` handler now rechecks the returned run's
key against the active puzzle after the asynchronous read completes: the active
records entry and its expected revision are never replaced from the
notification, a newer stored revision surfaces the existing another-tab
conflict, and equal/older rows return without touching local state. The early
higher-notification short-circuit and non-active refresh behavior are intact.
Regression coverage executes the actual handler and enqueueSave code in a VM
fixture. Evidence pending: the caller owns the proving check
(`node --test --test-concurrency=2 tests/app-broadcast-revision.test.cjs`),
formatting, catalogue hashes, builds and native-origin proof after integration.

## 2026-10-11: named audio and saved-note checks (#578)

The existing assertions now register as 26 audio cases and two saved-note key
cases. Receipt checks, derivative iteration, thresholds and conditional ffprobe
behavior are preserved; runtime and asset bytes are unchanged. All 28 cases pass
with the installed ffprobe exercised. A disposable test-memory receipt mutation
fails exactly the first audio case while the remaining 27 pass; baseline files
pass their two file-level cases. Independent review found no HIGH/CRITICAL issue.
Formatting and diff checks pass. Exact-head hosted CI remains required. This is
partial test-reporting work for #519; physical listening and device acceptance
remain in [HUMAN_TODO.md](../HUMAN_TODO.md).
