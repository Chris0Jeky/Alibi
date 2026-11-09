# 0.16.0: More Sun & Moon, a new Lab, and sturdier saves

## Published: 9 November 2026

This release publishes the merged work since 0.15.2: Sunrise Studies and
Interlock packs (612 puzzles across 33 trusted packs, 209 of them deferred),
the experimental Eclipse Lab, Castle answer feedback, Workshop draft/pack
safety, the phone first-puzzle starter, in-game technique practice, and
save/restore integrity and startup work. Escape rooms, Mirror Ledger, Timeline
Desk and native Android are not part of this release's player-facing claims.

The primary [Cloudflare site](https://alibi-after-hours-preview.commit-atlas.workers.dev/)
serves version 0.16.0, build `12b1c7800c71`, from clean merged source
`12b1c780` (PR #924). `npm run cloudflare:release -- --deploy` deployed Worker
version `d484a05f-2b00-4166-801e-ee4c18eba833`; its probe matched the served
identity, `sw.js` build `b8af73d79307` and seven hashed assets byte for byte.
The public [v0.16.0 release](https://github.com/Chris0Jeky/Alibi/releases/tag/v0.16.0)
tags that source and attaches the portable zip, standalone HTML, build-info,
the deploy receipt (without per-file hashes) and `SHA256SUMS`.

## Qualification

- All eleven hosted CI workflows passed on the release head `3dc7c6ae`.
- Codex review: no findings; independent review: no CRITICAL/HIGH (one wording
  fix applied). A retroactive Muse review of v0.15.2..main (storage, app,
  Eclipse Lab, Castle and accessibility lenses) found no confirmed
  correctness or data-loss defect; WCAG findings were routed to follow-ups.
- Local Windows `npm run verify`: 2,612 pass; the 7 failures all needed the
  web `dist/` that `verify` does not build, and pass after `npm run build`.
- Actual primary origin after deployment: response headers (CSP, nosniff,
  no-cache shell), unknown-path 404, manifest MIME; `browser_house_offline.py`
  (4 checks, including offline hard reload), `browser_backup_import.py` and
  `browser_castle.py` pass against the hosted origin.

## Collector

Pulseboard [#263](https://github.com/Chris0Jeky/Pulseboard/pull/263) admits
the 0.16.0 label; its push deployment succeeded and `/readyz` returned
ready, schema 6, Alibi admitted, before the Alibi deploy.

## Not verified

Physical Android, TalkBack and other owner conditions in
[HUMAN_TODO.md](../HUMAN_TODO.md). An actual 0.15.2 → 0.16.0 Save & update in
a profile that already held a 0.15.2 save was not run this time. The prior
Worker version remains available for `wrangler rollback`; no rollback was
executed.
