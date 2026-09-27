# 0.15.0: Tell us what you think, and the vaults open

## Source candidate: 27 September 2026

This release gathers the 2026-09-27 QA wave and the owner's feedback decisions:

- **Voices** ([#413](https://github.com/Chris0Jeky/Alibi/pull/413)): the Feedback button,
  "Report a problem with this puzzle", the puzzle rating row, the `alibi-taste-1` survey and the
  Settings/Privacy panels. Messages and answers go to the Pulseboard collector
  ([Pulseboard#149](https://github.com/Chris0Jeky/Pulseboard/pull/149)), queue offline for up to
  30 days, and are sent only after the player presses Send, submits or taps. Official puzzle
  journeys now carry `family` and `tier`. The collector was already live before this release:
  schema 5, voices admitted `["alibi"]` (Pulseboard `HUMAN_TODO.md` q-30).
- **Archive Heist vaults** ([#405](https://github.com/Chris0Jeky/Alibi/pull/405)): rooms 10–33,
  solved markers and end cards. Old room 01–09 saves are unchanged; a build older than 0.15.0
  refuses a Club save that has opened a vault (read-only session, nothing lost).
- **Challenge library** ([#409](https://github.com/Chris0Jeky/Alibi/pull/409)): grouped list,
  real boards, completion cards, automatic Ink replies in Lantern Duel endgames.
- **Castle** ([#406](https://github.com/Chris0Jeky/Alibi/pull/406)): Chapter I completion, the
  thread and locked-door guidance, clock input formats.
- **Games Room** ([#410](https://github.com/Chris0Jeky/Alibi/pull/410)) and **core cabinet**
  ([#412](https://github.com/Chris0Jeky/Alibi/pull/412)) fixes from the audits in
  `docs/qa/2026-09-27/`; **Block Cabinet** move cap
  ([#403](https://github.com/Chris0Jeky/Alibi/pull/403)).
- **Sites retirement notice** ([#398](https://github.com/Chris0Jeky/Alibi/pull/398)): shown only
  on the retired Sites origin, after the single retirement deployment (`HUMAN_TODO.md` q-9).
- **License** ([#396](https://github.com/Chris0Jeky/Alibi/pull/396)): PolyForm Strict 1.0.0.

No puzzle id, revision or published definition changed, and `alibi-device` stays at version 1.
Budget ceilings raised by measured amounts (each commented in `tests/budget.test.cjs`):
application JS 133,670 gzip (+3,648 over 127 KiB), initial code plus official data 205,232
with these release notes (+448 over 200 KiB, to be trimmed), main CSS 34,079 (+320), Quiet Wing pack 2,312,559 (+8,576),
precached shell +22,528 for the Voices chunk.

Version 0.15.0 is registered in `package.json` and `content/releases.json`; the release label and
the pinned Pulseboard SDK copy come from `npm run release:prepare -- 0.15.0 --publish`.

Merge note: on the owner's instruction ("merge everything in order ignoring CI"), #409, #410,
#411, #412, #413 and #423 were merged with an admin override after conflict resolution, before
their final CI runs finished. The merged `main` was then built and its full Node suite run
locally (all pass except `asset-audio`, which needs `ffprobe`), and this release waits for CI on
the release pull request before deploying.

## Publication receipt

Published 27 September 2026 from [PR #424](https://github.com/Chris0Jeky/Alibi/pull/424) merge
commit `7677ced05586a663f5b5ef24daa3e9f8e95d1ea0`; annotated
[`v0.15.0`](https://github.com/Chris0Jeky/Alibi/releases/tag/v0.15.0) points to it. The clean
merged-source build `51f3f8ed06a1` is version 0.15.0 with `sourceDirty: false`, 510 puzzles
(80 deferred), 294 emitted files, 133,670 application JavaScript gzip bytes and 205,233 initial
code-plus-content gzip bytes (ceiling 205,248). Exact-head PR CI and the `main` push workflows
(`fe12be2` puzzle cabinet; `896bb6d` Android payload, Wrenmere integration, discovery storage)
passed; `node observatory/check.mjs` passed (SDK 3.3.0, release 0.15.0); `cloudflare:check`
passed. `SHA256SUMS`:

- `alibi-deluxe-cloudflare.zip`: `cd334c1354e382e8f1bee6e9a0b6f36aa4018dfdffca4c63dc38bb881308bd38`
- `alibi-deluxe-play.html`: `8625162be12bf1b33a33b8a17d79e5f39cfad8dcdc1bae89f25ba83d15781565`

The primary Cloudflare origin is Worker version `20bd0591-b597-4c81-b512-49e51180a9de`
(rollback: 0.14.1's `856d1a61-fdae-4d6c-aca0-236ccc9982ca`). All 293 publicly served files
returned HTTP 200 (HTML after the host's canonical redirects) and matched the clean build byte for
byte (`_headers` is host configuration and is not served). `/` serves the repository CSP with the
collector in `connect-src`, `nosniff`, `no-referrer` and the permissions policy; the served SDK is
`assets/pulseboard.6793e71c9d6e.js` (the 0.15.0 copy) and `sw.js` precaches
`assets/voices.d13d5395ec2c.js`. `/a/b/x.html` returns 404.

Hosted smoke (a disposable-profile Chromium script kept outside the repository, at 390×844 touch
and 1280×800, 14/14 checks, every collector request blocked and recorded): offline ready,
version 0.15.0, the Feedback sheet opens with its kinds, Archive Heist lists vaults 10–33, the
castle route mounts, Settings shows "Feedback and surveys", no page errors, and **no request to
`/v1/feedback` or `/v1/survey` without a player action**. Nothing was sent to Pulseboard by this
check.

Collector (Pulseboard Worker `415057c9`, live before this release): `/readyz` reports schema 5
and voices admitted `["alibi"]`; a CORS preflight from the primary origin to
`/v1/feedback/alibi` returns 204; deliberately invalid `POST /v1/feedback/alibi` and
`PUT /v1/survey/alibi` bodies return 400 `{"error":"contract"}`, so no record was stored. The
0.15.0 label is registered by [Pulseboard#165](https://github.com/Chris0Jeky/Pulseboard/pull/165)
(the collector already admits any well-formed Alibi version, q-28); no collector redeploy was
needed for this release.

The Sites fallback was not updated and still serves 0.12.0; its single retirement deployment is
`HUMAN_TODO.md` q-9 (a Codex session).

Not verified on the hosted origin: a real feedback, rating or survey submission end to end (kept
out of the owner's data on purpose), the 0.14.1 → 0.15.0 service-worker update of an existing
profile with saves (covered by `browser_update.py` and `browser_live_update.py` in CI against the
local origin), and anything on a physical phone.

## Evidence limits

Browser suites ran in desktop Chromium with emulated phone viewports. They do not establish
physical Android behaviour, TalkBack, large system text, human difficulty or enjoyment. The
owner's one phone session ([PHONE-SESSION.md](PHONE-SESSION.md)) and player-data calibration
([CALIBRATION.md](CALIBRATION.md)) cover those; `HUMAN_TODO.md` q-2 through q-9 remain open.
