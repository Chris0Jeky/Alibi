# 0.13.0: Deeper vaults and a stronger Duel

## Source candidate: 26 September 2026

This candidate publishes the work merged since 0.12.0:

- [PR #357](https://github.com/Chris0Jeky/Alibi/pull/357): 24 Archive Heist vaults
  (three or four crates, independently reproduced 18–21 push minima) and 12 Pocket
  Borough planning contracts with visible neighbourhood requirements, bringing the
  challenge library to 95 with a family filter. No unique-route or human-difficulty claim.
- [PR #366](https://github.com/Chris0Jeky/Alibi/pull/366): Lantern Duel strengths
  (Learner / Club / Keeper / Expert at worker depths 1 / 3 / 4 / 5; legacy saves keep
  Keeper), fresh Block Cabinet seeds on confirmed Start again, and explicit Retry for a
  failed opponent.
- [PR #365](https://github.com/Chris0Jeky/Alibi/pull/365): lossless record encoding of
  the official startup content (byte-identical restore; no puzzle identity change).
- [PR #350](https://github.com/Chris0Jeky/Alibi/pull/350): Vault authoring tools only
  (no playable puzzle).
- The Usage sharing control moved into the Settings/Privacy slot (`d64b911`), and Club
  persistence hardening (#373–#378) plus stale-async guards
  ([PR #383](https://github.com/Chris0Jeky/Alibi/pull/383)).

The puzzle catalogue is unchanged at 430 puzzles in 26 packs. The 80 Vault logic
studies (#354) are not in this release; they need deferred delivery to fit the
unchanged 200 KiB startup budget.

Version 0.13.0 is registered in `package.json` and `content/releases.json`. The
matching Observatory release label is registered by
[Pulseboard PR #109](https://github.com/Chris0Jeky/Pulseboard/pull/109), and the
regenerated adapter is pinned in `observatory.lock.json`.

## Publication receipt

Published 26 September 2026 from [PR #386](https://github.com/Chris0Jeky/Alibi/pull/386)
merge commit `fa9dc0e6ede24156128a6d5dac04ed5ef7b5972b`; annotated
[`v0.13.0`](https://github.com/Chris0Jeky/Alibi/releases/tag/v0.13.0) points to that
commit. The clean merged-source build `81d973e4d783` is version 0.13.0 with
`sourceDirty: false`, 430 puzzles, 292 emitted files, 129,904 application
JavaScript gzip bytes and 198,340 initial code-plus-content gzip bytes (ceiling
204,800). Exact-head PR CI passed (Verify ×2 and Vault authoring). Merged-source
local `npm run verify` passed 655 tests (652 pass, 3 skipped); an earlier local run
on the same commit failed once in `tests/restore-ordering.test.cjs` (fake IndexedDB,
tracked as [issue #387](https://github.com/Chris0Jeky/Alibi/issues/387); 150 reruns
passed). `cloudflare:check` and `bundle` passed; the bundle's `SHA256SUMS` was
checked against its files:

- `alibi-deluxe-cloudflare.zip`: `f64228700d9cebf5999736f48a62cd0defc841c633a5d73827caa97ef6671ef5`
- `alibi-deluxe-play.html`: `62bd82155925630b7994336c67f4184fde723bee50c41f4acd7c2317fb7384c7`

The primary [Cloudflare origin](https://alibi-after-hours-preview.commit-atlas.workers.dev/)
is Worker version `65d60c13-1cb6-4567-8637-92e2fe249afc` (rollback: the hotfix Worker
`c8a8b8d5-7521-4779-98f1-545da40e2cac`, or 0.12.0's `8edf7ab7-a92e-4963-be7a-d1bebcd68fe8`).
All 291 publicly served files returned HTTP 200 and matched the clean build byte for
byte; the root response carries the CSP header. The hosted real-origin suite
(`tests/browser_origin.py` against the live origin, disposable profiles) passed 243
checks, including IndexedDB recovery, backup, offline and the aborted-Club-read
scenario.

The Pulseboard collector admitting `0.13.0` was deployed first as Worker version
`ed739cc8-b136-4c28-864f-6b34f9b2ee95` (rollback `bffba8a7-d066-46a8-887a-bf1c916f2648`;
`/healthz`, `/readyz` 200). No live 0.13.0 usage count was sent during QA.

The Sites fallback was **not** updated: no Sites deployment tooling was available in
this session, so it still serves 0.12.0 (saved version 23). It never loads the
collector, and its saves are separate. Update it from this same build when the Sites
tooling is available.

## Evidence limits

Browser suites and machine certificates do not establish physical Android behaviour,
TalkBack, human difficulty or enjoyment; `HUMAN_TODO.md` q-2 through q-8 remain open.
