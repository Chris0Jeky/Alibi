# Escape-room backlog and dependency map

Fifteen issues were created on 27 September 2026. This is an additive portfolio under the earlier #436 program, not a replacement backlog. P0 means first delivery, P1 the next validated integration, and P2 a bounded later content/experiment wave; these are priorities, not dates.

| Issue | Outcome | Priority | Depends on / coordinates with |
| --- | --- | --- | --- |
| [#460](https://github.com/Chris0Jeky/Alibi/issues/460) | Escape-room research-to-delivery program | P0 | Existing #436 |
| [#461](https://github.com/Chris0Jeky/Alibi/issues/461) | Authoring, reversible mechanisms and recovery epic | P0 | #464, #465, #466, #467, #468 |
| [#462](https://github.com/Chris0Jeky/Alibi/issues/462) | Distinct curated anthology epic | P0 | #466, #472, #473, #474 |
| [#463](https://github.com/Chris0Jeky/Alibi/issues/463) | Interaction, fair help and cooperation epic | P1 | #467, #469, #470, #471; existing #451 |
| [#464](https://github.com/Chris0Jeky/Alibi/issues/464) | Bounded room/action contract | P0 | Existing #47/#442 define future host seams |
| [#465](https://github.com/Chris0Jeky/Alibi/issues/465) | All-reachable-state recovery and diagnostic traces | P0 | #464; coordinate #443 |
| [#466](https://github.com/Chris0Jeky/Alibi/issues/466) | Tidekeeper and Printmaker rehearsal pair | P0 | #464, #465; independent clue derivations |
| [#467](https://github.com/Chris0Jeky/Alibi/issues/467) | Existing-inspector inventory/mechanism adapter | P1 | #466; existing #47/#442 retain production ownership |
| [#468](https://github.com/Chris0Jeky/Alibi/issues/468) | Clue sufficiency and dependency receipts | P1 | #466; existing #443/#446 |
| [#469](https://github.com/Chris0Jeky/Alibi/issues/469) | Current-object progressive help | P1 | #466, #468 |
| [#470](https://github.com/Chris0Jeky/Alibi/issues/470) | Equivalent controls and nonvisual clue acceptance | P1 | #466/#467; existing #56 human testing |
| [#471](https://github.com/Chris0Jeky/Alibi/issues/471) | Untimed baseline and deliberate optional clock | P1 | #466; existing #455 receipt ownership |
| [#472](https://github.com/Chris0Jeky/Alibi/issues/472) | Three advanced Conservatory rooms | P2 | First-pair quality gates, #468, #470 |
| [#473](https://github.com/Chris0Jeky/Alibi/issues/473) | Three parallel-path Signal House rooms | P2 | First-pair quality gates, #465, #468 |
| [#474](https://github.com/Chris0Jeky/Alibi/issues/474) | Four public/capstone rooms | P2 | Prior validated methods; existing #456 anthology rules |

## Reuse instead of duplicate ownership

#47 owns spatial and semantic object inspection; #442 owns production activity/save integration; #433 owns discoverable optional delivery; #443 general semantic conventions; #446 source/chronology; #451 complementary offline dossiers; #455 user-reviewed local playtest reports; #454 reception research. Existing #43/#53/#54/#76-78 continue to own canonical Wrenmere chapters. #46/#48/#52 own production media. No second notebook, online room transport or player database is proposed here.

The co-op follow-on is a room-specific experiment under #451: compare combined and complementary views, then simultaneous versus latched actions. It is not a new successfully opened issue in this pass. Do not infer missing issue IDs from a failed write.

## Concrete handoff at this publication

The research files are documentation deliverables. The twelve treatments are not shipped rooms. The first two have exact puzzle facts; selected facts across six treatments were independently enumerated or calculated in the session. Those checks do not supply the complete scene, room source, UI, save integration or human calibration.

A separate local implementation of #464/#465 exists with 52 passing new Node tests and a six-test existing Castle-object baseline. It has a finite-state validator, immutable action/projection API, bounded file reader, source receipts and exhaustive recovery diagnostics. A review regression now rejects explicit null/undefined exploration caps rather than silently replacing them with defaults.

Code-upload requests were blocked before GitHub execution. The implementation is therefore retained as a separate reviewable local delivery, not represented as a published code PR. Full package installation failed on an uncached dependency and registry DNS; no full build, formatter or new-code CI pass is claimed. Local Chromium file navigation is policy-blocked; no browser or human acceptance is claimed.

## Continue safely

First publish/review the retained foundation through an authorized functioning workflow, refreshing main and checking for intervening work. Then complete #466's actual room sources and player surface with exact-source controls evidence. #467/#442 promotion follows that rehearsal, not the reverse. Preserve independent review, head-aging and current-head CI requirements. Do not close the production epics merely because a local structural/model test passed.
