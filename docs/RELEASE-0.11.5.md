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

### Sites maintenance publication, 2026-09-22

The existing Sites project `appgprj_6a9f4fc7b5cc8191be66defcdccd366b` now
serves 0.11.5 maintenance build `b08bc7a1e5ea`, rebuilt from merged source
`d091d19ca942c1e8cec614038666ead9cfc73949`. Version 17 is
`appgprj_6a9f4fc7b5cc8191be66defcdccd366b~appgver_920ca720092481919dc83d8bb50d2449`;
deployment `appgdep_6ab2b2b8ed408191a09d6b65ad205bf9` succeeded at
2026-09-22 16:54:38 UTC. The saved archive digest is
`sha256:9f6e1b3c5cda97a71c4fad69b316d16ad6ead35559fa22174b6fe728ac002d5d`.
The release retains 376 puzzles in 22 packs and the existing public origin:
`https://alibi-puzzle-club.jeky-tck.chatgpt.site/`.

This build includes #247's fix for shared-address query preservation and
offline aliases, plus the merged provider and Bridges test improvements
from #238/#243. Local proof at the same build: 182 isolated UI checks,
127 real-origin checks across nine scenarios, nine mobile QA tests and
18 synthetic two-release update checks. The three required #238 CI runs
passed before the source merged; these are browser proofs, not phone results.

A fresh hosted Chromium session confirms version 0.11.5 and build
`b08bc7a1e5ea`. All 289 public file requests return 200: 279 non-HTML files
match local SHA-256 values, and ten HTML files differ only by insertion of
one Cloudflare challenge script. Original HTML content and the main page's
meta CSP remain intact. Sites still does not supply the repository's HTTP
CSP header (#6); an injected script's CSP warning does not establish a
game-script failure. Python urllib requests were rejected with HTTP 403
(Cloudflare 1010), so the file comparison used normal browser fetches.

The first hosted suite passed durability, backup, cross-tab, keyboard and
offline checks, then rejected valid 304 responses on a reused profile it
called cold. The shared query reached the correct route. PR #251 repairs
that evidence boundary: all fresh-profile and warm-cache cases now pass.
The corrected focused run passes 43 hosted checks before controlled `/login/`
fails with `net::ERR_FAILED`; the same focused scenario passes 54 checks
locally. That separate hosted worker failure remains under #244, so full
hosted acceptance is pending. The primary Cloudflare deployment remains
`f0baec5e3291` while its expired login awaits
renewal. The origins report the same version but different builds, and
saves remain per-origin.

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
in [HUMAN_TODO.md](../HUMAN_TODO.md). The synthetic two-release update suite
passes, but an actual hosted old-to-new update remains unverified. The primary
maintenance deployment and full acceptance of the new Sites build are still
pending. Browser and solver evidence does not close those human gates.
