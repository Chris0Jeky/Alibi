# 0.14.1: A Beta notice that stays out of the way

## Source candidate: 26 September 2026

This patch replaces the aggregate Usage sharing embed with the Pulseboard SDK 3.1.0
(Pulseboard issue #105, owner decisions q-13, q-19 to q-21). The puzzle catalogue, saves and
engines are unchanged.

- A one-line Beta notice sits in flow at the top of the page on the primary Cloudflare site:
  OK accepts, Choose opens three switches (Usage counts, Diagnostics, Journeys and product data)
  with Save and Turn all off. It never overlays the board; on a 390px phone it wraps and pushes the
  page down. This answers the 26 September tester report of a notice covering Undo/Redo
  ([hotfix record](HOTFIX-2026-09-26-USAGE-SHARING.md)).
- The collapsed Beta button renders inline inside the Settings and Privacy panels only.
- Puzzle journeys report official puzzle ids, whole seconds, hint indexes and attempt counts;
  imported and workshop puzzles report `custom`. Routes: home, puzzle, castle, quiet-wing, other.
- Privacy and Settings describe the three categories, EEA OK-gating, GPC/DNT and retention
  (90 days for detail, currently 14 days for aggregates).

## Deployment order (blocking)

1. Pulseboard registers `0.14.1` (append it to `observatory/src/alibi-releases.mjs`) and deploys
   the collector. `observatory/pulseboard.js` already lists `0.14.1` (built from Pulseboard `5b53836` with
   that one append); a rebuild from the registering Pulseboard commit must produce the same SHA-256 as `observatory.lock.json`.
2. Pulseboard admits `alibi` in `COLLECT_PRODUCT_PROJECTS` for diagnostics and journeys
   (counts already use `COLLECT_STAT_PROJECTS`). Until then product batches are refused and the
   SDK stops after three failures per page.
3. Only then deploy Alibi 0.14.1. Deploying first means every 0.14.1 count is rejected.

## Publication receipt

Published 26 September 2026 (Worker created 23:15 UTC) from [PR #391](https://github.com/Chris0Jeky/Alibi/pull/391)
merge commit `76e2d2fa9121d9d2838e4233f99b7fae17c7f0aa`; annotated
[`v0.14.1`](https://github.com/Chris0Jeky/Alibi/releases/tag/v0.14.1) points to it. The clean
merged-source build `64e09f4e5707` is version 0.14.1 with `sourceDirty: false`, 510 puzzles,
293 emitted files, 130,955 application JavaScript gzip bytes and 201,556 initial
code-plus-content gzip bytes (ceiling 204,800). Exact-head PR CI and all four `main` push
workflows passed; merged-source local `npm run verify` passed 651 tests; `node observatory/check.mjs`
passed (SDK 3.1.0, release contract 0.14.1); `cloudflare:check` passed. `SHA256SUMS`:

- `alibi-deluxe-cloudflare.zip`: `d85d046b4f1787c6b295d32362e0b8185c911ebd11dc029442f028eb4c336b96`
- `alibi-deluxe-play.html`: `b6d2c057223fe4bcecaf031a53a6a2e5378448e41c0961fc4994aa9ff6b70478`

The primary Cloudflare origin is Worker version `856d1a61-fdae-4d6c-aca0-236ccc9982ca`
(rollback: 0.14.0's `e667fd5c-784b-4754-b6f0-90be31293e1a`). All 292 publicly served files
returned HTTP 200 (HTML after the host's canonical redirects) and matched the clean build byte for
byte; `/` serves the repository CSP with the collector in `connect-src`. The hosted real-origin
suite passed 244 checks. The collector admitting 0.14.1 and `alibi` product events was already
live as Pulseboard Worker `10669420...` (coordinator record).

Live SDK acceptance (disposable in-memory Chromium profiles at 390×844, automation flag masked,
25/25 checks): 0.14.1 and SDK 3.1.0 are served; the Beta notice is the first element of `<body>`,
in flow (`position: static`, 119.6 px tall, the app starts at its bottom edge) and none of 15 puzzle
controls or the home controls is overlapped or covered; the region hint answered 200 `other`;
`page.view` counts for `home` and `puzzle` at release 0.14.1 got 202, and so did the product batch;
with Global Privacy Control no collector request was made and the Beta button sat inline in
Settings; after an explicit Choose → Turn all off the Beta button was hidden on home and puzzle and
inline in Settings and Privacy, and nothing more was sent. OK was never clicked.

QA traffic this created in Pulseboard (region `other`, release 0.14.1): counts `page.view/home` and
`page.view/puzzle` (one each); product events `web.vital` ×2 (`home`), `page.view/home`,
`page.view/puzzle` under one tab session. The GPC and opt-out profiles sent nothing beyond the
opt-out profile's region-hint request. No other live counts were sent.

The Sites fallback was not updated (no Sites tooling in this session) and still serves 0.12.0;
it never collects.

## Evidence limits

Intercepted browser checks at 390px (`tests/browser_observatory.py`) and the fake-DOM tests do
not prove the live collector, a physical phone, or the old-shell/new-host rollout case.
