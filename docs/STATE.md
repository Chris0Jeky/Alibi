# Live development state

## Published web release 0.12.0: 25 September 2026

[PR #364](https://github.com/Chris0Jeky/Alibi/pull/364) merged as
`0ebe3541837561a3f12da373ccfe266dc6a2260e`; annotated
[`v0.12.0`](https://github.com/Chris0Jeky/Alibi/releases/tag/v0.12.0)
and the public release assets point to that source. The clean build is
0.12.0 / `f2b20d3ee6c0`, with 430 puzzles and 130,290 startup JavaScript
gzip bytes. All seven exact-head CI checks passed; merged-source Verify,
Cloudflare dry run and release bundle passed. Cloudflare Worker version
`8edf7ab7-a92e-4963-be7a-d1bebcd68fe8` and Sites saved version 23
(deployment `appgdep_6ab6c0dc2c848191913d93bd136c2f2a`) now serve the
same source. All 291 public files returned HTTP 200 on each origin; both
origins passed 214 hosted real-origin storage/offline browser checks. The
primary origin's default-on Usage sharing sent a bounded aggregate count,
and opt-out stopped further sends in live Chromium. The separate Sites
origin stays outside collector admission. See the
[0.12.0 publication receipt](RELEASE-0.12.0.md) for build digests, HTTP
comparison, rollback references and evidence limits.

`HUMAN_TODO.md` q-1 through q-8 remain open, especially physical Android,
TalkBack and human difficulty calibration. Issue #220 remains open for larger
and decorative radii; issue #219 remains open for cross-room type work.
Earlier checkpoints below are historical.

## Club persistence and restore hardening merged: 25 September 2026

The Club storage closeout is now on `main`. PR #376 added backup-envelope
validation coverage and merged as `2856e8f9057ea808a8d152f5dc2a41ee6ee93449`.
PR #377 then serialized restore replacement, invalidated the pending bot keeper
and preserved persist-before-replace ordering; it merged as
`8452662f803139d5d51d65657f3b42d1a2389443`. PR #378 added fail-closed handling
for IndexedDB read or transaction failures (no writable localStorage fork),
bound delayed Borough reset confirmation to its own intent, and added a live
Chromium regression for an aborted Club read; it merged as
`69b8c42cccb721000e9628e3d12476d124724a9a` from exact head
`3a3a1fd7164b612262f01ca1bf1e74959c2352d2`.

At that exact head, local `npm.cmd run verify` passed 598 tests (595 passed,
3 skipped, 0 failed) with 581,847 assertions; both web and Android receipts
reported `sourceDirty: false`. The focused Club/restore/backup suite passed 14
tests, including 51 Club assertions. The focused real-origin Chromium scenario
passed 30 checks, the full real-origin suite on the same test content passed
243 checks, and exact-head hosted Verify, browser controls and Android payload
checks all passed. This is a source checkpoint only: no new release, tag or
deployment is claimed.

The evidence does not certify physical-device behavior, TalkBack, human
accessibility calibration, or real browser Worker interleaving. `HUMAN_TODO.md`
q-1 through q-8 remain open.

## Published web release 0.11.6: 25 September 2026 (historical)

[PR #335](https://github.com/Chris0Jeky/Alibi/pull/335) repaired the Cabinet restore
race and merged as `aa93c3340c108a4d90afcd0d955f551ce35da3b1`; it closed
[issue #333](https://github.com/Chris0Jeky/Alibi/issues/333). Exact-head
[Verify](https://github.com/Chris0Jeky/Alibi/actions/runs/36122242738) and the
other applicable checks passed, the focused second review found no new blocker,
and the head passed the three-minute merge age. A clean build of the merged commit
is 0.11.6 / `db7e68c1bfa6`, with 382 puzzles, 130,271 JavaScript gzip bytes and
`sourceDirty: false`. Local Verify passed (529 Node tests, 3 skipped), along with
pack validation, Observatory check, Cloudflare dry run, bundle packaging, and
214 local real-origin browser checks. The first bundle attempt lacked the local
`ffprobe` path; rerunning with the installed Krita tool passed.

Annotated tag [`v0.11.6`](https://github.com/Chris0Jeky/Alibi/releases/tag/v0.11.6)
points to that deployed source. Cloudflare now serves it as Worker version
`107707f3-1e5d-442c-94b3-c87c6ec73ae6` at
https://alibi-after-hours-preview.commit-atlas.workers.dev/. The existing Sites
fallback serves the same build at https://alibi-puzzle-club.jeky-tck.chatgpt.site/
from saved version 22, deployment `appgdep_6ab64e1a75ac8191b8308d22bdb4cb15`.
The two local build directories matched across all 292 files before packaging.
Each public origin passed all 214 hosted real-origin browser checks, including
IndexedDB restore/recovery, offline reload and in-progress navigation. All 291
public files returned HTTP 200: Cloudflare bytes matched the built files; Sites
matched all non-HTML bytes and transformed ten HTML pages. Cloudflare retained
HTTP CSP and WebP MIME; Sites still lacks the repository HTTP CSP and serves the
sampled WebP as `application/octet-stream` (existing hosting limits, issue #6).
See [the release record](RELEASE-0.11.6.md) for rollback and digest receipts.

`HUMAN_TODO.md` q-1 through q-8 remain open. In particular, the web publication
does not certify the affected physical Android phone, TalkBack, or the provisional
Picture Logic difficulty labels. The Android artifact remains a preview. Earlier
source-only and pre-publication checkpoints below are historical.

## 0.12.0 source candidate: 25 September 2026 (historical)

The proposed next web release combines 48 Night studies across eight families
with the merged Desk type ramp, the approved radius slice and Block Cabinet
visual stability. Its source catalogue has 430 puzzles in 26 packs. Version
registration and Pulseboard's release contract are complete in this candidate.
The candidate now includes the statistical-only, default-on Usage sharing adapter
for eligible visitors without a stored opt-out, including return visitors, on
the primary Cloudflare origin, with an open
notice, immediate opt-out and preserved prior off choices. The separate Sites
fallback origin remains outside collector admission. Pulseboard's production
admission switch is live and its aggregate-only hosted boundary has been probed.
Pulseboard PR #96 merged the automatic-delivery and malformed-preference repair;
PR #97 adds a fail-closed storage-probe cleanup. The regenerated Alibi adapter
passed 48 real Chromium assertions after idle-route and denied-cleanup
regressions failed against their prior artifacts. Integrated local Verify
passed 582 Node tests with three skips; 184 controls, 480 Night controls and
214 real-origin storage/offline checks passed. Exact-head hosted integration,
both existing deployments and hosted-origin acceptance remain to be completed.
No 0.12.0 tag or public release exists yet. See [the candidate release record](RELEASE-0.12.0.md)
and `HUMAN_TODO.md` for human difficulty and physical-device gates.

## Night Gardens source merged: 25 September 2026

Merged PR #342 adds 18 original Lanterns, Tents and Aquariums boards, bringing
the source catalogue to 400 puzzles across 24 packs. Exact registered-catalogue and
Night Gardens source checks pass locally (seven focused tests), including native
and independent unique answers, reducer replay, definition receipts and the
published-definition baseline. Exact-head hosted Verify and real-control browser
checks passed before merge.
Expert/Master labels remain provisional pending #161 and
`HUMAN_TODO.md` q-8; no new web release is claimed.

## Shared type ramp merged: 25 September 2026

A first #219 layer defines the approved seven type steps and maps Desk/page,
feature, section and card headings in the shared chrome to their roles. At 390px,
the Desk h1/h2 compute to 32px/25px; at 1280px, 36px/28px. The phone Desk title
stays on one line and 320px, 390px and 1280px rendered views have no horizontal
overflow. The dedicated token regression, 12 real-origin mobile QA scenarios,
184 isolated core UI checks and the isolated After Hours browser suite passed.
PR #353 merged after exact-head hosted Verify and Android checks passed. The rest
of the cross-room type migration in #219 remains open; physical-device evidence
has not yet been gathered.

## Approved radius mapping candidate: 25 September 2026

The owner approved eight small scalar mappings from issue #220. This source pass
maps 56 declarations across seven bundled CSS files onto the existing 8px, 12px
and 16px tokens. On the Desk, the desktop nav radius computes to 8px instead of
7px and the phone hero computes to 16px instead of 17px; neither 390px nor
1280px has horizontal overflow. Local Verify passed with 542 Node tests and
three skips, 184 isolated UI checks and 12 real-origin phone QA tests passed.
The full four-token collapse remains open: larger panel/theatre radii, true
circles, game-board geometry and named decorative exceptions were not changed.
Hosted and physical-device evidence has not yet been gathered for this pass.

## Night collection certificate foundation: 25 September 2026

Merged PR #341 adds offline definition receipts, structural duplicate
checks, independent uniqueness checks and production reducer replay for proposed
harder studies. It adds no playable puzzle or runtime code. On the current main
base, local Verify passed with 542 Node tests and three skips, both Quiet Wing
suites, and a clean 382-puzzle build; exact-head hosted Verify passed. The 48
proposed Night boards remain in stacked PRs; human difficulty and device checks
remain open under #161 and `HUMAN_TODO.md` q-8.

## Backup validation QA: 25 September 2026

Six direct tests now cover duplicate run and custom-pack records, starter-catalogue
collisions, and saved-run counter, note and undo bounds. They use the actual backup
validator and catalogue; no production behavior changed. The six-test direct Node
run passed on the original base. PR #349's exact-head hosted source gate passed
before merge, and PR #351's integrated head passed the same gate. Browser import,
physical Android and destructive-restore behavior remain separate evidence.

## Desk action sizing merged: 25 September 2026

A bounded #221 follow-up raises the Desk hero's two quiet actions from 10px/33px
on a 390px phone to 12px/44px, and raises its adjacent 43px actions to 44px.
At 320px, 390px and 1280px, the page has no horizontal overflow. A 320x568
Chromium touch run cycled the edition and pinned the desk without a page error.
The 12 real-origin mobile QA tests and 184 isolated browser UI checks passed,
including controls across all thirteen game families. Local format and Android
build passed. The concurrent Node suite in `npm.cmd run verify` stopped
progressing in `tests/platform.test.mjs` and was interrupted; that file passed
all 16 tests alone. The serial Node suite passed 529 with three skips, and both
Quiet Wing suites passed. PR #351's exact-head hosted Verify and Android checks
passed before merge. Physical-phone acceptance and the wider #221 button
recipe work stay open.

## Block Cabinet visual stability merged: 25 September 2026

Issue #160's ordinary-placement and line-clear blink paths are reproduced in a
real built Chromium origin. The placement lock had dimmed all 64 cells to 40%
opacity for roughly 15 frames. A Classic clear hid an unrelated stationary
piece for 18 frames. The source candidate keeps locked cells opaque and leaves
pieces unchanged across every clear wave in semantic HTML; Canvas animates only
changing cells. The focused Node suites passed 26 tests; the built-origin
Classic and Cascade browser suites passed 78 and 90 checks, including ordinary
and reduced motion and stationary pieces through both clear modes. This does
not establish that every instance of the player's flashing report is gone on
the affected physical phone. Local full Verify passed on the source and browser
test commit (535 Node tests passed, three skipped; Android build passed).
PR #352's exact-head hosted Verify and Android checks passed before merge.

## Night Routes source candidate: 25 September 2026

The stacked #343 candidate adds 18 original Signal Paths, Number Trails and
Bridges boards, bringing the proposed catalogue to 418 puzzles in 25 packs.
The six focused Routes/catalogue tests pass locally, including independent
unique-answer receipts and production reducer replay. An independent review
found no confirmed correctness blocker. Hosted full Verify and real-control
browser checks remain pending; human difficulty and physical-device acceptance
remain open under #161 and `HUMAN_TODO.md` q-8.

## Night Symbols source candidate: 25 September 2026

The stacked #344 candidate adds 12 original Sun & Moon and Futoshiki boards.
The proposed Night collection totals 48 additions and 430 puzzles across 26
packs. Its six focused Symbols/catalogue tests pass locally, including exact
definition receipts, independent unique answers and reducer replay; independent
review found no confirmed correctness blocker. Hosted full Verify and real-control
browser checks remain pending. Expert/Master labels, human solve paths and
physical-device acceptance remain open under #161 and `HUMAN_TODO.md` q-8.

## Repository and release checkpoint: 25 September 2026

PR #330 merged the 0.11.6 source candidate with merge commit
`287fc38757d8628bfa8a0b6912adf90aadca0219`. Its exact head
`3adfde9db7c68c2c78741a1e99c6090ec0f4cc9c` passed [Verify puzzle cabinet](https://github.com/Chris0Jeky/Alibi/actions/runs/36087890060)
and [Verify Android payload](https://github.com/Chris0Jeky/Alibi/actions/runs/36087890051).
Independent review found no confirmed CRITICAL/HIGH issue. The earlier failure on pre-fix head
`9ebf813` was corrected and is retained as history in [the release record](RELEASE-0.11.6.md).

The source catalogue now contains 382 puzzles across 23 packs. Release 0.11.6 includes six
new Picture Logic studies, Lantern and Tents hint improvements, Archive boundary corrections,
a Reversi depth correction and the refreshed Observatory release check. Local
`npm.cmd run verify` passed with 526 Node tests (523 passed, 3 skipped), both Quiet Wing suites,
and a 130,014-byte JavaScript gzip bundle, 34 bytes below the fixed cap. Pulseboard PR #86
registered 0.11.6 and its `v0.11.6` catalogue tag. PR #87 merged connection improvements as
`ad42c96520b79c406c1395908a9dcdb009178c54`: no-argument checkout discovery, structured JSON
receipts, and a read-only scheduled/manual watch. The local no-argument checker discovers the
sibling Alibi checkout and reports it in sync; its adapter SHA-256 is
`f63eb983e77c118a0c70ba8cdc37e9f6f9ba67868fdd508d70f98f43095f95e8`. Hosted watch
[36090389677](https://github.com/Chris0Jeky/Pulseboard/actions/runs/36090389677) succeeded on
that Pulseboard main commit.

This is a source merge only. No 0.11.6 tag, deployment or public GitHub release was created;
0.11.5 remains the latest deployed release. PR #329 remains draft because head `e0efa24` is
55 bytes over the unchanged JavaScript gzip cap. #281 remains draft pending maintainer
architecture acceptance. See [the repository sweep](REPO-SWEEP-2026-09-25.md).

The primary checkout's tracked files are clean on `main` after the documentation refresh. The
merged release worktree and local branch were removed with ordinary Git removal after confirming
there were no tracked or untracked edits; its ignored contents were generated builds, dependencies
and test results. Thirteen Git worktrees remain registered, including asset worktrees,
unique-commit work and the dirty external review worktree. Windows refused plain removal of 18 old
local directories, now outside the registry. That dirty review worktree and the refused
directories remain preserved.
`HUMAN_TODO.md` q-1 through q-8 remain open, including source licensing, physical Android and
TalkBack checks, and human calibration.

## Curation guard coverage: 25 September 2026

Focused Node coverage now checks that editorial notes do not attach to imported IDs or
other puzzle revisions, that editorial and museum text is escaped, and that the
gallery filters artwork by venue and kind. Eight focused tests pass. This adds no
runtime logic, content, save-schema change or published puzzle ID. Full Verify,
browser and physical-device checks remain separate evidence gates.

## 0.11.6 publication preflight: 25 September 2026

PR #332 merged focused curation tests as `da19969` after exact-head Verify and
fresh-context review. The 0.11.6 source at `84be37f` passed local Verify,
example-pack validation, Observatory check and a Cloudflare dry run; its clean
build is `024c5bc9bd9d` with 382 puzzles and 130,014 JavaScript gzip bytes.
Read-only HTTPS checks still found the previous builds on both existing origins.
No 0.11.6 tag, deployment or public GitHub release has been created. A real
IndexedDB two-connection check then reproduced [restore issue #333](https://github.com/Chris0Jeky/Alibi/issues/333):
a save made between the pre-restore snapshot and replacement vanished from both
live runs and the recovery copy. The next release needs a verified fix before
publication. See [the release record](RELEASE-0.11.6.md); `HUMAN_TODO.md`
q-1 through q-8 remain open.

The issue #333 fix candidate at `cbfdf0e30688c4c6ed6acc05adec4ee427b32b12`
reads recovery data and replaces Cabinet records in one IndexedDB write
transaction. A merge rejects a stale snapshot and retains another tab's fresh
preferences; a queued error aborts the transaction. Both real-origin regressions
failed before their fixes and passed afterward. Local Verify passed (529 Node
tests passed, 3 skipped) and the full origin suite passed 214 checks. The clean
build is `7af1c8978307` with 130,271 JavaScript gzip bytes. The safety fix
needed a measured 256-byte increase to the previous bundle limit; the new
strict limit is 130,304 bytes.
The first independent review found the preference loss and it was fixed; a
fresh review of that logic change and exact-head CI are still required before
merge or publication.

## Source reconciliation checkpoint: 24 September 2026

This working tree starts from main `6da00fcd701a4ffa4ed01614e16cc8752fa1032c`, after
Tents reasoning PR #324 merged. A clean main checkout passed `npm.cmd run verify` at that
commit: 519 passed, 3 skipped and 0 failed; the emitted JavaScript measured 130,012 gzip
bytes, below the existing 127 KiB cap. The build still identifies the source version as
0.11.5; this is a source checkpoint, not a new release or deployment.

House wait PR #311 includes child #315. Their combined changes replace fixed sleeps with
predicate waits for route and restored opener focus, and add three Node regressions that
execute the actual browser predicates. The two House browser suites keep their existing
focus assertions. See PR #311 for exact-head CI and review receipts; source-level predicates
do not establish physical-browser, phone, or accessibility acceptance.

The 24 September Muse wait branches #313, #316 and #318 are being requalified against current
main. PR #281 remains draft pending its maintainer architecture acceptance. Human acceptance
for physical Android/TalkBack use and provisional puzzle calibration remains open in
`HUMAN_TODO.md`.

## Matching and review continuation: 24 September 2026

The Tents review also identified a distinct shared-tree witness on tents-04. The latest
hint-only correction uses the existing augmenting-path matcher with its sides reversed,
requiring each placed or forced tent to have a distinct adjacent tree. It checks existing
assignments and the whole hypothetical forced set, without changing engine validation,
reading stored answers, installing hypothetical marks or adding a puzzle-search fallback.
Two further tests were observed failing before correction; 25 hint tests now pass. The
independent arbitrary-mark model additionally checks partial matching, and a positive case
requires reassignment rather than greedy pairing. The 621 official steps remain unchanged.

The wrong-C1 browser/Undo scenario passed at both widths in run 36060033384. The new shared-
tree browser scenario and current emitted bundle still need latest-head CI. The formatted
predecessor c70faaf built at 130,112 gzip bytes, 64 bytes over the unchanged cap. Reusing core
number-grid groups and reducing repeated wording addresses size without removing rules or
raising limits; 2,210 peer sets across 54 number boards matched the earlier geometry. See
[TENTS-REASONING.md](TENTS-REASONING.md) for limits and exact evidence scope.

House child #315 joined #311 as `2a5fca0f266ca424d694c5c2e86d7f310d66fbca`. Earlier source
checkpoints below remain dated history; live GitHub status and PR #311 hold the latest
combined-head CI and review receipts.

## Latest continuation: 24 September 2026, after 21:00 UTC

The source baseline is now main `93852f76a3b3014d463a6dab55b7d657efc836ef`.
#320 merged as `db4925fb28f5e1dce348f7d53712722005605ed4` after final-head full Verify,
four dedicated lanes and independent review. All four inline findings were addressed.
The source catalogue is 382 puzzles across 23 packs, including 40 Picture Logic entries;
the six new pictures remain provisionally rated. #161 and q-8 stay open.
#326 merged as `93852f76a3b3014d463a6dab55b7d657efc836ef` after full Verify, Android payload
and independent review. It normalizes Reversi depth without changing the normal worker path.

#324's combined head 4bad87b also completed all five workflows, but review 4098104696 found
that incorrect crosses could force a tent into a fulfilled perpendicular line. The correction
validates the whole forced set on a copied board and reports the conflict instead of a move.
Three new regressions failed before the fix. The current 23-test hint run passes, retaining
872 compatible-board deductions and 621 official Tents steps. An independent arbitrary-mark
check covers 1,568 locally legal positions: 1,532 safe moves, 14 conflicts and 22 fallbacks.
The browser route adds wrong-cross advice, no-mutation checks, Undo and resumed valid play
at both 390px and 1440px. Python compilation passes. See TENTS-REASONING.md.

Require the corrected head's exact CI, current bundle budget and independent review; older
4bad87b results do not qualify new bytes. No published puzzle, save schema, dependency,
resource cap or deployment changes are part of this continuation. Local npm registry access
was retried and remains blocked. Full local build/browser success is not claimed.

The earlier checkpoint below is retained as dated history. Its pending-merge statements are
superseded by the latest continuation above, not erased from the evidence trail.

## Gameplay continuation: 24 September 2026, evening

This checkpoint starts from main `753b5d0476b79abde633a579227264556f996380`.
It records source work, not a deployment. Live GitHub takes precedence for later PR status.
The previous STATE is preserved byte-for-byte in
[the gameplay-base archive](STATE-ARCHIVE-2026-09-24-GAMEPLAY-BASE.md), including all earlier
maintenance, source/CI, hosted-origin, Android preview and rollback references.

### Landed gameplay

#317 fixed Archive map occupants, missing rows, completion and board-edge handling, preserving
all nine rooms and replay identities. It merged as `12817918456cff0b4d92ac61e59ccc2126e1aeed`.
#322 added four answer-independent Lantern deductions and merged as
`753b5d0476b79abde633a579227264556f996380`. Both had full exact-head verification, independent
review and unchanged-head checks before merge. Their PRs retain detailed evidence.

### Picture Logic expansion, #319 / #320

Six original revision-1 15x15 pictures propose 382 source puzzles across 23 trusted packs.
All earlier 376 definitions remain unchanged. Labels are provisional, not human calibration.
The first full Verify failed in `browser_expert_families.py`: its fixed 21-card Expert count
could not include the two new Expert boards (actual 23). This was not an origin-storage or
puzzle-solver failure. The complete log was recovered as artifact `10829779903`.

Head `9d156c64f3cfeccc50c6c92eff375f6d33987df5` derives expected Expert revision keys from the
trusted registry and checks exact displayed membership as well as count. The temporary log
collection job was removed; no extra Actions permission or weakened verification remains.
All five workflows passed on that head. Review then identified the 24-card pagination
boundary; head `2ce1807f90998fa2478b019e2df73aff55865fc4` also expands Show more before exact
membership checks. Five controlled list sizes and a non-progressing control were checked.
Require that final head's full CI and review before merging. Keep #161 and human q-8 open.

### Tents reasoning, #323

Four local rules extend the existing hint seam: tree adjacency, tent spacing, fulfilled line
counts and forced remaining sites. Seven new plus five existing source tests pass, including
872 independently checked deductions over 880 compatible small-board states and 621 official
steps with answer access blocked. See [TENTS-REASONING.md](TENTS-REASONING.md).
The existing reasoning browser workflow now checks Lantern and Tents controls. Require its
receipts, full exact-head CI/budgets and independent review before merge. No complete-solver,
automatic-move, save-schema or puzzle-revision change is introduced.

A later bundle check measured 130,141 gzip bytes, 93 bytes over the unchanged 127 KiB limit.
Shorter explanations for Tents, Lanterns and number hints preserve their rules and reduce the
actual emitted bundle to 130,029 bytes on head `7a5b744`. Twenty combined hint source tests and
both reasoning browser suites pass. The separate historical phone-action warning below was
restored after its existing source test caught the loss from the condensed handoff.

### Reversi search boundary, #325 / #326

The engine accepted fractional depths that never reached the recursive zero-depth stop.
Three new regressions reproduce the defect on a bounded seven-empty-square endgame. Head
`541209500f2f0f24eb09602e1d66249565829038` normalizes invalid values to four and retains the
existing one-to-five integer clamp. Nine Reversi/Club/challenge subtests pass locally; the
published corrected source blob matches the tested bytes. Require final-head CI and review.
The shipped worker uses depth four, so this is not a reproduction of the reported phone freeze.
No game rules, replay versions or published Archive layouts changed.

### Block Cabinet phone action hierarchy candidate, 2026-09-17

The historical candidate and proving checks remain in the linked gameplay-base archive;
physical Android touch, TalkBack, comfort review and human acceptance stay open.
Neither newer source proofs nor browser screenshots turn that candidate into a device signoff.

## Evidence and remaining boundaries

The local workspace is an uploaded source ZIP reconciled at changed seams, not a fresh full
checkout/build of main. npm registry DNS and local Chromium origin policy block full local
verification. Focused Node checks and Python compilation supplement GitHub Actions; they do
not replace full build, browser, offline or Android payload gates.

Version 0.11.5's published 376-puzzle release and the separate Cloudflare/Sites origin receipts
remain dated history in [RELEASE-0.11.5.md](RELEASE-0.11.5.md) and the state archives. No new
hosted-origin probe, deployment, rollback, store submission or physical-device acceptance is
claimed. Android remains a non-publishable preview; the Capacitor owner gates remain open.

[HUMAN_TODO.md](../HUMAN_TODO.md) retains device, TalkBack, difficulty, recognizability and
explanation-quality acceptance. #281/#282 still require the maintainer architecture skim;
source tests do not approve that ADR. Review live open PRs before overlapping another lane.
