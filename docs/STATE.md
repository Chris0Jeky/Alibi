# Live development state

Current qualification: #432 consolidates the optional Lattice content and
reviewed #544/#545 persistence tests with all original commits preserved.
#539 and #543 are merged; combined full verify at 981df97 passes (966
passed, three intentional skips). Final clean-head source/import proof and
hosted CI remain required.
Superseded test PRs remain open until the combined head lands.

## Lattice optional collection closeout (#432): 2 October 2026

The existing Lattice candidate is refreshed onto current main, preserving all
24 playable pack definitions and editorial receipts byte-for-byte. It remains
an optional Workshop JSON import: twelve Lanterns and twelve Futoshiki, all
revision 1 with provisional Expert labels. The official registry and all 510
previous definitions/legacy data are unchanged. No new runtime loader, startup
content, dependency or numeric budget change is introduced by this pack.
A bounded Muse contributor xhigh file-only review completed with no findings;
its machine reconstruction/uniqueness/import/browser checks were explicitly
not_run. A narrow Sol review completes the previously uninspected certificate
seam, with no blockers. Coordinator full verify passes (928 passed, three
intentional skips), including all-board regeneration, native/independent
uniqueness, reducer replay, answer-free openings and production import. All 48
phone/desktop puzzle cases pass (194 browser checks), with undo/redo, guarded
restart, saved completion and offline reopen. Representative captures for both
families and aligned phone/desktop views were inspected. The local build pins
clean source 03c0afa; the browser receipt pins pack SHA256 rather than local
HEAD. The current gate first exposed one old helper-formatting issue; only that
helper was formatted, with no data changes. Final source proof and hosted CI
remain separate. No human calibration, physical Android/TalkBack or deployment
is claimed; [HUMAN_TODO.md](../HUMAN_TODO.md) remains open.

## Activity guard regression integration (#512/#513): 2 October 2026

The two independently reviewed test-only candidates are integrated together on
current main, preserving their original commits. Six checks cover refusal of
unsafe update flushes and the clean positive path; two cover overlapping or
disconnected mounts. With the four existing activity checks, all twelve pass.
The reviewed activities.js blob remains cce877a6897f45c263091dff442484ee8b82181c;
no runtime code changes. One integration PR carries both tests so separate
base refreshes do not keep invalidating each other. Full local verify passes
(928 passed, three intentional skips); exact-head CI and aging remain required. The original PRs remain open until this integration
lands. [HUMAN_TODO.md](../HUMAN_TODO.md) physical acceptance remains open.

## Backup validation route ownership (#536): 2 October 2026

Cabinet and combined-backup validation capture their route before reading the
file. A completed validation from a departed route cannot replace the staged
backup or open a restore dialog. Existing byte limits and error propagation are
preserved. The actual HTTP-origin regression exports ordinary app backups,
holds the real Worker response, navigates Home and releases it. Both baseline
dialogs reopen over Home; both guarded cases pass, with positive Settings review
controls and no destructive restore clicked. Twelve unit cases pass, versus
eight passes/four failures on the baseline, covering navigation during both
file reading and validation, retained previous state, errors and byte limits.
Gzip measures 134,833 (+20), code/shell 1,411,339 (+47); measured 32-byte
extensions leave 15 and 13 bytes. Both input paths need their capture/stale
check, with validated Cabinet data held locally until ownership is confirmed.
Full local verify passes (944 passed, three intentional skips), UI 184, mobile
QA 16 and all 270 real-origin checks pass. Independent Sol review has no
blockers; exact-head CI remains pending. Same-route concurrency and platform
picker timing are outside this slice. [HUMAN_TODO.md](../HUMAN_TODO.md) remains open; no
deployment or physical-device acceptance is claimed.

## Restore fixture transaction activity (#476): 2 October 2026

The bounded Club restore-ordering fixture now rejects requests outside its
creation/request callback activity window and after completion/abort. Immediate
callback microtasks remain valid; repeated/post-completion aborts throw
InvalidStateError. The 30 ms completion delay no longer grants permission to
later timers. This improves the fixture, not product storage. Six new tests
produce five baseline failures; all eleven fixture tests pass after correction.
Four semantic mutants are killed. A disposable real-origin Chromium probe
confirms timer/finished exceptions and callback microtask acceptance. Full local
verify at 59f2875 passes (938 passed, three intentional skips), and a fresh
bounded Muse xhigh review has no findings; it ran no commands. The fixture's
zero-delay activity checkpoint is an approximation; native durability remains
separate. Issue #476 stays open for transaction serialization, pending abort
error events and a behavioural stale-pin mutation. Hosted CI/aging are pending;
[HUMAN_TODO.md](../HUMAN_TODO.md) physical acceptance remains open.

## Workshop worker completion ownership (#535): 2 October 2026

Workshop edits and route entries now invalidate pending generation/verification.
A stale worker success cannot replace or save the newer draft; a stale rejection
cannot clear its verification state. A second check after persistence prevents
late success messages or scrolling. Generation uses its final render once.
The real-origin browser regression holds an actual Worker completion, paints a
room, and reads its saved IndexedDB draft. The baseline loses that edit, both
in place and after Home/Workshop; both cases pass with the guard. Twelve unit
cases pass, versus four passes/eight failures on the baseline, including ordinary
success/error and an edit during a delayed save. Gzip measures 134,813 (+65),
code/shell 1,411,292 (+152); removing the duplicate generation render trims six
emitted bytes and three gzip bytes. Measured ceiling extensions are 64 gzip and
160 shell bytes, leaving three and 28 bytes. Full local verify passes (932
passed, three intentional skips), UI 184 and all 15 mobile QA tests pass.
Independent Sol review has no blockers; exact-head hosted CI passed and #539 merged at be849af. No deployment or physical acceptance is claimed;
[HUMAN_TODO.md](../HUMAN_TODO.md) remains open.

## Lesson completion route ordering (#530): 2 October 2026

The lesson completion captures its lesson object and route serial before saving,
then checks both after the await. A newer route or replacement lesson keeps its
screen/dialog state; ordinary completion still opens or reveals its puzzle.
The actual real-origin IDB regression commits the learned-family preference,
holds only its completion notification, navigates Home, then releases it. The
baseline incorrectly opens Sudoku; the guard preserves Home. A fresh-profile
positive control also passes. Four executed unit cases have RED/GREEN proof.
The standalone measured bundle fits existing ceilings (134,747 bytes gzip);
on the landed tablet base it is 134,748 and code/shell is 1,411,140, exceeding
that ceiling by 12 bytes. The two required captures/stale check add 34 emitted
bytes with no redundant helper; a measured 32-byte shell extension leaves 20.
The JavaScript gzip ceiling is unchanged; source asset metadata is refreshed. Full local verify passes (920 passed,
three intentional skips), UI 184 and all 14 mobile QA tests pass. Independent
Muse review has no merge blockers. Its LOW scheduling claim is declined:
Playwright evaluate awaits the returned release Promise, and the actual
baseline regression fails after release. PR #534 merged at a3228b7 after completed exact-head CI and aging. No deployment or physical acceptance; [HUMAN_TODO.md](../HUMAN_TODO.md)
remains open.

## Goal continuation: 2 October 2026

Work is tracked in [ORCHESTRATOR.md](qa/2026-10-02-goal/ORCHESTRATOR.md) and
[PLANNER.md](qa/2026-10-02-goal/PLANNER.md). PR #523 was refreshed at 16f203b:
full local verify and exact-head hosted CI pass, a fresh Muse xhigh review has no
findings, and #523 merged at 45102bc. The #524 candidate aligns challenge imports to a 3 MiB UTF-8
byte cap and message. Source/built-worker focused checks pass (19), and the
real-origin challenge suite proves the file gate, actual Worker rejection of
multibyte oversize, unchanged replay on rejection and valid at-limit restore.
The full local gate and independent Muse review pass for the import fix (#527).
The toolchain upgrade (#522) merged at 8072981 after install, full verify,
Cloudflare dry-run, independent Sol review and exact-head CI passed.

The #526 candidate pauses native and Shadow DOM inputs before the first save
snapshot, cancels pending Club bot work, and checks all stores again before
controllerchange reload. Three real-origin RED-to-GREEN cases cover Club click
and keyboard moves, Quiet Wing realm names and cabinet notes. Rejected flushes
preserve data and restore controls; a final controllerchange failure avoids
reload, and a retry with no waiting worker releases the pause. The existing
two-release/two-tab suite passes 18 checks. Sharing pause/release sites trims
81 raw bytes; gzip remains 134,639 (+164), so the JS ceiling rises 128 bytes.
UI QA (184) and the full real-origin suite (270) pass. Muse's two MEDIUM claims
were triaged: temporary recovery-control pause is intentional, and native Enter
cannot focus or submit an inert form. A final independent Sol review has no
merge blockers. The render decorators remain adjacent, fixing two source-contract
regressions; source asset hashes are regenerated. On the landed Borough base,
JS gzip is 134,711 and code/shell is 1,411,081, requiring a measured 384-byte
code/shell ceiling extension after the shared-helper trim. The final full local gate passes (916 passed, three intentional skips). After
merging the refreshed import base, Android/seam checks pass (31), and the
combined real-browser pause/reload regression plus two-release suite passes
(four pause cases and 18 lifecycle checks, build 62c59a6a3c6a).

Borough #528 merged at 9f7e09d after its three-phone/desktop regression, full local
gate, independent review and exact-head CI passed. The confirmed 700px overlay
is fixed in PR #532, merged at 21091a0: six viewport checks, full verify, UI QA,
independent review and exact-head CI pass. Lesson
completion issue #530 is reproduced with a real IndexedDB completion delay.
#527 merged at 44f0bd0 after completed exact-head CI, and #533 merged at
f18c26e after its reviewed, tree-identical base refresh passed exact-head CI.
The original import CI cancellation is tracked in #531; one source-fixture
IndexedDB refusal with an unlogged trigger is tracked in #537. An independently
instrumented rerun passed all 46 unchanged challenge checks. A disposal data-loss claim was declined
after retained-state/retry behavior was traced.
No deployment or physical-device acceptance is claimed. [HUMAN_TODO.md](../HUMAN_TODO.md)
and the phone session remain open.
## Borough tablet navigation: 2 October 2026

Follow-up #529 moves Borough's confirmation/plot scroll margin to the 800px
breakpoint used by the fixed navigation. Before the change, the new regression
fails at 700x800 and 700x568: Build ends at the viewport bottom, behind a nav
starting 65px higher, and centre hit tests fail. After the change, six phone,
tablet and desktop sizes pass actual touch/click confirmation and focus return;
the five navigation-covered sizes also pass plan changes and keyboard continuation.
The download budgets pass without an increase. Full local verify and the UI
suite (184 checks) pass; tablet screenshots were inspected. Independent Muse
review finds no correctness, security or data-loss defect. Its non-blocking
coverage wording observation is clarified in this required QA receipt. This follows
#528 and preserves its separate phone fix/review. [HUMAN_TODO.md](../HUMAN_TODO.md)
still holds physical-phone acceptance; no deployment is claimed.


## Borough confirmation reachability (#497): 2 October 2026

Selecting a plot or changing its chosen plan now focuses and reveals Build;
confirmation returns focus and view to the built plot. A phone-only scroll
margin clears fixed navigation without adding an overlay. The new regression
fails on the old source at three phone sizes, then passes on 390×844, 320×568,
390×650 and 1440×900, checking hit testing before any automatic button scroll,
actual touch and keyboard confirmation, one move per action and focus return.
It waits for initial service-worker setup before measuring so installation
rerenders cannot shift the measured tap. Main UI suite: 184 checks pass.
Phone/desktop screenshots were visually inspected; layout and size gates pass.
The measured app gzip grows 101 bytes after trimming the first draft by 28;
the ceiling grows 64 bytes for its 21-byte excess. Full local verify passes;
independent review is pending. Not deployed or physically accepted; [HUMAN_TODO.md](../HUMAN_TODO.md)
and its phone session remain open.

## Goal-swarm wave 1 (merged): 1 October 2026

PR #515 merged to `origin/main` (merge `6364767`), 12 commits, CI 12/12 green,
one independent adversarial lens (NO-BLOCKERS), head aged past the floor:
ffprobe-skip when missing, prettier globs widened to tool/test subdirs with a
pin test plus the reformat, order-insensitive combined-backup manifest,
#501 desk attribution 24px targets with kept focus ring and hidden guard
(+73 shell bytes), damaged-local-record skip-and-report in getAll/export with
byte preservation, boot re-raise of the exact damaged message, asset catalogue
refresh. The boot re-raise matters: a September wave reverted a silent
fallback getAll skip because the origin suite requires the loud damage report;
this version keeps valid runs loaded while still surfacing the exact message,
and `scenario_malformed_persisted` passes. Ceilings raised with trim notes
(shell +1,024, CSS gzip +64, JS gzip +256); headroom is now thin everywhere
(~954B shell, 64B CSS gzip, ~80B JS gzip), so the next size-adding change trims
first. Verified on build `357cf188b484`: full `npm run verify` EXIT 0,
origin `malformed_persisted` 14/14, UI suite 184/184. NOT verified: full
origin suite, hosted behaviour, physical phone. Follow-ups filed: #516
validate-pack CLI tests, #517 quiet-import 2MB-vs-1MiB cap mismatch, #518
382-vs-510 puzzle count docs, #519 twelve bare-assert suites to node:test,
#520 five unwired browser suites; #501 kept open pending a device check and
linked to #515. Residual risks: the external `auto-alibi` fix-501 lane must
reconcile with #515 before landing; omitted triage backlog for wave 2
(reducer guards, fail-closed next-puzzle, wave-014 HIGH claims, restore
pre-read errors, settle guard, re-observe-while-hidden, offline-ready gate,
#489/#497/#476, Quiet Wing stale handle, lesson/apply-update gap, parked club
race + silent drop, escape epics #460-474 and #456).

## Session-3 swarm coordination (unreleased): 1 October 2026

Twelve PRs merged to `origin/main` (head `a851e9c`), each with CI green,
independent review and coordinator RED-to-GREEN proof where applicable:
#484 platform identity replace ordering, #488 non-OK asset-delivery test,
#491 challenge/editorial fail-closed loads, #495 scene clue-mark bound +
clear-voids-accused (with measured app-JS +128 and precache +1,024 raises),
#496 sidebar NEW-badge drop, #504 Borough plan/plot guards, #505 Voices
non-string release rejection, #506 quiet-import 1 MB pre-parse cap, #507
engine dimension-mismatch guards, #508 missing next-chapter routing with
catalogue pin refresh, #509 sudoku exclusion pins, #510 candidates pin.
Round-2 fixes: #495 precache raise (main had 43 bytes headroom), #507
prettier, #508 catalogue pins, one #488 OUTCOME-23 flake (rerun green) and
one duplicate-trigger verify cancellation on #510 (rerun green). Six stale
worker worktrees triaged (2 landed, 1 published, 3 discarded with reasons in
the lane known file). Verified: full `npm run verify` EXIT 0 (885 pass) on
the merged main; late-review sweep found only Codex quota notices, no
findings. NOT verified: hosted behaviour, physical phone. Still queued in
`auto-alibi` (running, coordinator re-enabled): fix-489 (Tic-Tac-Toe fixture
vs date validation) and fix-501 (desk attribution 24px targets) workers, plus
wave-026 backlog outputs awaiting triage. Strict branch protection
(`verify`, up-to-date) confirmed; three mid-session merges slipped through on
stale-base evaluation and main CI stayed green.

## Session-2 swarm wave (unreleased): 29 September 2026

Continued the background swarm (`auto-alibi` waves 007-015, plan in
`docs/qa/2026-09-29-swarm/PLAN.md`) with an in-session 7-agent research sweep
plus coordinator triage. Integrated, each RED-to-GREEN and pushed to
`origin/main`: challenge restore over unusable saves with the conflict guard
kept for valid records, theatre/voices pins (escape/deliver runtime-verified
by stub probes), combined-backup sanitized sections + 16MB/1MB text caps,
dev-server crash survival (500 + stream destroy, gallery `require.main`
guard), curation-derivative and `--pulseboard` fail-closed validation, and
inline micro-fixes (Club record dates, drag-commit before update, dossier
clue-toggle guard, late-import toast on route change). Rejected with code
evidence: cabinet 500/3000 asymmetry, discovery CAS and snapshot IDB claims
(abort semantics), Store.restore semantic-validation demand, cross-tab saved
self-conflict (accepted risk), BlockCabinetPrototype removal (diagnostics
hook), third nonogram-leniency sighting (player contract). Verified: full
`npm run verify` EXIT 0 on the clean tree, browser UI 185/185, real-origin
270 checks, budget/catalogue green after two trim rounds and measured ceiling
raises (+96 app gzip, +1,024 precache, catalogue regenerated). Visual probe of
fresh screenshots: no defects. Owner-visible, no code change: dominoes and
mahjong are playable via salon routes but have no cards and are skipped by the
home continuation. NOT verified: hosted behaviour, physical phone. Open
backlog in PLAN.md: wave-014 lens claims (curation-editorial/challenge
loaders, apply-update playable gap, lesson-finish yank), cross-tab Club race,
silent classics drop, tg lens claims.

## Swarm quality wave (unreleased): 29 September 2026

A background swarm (`auto-alibi`, 22 lenses + 10 workers over 6 waves, live plan in
`docs/qa/2026-09-29-swarm/PLAN.md`) hunted bugs, test gaps and dead code across engines,
storage, player, Club, Quiet Wing, voices, media, tools and docs. Nine fixes are integrated
in the working tree (uncommitted), each RED-to-GREEN: Club run date validation + house date
normalisation, workshop clue entry validation, local-server `_headers` survival, gallery
traversal/method/range hardening, storage key capture + restore shape guard, three tool
defects plus import guards, runBounded coverage, challenge trust pins, dossier link feedback.
Two candidates were reverted after the repo's own suites proved them wrong: strict nonogram
Solved (UI suite completes by filling only; leniency now pinned) and silent fallback
getAll skip (origin suite requires the loud damage report; bytes stay preserved). Budgets:
three trim rounds first, then measured +128 app gzip (133,952; at 133,910) and +1,024 shell
ceilings with justification; asset catalogue regenerated. Verified: every focused Node
regression RED-to-GREEN, full Node suite 787+ pass (only the 6 clean-tree-gated android
checks fail on a dirty tree, by design), browser UI suite 185/185 PASS, real-origin suite
271/271 PASS, budget GREEN. NOT verified: full `npm run verify` (needs committed sources),
hosted behaviour, physical phone. Open backlog in PLAN.md: cross-tab Club race, silent
classics drop, test-gap lens claims (two spot-disproven), apply-update input lock.

## Scene action validation (unreleased): 28 September 2026

The crime-scene reducer now rejects malformed exclude, clue, accuse and clear actions without
cloning or changing the current run. Valid actions retain their existing behaviour. The focused
Node regression covers invalid-action identity and each valid action path; the repository verify
gate also passes at the candidate head. Not deployed; no browser or physical-device check was run
for this pure reducer guard.

## Release 0.15.0: published 27 September 2026

Published from the release pull request ([#424](https://github.com/Chris0Jeky/Alibi/pull/424),
tag `v0.15.0`); the publication receipt is in [RELEASE-0.15.0.md](RELEASE-0.15.0.md). The Sites
fallback still serves 0.12.0 until q-9. It gathers the 2026-09-27 QA wave (audits in
`docs/qa/2026-09-27/`, redesign brief in `docs/design/`):

- Merged normally, after CI and review: #396 (PolyForm Strict license), #397 (budget double
  subtraction), #398 (Sites moved notice), #399 (legacy opt-out write), #400 (fake IndexedDB
  ordering), #402 (Postern redesign brief), #403 (Block Cabinet 500-move cap), #405 (Archive vault
  rooms), #406 (castle Chapter I).
- Merged with an admin override on the owner's instruction ("merge everything in order ignoring
  CI"), after conflict resolution and each PR's own review: #409, #410, #411, #412, #413 and #423.
  The merged `main` (`896bb6d`) built, and its full Node suite passed locally apart from
  `asset-audio` (no `ffprobe` here); the Android tests pass after `build:android`.
- Measured at release (all commented in `tests/budget.test.cjs`): application JS 133,670 gzip
  (ceiling 127 KiB + 3,648 = 133,696), initial code plus official data 205,233 (ceiling
  temporarily 200 KiB + 448), main CSS 34,079, Quiet Wing pack 2,312,559. After #425, #428 and
  #435, main measures 133,690 application JS and 202,748 initial. The +448 initial ceiling stays
  while the Interlock studies (#427) need it. The application JS ceiling gains a 128-byte margin for hash noise (133,824), not room
  for new code: the next feature that adds application JS trims first.
- Pulseboard: Voices intake live since 2026-09-27 (schema 5, voices admitted `["alibi"]`).
- Review follow-ups, all non-blocking: #404, #407, #416, #417 (intermittent Block Cabinet
  landscape test), #418, #419, #420, #421 (completion-hook hardening for #11).
- Human gates: [HUMAN_TODO.md](../HUMAN_TODO.md) q-2 to q-9, now organised as one phone session
  ([PHONE-SESSION.md](PHONE-SESSION.md)) and player-data calibration
  ([CALIBRATION.md](CALIBRATION.md)).

## Completed challenge routes (#434, refs #416): 27 September 2026

A completed curated challenge now refuses board input by click and by Archive arrow keys, and tells
the player to Undo or Start again. Undo stays available. Any board interaction cancels a pending
"Clear your finished route?" confirmation. Before this, a stray legal move after completion was
saved and un-completed the route. Opening an older Lantern Duel save that ends with Ink to move
now saves the settled reply once. Concurrent list and board opens share one IndexedDB open. The
optional Quiet Wing CSS is whitespace-compacted by esbuild. Verified: Node regressions (RED on
the old launcher and storage), full `npm run verify`, and Chromium suites at 390/1280px
(`browser_challenge_lifecycle`, `browser_challenge_library`, `browser_challenges`, `browser_quiet`,
`browser_calm`). Not verified: a physical phone. Still open under #416: the Quiet Wing host keeps
its old challenge handle across route changes. Details in
[CHALLENGE-LIFECYCLE.md](gameplay/CHALLENGE-LIFECYCLE.md).

## Numbered game restore identity (#435, refs #408): 27 September 2026

Backups and local saves whose Archive Heist or Lantern Gardens run has no own integer `level` are
refused, no longer restored silently as room 0. Every published level, including 0, is still
accepted, and games without numbered levels are unchanged. No live code path writes such a run
without `level`, so this refuses only hand-made or corrupted saves. A malformed local record keeps
its original bytes in protected mode. Verified: the new Node regressions (RED on the old
validator), full `npm run verify`, and the Chromium import/worker suites at 390/1280px. Not
verified: a physical phone. Details in [NUMBERED-LEVEL-RESTORE.md](gameplay/NUMBERED-LEVEL-RESTORE.md).

## Archive Heist vault rooms (#405, merged; in 0.15.0): 27 September 2026

Refs [#346](https://github.com/Chris0Jeky/Alibi/issues/346). The 24 curated vaults from 0.13.0
(`content/challenges/archive-vaults.json`) now also play as Archive Heist rooms 10–33 in the Games
Room; rooms 01–09 keep their maps, indices, replays and journal records (hash-pinned). Room
navigation is two disclosures (Rooms 01–09, Vaults 10–33) with solved markers read from existing
record ids, end cards after rooms 09 and 33, and a bounded room action. The Games Room and Pocket
Borough link the curated challenges at `#/quiet/challenges` (the current Quiet Wing router sends
`challenges?family=…` to the Realm page; switch once it reads a family filter). Measured
ceilings raised: startup JS gzip 130,955 -> 131,549 (+640), `club-engines` gzip 7,661 -> 8,475
(+832), Quiet Wing pack 2,303,623 -> 2,305,480 raw (+1,920; it embeds the engine). New checks:
`tests/archive-heist-vaults.test.cjs` and `tests/browser_archive_vaults.py` (local origin, 390px
and 1280px, all 24 vaults played). Not deployed; physical Android, TalkBack and human difficulty
remain open.

## Voices client half (#413, merged; in 0.15.0): 27 September 2026

Implements Alibi's half of the Pulseboard "Voices" contract v1
([FEEDBACK-AND-SURVEYS.md](FEEDBACK-AND-SURVEYS.md)): a quiet Feedback button in the top bar,
"Report a problem with this puzzle", the `alibi-taste-1` survey (Settings, plus a timed
invitation on completion screens), a rating row on official completion screens, Settings and
Privacy panels, and a localStorage offline queue with the contract's status handling. Journey
events now also carry `family` and `tier` for official puzzles. The sheet, forms, rating row and
delivery are one deferred precached chunk (19,704 bytes); startup grew 1,022 gzip bytes, so the
application-bundle and precached-shell ceilings were raised by the measured delta (see
`tests/budget.test.cjs`). Proven locally: `npm run verify` (all but the ffprobe-dependent
asset-audio test, which fails on this machine without ffprobe on the unmodified base too), the new
Node suites, `tests/browser_voices.py` against an intercepted collector, and the UI (3 widths),
observatory, origin, narrow, mobile/player QA, September feedback, feedback discovery and boot
browser suites. NOT verified: a live collector (the Pulseboard half must deploy and admit Alibi in
`COLLECT_VOICE_PROJECTS` first), a physical phone, or screen-reader output. Not deployed; no
version bump.

## Core-cabinet audit fixes (#412, merged; in 0.15.0): 27 September 2026

Fixes from the 0.14.1 browser audit of the core cabinet: library filters stay with one family
and Reset keeps Browse all (M2, m4, m5); a finished crime scene or Alibi file points at, and
scrolls to, the final question, and a wrong scene accusation says so (M3, m10); casebook
completions name the chapter and Next opens the next chapter (M5); journal links (M1 partial,
m12); touch-first instructions, live Sun & Moon count, solved-board hint, report copy (m8, m1,
m9, m21); the play bar says Casebook (m24); plurals (p1, p2). The service worker serves the
shell only at the scope root, `index.html` and single extensionless segments, so deep URLs
reach the styled static 404 (M4); `tools/serve.cjs` mirrors the host 404 locally. Application
bundle ceiling +448 (131,011 -> 131,464 gzip on main after #396). New suite
`tests/browser_core_cabinet.py` and origin scenario `unknown_paths`. Not deployed; hosted 404
behaviour and physical phones unverified.

## Published web release 0.14.1: 26 September 2026

Published from `76e2d2f` as [`v0.14.1`](https://github.com/Chris0Jeky/Alibi/releases/tag/v0.14.1):
Cloudflare Worker `856d1a61-fdae-4d6c-aca0-236ccc9982ca` (rollback `e667fd5c-784b-4754-b6f0-90be31293e1a`),
build `64e09f4e5707`, 292/292 files byte-identical, 244 hosted real-origin checks and 25/25 live
Pulseboard SDK checks (in-flow notice at 390px, region hint, 202 counts, GPC silent, Beta button
only in Settings/Privacy). Sites fallback still on 0.12.0. See the
[publication receipt](RELEASE-0.14.1.md).

## Castle Chapter I completion and navigation (#406, merged; in 0.15.0): 27 September 2026

Branch `fix/castle-completion-navigation` answers the castle audit (Chapter I completable but
never shown as finished, misleading guidance). Completion is derived from the Keeper's Study
record (no save change): grounds mark, finished thread, done stair and a
"Chapter I n/5 · Extra questions n/5" header. The thread sits above the map and only offers open
rooms; the keeper's letter opens on first arrival; locked doors, pins and first completions link
to the rooms that open them; the clock accepts 2100/21.00/21 00; the directory collapses planned
rooms; the Quiet Wing room bar is hidden on castle pages; blank hypotheses keep their draft. The
castle script ceiling rose by 2,816 bytes (measured 98,062 -> 100,837 of 101,120); core budgets
are unchanged. Physical keyboards and TalkBack remain unverified. See
[docs/castle/README.md](castle/README.md).

## Challenge library polish (#409, merged; in 0.15.0): 27 September 2026

The curated challenge library (QA findings F02–F06, F11, F12, F21, F22, F31 and F01's 10px link)
now reads as a player surface. `#/quiet/challenges?family=<id>` opens one family; the list is
grouped and collapsed (about 1,100px at 390px instead of 12,958px) with player-facing family
names, difficulty chips and Completed/Continue marks derived by replaying stored runs. The
launcher drops revision/title chrome, words refusals for players, pluralises, fills selected
controls, draws Hanoi discs, gives Archive boards a legend, 44px arrow pad, arrow keys and
adjacent-square taps, names Borough buildings with their scoring, and shows a completion card
(difficulty, Next in family, Back to the list) with a confirmed restart. Duel endgames: the player
keeps Gold; Ink replies by the recorded line, then the expert-depth search, and a lost line says so
with the stored hint. Classics claim a journal stamp only when one is earned. Definitions, ids,
revisions, replay format and storage are unchanged. Quiet Wing pack 2,303,623 -> 2,310,369 bytes;
its ceiling alone rose by the measured delta rounded to 64 bytes (+6,784). Node suites, budget,
`browser_challenges.py` (isolated and served), `browser_planning_expansion.py` (built and
isolated, 72 each), `browser_calm.py`, `browser_quiet.py` and the new `browser_challenge_library.py`
pass locally on a local Chromium headless shell; not deployed, no physical phone.

## Games Room phone polish (#410, merged; in 0.15.0): 27 September 2026

Branch `fix/games-room-polish` answers the Games Room QA findings F07-F10, F13-F15, F17-F20,
F23, F31 (Club plurals) and F33. At 390×844 the Duel board moved from y=728 to 440-772 of a
779px usable height (TTT status 879 -> 690, Archive pad 834 -> 655): phone play pages collapse the
room banner to one line and the heading to one row. Block Cabinet's phone actions stick to the
bottom only, directly under the tray, and its ⋯ menu scrolls into view with focus (Cascade lab
shares the surface). Finished Duel/TTT/Gardens offer Play again without a dialog; solved gardens
offer Next garden; journal records name their game; section numbers and card engravings follow
the card order. The phone nav's Settings tab (duplicating the top bar) became the Quiet Wing,
and the wing header has a 44px "← Back" on phones. Application JS measured 130,955 -> 131,382
gzip (ceiling +448); main CSS 33,903 -> 34,046 (unchanged ceiling); Quiet Wing pack
2,303,623 -> 2,303,890 bytes. Not done here: the sidebar "NEW" badge (`src/app.js` sidebar,
outside this slice) and the Borough Build button, still about 75px below the fold at 390×844.
Local Node suites and the Club, Block Cabinet, block motion, Gardens, Tic-Tac-Toe, Quiet Wing
and targeted mobile QA browser suites passed; no physical phone, hosted origin or deploy.

## Pulseboard SDK v3 (0.14.1 candidate, merged as #391, historical): 26 September 2026

Branch `feat/pulseboard-sdk-v3` replaces the aggregate statistics embed and
`src/observatory-loader.js` with the Pulseboard SDK v3 (`observatory/pulseboard.js`, built
from Pulseboard `5b53836` (SDK 3.1.0) for release 0.14.1) and `src/pulseboard-host.js`. The Beta notice is
in flow at the top of the page; the Beta button renders inline in Settings and Privacy only.
Puzzle journeys carry official ids and numbers only. Version 0.14.1 must be registered in
Pulseboard and `alibi` admitted to `COLLECT_PRODUCT_PROJECTS` before this deploys
([release record](RELEASE-0.14.1.md)). Pulseboard's `sync:alibi` still targets the old embed, so
`npm run release:prepare` fails until it learns SDK v3. The application bundle budget took a
measured +256-byte ceiling (130,084 -> 130,678 gzip). Local `npm run verify`,
`node observatory/check.mjs` and the browser suites observatory (82), origin (244), UI at 390px,
narrow layout, mobile QA, player QA, September feedback, curation, discovery, boot and Android
payload passed; not deployed.

## Published web release 0.14.0: 26 September 2026

Published from `985515e` as [`v0.14.0`](https://github.com/Chris0Jeky/Alibi/releases/tag/v0.14.0):
Cloudflare Worker `e667fd5c-784b-4754-b6f0-90be31293e1a`, 292/292 files byte-identical,
244 hosted real-origin checks (Vault chunk offline included). Sites fallback still on
0.12.0. Open follow-ups: [#389](https://github.com/Chris0Jeky/Alibi/issues/389) (Vault
chunk LOWs), [#387](https://github.com/Chris0Jeky/Alibi/issues/387) (intermittent test).
See the [publication receipt](RELEASE-0.14.0.md).

## Release 0.14.0 candidate: 26 September 2026 (historical)

Branch `release/0.14.0` publishes the 80 Vault studies merged in #385 (510 puzzles,
30 packs; provisional 47 Expert / 33 Master) through the precached deferred chunk. The
release label was registered with `npm run release:prepare -- 0.14.0 --publish`, which
opened [Pulseboard#124](https://github.com/Chris0Jeky/Pulseboard/pull/124) unattended; it
merged and the collector deployed as Worker `1fdd08f8-a81f-436c-ab41-90762ce79fbd`
(rollback `6735ac3b-2187-4c91-a50f-ac2822ae35f9`) before Alibi. #354 is closed as superseded.

## Published web release 0.13.0: 26 September 2026 (historical)

Every later section below is historical: its deployment status and next-step directives
predate this release (0.13.0 deployed the Settings-slot Usage sharing change).

[PR #386](https://github.com/Chris0Jeky/Alibi/pull/386) merged as `fa9dc0e`;
[`v0.13.0`](https://github.com/Chris0Jeky/Alibi/releases/tag/v0.13.0) and its assets
point there. Clean build `81d973e4d783` (430 puzzles). Cloudflare Worker
`65d60c13-1cb6-4567-8637-92e2fe249afc` serves it: all 291 files matched byte for byte
and 243 hosted real-origin checks passed. The Pulseboard collector admitting 0.13.0
deployed first. The Sites fallback still serves 0.12.0 (no Sites tooling this session).
Intermittent local test failure tracked as [#387](https://github.com/Chris0Jeky/Alibi/issues/387).
Next: [PR #385](https://github.com/Chris0Jeky/Alibi/pull/385) delivers #354's 80 Vault
studies through a precached deferred chunk (199,942 initial gzip bytes), superseding #354.
See the [publication receipt](RELEASE-0.13.0.md).

## Release 0.13.0 candidate: 26 September 2026 (historical)

Branch `release/0.13.0` carried version 0.13.0, its release record and the
[receipt draft](RELEASE-0.13.0.md): 36 new challenges (#357), Duel strengths /
Cabinet restarts / opponent retry (#366), Usage sharing in Settings, Club
hardening and stale-async fixes (#383, from a Muse bug-hunt plus a Codex
follow-up). The catalogue stays at 430 puzzles; #354's 80 Vault studies wait
for deferred delivery (a replacement PR is in progress).

Retroactive audit of the previous merge wave: main's full CI Verify for #366
had been cancelled by the docs-only #381 push; a dispatched full run on
`b1c1977` passed, local verify passed, and #382 now gives main pushes a
per-commit concurrency group so this cannot recur.

Release registration is automated (#384): `npm run release:prepare -- <version>
[--publish]` validates the record, sets the version, runs the Pulseboard sync in
a temporary worktree and its tests, and opens the Pulseboard PR. Proven locally:
the 0.13.0 no-change path and a full unpublished 0.13.1 scratch path. Pulseboard
#109 admitted 0.13.0 (it also derives test expectations from the registry) and the
collector deployed as Worker version `ed739cc8-b136-4c28-864f-6b34f9b2ee95`
(rollback `bffba8a7-d066-46a8-887a-bf1c916f2648`); `/healthz` and `/readyz` 200. No
live 0.13.0 count was sent. Collector deployment remains a manual step: automating it
needs a Cloudflare token in Pulseboard Actions (owner decision).

## Coordinator merge wave: 26 September 2026 (historical)

Merged, each with exact-head green CI, head age, an independent review and
resolved threads: #281 research docs, #350 Vault authoring foundation
(+ #369 fail-closed profiles, coordinator recipe test), #357 planning vaults
and challenge registry, #365 lossless official-content delivery, #366 Duel
strengths, Cabinet restarts and opponent recovery (+ #370/#371 test pins).
Stacked fixes #369-#372 merged into their bases first. Owner hotfixes
(fcc8d4b-3e00ef5) moved main mid-flight; branches re-refreshed onto each base.

Two CI trigger gaps observed: conflicting PRs get zero pull_request runs (no
merge ref), and one push fired only 2 of 5 workflows (selective drop,
unexplained). Required-conversation-resolution blocked #350 until four bot
threads were answered; #357/#366 had three more between them.

#354 stays draft: measured 205,448 initial gzip bytes vs the 204,800 limit,
with vault content costing 7,495 bytes inside the initial script, so it needs
deferred (non-initial, precached) delivery plus recertification
(vault-binary-03 recomputes residual 8 vs stored 15, below the 12 bar) and
the 80-board actual-control matrix. Design-system audits posted on #219
(inversion fixed; adoption remainder quantified) and #220 (remainder
quantified with token proposal); both need visual review before migration.

## Usage sharing moved into the Settings slot: 26 September 2026 (historical; deployed in 0.13.0)

Source `d64b911` answers the owner's "can't find the setting" report: the
hotfix banner rendered above the app header and read as a cookie notice. The
generated control now moves into a real slot panel inside Settings (second
panel) and Privacy, with a fail-closed fallback line when the adapter cannot
load; the app rescues the node across re-renders. Local `npm run verify`,
`node observatory/check.mjs` and 73 intercepted Observatory browser assertions
passed. NOT deployed per owner request; the live Cloudflare origin still
serves the banner hotfix (`6b11d27969d7`). Deploy with the next release.
Separately, [issue #380](https://github.com/Chris0Jeky/Alibi/issues/380) seeds
the in-app feedback-pipeline proposal (description field plus direct or
GitHub-issue submit); the owner contact decision is open.

## Hotfix: Usage sharing confined to Settings: 26 September 2026 (historical; superseded by 0.13.0)

Source `afabf32` (three commits on `main`) fixes the player-reported floating
Usage sharing popup: the loader now hides the generated control on every route
except Settings and Privacy, where it renders as a static top-of-page box.
Sharing still defaults on for eligible visits; no default change was made.
Version stays 0.12.0 (Pulseboard registration unchanged); clean build is
`6b11d27969d7` with 130,366 startup JavaScript gzip bytes against the extended
130,432-byte ceiling. Cloudflare Worker version
`c8a8b8d5-7521-4779-98f1-545da40e2cac` serves the hotfix. Local `npm run
verify`, `node observatory/check.mjs`, 65 intercepted Observatory browser
assertions and a live disposable-profile smoke (collector blocked, no popup on
home at 390px, settings/privacy box visible, opt-out persists, no page errors)
all passed. The Sites fallback still serves the pre-hotfix build (saved
version 23); it never loads the control and no Sites deploy tooling was
available in this session. Full CI matrix and physical-device confirmation are
pending. See [the hotfix receipt](HOTFIX-2026-09-26-USAGE-SHARING.md).
Rollback: Worker `8edf7ab7-a92e-4963-be7a-d1bebcd68fe8`.

## Lossless official-content delivery merged: 26 September 2026 (historical)

PR #365 merged the lossless record/column encoder for the five startup JSON
globals with byte-identical restore, decoder bytes inside the counted content
script, and VM-executed install tests. It unblocks the Vault collection #354
delivery gate pending full-payload re-measurement.

## Published web release 0.12.0: 25 September 2026 (historical)

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

## Club persistence and restore hardening merged: 25 September 2026 (historical)

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

## Planning vault integration recovery: 25 September 2026

PR #357 now wires its existing 24 Archive vaults and 12 Borough contracts into
one trusted source registry for both the optional launcher and validation worker.
All 59 earlier challenge definitions and starting identities remain intact.
Independent push minima, native immutable replays, source projection and actual
emitted-worker checks cover all 95 challenges. The legacy audit also covers 95.
The two #357 data files remain byte-identical to c60c3285; no older handoff map
replaces them. See docs/curation/PLANNING-VAULTS.md for proof limits and the missing
historical generator, and the new read-only planning control workflow for the
real-origin gate. Isolated controls pass all 72 cases; this does not certify
origin persistence, physical Android, TalkBack or calibrated human difficulty.
No budget increase, merge, deployment or release is implied.

## Vault authoring foundation: 26 September 2026

PR #350 (#345/#161) adds six authoring-only files: bounded independent Sudoku
enumeration, answer-free elementary-method profiles with fail-closed unsupported
markers, symmetry/digit-renaming identities, native/independent uniqueness
certificates, seeded Sudoku recipes and a read-only authoring workflow. No
playable puzzle, runtime generator, save format, budget or deployment change.
Coordinator review verified the bounds and added recipe
determinism/uniqueness coverage. Stored profiles must be recomputed after
production hint changes; human difficulty stays under #161 / q-8. The
dependent Vault collection #354 was retargeted to main after the merge.

## Games Room recovery draft

The #347 continuation adds bounded Duel strengths and fresh confirmed Cabinet
restarts, with explicit worker-error retry and stale-reply guards. See
[Games recovery](curation/GAMES-RECOVERY.md) for the source and browser receipts.
Eighteen source tests and ten/76 standalone browser checks pass. The measured
JavaScript exceeds the unchanged cap; no full-CI, merge or release claim is made.
Physical-device and human gates remain in HUMAN_TODO.md.

### Games Room budget recovery

The gameplay slice moves enhancement metadata into the existing official data
asset and retains the same startup global. All values are independently compared
with the asset builder; no metadata, request, shell entry or byte accounting is
dropped. The measured 430-puzzle build is 129,651 JavaScript gzip bytes and
203,370 combined initial bytes, below unchanged 130,304 and 204,800 limits.
Twenty-three focused checks, ten actual-worker standalone scenarios and 76 Block
assertions pass after this change. Full exact-head CI, origin storage/offline,
independent review and physical/human acceptance remain required.
