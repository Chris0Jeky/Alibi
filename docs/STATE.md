# Live development state

## 2026-10-16: asset gallery server sends Content-Range on malformed-Range 416 (PR #694)

`tools/serve-assets.cjs` now answers a malformed `Range` header with 416 plus
`Content-Range: bytes */<size>`, matching its other 416 path and `tools/serve.cjs`
(RFC 9110). Dev tooling only; no app or save behaviour changes. Proof:
`node --test tests/serve-assets.test.cjs` (fails on the old code) and
`tests/serve-gallery.test.cjs`.

## 2026-10-16: Quiet Wing fallback quarantine candidate

Malformed fallback JSON is copied byte-for-byte to recovery before the active
key is removed, allowing a fresh save. An occupied recovery slot or failed
recovery write preserves both records and keeps storage read-only. The occupied
slot regression fails before the review correction. This candidate is not deployed. Physical
acceptance remains open in `HUMAN_TODO.md`.

## 2026-10-16: byte-accurate backup import limits

The validation worker now measures UTF-8 bytes for Castle, combined, Cabinet and
Club backup text, matching the existing Challenge and Quiet Wing checks. Limit
values and validation rules are unchanged. Eight focused regressions pass; four
oversize multibyte cases fail against the original worker. The full verify gate
is run after committing because the Android payload requires a clean source tree.
Hosted CI, browser integration and physical devices are not verified by this
entry; owner acceptance remains in [HUMAN_TODO.md](../HUMAN_TODO.md).
Residual risk: multibyte files previously admitted by character count can now be
refused at the documented byte limit, before parsing or changing saves.
## 2026-10-16: scene victim-room regression candidate

Three source-engine tests pin the victim sharing a room with exactly one
suspect, rejecting zero or two. No gameplay behavior changes. Physical
acceptance and owner decisions remain open in `HUMAN_TODO.md`.

## 2026-10-16: #606 read-only Cabinet capability and #620 recovery wording (PR #690)

When IndexedDB is unavailable and Cabinet reads localStorage, the player save status and
Settings say **Puzzle progress is read-only here; settings still save** before any edit.
The shared label limits the warning to puzzle progress: local settings, preferences, drafts
and packs remain writable. Settings mentions existing Cabinet saves only when legacy
records exist and retains the instruction to export puzzle edits before reloading.
The first refused run save still retains the edit for export and blocks further edits.
A shared temporary-progress check makes notes, pause, completion and journal wording accurate
in both local read-only and session modes, without duplicating their session strings.

The older-browser-data warning retains the not-migrated wording for IndexedDB. In local mode
it explains that Cabinet reads these saves as read-only; in session mode it explains that
these records are not used by the session. Both describe the raw export's unreadable records.
The explicit recovery action and failure/retry reporting remain. The export success notice
confirms unchanged data without claiming that fallback records are separate saves.
The catalogue's 13 `src/app.js` byte/hash receipts follow the changed source.

One owner-requested fix round addresses F3/F4/F5 only. Before the fixes, the updated save-label
unit assertion failed and the new empty-origin browser case reproduced the false existing-save
claim. The focused storage/export/asset/completion/budget batch passes **135 tests**; formatting
passes. Native Chromium `tests/browser_storage_readonly.py` passes **66 cases** at 390/1280px
(previously 58), including no legacy records, a setting toggled through the UI and persisted
across reload while progress remains read-only, temporary notes/pause/completion wording,
valid/malformed string preservation, ordinary/raw exports, refused-edit export and reload.
Pause and edit probes are separated by reload because pausing already attempts a run save.
`tests/browser_ui.py` passes **187 checks**; real-origin `legacy_browser_recovery` passes **33**.
Phone and desktop Player/Settings screenshots were inspected. Quiet Wing's separate
engine/contract suites pass **581,856/43 assertions**.

The direct full Node run (`node --test --test-concurrency=2 tests/*.test.cjs tests/*.test.mjs`)
reports **1,598 pass, 7 fail, 3 skipped** (1,608 total). All seven failures are in
`android-build.test.cjs` and report `Android builds require a clean source tree.`
`npm.cmd test` stops at its clean-source artifact preflight. These are clean-source artifact
gate limitations with the requested uncommitted edits, not a green full gate. No gate bypass.

Same-toolchain web build before/after this review round: JavaScript gzip **134,431 -> 134,480
bytes (+49)**, leaving **464 bytes** below the unchanged 134,944 ceiling; initial code/content
gzip **201,704 -> 201,752 (+48)**; precached shell excluding official content **1,409,630 ->
1,409,677 (+47)**; core offline **1,921,645 -> 1,921,692 (+47)**. All unchanged byte ceilings
pass; deferred definitions remain **21,266 gzip bytes**, with **570 puzzles**. The emitted build
is `4b5aedc1d01b` (sourceDirty true). No database, puzzle identity or ceiling changes.
Evidence is local and ignored under `test-results/readonly-review-*` and
`test-results/storage-readonly/`.

No commit, push or deployment was performed. Hosted, clean-source Android payload and
physical-device acceptance are not claimed. Owner actions remain in
[HUMAN_TODO.md](../HUMAN_TODO.md); this copy/test round closes none of them.

## 2026-10-16: #677 acknowledged-save allocation benchmark

Added the reproducible, self-checking `node --expose-gc tools/bench-save.cjs` and
[measurement report](qa/SAVE-CLONE-BENCHMARK.md). On Node v24.13.1 / i5-13600K,
500 measured saves per strategy/profile compare the actual save path without ack,
#617's JSON clone, structuredClone and an immutable JSON string. Synthetic profiles
cover 10 edits, 100 undo with dense notes across 100 loaded saves, and the import
stress bound of 3,000 loaded saves with one 100-undo/100-redo active row.

The cost is material: heavy-row ack p95 falls **2.066 -> 0.886 ms** and retained ack
heap **81.400 -> 15.858 MiB** with the string; ceiling ack p95 falls
**3.507 -> 1.694 ms**. Total save median/p95: fresh **0.059/0.120 -> 0.076/0.138 ms**,
heavy **5.669/8.767 -> 4.806/6.722 ms**, ceiling **10.258/13.547 -> 9.116/10.623 ms**.
Small fresh timings are near the noise floor. No measured save exceeds 50 ms;
ceiling saves over 16.67 ms fall from 4/500 to 0/500. These are Node duration
proxies, not browser long-task entries. structuredClone is slower on the large rows.

`acked` now stores immutable full-row JSON strings at all three setters; backup
comparison retains full-row equality, including same-revision restores (#602).
Both earlier ownership clones, persisted bytes, CAS and backup formats are unchanged.
At an explicit, uncalibrated 6x low-end slowdown estimate, heavy/ceiling ack p95 is
**5.316/10.164 ms (31.9%/61.0% of a 60 Hz frame)**. Both still exceed the proposed
10% frame budget; physical Android performance and IndexedDB timing are unmeasured.

Verification: new byte-equivalence/immutable-baseline tests fail before the change
and pass after; persistence/storage selection **102 pass**; real-origin Chromium
suite **599 checks pass**; web build and format check pass. Quiet Wing engines pass
**581,856 assertions**, contracts **43**. Ordinary `npm test` refuses the required
uncommitted state/missing Android artifacts. Its body run separately reports
**1,599 tests: 1,583 pass, 3 skip, 13 fail**: twelve need Android artifacts or a clean
Android source tree; the changed app hash caused one asset-catalogue failure, fixed
by refreshing only its 13 app receipts (catalogue tests now **2 pass**).
No whole-suite rerun is claimed after that metadata correction. Details and raw
receipt location are in the report. No commit, push or deployment was performed.
Owner actions remain in [HUMAN_TODO.md](../HUMAN_TODO.md); none are closed here.

## 2026-10-16: #684 respondent reset under the revision lock (PR #685)

`resetRespondent()` now runs entirely under the Web Lock shared with `survey()`, `enqueue()`
and `flush()`, so a reset racing a submit in another tab can no longer erase the fresh
respondent's revision counter (which made the next edit reuse revision 1 and get a 409).
A rejected lock refuses the reset visibly and leaves storage untouched. After the awaited
reset the sheet re-reads Voices state before clearing `rated`, so a preference changed in
another tab during the wait is not overwritten. Behaviour-preserving trims keep the Voices
chunk under its unchanged caps (20,480 raw, 9,216 gzip).

Proof: three new Node regressions failed first (one produced revision 1 instead of 2);
queue tests 44 -> 47, selected Node tests 73 -> 76, browser assertions 151 -> 159; `npm run
verify` passed (1,597 pass, 0 fail) before the state re-read fix. Not verified: hosted
collector and physical devices. Residual risk: raw Voices headroom is a few bytes.

## 2026-10-16: #683 deferred WebP provenance must match the record's hash (PR #686)

The #678 guard is strengthened: a deferred WebP in `content/asset-delivery.json` now needs one
curation registry record whose file AND sha256 match the declaration and that carries rights
(`rights.licence` or `source.rights`); a rights-less duplicate cannot satisfy it, and a matching
record among duplicates is accepted. Derivative records under the policy's `src/curation-assets`
root are reachable, matching where real derivatives live. Swapped bytes with an updated policy
hash are refused because the record hash must match.

Proof: six regressions failed first; the delivery, budget and official-deferred selection (21)
passes; `npm run verify` passed (1,601 pass, 0 fail). `content/asset-delivery.json` `deferred` is
empty, so current content is unaffected. Not verified: hosted and device acceptance.

## 2026-10-15: #678 deferred WebP provenance guard

`tools/build-delivery.cjs` now refuses deferred WebP declarations unless their file
matches a source or derivative in the existing `assets-source/curation/registry.json`
with nonempty `rights.licence` or `source.rights`. The error names the missing file;
the delivery authoring guide documents the enforced requirement.

Test-first proof: the new regression failed with `Missing expected exception`
before the guard. It now rejects missing records, unrelated files and missing rights,
and accepts both source-rights and derivative-licence records. The delivery-build
suite grows from 2 to 3 tests; delivery-build, budget and official-deferred together
grow from 14 to 15 passing tests. `npm.cmd run build` and `npm.cmd run format:check`
pass. Output retains 570 puzzles, 302 files and 3,384,920 enhancement bytes.
No commit, push, hosted verification or physical-device acceptance is claimed;
owner actions remain in [HUMAN_TODO.md](../HUMAN_TODO.md).

## 2026-10-15: survey v2 edit revisions (#680; PR #681 review fixes)

`feat/voices-survey-v2-680` sends `pulseboard.survey/2` for surveys and ratings.
Per-respondent, survey and subject counters persist before queueing under a cross-tab
Web Lock. Deliberate edits increment;
retries retain their exact revision. Older enqueues cannot displace newer edits, including
after queue removal. Legacy queued v1 answers migrate to revision 1 before sending.
202 updated/duplicate/stale finish delivery; 409 conflicts drop with the existing refusal
note. Missing durable counter storage/Web Locks and counter exhaustion refuse new answers.
Feedback retains its existing memory fallback and retry rules.

PR #681's one review fix round catches rejected Web Locks. Surveys and ratings visibly
refuse writes without an acquired lock, preserving cross-tab revision ordering; feedback
retains its memory-only delivery and retry fallback. Queued surveys wait until locking
recovers. The rating tap chain catches failures so later rating and heart taps can retry.
A queued v2 item without a revision counts as revision 0 when allocating the next edit.

Six new Node regressions failed before the fixes. Queue tests increase from 40 to 44;
the selected Voices and budget tests increase from 67 to 73, all passing. The intercepted
browser suite increases from 140 to 151 assertions, all passing, including rejected-lock
survey submission, a refused rating followed by a successful tap, subsequent heart taps,
and feedback with both locks and Voices storage blocked. No unhandled page errors.
The local web build reports sourceDirty true; build, budget and format checks pass.
Review-round Voices raw bytes: 20,424 -> 20,476 (+52), below 20,480 with 4 bytes left.
Gzip: 8,885 -> 8,930 (+45), below 9,216. Startup gzip: 204,197 -> 204,195 (-2),
below 205,248. No budget changed.

Initial implementation evidence: seven new regression cases failed against v1, while the existing
202 handling already passed. Queue tests increased from 29 to 40; the complete relevant
Voices and budget selection passes 67 tests. Rapid rating/heart edits and re-enqueue after
a newer answer drains each failed before their fixes. The intercepted Voices browser suite
passes 140 assertions, including real Web Locks across two tabs, real localStorage and reload.
Phone (390px) survey and desktop feedback screenshots were inspected. The real-origin
storage/offline suite passes 599 checks in disposable profiles. These are browser proofs,
not hosted collector or physical-device acceptance.

The initial implementation's local web build reported sourceDirty true. Voices raw bytes:
20,048 -> 20,424 (+376), below 20,480; gzip: 8,659 -> 8,885 (+226), below 9,216.
Startup gzip: 204,191 -> 204,194 (+3), below 205,248. No budget changed. Repeated UI
explanations were shortened to fit the existing deferred-chunk ceiling.

Initial wider checks (not repeated for this review round): `npm test` stops at its clean-source artifact preflight;
`npm run build:android` likewise refuses an uncommitted tree. The test body run separately
with `npm run test --ignore-scripts` reports 1,563 tests: 1,553 pass, 3 skip and 7 fail.
All seven failures are the unchanged Android clean-source requirement in
`tests/android-build.test.cjs`: generated artifact contract; shared content revision;
native flavor substitution; runtime/metadata tampering; deterministic derivation;
bundled-file tampering; source/content provenance tampering. Quiet Wing engines pass
581,856 assertions and contracts pass 43 assertions when run separately.

This review round leaves source, tests and these notes uncommitted and unpushed, as requested;
the driver owns commits. No deployment or physical-device claim is made. After coordinator
integration, the remaining artifact gate is a clean-source Android build and ordinary
`npm test`. Owner actions remain in [HUMAN_TODO.md](../HUMAN_TODO.md), including physical
Android/TalkBack acceptance; this change closes none of those items.

## 2026-10-15: #427 source-preview legacy-storage regression

Compared generated house previews at base `5966611b` and head `8af04097`: the
merged legacy-recovery change adds `Store.legacySnapshot()` and `legacyBanner()`.
Both versions already await storage initialization before rendering. The source
preview reads all definitions directly and does not consume `dist/` or the deferred
delivery graph, so this is not a deferred-chunk startup-order change. The reported
failure at `72d5dfd9` is not explained by its diff: its preview generator and runtime
source inputs are unchanged from `5966611b`.

`tools/preview-house.cjs` now gives only an opaque `about:` document an empty legacy
inventory: that explicit source fixture has no saved origin to inspect. It retains
session-only storage warnings, initialization order and real-origin recovery probes;
HTTPS, file URLs and about:blank documents inheriting a real origin retain failures.
Production storage and app source are unchanged. At 320x844, the repaired preview
matches the base: resume y=327.39, Play y=449.23 (previous head Play y=571.23).

Local proof: web build passes; source-preview mobile/navigation suites pass 250/79
checks. House, budget, official-deferred, delivery-build, platform-build and
legacy-recovery suites pass 65 tests. The preview regression failed before the fix
and now covers denied storage with opaque, HTTPS, file and inherited origins. A
browser on a simulated HTTPS origin still shows the denied-storage banner and export
control (commit c463e220). Hosted CI and physical-device
acceptance are not claimed; owner actions remain in [HUMAN_TODO.md](../HUMAN_TODO.md).

## 2026-10-15: Interlock deferral and owner-authorized budget headroom (#427)

The owner authorized both deferral and higher reasonable caps. Both Interlock packs, Expert
Families and Master/Grandmaster now use the existing declarative `official-packs.json` list:
570 unchanged definitions in source order, 403 initial and 167 deferred across nine packs.
Initial gzip measures 200,827 bytes, 4,421 below the old 205,248 cap; the new cap is 225,280.
Deferred gzip measures 21,266 against the new 32,768 cap (old 12,288). JS/shell caps are unchanged.
Optional WebP declarations join the existing verified asset-delivery path and byte receipt.
Author instructions and cap rationale: [DELIVERY.md](content/DELIVERY.md) and
[INTERLOCK-STUDIES.md](content/INTERLOCK-STUDIES.md). Committed in 72d5dfd9; `npm run verify` passed
1,568 tests at 05fd9f45. Hosted and physical-device acceptance are tracked separately.
Owner actions remain in [HUMAN_TODO.md](../HUMAN_TODO.md).

Local evidence: 53 focused content/accounting/worker tests and 17 optional-image/budget tests
pass; nine Interlock registry-selection tests pass. All 60 studies pass 720 real-origin checks
at 390/1440px, including save/reopen/offline reload; representative screenshots inspected.
The complete Node unit script reports 1,530 passes, 12 Android clean-source/artifact prerequisite
failures and three skips. Quiet Wing suites pass 581,856/43 assertions separately. Formatting and
diff checks pass. `npm test`/`npm run verify` cannot pass while this tree is intentionally
uncommitted: Android refuses dirty source, and the normal pretest requires matching clean web
and Android artifacts. Guards remain intact; driver review/commit then `npm.cmd run verify` is
the exact resume point. GitHub authentication is unavailable (HTTP 401); no hosted CI claim.

## 2026-10-15: Interlock studies merged with current main (#427), budget still blocked

Interlock candidate #427 is merged with main `abb0be0a`: the 60 definitions/editorial receipts are
unchanged, the registry now defers the four Vault packs, the crime-scene variations and Interlock Routes
(570 puzzles, 32 packs, 448 initial and 122 deferred), and the exact official-byte accounting replaces the
double subtraction. On the merged tree the shell (1,406,586) and JavaScript (133,778 gzip) fit their
unchanged ceilings, but two existing ceilings are exceeded: initial code/content measures 205,708 gzip
bytes against 205,248 (460 over), and the deferred official chunk measures 14,633 gzip bytes against
12 KiB (main alone measures 11,490, so Interlock Routes' 36 puzzles do not fit). No ceiling is raised and
no pack is deferred beyond Routes without an owner budget decision, still tracked under #422.
Full verify, Android, real-control and hosted browser acceptance are not claimed.

## 2026-10-14: a held Enter leaves a clue check and a favorite in place

Holding Enter on a clue or a favorite checked it, and the key repeat removed it. A separate later press still removes the check or the favorite. Cell notes, number keys, board size, pause, and the held digit guard are unchanged.

An isolated page checked the first scene clue, favorited the first listed puzzle, and checked the first mobile clue. Each repeat left that choice in place, and the next press removed it. The same build still leaves a repeated Enter on Cell notes, a number key, board size, and pause in place. No page errors. The asset catalogue records `src/app.js` at 208,521 bytes, sha256 `8ecfaff2c216fd5eb196ddca0cc84a4e6f4f8d1a9085734794d86fae45205b4a`. `tests/budget.test.cjs` passed on local web build `4535d53c9536` at 203,491 initial gzip bytes, under the existing 205,248 ceiling. The voices chunk is 20,048 bytes. JavaScript gzip is 133,781. The measured sourceSha was still `73589add` because this edit was uncommitted. sourceDirty true. Payload `9f89dfc81e1adb1158e7237dcc8c1a05d360f052113cabaa61e6b48b61018dc4`. That build was dirty and is not a hosted measurement. Physical devices remain in HUMAN_TODO.md.

## 2026-10-14: held Enter and a held digit both leave a cell note

This merge keeps the Enter guards and the held-digit guard. A repeated Enter on number key 1 leaves note 1. A repeated digit key 1 also leaves note 1. A later press removes it. Zoom, pause, and Cell notes stay on when Enter repeats.

The combined desktop page showed each repeat leaving the note, the enlarged board, and the pause in place. The September feedback page passed at 390px and 1440px. The asset catalogue records the combined `src/app.js` at 208,425 bytes, sha256 `e9f8f80b553d6b0d6bf06037c27277f95374ff58777393896adf1b1db1584444`. `tests/budget.test.cjs` passed on the combined local web build `9dcabedacc9e` at 203,471 initial gzip bytes, under the existing 205,248 ceiling. The voices chunk is 20,048 bytes. JavaScript gzip is 133,764. The measured sourceSha was still `c6807ad8` because the merge was uncommitted. sourceDirty true. Payload `e4abca030f0fd8ed9fcca6b4cf2c3fff1f5009301437db44c8f1e9a3261db3b0`. That build was dirty and is not a hosted measurement. Physical devices remain in HUMAN_TODO.md.

## 2026-10-14: a held Enter leaves a cell note in place

Holding Enter on number key 1 adds that note once. A later press still removes it. Enlarge board, Pause, and Cell notes still stay on when Enter repeats.

An isolated desktop page showed the old behavior first: the first Enter added note 1 and the repeat removed it. After the change, the repeat leaves note 1 and the next press removes it. Zoom, pause, Cell notes, number key 2, and the phone page still pass. A repeated N leaves notes on. The September page was not re-run for this commit. The asset catalogue records the combined `src/app.js` at 208,323 bytes, sha256 `33a0553ba7e4adfc10517c6d42c25f6bc37216f59b474fbfbab422b60d1c2680`. `tests/budget.test.cjs` passed on the combined local web build `9e03d02ac628` at 203,465 initial gzip bytes, under the existing 205,248 ceiling. The voices chunk is 20,048 bytes. JavaScript gzip is 133,756. The measured sourceSha was still `34a63681` because the edit was uncommitted. sourceDirty true. Payload `30318f2e86d18eb3a913d90d65569e324de5b97e78029ecc0dbf28ec67516730`. That build was dirty and is not a hosted measurement. Physical devices remain in HUMAN_TODO.md.

## 2026-10-14: a held Enter leaves zoom and pause in place

Holding Enter on Enlarge board enlarges the board once. Holding Enter on Pause pauses once. A later press still returns the board to its previous size or resumes. Cell notes still stay on when Enter repeats, and a later press still turns them off. This merge keeps the held-N guard.

An isolated desktop page showed the old zoom and pause behavior first: the first Enter changed the control and the repeat changed it back. After the change, a repeated Enter leaves the board enlarged and paused, and a later press restores the normal size and resumes. Cell notes, number key 2, and the phone page still keep focus. A repeated N leaves notes on. The September feedback page passed at 390px and 1440px. The asset catalogue records the combined `src/app.js` at 208,265 bytes, sha256 `cce0dee6da557d448b8de8908ade4c90a97d3ba57de2b5d3e2405f7be9d5feff`. `tests/budget.test.cjs` passed on the combined local web build `9dfedfd46063` at 203,454 initial gzip bytes, under the existing 205,248 ceiling. The voices chunk is 20,048 bytes. JavaScript gzip is 133,748. The measured sourceSha was still `2307147e` because the merge was uncommitted. sourceDirty true. Payload `ebfb42addfa9e63d8dad83ae2dbe790cd463a3b1f0038810bb80d3bd3b24f350`. That build was dirty and is not a hosted measurement. Physical devices remain in HUMAN_TODO.md.

## 2026-10-14: a held Enter leaves Cell notes on

Holding Enter on the focused Cell notes button turns notes on once. A later press still turns them off. Pressing N still toggles notes.

An isolated desktop page showed the old behavior first: the first Enter turned notes on and the repeat turned them off. After the change, the repeat leaves notes on and the next press turns them off. Cell notes and number key 2 stay focused, including a 390px page. Removing a favorite returns focus to the page. The September feedback page passed at 390px and 1440px. The asset catalogue records the combined `src/app.js` at 208,086 bytes, sha256 `da4da22649c39839374d02a23410c697ea0e8de25e1a3f9a38746e0617a8d1da`. `tests/budget.test.cjs` passed on the combined local web build `e654623a050e` at 203,443 initial gzip bytes, under the existing 205,248 ceiling. The voices chunk is 20,048 bytes. That build was dirty and is not a hosted measurement. Physical devices remain in HUMAN_TODO.md.

## 2026-10-14: tool buttons keep focus when the board redraws

A play control without an id stays focused when the board redraws. Cell notes and a number key are two of those controls. Pressing N still toggles cell notes. Placing a digit still changes the selected square. This merge keeps the Escape, restore, and voices focus guards.

An isolated desktop page showed the old behavior first: after N, focus moved to the page body. After the change, Cell notes stays focused on that desktop page and on a 390px phone page. Number key 2 stays focused after digit 1 is placed. A favorite button is matched by its puzzle id. Removing it from the favorites list returns focus to the page. The next favorite stays on the list. The September feedback page passed at 390px and 1440px. The asset catalogue records the combined `src/app.js` at 207,800 bytes, sha256 `4665d4c6383145b536f42101c2e70e0a5b044947a5d3eeeb7aa261dd82ea9cee`. `tests/budget.test.cjs` passed on the combined local web build `482d954a3476` at 203,413 initial gzip bytes, under the existing 205,248 ceiling. The voices chunk is 20,048 bytes. That build was dirty and is not a hosted measurement. Physical devices remain in HUMAN_TODO.md.

## 2026-10-14: a held digit leaves a cell note in place

Holding a digit while Cell notes are on added that candidate, and the key repeat removed it. A separate later press still adds or removes the candidate. A placed digit, arrows, and Escape are unchanged. This merge keeps the held-N, Escape, restore, and voices focus guards.

An isolated desktop page turned notes on, selected an empty square, and held 1. Before the guard, build `0f83210ddcb7` cleared the note. After the guard, the repeat keeps note 1, and the next press removes it. The same page leaves a held N on, and a later N turns it off. No page errors. The asset catalogue records the combined `src/app.js` at 206,872 bytes, sha256 `6cba9ab0e95b9a29af229eaedd4339646d35d8250b9b01667d0634cdfd79e45e`. `tests/budget.test.cjs` passed on the combined local web build `743aa6ed8a75` at 203,269 initial gzip bytes, under the existing 205,248 ceiling. The voices chunk is 20,048 bytes. That build was dirty and is not a hosted measurement. Physical devices remain in HUMAN_TODO.md.

## 2026-10-14: a held N leaves Cell notes on

Holding N turns Cell notes on once. A later press still turns them off. That change kept the Escape, restore, and voices focus guards.

An isolated desktop page showed the old behavior first: the first N turned notes on and the repeat turned them off. After the change, the repeat leaves notes on and the next press turns them off. No page errors. The asset catalogue records the combined `src/app.js` at 206,770 bytes, sha256 `20d743cb09065d66a23ea30ed659d90f935ca9a259cb9643c45e4fc4fe0879b2`. `tests/budget.test.cjs` passed on the combined local web build `20db11ab954e` at 203,259 initial gzip bytes, under the existing 205,248 ceiling. The voices chunk is 20,048 bytes. That build was dirty and is not a hosted measurement. Physical devices remain in HUMAN_TODO.md.

## 2026-10-14: Not now leaves focus on the page

Dismissing the survey invitation from the keyboard no longer moves focus to another puzzle action. Delete in Settings still returns to Send feedback.

The voices page showed the old behavior first: after Not now, focus was not on the page main. After the change, focus is on main. Delete still focuses Send feedback. The page passed 130 assertions. That change kept the Escape and restore guards. The asset catalogue records `src/app.js` at 206,670 bytes. `tests/budget.test.cjs` passed on the combined local web build `31ab4f964280` at 203,260 initial gzip bytes, under the existing 205,248 ceiling, and the voices chunk is 20,048 bytes. That build was dirty and is not a hosted measurement. Physical devices remain in HUMAN_TODO.md.

## 2026-10-14: a held Escape does not flicker pause

Holding Escape to close How to play no longer pauses the board on the key repeat. Holding Escape on the board pauses once. A separate press still pauses, and the next press resumes.

An isolated desktop page showed the old behavior first: the repeat after the help dialog closed paused the board. After the change, that repeat leaves the board running, and a later press still pauses. That branch recorded `src/app.js` at 206,670 bytes and a local web build of 203,262 initial gzip bytes, under the existing 205,248 ceiling. Build `5b0c8db24867` was dirty and is not a hosted measurement. Physical devices remain in HUMAN_TODO.md.

## 2026-10-14: a restore button runs one restore

Add missing only and Replace with backup ignore a second activation while the first restore is still running. A failed restore can be tried again. The backup dialog and the saved records are otherwise unchanged.

A race test called the restore twice while the first was still waiting. Before the guard, that started two restores. After the guard, it starts one and reloads once. That branch recorded `src/app.js` at 206,561 bytes and a local web build of 203,251 initial gzip bytes, under the existing 205,248 ceiling. That build was dirty and is not a hosted measurement. Physical devices remain in HUMAN_TODO.md.

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
## 2026-10-11: authoritative Cabinet backup candidate (#602)

Candidate, not a release: acknowledged full-row snapshots keep clean cached runs
from replacing the committed export. Dirty active, inactive and local-only edits
remain recoverable; different committed and session copies get explicit download
choices in normal and combined exports. Restores retain revisions, so matching
only revision numbers would be unsafe.
On source `602fc9e33fe37b45f425ec3844d41592aa28598d`, clean web build
`e2ad9f4d552a` passed the unchanged shell budget (1,412,777 bytes against
1,412,792.32), 16 export/broadcast source cases, 187 focused real-origin
checks and 184 UI checks. Phone/desktop scenarios download the actual device
and session files and restore each into isolated profiles. Fresh reviews found
no HIGH/CRITICAL defect; pre-existing dirty inactive broadcast replacement is
tracked in #619. Merged with main `abb0be0a` on 2026-10-15: the code/shell
measure is now 1,408,464 bytes against the unchanged 1,412,792.32 ceiling (main's
worker compaction restored the room; no ceiling change). The completion-hook
source fixture gained the `acked` map `enqueueSave` now writes, and asserts it.
Hosted results are recorded on the PR. No physical Android/TalkBack or deployment acceptance is inferred.

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
## 2026-10-11: older browser data discovery candidate (#603 / PR #618)

The read-only raw `alibi.v1.*` inventory and separate recovery export preserve
malformed, empty, unknown and colliding strings without migration or deletion.
Healthy IndexedDB remains authoritative. The export action re-reads storage and
refuses incomplete snapshots, including changing key sets. All 33 focused source
cases pass. Clean candidate `068c263d`, web `bd95b000813f`, passed 33 actual-origin
checks at 390/1280 and all 184 UI checks with zero uncaught errors; both recovery
layouts were inspected. Fresh independent reviews found no HIGH/CRITICAL defects.
Fallback warning clarity is tracked in #620.

**Budget gate (re-measured 2026-10-15):** merged with main `abb0be0a`, the web build measures
code/shell 1,409,106 bytes against the unchanged 1,412,792.32 ceiling and 203,927 initial gzip bytes
against 205,248; main's worker compaction removed the 502-byte excess. `npm run verify` passes
(1,536 passed, three intentional skips). Hosted results are on the PR.
This is candidate proof, not a release or physical-device acceptance.
[HUMAN_TODO.md](../HUMAN_TODO.md) retains Android/TalkBack acceptance.

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
