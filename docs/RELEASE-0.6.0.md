# Alibi 0.6.0 release receipt

Published 2026-09-08, 18:39 UTC, at **https://alibi-puzzle-club.jeky-tck.chatgpt.site**.
This is the existing public origin. The separate Cloudflare preview was not redeployed.

## Changed

PR [#14](https://github.com/Chris0Jeky/Alibi/pull/14) merged 30 incremental commits as
`669654613d68d93e8eaf8a9dd49d32616464692f`. The tested Windows build is `f7c4ef0b6961`.
The original 116 puzzle definitions, 13 engines, four casebooks and three database identities
remain unchanged. The source integration replaces the distribution-only bridge.

Quiet Wing adds seeded modular towns/castles and connected roads, reversible world editing,
lit WebGL with Canvas recovery, animated companions, four new relaxing boards, a flower
collection and editable postcards. Verified museum art refreshes the wing, Club and puzzle
browsing. Original model/image bytes and rights records are retained in assets-source.
Backup imports and section restores use bounded worker validation; ambiguous database opens
remain protected rather than creating competing fallback saves.

## Verified

- `npm run verify` passed. Final source CI passed on both push and PR at `8e76e23`:
  [push run](https://github.com/Chris0Jeky/Alibi/actions/runs/34263318632),
  [PR run](https://github.com/Chris0Jeky/Alibi/actions/runs/34263321915).
  These include existing cabinet, Club, expedition, release-update and local optional-room tests.
- Independent source/city/companion/game/art reviews and bounded fix verification found no
  remaining CRITICAL/HIGH. Review threads were triaged; MEDIUM findings are tracked in #15/#16.
- Local Quiet Wing storage contracts: 22 assertions. Local real-origin A/B update, conflicts,
  future-record recovery and open-timeout retry: 40 checks. These are synthetic release fixtures.
- Actual hosted installed-profile update: a partial puzzle and Club building created on live
  `134d93f3d854` survived Save & update to `f7c4ef0b6961`, then an offline reload unchanged.
- Ten hosted suites passed: origin (92), process restart (28), Quiet Wing controls (156), city
  controls (28), city graphics/fallback (14), companions (50), calm games (29), garden (16),
  artwork/navigation/viewports (43), and backup worker (4). These are check counts, not unique
  games or physical-device certifications. Garden growth uses a declared timestamp fixture.
- All 36 requested hosted application files returned HTTP 200 through the browser. 35 matched
  local bytes exactly, including JS/CSS, service worker, models, images and index.html.
  The provider's 404.html response differed. Original source references in HTML were checked.
- Phone/tablet/desktop artwork captures were inspected locally; hosted captures cover the same
  widths. Pet actions, GPU fallback/context loss, offline assets and route disposal were exercised.

Measured download sizes: initial JavaScript 125,138 bytes gzip; core offline files 1,329,465 bytes;
optional wing 1,977,944 bytes. All declared budgets pass. The garden's single image loads eagerly
after entering its already-lazy activity. No runtime museum/CDN asset service was introduced.

## Failures and workarounds

Earlier CI exposed a departing-DOM screenshot race and a deferred garden image that could stay
unloaded on Linux. Image inspection now targets the actual image; the garden image loads eagerly,
and decode has a ten-second deadline with diagnostics. Both final CI runs passed. One hosted
artwork attempt hit a detached screenshot target; its one bounded retry passed all 43 checks.

A direct non-browser file client received HTTP 403. Same-origin browser requests successfully
verified the hosted files. Sites still does not apply the emitted CSP header and serves WebP as
application/octet-stream; images decode in the tested browser. These provider limitations remain
tracked in [#6](https://github.com/Chris0Jeky/Alibi/issues/6). Do not claim hosted header enforcement.

Linux and Windows release fingerprints differ because the emitted Kenney licence text has
different line endings. Comparison found the model/image bytes identical; the hosted byte check
uses the exact Windows artifact that was uploaded. No binary source was silently normalized.

## NOT verified and residual risk

[HUMAN_TODO.md](../HUMAN_TODO.md) remains authoritative for physical Android/iOS, TalkBack,
large system text, gestures, sound/haptics, sustained device performance, difficulty/pace and
external OBJ-editor acceptance. The reported Android post-completion freeze is not certified
fixed by these browser tests. Source licensing and promotion/name decisions remain open.

MEDIUM follow-ups: [#15](https://github.com/Chris0Jeky/Alibi/issues/15) covers inherited crop names
in malformed imports. [#16](https://github.com/Chris0Jeky/Alibi/issues/16) covers root accessibility
preferences, standalone credits, delayed exit during optional caching, combined export before
the optional pack is cached, the 5,001-action classic-history boundary and edge-arrow selection.
Separate cabinet/Club exports, the wing/OS motion switch and undo remain available as applicable.
No production rollback or physical-device test was performed.

## Recovery and retained artifacts

Export saves before changing browsers/devices. Never clear site data to repair a freeze.
Section restores retain their previous committed state; export raw recovery when data is protected.
If an open stalls, retry once storage responds rather than creating or copying fallback state.

- Sites project: `appgprj_6a9f4fc7b5cc8191be66defcdccd366b`.
- Current saved version 4:
  `appgprj_6a9f4fc7b5cc8191be66defcdccd366b~appgver_483cfe5e60148191bce121e3a69dcf35`.
- Successful deployment: `appgdep_6aa0564eb20c8191905287c090990504`.
- Prior file rollback candidate, version 3:
  `appgprj_6a9f4fc7b5cc8191be66defcdccd366b~appgver_d00ebd40af8c81919e83949835c95175`,
  source `1f049a794609be04f29a91117fbd1a8701d28d08`.

A file rollback does not reverse IndexedDB or instantly replace active workers. Version 3 has
no Quiet Wing UI; preserve the newer wing database and backups for a later compatible release.
The rollback candidate is retained, not execution-tested on production.

Ignored local `release/` retains the Sites tar, deployment/rollback receipts, hosted file hashes,
old-to-new upgrade profile/receipt, per-suite logs and final CI artifacts. `test-results/` retains
browser reports/captures; these are generated disposable test data, not user saves or public assets.
The complete deployment ZIP remains at the repository root. No credentials are stored with them.
