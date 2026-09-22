# Live development state

## Published 0.11.5 on Cloudflare, 2026-09-22 (Sites fallback still 0.11.4)

Merged source `5d3c594a7494ba58acab7fbf5668fcd8d3e2fcd3` (PR #241, release
head `a66c52b9e36c`), build `f0baec5e3291`, is published on the primary
Cloudflare Worker `alibi-after-hours-preview` as version
`b8f83076-dc6f-41d6-acf0-7787ede4424e` (21 files uploaded, 268 retained).
The recorded hosted checks for `/`, `/privacy.html`, `/manifest.webmanifest`
and the content-hashed shell assets pass; the full receipt is
[RELEASE-0.11.5.md](RELEASE-0.11.5.md).

The Sites fallback still serves 0.11.4 (version 16); deployment is pending.
The two origins serve different releases and saves remain per-origin. Source
and release records include PRs #237, #240, #241, #243, #245, #246, #247 and
#248. The #244 fix has local 25/25 real-origin evidence and full CI; hosted
acceptance still needs a deployment carrying it. No newer hosted release is
claimed here.

## Current source checkpoint, 2026-09-22

The current source base is `origin/main` at `d091d19`. It includes the merged
unknown-route recovery (#233), Android-aware startup recovery (#236), the
0.11.5 release and its follow-up routing and deployment records through #248.
Published puzzle IDs, revisions, save schemas and the app's offline ownership
remain unchanged.

PR #238 merged as `d091d19ca942c1e8cec614038666ead9cfc73949`, integrating the
provider-phase regression and PR #243's coherent Bridges zoom sampler after
all three required CI workflows passed at `d3cc268`. PR #239 is this live-state
refresh. PR #251 corrects the packager's stale seven-scenario browser evidence
contract; its independent regression and actual nine-scenario report check
pass, while current-base CI and integration are pending. Deployment is pending.

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
