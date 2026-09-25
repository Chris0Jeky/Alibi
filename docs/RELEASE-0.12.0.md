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
the candidate. Pulseboard must admit the matching release label and regenerate
the locked Observatory adapter before Alibi's version commit can merge. Source
PRs still require exact-head CI and their review gates. No tag, deployment,
public GitHub release or physical-device acceptance is claimed here.

## Publication receipt

Pending. Record the merged source SHA, clean build hash and budgets, exact-head
checks, bundle hashes, Cloudflare Worker version, Sites saved/deployed version,
actual HTTPS response checks, real-origin offline/save results and rollback
references here before calling 0.12.0 published.
