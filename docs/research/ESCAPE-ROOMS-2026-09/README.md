# Escape rooms: research-to-delivery portfolio

27 September 2026. Owner-requested extension of #436, tracked in [#460](https://github.com/Chris0Jeky/Alibi/issues/460). Inspected main: `a3c6ad9bc3b27573d2f310a4313418c47a4b3f49`, source tree `073abac9117c3704953453f84d3e74372ccc5bf6`. Documentation stacks on the earlier research PR #457 so its state handoff is preserved rather than overwritten independently.

## Direction

Build authored rooms in which inspecting, combining and operating things changes the space and makes a meaningful objective possible. A room is not simply a menu of standalone puzzles. Preserve challenging reasoning while removing ambiguous controls, arbitrary hidden knowledge and unrecoverable mistakes.

The portfolio contains twelve original room treatments, not twelve released levels. Begin with Tidekeeper's Workshop and Printmaker's Cabinet; expand through Conservatory, Signal House and public/capstone batches only after quality gates. Solo and untimed are the default proposal. Optional co-op, tension, richer art and sound must add useful play rather than become prerequisites. Experimental treatments are not yet canonical Wrenmere chapters.

## Read the deliverables

| Document                                                                      | Purpose                                                                                             |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| [SOURCES](SOURCES.md)                                                         | Twelve primary-source/guidance entries, with three additional leads explicitly marked partial       |
| [DESIGN](DESIGN.md)                                                           | Physical-to-digital comparison, room loop, branching, difficulty, feedback and interaction craft    |
| [ARCHITECTURE](ARCHITECTURE.md)                                               | Six decisions covering state, clue graphs, recovery analysis, preview and existing-host integration |
| [ROOMS](ROOMS.md)                                                             | Twelve original treatments with objectives, mechanisms, transformations and acceptance risks        |
| [QUALITY](QUALITY.md)                                                         | Author packets, five evidence gates, diagnostic playtests and four production waves                 |
| [BACKLOG](BACKLOG.md)                                                         | Fifteen published issues with priorities, dependencies and existing ownership                       |
| [EVIDENCE](EVIDENCE.md)                                                       | Checked example deductions, local implementation evidence and publication limits                    |
| [Specification](../../superpowers/specs/2026-09-27-escape-rehearsal.md)       | Exact bounded experimental state contract                                                           |
| [Implementation plan](../../superpowers/plans/2026-09-27-escape-rehearsal.md) | Original foundation and player plan; implementation is recorded in merged PRs #480 and #481         |

## Research, proposal and implementation are different

Nicholson's historical survey supplies a useful distinction between open, sequential and path-based organization; his Ask Why paper motivates embedding tasks in a setting. Coin Crew's maker account describes selective digital interactability and observed playtesting. Pine Studio illustrates object manipulation and creator tooling; tabletop examples suggest compact inspect/combine/transform packets. Sources and their limitations are linked in SOURCES. None establishes a universal popularity formula or guarantees Alibi demand.

Current Castle inspect/note objects, the evidence-case workbench and Archive Heist's crate-pushing reducer are different systems. The escape layer reuses the appropriate seams without silently redefining their rules, save domains or published content. The existing Castle case host/save authority under #442 is complete; the escape-specific Castle adapter is implemented but still needs mounting under #467. #47 retains the existing inspector contract, while #433 tracks broader optional delivery work.

## Current delivery status, reconciled 9 November 2026

The research portfolio was published in [PR #478](https://github.com/Chris0Jeky/Alibi/pull/478), merged on 17 October 2026 as `44a580c1f7e25ecb0f52edfa04d0c993db67753a`. Its final head, `868cdfa3bc6018a990eadca1da48e08b9e4f7423`, passed full verification in run [39001309053](https://github.com/Chris0Jeky/Alibi/actions/runs/39001309053). An earlier stacked head, `58485f1`, failed run 36339308214 on a stale STATE-text assertion; that historical failure is retained and is not erased by the final pass.

The bounded state/recovery foundation shipped in [PR #480](https://github.com/Chris0Jeky/Alibi/pull/480), merged 16 October as `7e3c1c36ab26941f91582d9106d27bcf3f361e9d`. Its closeout head `f57931799d29c3895a37063a595adacbc64b6483` passed 52 focused tests, the rehearsal and numbered-import workflows, and full verification. A later diagnostic ambiguity was corrected in merged #727; the historical alias for `unreachableActions` must not be read as evidence that the player should hide a control.

The six-room standalone player and authored sources shipped in [PR #481](https://github.com/Chris0Jeky/Alibi/pull/481), merged 17 October as `53ddeb8f8314d97867d77a949848d6170e10bb94`. Its tested code head `2846aaff0737a3f090e6de349352e57efefdf274` is an ancestor of reviewed head `77744f61`, whose handoff changes were documentation-only. The dedicated rehearsal recorded 93 focused tests and 18 actual offline-file cases; the controls, Android and full workflows also succeeded, including `npm run verify` with 844 Node tests. The six implemented rooms are Tidekeeper's Workshop, Printmaker's Cabinet, Moonseed Conservatory, Herbarium Lift, Counterweight Loft and Clockmaker's Rehearsal. Six of the twelve treatments remain unimplemented: Rain Collector, Fogbound Exchange, Mapmaker's Fold, Lost Property Counter, Projection Booth and House of Departures.

This is still a memory-only standalone anthology: switching rooms preserves progress and notes during the session, while refresh or close clears them. No escape-room production route, durable escape save, automatic collection installation, deployment or human playtest is claimed. The #467 Castle adapter exists and has focused coverage across the 648 declared states, but it is not mounted in the shipped Castle. Issue #442 is complete for the existing case host; it is not an open escape-room adapter task. The first keyboard/nonvisual parity slice in #470 merged, while screen-reader, physical-device and editorial acceptance remain unproven. Shared delivery infrastructure under #433 has landed through PRs #805, #906 and #910; #433 remains open for constrained-device measurements and broader coverage, and those changes do not add an escape-room route.

No formal GitHub `APPROVED` review or human/editorial acceptance is claimed for #481. The independent review comment recorded no correctness, security or data-loss defect. Keep the remaining acceptance and owner decisions aligned with the existing issues and [HUMAN_TODO.md](../../../HUMAN_TODO.md).

The twelve treatments remain a concrete commissioning direction. Selected example deductions and the six implemented finite models do not turn the remaining treatments into complete room implementations or establish human clue comprehension, difficulty or enjoyment. Preserve this distinction when continuing, closing issues or describing release contents.

### Historical handoff, 27 September 2026

At the original handoff, fifteen issues (#460-#474) had been published, and local #464/#465 code-upload requests were blocked before GitHub execution. That work was preserved separately at the time. The statements that no UI existed and that full application, browser and independent review evidence remained unavailable were true then; PRs #480 and #481 supersede those status claims.
