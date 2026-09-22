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

Pending. Primary is the existing Cloudflare Worker
`alibi-after-hours-preview`; fallback is the existing Sites project
`appgdep_6aabac35f2f48191b5aa2f3e59150239`. Record Worker version, Sites
version, uploaded/retained asset counts, MIME and header verification here.

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
in [HUMAN_TODO.md](../HUMAN_TODO.md). Browser and solver evidence does not
close those human gates.
