# Live development state

## CAP-03 source candidate, 2026-09-22

The `codex/cap03-platform-startup-20260922` candidate installs the shared browser
platform before the app in the PWA, standalone preview and Android payload.
Build identity records the real commit anchor and dirty-source status; Android
preview capabilities explicitly report that no native host or vault exists.
The schema-2 Android receipt separates the runtime graph SHA from the complete
artifact SHA and leaves save compatibility undeclared pending CAP-05.

App feedback now uses the port. A reproduced vibration exception previously
interrupted a validated move before completion, saving and rendering; focused
tests now prove those steps finish for throwing, rejected and unresolved
feedback. The app owns its lifecycle lease and disposes it on final page exit,
while retaining it for a browser-cached page return. Actual document migration,
activity/Club lifecycle consumers and native recovery remain follow-on work
under #125 and the dependent CAP packages; this candidate does not close #125.

At `c7b1b8b`, `npm run verify` passes formatting, web/Android builds, all 421
Node tests (zero failures/skips), and both Quiet Wing checks (581,847 reducer
assertions and 29 contracts). The first full run exposed two outdated startup
accounting assertions and stale app source receipts; those were corrected.
A later 5 ms fixture deadline could expire during real hashing before its
intended readback phase. Its controlled timer now expires only after the
provider closes; production deadlines are unchanged.

At the unchanged runtime source `f4be7e9`, the isolated browser UI passes 184
checks, completing all thirteen games and exporting saves while vibration
deliberately throws. Android preview passes 19 checks with no native bridge,
service worker or remote request. At `6bfbac7`, the complete nine-scenario
real-origin suite passes 168 checks and the synthetic two-release update
suite passes 18. Phone/desktop viewport screenshots were visually inspected;
these are simulated browser results, not physical-device acceptance. Later
changes only correct receipts and the timeout fixture. Independent review
of the runtime and its follow-up diff found no blockers. Hosted CI and
deployment remain pending.
Published origins remain on build `9760fe9fcf64` below. Human and physical
acceptance in [HUMAN_TODO.md](../HUMAN_TODO.md) remains open.

## Published 0.11.5 on both origins, 2026-09-22

Merged source `4ad450ff032d91d0a483548ab2791b3b202976e2` (PR #252), build
`9760fe9fcf64`, is published on both existing origins. Cloudflare Worker
`alibi-after-hours-preview` runs version `31412617-9de1-41f2-927b-371b45c09460`
(six files uploaded, 283 retained). Sites runs version 18, deployment
`appgdep_6ab2c17f3fd881918cbdd3a094d019fd`, succeeded at 17:57:52 UTC.
The complete receipts and prior rollback references are in
[RELEASE-0.11.5.md](RELEASE-0.11.5.md). Saves remain separate per origin.

Both hosted origins pass all 156 real-origin checks across nine scenarios,
including cold/warm shared links, controlled `/login/`, query preservation,
offline navigation and retained puzzle progress (#244). Actual old-to-new
hosted updates also preserve two moves and the pinned puzzle definition,
wait for Save & update, retain an observer tab without forced reload, and
reload offline with the exact saved state. The prior builds were Cloudflare
`f0baec5e3291` and Sites `b08bc7a1e5ea`. The Sites update assertions passed;
a later Windows temporary-profile cleanup error was separately resolved.

All 289 Cloudflare public files match local SHA-256 values. On Sites, 279
non-HTML files match; ten HTML files retain their source content with one
hosting-layer challenge script inserted. The main page's meta CSP remains
present. Sites still lacks the repository's HTTP CSP header and serves 51
WebP files as octet-stream (#6); these platform limits remain open.

## Current source checkpoint, 2026-09-22

The published source base is `origin/main` at `4ad450f`. It includes the merged
unknown-route recovery (#233), Android-aware startup recovery (#236), the
0.11.5 release and its follow-up routing and deployment records through #248.
Published puzzle IDs, revisions, save schemas and the app's offline ownership
remain unchanged.

PR #238 merged as `d091d19ca942c1e8cec614038666ead9cfc73949`, integrating the
provider-phase regression and PR #243's coherent Bridges zoom sampler after
all three required CI workflows passed at `d3cc268`. PR #239 merged the
live-state refresh as `d729d70a67a1c08898c1954d0a7aedb7c945ca7b` after CI
run `35756590457` passed. PR #251 merged as
`aa777181ee67722f254830c8347a0fcab4320b5a` after CI run `35759764242` and
independent review passed at `dbbfbba`. It corrects the packager's stale
seven-scenario browser evidence contract and the hosted suite's reused cold
profile. The packager accepts the ordered
nine-scenario report, including `shared_paths` and `malformed_persisted`,
while rejecting stale, incomplete, duplicate, focused, failed or wrong-build
reports. Packaging never establishes hosted or physical acceptance.

PR #252 merged as `4ad450ff032d91d0a483548ab2791b3b202976e2` after all five
current-base CI jobs passed at `6d6558e299b73c824298b5240004c0a8af7127ec`
(full verification run `35761649274`) and independent review requalified the
main-based diff. Build `9760fe9fcf64` fixes the confirmed Sites worker failure.
Sites canonicalizes
the cached alias-file URLs through HTTP redirects; a followed-redirect
response cannot satisfy a manual-mode navigation. The worker now rewraps
only those cached alias responses, preserving their body, status and headers.
The real-redirect Node regression is red before the fix and green after it;
all 11 focused Node tests pass, including 85 existing worker/build assertions.
A loopback host with the same canonical redirects reproduces the old failure
and passes all 156 checks in the complete nine-scenario suite with the fix,
with no uncaught browser errors. Formatting and web/Android builds pass;
the full local Node run is 405/406, with only the unchanged Windows symlink
permission fixture failing (#250). The 18-check synthetic update suite and
independent source review pass. The hosted results above qualify publication.

The final Sites run also exposed an evidence-only race: its asset recorder
counted the optional, post-load usage-sharing script as a startup dependency.
The recorder now checks the emitted deferred shell scripts, still fails on
missing required responses, and exercises cold startup with the optional
script blocked. The corrected full hosted run passes 156 checks with no
uncaught page errors. This test correction does not change the deployed build.

### Verification boundary

The Windows document fixture follow-up (#250) now makes `npm run verify`
fully green on this host: formatting, web/Android builds, 407 Node tests
with zero failures or skips, and both Quiet Wing scripts pass. Windows
checks a real file through an outside parent junction and separately rejects
a directory at an allowlisted document path; POSIX keeps direct file-symlink
coverage. The guard implementation and machine permissions are unchanged.
`npm run bundle` also passes for build `9760fe9fcf64`; its checksums match
and it includes the complete nine-scenario, 156-check browser report plus
the matching synthetic-update report. Packaging still marks Android
acceptance unverified. Earlier 405/406 results below are historical snapshots.

PR #238 replaces scheduler-turn polling with explicit provider-stream request
and late-abort signals. Its fixture retains a real SHA-256 digest delayed past
150 turns, a 1000 ms operation deadline, exactly one abort, and no write or
close after cancellation. PR #243 samples the same Bridges DOM geometry across
three stable frames for baseline, enlarged and restored states, retaining the
44px target floor, no-overflow check and zero-move assertion.

At `d3cc2688a9cdff35cd5ccd36bd6930cd21b182de`, all 14 platform tests and nine
real-origin Chromium mobile QA tests pass locally. The independent review
found no merge blockers. Formatting and web/Android builds pass; the unchanged
Windows symlink-permission fixture prevents a fully green local Node run.
Linux CI subsequently passed in runs `35754591274`, `35754589032` and
`35754589020` before #238 merged. The full local UI suite passed 182 checks,
the nine-scenario real-origin suite passed 127 checks, and the synthetic
two-release update suite passed 18 checks. These results do not establish
hosted deployment, physical-device behavior or TalkBack acceptance.

PR #183 remains parked on Pulseboard #63: the collector must admit the
`puzzle.failed` event before the host journey branch can merge. The dependency
is still an open draft at `7cb0687`; host-only tests are not collector proof.

## Remaining gates

The release and source work remain subject to the human actions in
[HUMAN_TODO.md](../HUMAN_TODO.md), including the physical Android recovery and
accessibility checks (q-2), Quiet Wing acceptance (q-4), Wrenmere playtest
(q-7), and September additions and difficulty calibration (q-8). Browser and
CI evidence cannot close those device and human gates.

### Block Cabinet tactile motion candidate

The Block Cabinet phone action hierarchy candidate, 2026-09-17, remains a
source checkpoint with simulated-browser evidence only. Its boundary remains
live: physical Android touch, TalkBack, comfort review and human acceptance stay open.
Neither newer mobile QA nor simulated browser viewports replaces those checks.

The complete prior state, including concurrent integration history, is
preserved byte-for-byte in
[STATE-HISTORY-2026-09-22.md](STATE-HISTORY-2026-09-22.md), Git blob
`66604fea62153624911e43ed57f2dab5b35a837b`. Historical candidate labels and
older receipts remain in that archive rather than serving as current release
status.
