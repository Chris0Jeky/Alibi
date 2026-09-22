# Live development state

## Published 0.11.5 on both origins, 2026-09-22

Merged source `5d3c594a7494ba58acab7fbf5668fcd8d3e2fcd3` (PR #241, release
head `a66c52b9e36c`), build `f0baec5e3291`, is published on the primary
Cloudflare Worker `alibi-after-hours-preview` as version
`b8f83076-dc6f-41d6-acf0-7787ede4424e` (21 files uploaded, 268 retained).
The recorded hosted checks for `/`, `/privacy.html`, `/manifest.webmanifest`
and the content-hashed shell assets pass; the full receipt is
[RELEASE-0.11.5.md](RELEASE-0.11.5.md).

The Sites fallback now serves maintenance build `b08bc7a1e5ea` from merged
source `d091d19ca942c1e8cec614038666ead9cfc73949`, version 17, deployment
`appgdep_6ab2b2b8ed408191a09d6b65ad205bf9` (succeeded at 16:54:38 UTC).
It includes the shared-address query and offline-alias fix for #244.
All 279 non-HTML public files match the local build byte-for-byte. The ten
HTML files retain their source content with one hosting-layer Cloudflare
challenge script added; the main page's meta CSP remains present. The fallback's
HTTP CSP-header limitation remains separate from these file checks (#6).

Both origins report 0.11.5, but their build hashes differ and saves remain
per-origin. The primary still serves `f0baec5e3291`: its maintenance deployment
requires renewal of the expired Cloudflare login. Full hosted acceptance of
the new fallback build and an actual old-to-new hosted update are pending;
the first hosted run exposed a cold-profile test defect under HTTP 304 cache
revalidation. With that corrected, all cold and warm shared-link cases pass,
but controlled `/login/` navigation fails with `net::ERR_FAILED` on Sites.
The same focused scenario passes 54 checks locally. This hosted worker
failure remains under investigation in #244; hosted acceptance is not green.

## Current source checkpoint, 2026-09-22

The current source base is `origin/main` at `d729d70`. It includes the merged
unknown-route recovery (#233), Android-aware startup recovery (#236), the
0.11.5 release and its follow-up routing and deployment records through #248.
Published puzzle IDs, revisions, save schemas and the app's offline ownership
remain unchanged.

PR #238 merged as `d091d19ca942c1e8cec614038666ead9cfc73949`, integrating the
provider-phase regression and PR #243's coherent Bridges zoom sampler after
all three required CI workflows passed at `d3cc268`. PR #239 merged the
live-state refresh as `d729d70a67a1c08898c1954d0a7aedb7c945ca7b` after CI
run `35756590457` passed. PR #251 corrects the packager's stale seven-scenario
browser evidence contract and the hosted suite's reused cold profile. Its
current-base CI and integration are pending. The packager accepts the ordered
nine-scenario report, including `shared_paths` and `malformed_persisted`,
while rejecting stale, incomplete, duplicate, focused, failed or wrong-build
reports. Packaging never establishes hosted or physical acceptance.

### Verification boundary

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
