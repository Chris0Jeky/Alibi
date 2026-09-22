# 0.11.5 — Phone-first play and forgiving routes

Release candidate cut from main. Source SHA, build hash, PR references and
deployment evidence are recorded below as each step completes; nothing in this
file is a publication claim until the Publication and delivery section is
filled.

Player-facing changes since 0.11.4: board-first phone play with 44px touch
targets and Bridges zoom; modal how-to dialog with route-leave dismissal;
screen-reader-safe navigation and card names; a designed recovery page for
unknown addresses; first-visit shared addresses (/privacy, /about, /login)
that open their page; castle collected-record comparison; fifteen new
puzzles in two new packs (six crime-scene variations, nine
Master/Grandmaster studies under the open human-calibration gates). All
previously published puzzle IDs, revisions and save formats are unchanged;
the catalogue grows from 361 to 376 puzzles across 20 to 22 packs.

## Publication and delivery

Primary published 2026-09-22 from merged source
`5d3c594a7494ba58acab7fbf5668fcd8d3e2fcd3` (PR #241, release head
`a66c52b9e36c`), build `f0baec5e3291`, 376 puzzles across 22 packs.
`npm run cloudflare:check` (wrangler 4.129.1 dry run, 295 dist files) passed,
then `npm run cloudflare:deploy` uploaded 21 changed files (268 retained) to
the existing Worker `alibi-after-hours-preview`. Current Worker version ID:
`b8f83076-dc6f-41d6-acf0-7787ede4424e`.

Hosted verification on
`https://alibi-after-hours-preview.commit-atlas.workers.dev/` the same day:
`/` 200, `/privacy.html` 200 (redirect stub to the in-app `/#/privacy`
route), `/manifest.webmanifest` 200, content-hashed shell assets 200 with
names matching the local `dist/` build (`boot.bdf54bea6078.js`,
`alibi.a765ad34a970.js`), shell `cache-control: no-cache`, and the
repository Content-Security-Policy present. The in-app privacy copy at
`/#/privacy` is unchanged device-local copy plus the optional usage-sharing
disclosure.

The advertised extensionless shared addresses were checked on the live
origin the same day, not just their `.html` files: `/privacy`, `/about`,
`/login` and their directory forms each return 200 with the redirect target
`/#/privacy`, `/#/about` or `/#/login`. A real Chromium session in a fresh
profile (cold, no controlling worker) lands on each hash route with the app
booted and hashed JS/CSS loading 200 — 6/6 forms pass. One known boundary
carried forward to issue #244: `/privacy?from=shared-link` lands on
`#/privacy` with the query dropped, because the no-JavaScript meta refresh
wins over the query-preserving script under the deployed CSP.

The hosted real-origin suite was run against the same deployment from
disposable profiles the same day: durability 17, backup/restore 22,
cross-tab 17, keyboard 10, offline (IndexedDB persistence plus offline
reload under a controlling worker) 14, malformed draft 10, malformed
persisted 12 and newer database 8 — 110/110 checks pass with no uncaught
page errors, covering the IndexedDB, service-worker offline and recovery
behavior. Release-to-release update behavior, the Sites fallback and
physical-device acceptance remain in the limits below.

Fallback not yet updated: the existing Sites project
`appgdep_6aabac35f2f48191b5aa2f3e59150239` still serves 0.11.4 (version 16).
Its update needs the owner credential flow in `docs/DEPLOYMENT.md` step 5,
so the two origins currently serve different releases. Saves stay
per-origin; no migration is implied by this skew.

## Verification

Local `npm run verify` passed on the release branch before publication.
The 0.11.5 version bump exposed a real defect: the Observatory adapter's
closed release allowlist still ended at 0.11.4, so consent events shipped
`release: "unattributed"` and `browser_observatory.py` failed deterministically
(local repro plus CI run 35675412689). Fixed by registering 0.11.5 in
`observatory/browser.js` with a recomputed `observatory.lock.json` hash,
mirroring the 0.11.4 alignment; `observatory/check.mjs` and all 15
`browser_observatory.py` assertions pass locally. Release-PR CI runs and
per-origin hosted real-origin check totals are recorded below as they land.

## Rollback and remaining limits

Rollback references are the 0.11.4 publication: Cloudflare Worker version
`ef512e73-7e2d-4864-a90d-e938d468bdc9` and Sites version 16 with deployment
`appgdep_6aabac35f2f48191b5aa2f3e59150239`. No rollback has been executed.

Physical-device, TalkBack, human difficulty and curation acceptance remain open
in [HUMAN_TODO.md](../HUMAN_TODO.md). Release-to-release service-worker
update behavior and the Sites fallback publication are likewise unverified
here. Browser and solver evidence does not close those human gates.
