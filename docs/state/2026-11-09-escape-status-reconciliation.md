# Escape-room status reconciliation, 9 November 2026

This handoff updates the research portfolio, six-room plan and anthology guide from their September draft-era status to the checked-in and GitHub-verified state. It does not change code, room sources, save behavior, delivery, budgets or release state. The earlier entries in `docs/STATE.md` remain historical records; this note is the current escape-specific handoff.

## Merged work and evidence

- **Research, PR #478:** merged 17 October 2026 as `44a580c1f7e25ecb0f52edfa04d0c993db67753a`. Final head `868cdfa3bc6018a990eadca1da48e08b9e4f7423` passed full verification in run [39001309053](https://github.com/Chris0Jeky/Alibi/actions/runs/39001309053). The earlier stacked head `58485f1` failed run 36339308214 on a stale STATE-text assertion. That failure remains historical; it is not true that every run was green.
- **Bounded state/recovery foundation, PR #480:** merged 16 October as `7e3c1c36ab26941f91582d9106d27bcf3f361e9d`. Closeout head `f57931799d29c3895a37063a595adacbc64b6483` passed 52 focused tests, rehearsal run 36337662276, numbered-import run 36337662275 and full verification run 36337662279. The initial ambiguity in the P2 unreachable-actions diagnostic was later fixed in merged #727 (`b5b044b`); it is not an open defect in the current authoring diagnostic.
- **Six-room anthology, PR #481:** merged 17 October as `53ddeb8f8314d97867d77a949848d6170e10bb94`. Tested code head `2846aaff0737a3f090e6de349352e57efefdf274` is an ancestor of reviewed head `77744f61`, whose handoff delta was documentation-only. The dedicated rehearsal run 36339248604 passed 93 focused tests and 18 actual offline-file scenarios; controls run 36339248618, Android run 36339248626 and full run 36339248645 also succeeded. Full verification at that then-head reported 844 Node tests. Independent review comment 6223194047 found no correctness, security or data-loss defect. No formal GitHub `APPROVED` review is claimed.

The six implemented rooms are Tidekeeper's Workshop, Printmaker's Cabinet, Moonseed Conservatory, Herbarium Lift, Counterweight Loft and Clockmaker's Rehearsal. The other six of the twelve original treatments remain unimplemented: Rain Collector, Fogbound Exchange, Mapmaker's Fold, Lost Property Counter, Projection Booth and House of Departures. All six implemented rooms remain memory-only in a standalone anthology. Switching rooms retains session state; refresh or close clears it. No new production route, escape save, release, deployment or human playtest is claimed.

## Current integration and acceptance state

- The existing Castle case host/save authority under #442 was completed and closed on 29 October. It is not an unfinished escape-room adapter epic.
- The memory-only Castle adapter was implemented under #467 and has focused coverage across all 648 declared room states. The original adapter handoff reported seven tests; the captured-controls follow-up reports the current eight-test suite. It is not mounted in the shipped Castle; #467 remains open for that escape-specific mounting and recovery acceptance using the existing CastleStore. #47 retains the existing inspector contract.
- The first keyboard/nonvisual parity slice in #470 has merged. This does not establish real screen-reader, physical-device or editorial acceptance. Human clue comprehension, spoiler review and difficulty calibration remain unclaimed.
- Shared delivery infrastructure has landed through #433 follow-up PRs #805, #906 and #910. #433 remains open for constrained-device measurements and wider coverage. No escape-room production asset route is included in the anthology.
- `HUMAN_TODO.md` remains authoritative for owner and physical-device decisions. This reconciliation adds no acceptance claim or owner decision.

## Files changed

- `docs/research/ESCAPE-ROOMS-2026-09/README.md`: replaces stale unpublished/draft status with merged PRs and current evidence while retaining the September handoff as historical.
- `docs/escape-rooms/README.md`: labels the September foundation evidence as historical and corrects current #467/#442 ownership.
- `docs/escape-rooms/CASTLE-ADAPTER.md`: keeps the memory-only ADR and existing-store boundary, assigning outstanding escape-specific mounting/recovery acceptance to #467.
- `docs/escape-rooms/ANTHOLOGY-PLAN.md`: marks the completed player and publication tasks, dates the original planning constraints and execution ledger, and links to current evidence.
- `docs/escape-rooms/ANTHOLOGY.md`: states merged status, reconciles final-head evidence and corrects current #442/#467/#470/#433 ownership and remaining gates.
- This unique handoff records the facts and residual limits without editing shared `docs/STATE.md` or `HUMAN_TODO.md`.

## Verification and limits

Verified during this documentation change: each edited claim against the stated PR/CI evidence and current in-repository handoffs; relative Markdown links in the six changed files; Markdown formatting/line endings; `git diff --check`; and a final changed-path review. No tests were added. The author did not run application suites for this documentation-only change; independent review reran the eight existing Castle adapter tests to confirm the current coverage count, and all passed. The current-head repository CI remains required before merge.

Not verified by this handoff: a live deployed escape-room route, durable escape-room saves, automatic production delivery, formal GitHub approval, human/editorial playtesting, screen-reader acceptance or physical-phone behavior. Those limits remain as stated above and in the existing issues.
