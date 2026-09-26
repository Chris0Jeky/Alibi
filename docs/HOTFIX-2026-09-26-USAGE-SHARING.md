# Hotfix 2026-09-26: Usage sharing control confined to Settings

Superseded in 0.13.1 by the Pulseboard SDK v3: an in-flow Beta notice and an inline Beta
button in Settings and Privacy ([release record](RELEASE-0.13.1.md)).

## Problem

On the primary Cloudflare origin, the generated Usage sharing notice rendered
as a fixed-position popup over every route, including active puzzle boards,
with no dismiss path (player screenshot: collapsed box covering Undo/Redo on a
390px phone). Reported 26 September 2026.

## Fix (source `afabf32`, version stays 0.12.0)

- `src/observatory-loader.js`: the loader hides `#pulseboard-usage-sharing`
  on every route except `#/settings` and `#/privacy`, re-syncing on
  `hashchange` and via a one-shot mutation observer for the late mount.
- `src/app.css`: the control is a static centered top-of-page box instead of
  a fixed overlay; `[hidden]` removes it from layout.
- `src/app.js`: Settings points at the box above; Privacy copy describes the
  settings-only placement. Sharing still defaults on for eligible visits.
- Tests: loader unit coverage for visibility/observer/storage-safety, the
  integrated journey suite, and `tests/browser_observatory.py` (65 assertions)
  follow the new placement. `tests/budget.test.cjs` takes a measured +128 byte
  JS gzip extension (130,290 -> 130,366 against a 130,432 ceiling).
- No Pulseboard regeneration: `observatory/browser.js` and its lock are
  untouched, so the 0.12.0 release registration still satisfies
  `observatory/check.mjs`.

## Build and deploy

- Clean build from `afabf32`: 0.12.0 / `6b11d27969d7`, 292 files,
  130,366 startup JavaScript gzip bytes.
- Cloudflare primary deployed as Worker version
  `c8a8b8d5-7521-4779-98f1-545da40e2cac` (5 changed assets, 286 deduplicated).
- Rollback: previous Worker `8edf7ab7-a92e-4963-be7a-d1bebcd68fe8`
  (build `f2b20d3ee6c0`). Sites fallback untouched at saved version 23
  (build `f2b20d3ee6c0`); it never loads the control.

## Evidence

- `npm run verify` passed on the hotfix tree; `node observatory/check.mjs`
  passed (pin, endpoint, CSP, deferred asset).
- `tests/browser_observatory.py`: 65/65 intercepted-origin assertions passed.
- Live smoke (disposable profile, collector route blocked): hotfix build
  served, no popup on home at 390px, settings box visible and on by default,
  opt-out persists, privacy route shows the control, no page errors.
- Live `HEAD /`: HTTP 200 with the repository CSP (`connect-src` lists the
  collector) and security headers.

## Not verified here

- Full CI browser matrix on the pushed commits (runs on push to main).
- Physical-device confirmation of the reported phone.
- Sites fallback redeploy: no Sites deploy tooling is available in this
  session; it still serves the pre-hotfix build (unaffected by the bug).
