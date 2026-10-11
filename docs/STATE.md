# Live development state

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
The CSS fix awaits budget and real-origin qualification; the hosted disclosure
failure is not dismissed as flaky. Source-specific controls and independent reviews are
recorded in those PRs; combined build, browser and exact-head hosted gates remain
pending at this checkpoint. No source PR merge or primary deployment is claimed.
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
