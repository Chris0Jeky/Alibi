# Keyboard-focus follow-up 0.8.2

Published 2026-09-09 from [PR #60](https://github.com/Chris0Jeky/Alibi/pull/60), source
`c42a3886ac1ca87cb666fe57b246f51a3e185213`, build `d4e57ffe54f5`.

## Changed

Internal navigation now focuses the destination main landmark instead of leaving keyboard focus
on BODY. Search rerenders preserve input focus; direct URL loads retain their behavior; automatic
first-play lessons keep modal focus. No puzzle definitions, revisions or save identities change.
The earlier feedback features remain described in [RELEASE-0.8.1.md](RELEASE-0.8.1.md).

Terra implemented and tested this bounded follow-up while the first release proceeded. Luna supplied
an independent review and an editorial inventory. The latter expands the future-case evidence seed
without adding a new casebook or treating an unresolved motive as finished canon.

## Verified

- Both exact-head CI runs pass: [push](https://github.com/Chris0Jeky/Alibi/actions/runs/34390060189)
  and [PR](https://github.com/Chris0Jeky/Alibi/actions/runs/34390086863).
- Local full verify, 182 original UI checks, phone/desktop player matrix and visual inspection pass.
  A separate 22-check audit covers rules across all families, empty search, family back navigation,
  narrow-width reflow and the app's large-text setting. Real browser zoom is not claimed.
- Primary Worker version `cf374cef-566c-495d-a938-e9f401b81596`; fallback Sites version 8,
  deployment `appgdep_6aa1aa6fda508191b18be090649930d9`, succeeded.
- Both current live origins pass all 92 storage/offline checks. The primary also passes the full
  player-feedback control matrix at 390/1440.
- All 254 primary public files match the release. A complete fallback recheck matches all 250
  non-HTML files; its four HTML files preserve the exact source plus the known 938-byte challenge
  insertion. The initial sweep briefly received a 404 for the new app script; that failure is
  retained in the evidence rather than counted as a clean first attempt.
- The primary live 0.8.1-to-0.8.2 probe keeps the old release active while waiting, saves another move,
  then uses Save & update and verifies exact state/pinned definition retention after offline reload.

## NOT verified

The same fallback probe timed out after 90 seconds waiting for the update-ready signal. The initial
file sweep returned 404 for `assets/alibi.2b7909e7f1f3.js`; a later fetch and complete recheck match
the bundled file. A required cache asset missing during installation can prevent the worker reaching
waiting. This supports transient host publication/serving inconsistency, but the probe did not retain
its worker/network snapshot, so the exact causal request is unconfirmed. Current-release offline and
storage checks passed there, but the hosted old-to-new transition is not certified. This is tracked
in [#63](https://github.com/Chris0Jeky/Alibi/issues/63); no fallback upgrade success is inferred.
The earlier 0.8.0-to-0.8.1 probe likewise lacked a final receipt.

Physical Android, TalkBack, large system text, sustained performance and subjective calibration
remain [HUMAN_TODO.md](../HUMAN_TODO.md). The two successful player reports remain positive
qualitative evidence; they do not close those distinct checks.

## Residual risk and next iteration

Review's two P2 focus gaps are acknowledged in [#62](https://github.com/Chris0Jeky/Alibi/issues/62):
Quiet Wing's separate shadow-root landmark and native internal hash links. Root-route coverage does
not certify those paths. Anthology framing is [#61](https://github.com/Chris0Jeky/Alibi/issues/61).
Known Sites header/MIME limits remain #6 and the tooling dependency advisory remains #58.

Evidence and release artifacts are retained in the coordinator's ignored
`test-results/route-focus-release-2026-09-09/` folder. No production player data was accessed or cleared.
