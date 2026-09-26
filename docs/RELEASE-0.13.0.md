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

Pending. Record here: merge commit, clean build hash and `build-info.json` figures,
exact-head CI, Cloudflare Worker version and hosted checks, and Sites status. The
collector admitting 0.13.0 is already deployed as Pulseboard Worker version
`ed739cc8-b136-4c28-864f-6b34f9b2ee95` (rollback `bffba8a7-d066-46a8-887a-bf1c916f2648`).

## Evidence limits

Browser suites and machine certificates do not establish physical Android behaviour,
TalkBack, human difficulty or enjoyment; `HUMAN_TODO.md` q-2 through q-8 remain open.
