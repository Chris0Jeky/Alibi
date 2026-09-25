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

On the integrated candidate, local Verify passed 582 Node tests with three
skips; 184 actual-control checks, 214 real-origin storage/offline checks and
480 Night study control checks passed. A real Chromium adapter regression failed
against the old generated artifact when an idle route count was not sent; the
regenerated adapter passed 48 browser assertions, including automatic delivery,
a corrupt legacy opt-out and denied probe cleanup. The first integrated Verify found a 7-byte
startup-JavaScript budget overrun, resolved by shorter About copy and a refreshed
source catalogue. The integrated clean build remained below the
130,304-byte gzip ceiling. Exact-head CI, hosted integration, publication and
physical-device acceptance remain open for the release PR. No tag, deployment
or public GitHub release is claimed here.

## Publication receipt

Pending. Record the merged source SHA, clean build hash and budgets, exact-head
checks, bundle hashes, Cloudflare Worker version, Sites saved/deployed version,
actual HTTPS response checks, real-origin offline/save results and rollback
references here before calling 0.12.0 published.
