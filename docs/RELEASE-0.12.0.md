# 0.12.0: Night studies and a steadier Desk

## Source candidate: 25 September 2026

This candidate combines the three Night study PRs (#342–#344), the merged Desk
type ramp (#353), the approved radius mapping (#355), and the previously merged
Block Cabinet visual-stability fix (#352). The Night collection adds 48 original
boards across eight families, bringing the proposed catalogue to 430 puzzles in
26 packs. Expert and Master labels remain provisional until human playtesting.
The machine certificates check exact definitions, uniqueness, structural
differences and production reducer replay; they do not establish perceived
difficulty or enjoyment.

The radius pass maps only the eight owner-approved scalar values. Issue #220
remains open for larger and decorative values. The Desk action sizing and type
ramp improve browser controls, but physical Android, large text and TalkBack
acceptance remain open in `HUMAN_TODO.md`.

Version 0.12.0 is registered in `package.json` and `content/releases.json` for
the candidate. Pulseboard PR #88 registered the matching release label. The
Observatory adapter is now generated from Pulseboard's statistical-only client:
eligible first-time visitors on the primary Cloudflare origin start with Usage
sharing on, see an open notice and can turn it off with its checkbox. Previous
explicit off choices remain off. GPC, DNT, storage failures, automation and the
Sites fallback origin do not collect. The collector accepts only bounded
event/route/release counts, while its hosting provider necessarily receives
request metadata such as IP addresses; aggregate rows are retained for at most
14 UTC dates. Pulseboard's production admission switch is live in Worker
version `51871cc3-75ef-40e8-80b8-3e4bb0336cb0`: an exact valid Alibi
aggregate returned 202, while an identifier-bearing payload returned 400,
a wrong Origin returned 403, and unauthenticated statistics returned 401.
Pulseboard PR #96 then repaired automatic delivery, kept pending aggregate
handoffs alive across ordinary navigation without replay and made malformed
legacy opt-outs fail closed. Pulseboard PR #97 also makes a failed preference
storage-probe cleanup fail closed. The regenerated Alibi adapter is pinned by hash.

At the candidate checkpoint, local Verify passed 582 Node tests with three
skips; 184 actual-control checks, 214 real-origin storage/offline checks and
480 Night study control checks passed. A real Chromium adapter regression failed
against the old generated artifact when an idle route count was not sent; the
regenerated adapter passed 48 browser assertions, including automatic delivery,
a corrupt legacy opt-out and denied probe cleanup. The first integrated Verify found a 7-byte
startup-JavaScript budget overrun, resolved by shorter About copy and a refreshed
source catalogue. The integrated clean build remained below the
130,304-byte gzip ceiling. That checkpoint preceded the publication receipt below.

## Publication receipt

Published 25 September 2026 from [PR #364](https://github.com/Chris0Jeky/Alibi/pull/364)
merge commit `0ebe3541837561a3f12da373ccfe266dc6a2260e`; annotated
[`v0.12.0`](https://github.com/Chris0Jeky/Alibi/releases/tag/v0.12.0) points
to that commit. The clean merged-source build `f2b20d3ee6c0` is version 0.12.0,
with `sourceDirty: false`, 430 puzzles, 292 emitted files and 130,290 startup
JavaScript gzip bytes against the 130,304-byte ceiling. The independent Sites
source checkout at the same SHA emitted byte-identical output across all 292
files plus `build-info.json`. Exact-head CI passed all seven applicable checks;
merged-source `npm run verify` passed 588 Node tests with three skips, plus
581,847 Quiet Wing reducer and 29 save-adapter assertions. `cloudflare:check`
and `bundle` passed. The bundle's `SHA256SUMS` was checked against its files:

- `alibi-deluxe-cloudflare.zip`: `21f46cb0b47e7c2656760dc64c52067c4b58a081d3eb8f6357407280578dd077`
- `alibi-deluxe-play.html`: `9804b576fba6ad5c1dfea0e742486bcadfc9d9d147fb56ff5c96cb8a97e8b0cf`

The primary [Cloudflare origin](https://alibi-after-hours-preview.commit-atlas.workers.dev/)
is Worker version `8edf7ab7-a92e-4963-be7a-d1bebcd68fe8`. The existing
[Sites fallback](https://alibi-puzzle-club.jeky-tck.chatgpt.site/) is saved
version 23, deployment `appgdep_6ab6c0dc2c848191913d93bd136c2f2a`,
from the same source SHA. All 291 publicly served files returned HTTP 200:
Cloudflare matched the clean build byte for byte; Sites matched 281 files
byte for byte and transformed ten HTML pages. Each hosted origin passed 214
disposable-profile real-origin browser checks, including IndexedDB recovery,
backup and offline behavior. The hosted checks intercepted statistical POSTs
to avoid contaminating live counts. A separate disposable primary-origin visit
observed the open, on-by-default notice, one accepted aggregate-only
`page.view/home/0.12.0/n=1` POST (202), a persisted opt-out, and no subsequent
send after navigation. That QA visit and the earlier collector admission probe
each added one synthetic count to production aggregates.

Cloudflare serves the repository HTTP CSP and sampled WebP as `image/webp`.
Sites still lacks the HTTP CSP and serves sampled WebP as
`application/octet-stream`, existing fallback limits tracked in issue #6.
The prior web rollback is annotated tag `v0.11.6`, Cloudflare Worker version
`107707f3-1e5d-442c-94b3-c87c6ec73ae6`, and Sites saved version 22
(deployment `appgdep_6ab64e1a75ac8191b8308d22bdb4cb15`). Rollback was
not exercised. Physical Android, TalkBack, and human difficulty calibration
remain open in `HUMAN_TODO.md` q-1 through q-8.
