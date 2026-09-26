# 0.13.1: A Beta notice that stays out of the way

## Source candidate: 26 September 2026

This patch replaces the aggregate Usage sharing embed with the Pulseboard SDK v3
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

1. Pulseboard registers `0.13.1` (append it to `observatory/src/alibi-releases.mjs`) and deploys
   the collector. `observatory/pulseboard.js` already lists `0.13.1`; a rebuild from that
   Pulseboard commit must produce the same SHA-256 as `observatory.lock.json`.
2. Pulseboard admits `alibi` in `COLLECT_PRODUCT_PROJECTS` for diagnostics and journeys
   (counts already use `COLLECT_STAT_PROJECTS`). Until then product batches are refused and the
   SDK stops after three failures per page.
3. Only then deploy Alibi 0.13.1. Deploying first means every 0.13.1 count is rejected.

## Publication receipt

Pending. Record here: merge commit, clean build hash and `build-info.json` figures, exact-head CI,
the Pulseboard registration and collector version, the Cloudflare Worker version and hosted checks,
and Sites status.

## Evidence limits

Intercepted browser checks at 390px (`tests/browser_observatory.py`) and the fake-DOM tests do
not prove the live collector, a physical phone, or the old-shell/new-host rollout case.
