# Escape rooms: research-to-delivery portfolio

27 September 2026. Owner-requested extension of #436, tracked in [#460](https://github.com/Chris0Jeky/Alibi/issues/460). Inspected main: `a3c6ad9bc3b27573d2f310a4313418c47a4b3f49`, source tree `073abac9117c3704953453f84d3e74372ccc5bf6`. Documentation stacks on the earlier research PR #457 so its state handoff is preserved rather than overwritten independently.

## Direction

Build authored rooms in which inspecting, combining and operating things changes the space and makes a meaningful objective possible. A room is not simply a menu of standalone puzzles. Preserve challenging reasoning while removing ambiguous controls, arbitrary hidden knowledge and unrecoverable mistakes.

The portfolio contains twelve original room treatments, not twelve released levels. Begin with Tidekeeper's Workshop and Printmaker's Cabinet; expand through Conservatory, Signal House and public/capstone batches only after quality gates. Solo and untimed are the default proposal. Optional co-op, tension, richer art and sound must add useful play rather than become prerequisites. Experimental treatments are not yet canonical Wrenmere chapters.

## Read the deliverables

| Document | Purpose |
| --- | --- |
| [SOURCES](SOURCES.md) | Twelve primary-source/guidance entries, with three additional leads explicitly marked partial |
| [DESIGN](DESIGN.md) | Physical-to-digital comparison, room loop, branching, difficulty, feedback and interaction craft |
| [ARCHITECTURE](ARCHITECTURE.md) | Six decisions covering state, clue graphs, recovery analysis, preview and existing-host integration |
| [ROOMS](ROOMS.md) | Twelve original treatments with objectives, mechanisms, transformations and acceptance risks |
| [QUALITY](QUALITY.md) | Author packets, five evidence gates, diagnostic playtests and four production waves |
| [BACKLOG](BACKLOG.md) | Fifteen published issues with priorities, dependencies and existing ownership |
| [EVIDENCE](EVIDENCE.md) | Checked example deductions, local implementation evidence and publication limits |
| [Specification](../../superpowers/specs/2026-09-27-escape-rehearsal.md) | Exact bounded experimental state contract |
| [Implementation plan](../../superpowers/plans/2026-09-27-escape-rehearsal.md) | Tested foundation tasks and the still-open playable-room/UI work |

## Research, proposal and implementation are different

Nicholson's historical survey supplies a useful distinction between open, sequential and path-based organization; his Ask Why paper motivates embedding tasks in a setting. Coin Crew's maker account describes selective digital interactability and observed playtesting. Pine Studio illustrates object manipulation and creator tooling; tabletop examples suggest compact inspect/combine/transform packets. Sources and their limitations are linked in SOURCES. None establishes a universal popularity formula or guarantees Alibi demand.

Current Castle inspect/note objects, the draft evidence-classification workbench and Archive Heist's crate-pushing reducer are different systems. The proposed escape layer must reuse their appropriate seams without silently redefining their rules, save domains or published content. #47/#442/#433 retain inspector, host and delivery ownership.

## Delivery status

Fifteen issues (#460-#474) are published. A local #464/#465 foundation passes 52 new Node tests, but its code-upload requests were blocked before GitHub execution. It is preserved separately, not claimed as a published code PR. Full application formatting/build, browser acceptance and independent review remain unverified. No new escape-room UI, production save integration, room release or human playtest was completed in this pass.

The twelve treatments are a concrete commissioning direction. Selected example deductions were independently checked, but those checks do not turn treatment documents into complete room implementations. Preserve this distinction when continuing, closing issues or describing release contents.
