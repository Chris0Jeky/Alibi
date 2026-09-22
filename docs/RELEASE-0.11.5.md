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

### Platform startup update, 2026-09-22

Both existing origins now serve version 0.11.5, build `df04399c4ee7`, from
reviewed source `1819ae38d5b2d4fa0fd001370bc7bc3627158c93` (PR #255). The PR
merged as `cddeea1126e146ad56cb2bbb20ca0ebb57433e97` at 19:32:45 UTC after
all seven current-base checks passed, including full run `35772430005`,
independent review and aging. Publication reuses the verified source artifact;
the deployed source is an ancestor of the merge commit. Source identity now
enters the build seed, so rebuilding a later documentation or merge commit
would produce a different release identity even with identical game code.

Optional feedback cannot interrupt a validated move before saving, completion
or rendering. The PWA, standalone/source preview and Android payload install
the shared browser facade before the application. Native host capabilities
remain explicitly unavailable in a browser-only Android payload. Puzzle IDs,
revisions, content and save schemas are unchanged; remaining consumers stay #125.

Cloudflare Worker `64329d75-8b37-4159-8851-1b22579d97e3` uploaded five files,
retained 286 and inspected 297. All 291 public files return 200 and match local
SHA-256 values; the HTTP CSP remains present. Sites version 19 is
`appgprj_6a9f4fc7b5cc8191be66defcdccd366b~appgver_1c44c25aca208191b09f4918c3c229dd`.
Deployment `appgdep_6ab2d8b1eafc8191997d2d58a24c8ab2` succeeded at
2026-09-22 19:36:34 UTC, with archive digest
`sha256:3b947fa7d1ac7116f9f5574ec4fbde64e9343ee318e24c971a0ab2c57147f43a`.
All 291 Sites files return 200; 281 non-HTML files match. Ten HTML files retain
their source with one 938-character hosting challenge script inserted. The
main meta CSP remains present. Missing Sites HTTP CSP and 51 WebP octet-stream
responses remain #6. Normal Chromium fetches prove these comparisons; a
separate urllib attempt was rejected with 403 and is retained as failed evidence.

Both full hosted origin suites pass 168 checks across nine scenarios. Games
opened on each previous `9760fe9fcf64` release stay active until Save & update,
retain the exact two-move state and pinned definition, leave observer tabs
loaded, and reload offline with the same state after the update. Both disposable
profiles close cleanly. Local proof at the deployed source includes 422 Node
tests, both Quiet Wing suites, UI 184, real-origin 168, synthetic update 18,
source-preview house 79 and mobile 250 checks. Package checksums match.

The prior `9760fe9fcf64` artifact and publication receipts below remain rollback
candidates; no rollback was executed. Source and proof are preserved under the
primary checkout's ignored `release/2026-09-22-integration/cap03/`, including
`release/publication-df04399c4ee7.json` and `PRESERVED-FILES.json`. Physical
Android/TalkBack and owner gates remain in [HUMAN_TODO.md](../HUMAN_TODO.md).

### Previous cached-navigation update

Both existing origins previously served version 0.11.5, build `9760fe9fcf64`, rebuilt
from merged source `4ad450ff032d91d0a483548ab2791b3b202976e2` (PR #252).
The catalogue remains 376 puzzles across 22 packs. Their saves remain separate.

### Cloudflare primary, 2026-09-22

`npm run cloudflare:check` passed before publication. The merged build then
deployed with `npm run cloudflare:deploy` to the existing Worker
`alibi-after-hours-preview`: six changed files uploaded, 283 retained,
295 files inspected by Wrangler. Previous Worker version:
`31412617-9de1-41f2-927b-371b45c09460`.

The public origin is
`https://alibi-after-hours-preview.commit-atlas.workers.dev/`.
Fresh Chromium file verification observes the expected build; all 289 public
files return 200 and match local SHA-256 values. The main shell retains
`cache-control: no-cache` and the repository HTTP Content-Security-Policy.
The full hosted real-origin suite passes 156 checks across all nine scenarios
with no uncaught page errors.

### Sites fallback, 2026-09-22

Existing project `appgprj_6a9f4fc7b5cc8191be66defcdccd366b`, public origin
`https://alibi-puzzle-club.jeky-tck.chatgpt.site/`, served version 18:
`appgprj_6a9f4fc7b5cc8191be66defcdccd366b~appgver_723df60146888191b798da62ca367851`.
Deployment `appgdep_6ab2c17f3fd881918cbdd3a094d019fd` succeeded at
2026-09-22 17:57:52 UTC. The source was pushed before saving the version;
the saved archive digest is
`sha256:123c5a49e03a5866f24c4cfa6a8df085722265063f5d5f7e1d0cc22627b09d12`.

All 289 public file requests return 200. The 279 non-HTML files match local
SHA-256 values. Ten HTML files differ only by insertion of one Cloudflare
challenge script; original HTML and the main page's meta CSP remain intact.
Sites still lacks the repository HTTP CSP header and returns 51 WebP assets
as `application/octet-stream` (#6). These are hosting limits, not byte-match
failures in the application. Normal browser fetches provided the comparison;
the earlier Python urllib client was rejected by the hosting layer.

The final full hosted suite passes 156 checks across nine scenarios with no
uncaught page errors. It proves cold shared links in separate profiles,
warm-cache 200/304 revalidation, query/fragment preservation, controlled
`/login/`, refresh, retained puzzle progress and offline `/privacy/` (#244).
The prior worker returned cached responses marked as redirected, which
Chromium refused for manual-mode navigation. PR #252 rewraps only those
cached alias responses, retaining their body, status and headers.

Two test-evidence defects are separately repaired: PR #251 stops reusing
profiles labelled cold; the final recorder excludes optional post-load usage
sharing from deferred startup scripts and reports missing required responses
as assertion failures. The final run also blocks that optional asset in one
cold profile. Neither change relaxes required shell-response success or
changes the deployed build.

### Actual hosted updates and source gates

Disposable profiles held an in-progress Sudoku game and a second observer
tab on each old release before deployment. Both origins waited for the
visible Save & update action, retained the exact two-move state and pinned
puzzle definition, left the observer tab loaded, and reloaded offline with
the same state. The upgrades were Cloudflare `f0baec5e3291` and Sites
`b08bc7a1e5ea` to `9760fe9fcf64`. All update assertions passed. A subsequent
Sites temporary-profile cleanup raised Windows file-in-use error 32; its
raw report retains that cleanup error, and the exact disposable directory
was successfully removed after Chromium exited. No player profile was used.

PR #238 integrated provider cancellation and Bridges geometry evidence;
#239 refreshed state; #251 repaired package/cold-origin evidence; #252 fixed
the cached redirect response. All five #252 current-base CI jobs passed at
head `6d6558e299b73c824298b5240004c0a8af7127ec`, including full verification
run `35761649274`. Independent review requalified the actual main-based diff.
The real-302 regression passes after failing before the fix; 11 focused Node
tests pass, including 85 existing worker/build assertions. The canonicalizing
loopback host passes all 156 origin checks; synthetic update coverage passes
18 checks. At the runtime-fix head, local formatting and web/Android builds
passed; the Node run was 405/406 because of the Windows symlink fixture.
The test-only #250 follow-up preserves POSIX file-symlink coverage, exercises
a Windows parent-junction escape with a real file, and rejects directory
documents on all platforms. Full local `npm run verify` now passes 407 Node
tests without failures or skips, plus both Quiet Wing scripts and web/Android
builds. No guard or machine permissions changed. `npm run bundle` passes with
matching checksums and the complete browser/update reports for the same build.

Earlier 0.11.5 publication receipts remain rollback references: Cloudflare
source `5d3c594a7494ba58acab7fbf5668fcd8d3e2fcd3`, build `f0baec5e3291`,
Worker version `b8f83076-dc6f-41d6-acf0-7787ede4424e`; Sites source
`d091d19ca942c1e8cec614038666ead9cfc73949`, build `b08bc7a1e5ea`, version 17,
deployment `appgdep_6ab2b2b8ed408191a09d6b65ad205bf9`, saved archive digest
`sha256:9f6e1b3c5cda97a71c4fad69b316d16ad6ead35559fa22174b6fe728ac002d5d`.

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
passes, and both actual hosted old-to-new updates pass the save-retention
assertions above. Browser, hosted and solver evidence does not close those
human gates. Sites header/MIME limits (#6) remain open; the #250 fixture
follow-up removes the local verification failure without changing the guard.
