# Producing many rooms without multiplying weak puzzles

Production protocol under #460/#462. These are proposed acceptance gates, not claims that a human study or release has happened. The target is a repeatable authoring process that makes twelve genuinely different rooms feasible.

## Five separate quality gates

| Gate | Required evidence | Does not establish |
| --- | --- | --- |
| Source integrity | Explicit version, bounds, references, original provenance and exact-source digest | A fair or enjoyable puzzle |
| Mechanic recovery | Exhaustive bounded state analysis, a replayed winning path and no reachable softlock; cap exhaustion is inconclusive | That players can infer the winning actions |
| Clue reasoning | Independently derived answers, sufficient clues available beforehand, ambiguity/counterexample tests | Natural-language clarity for all players |
| Interaction and integration | Actual-control tests, focus, wrong-input retention, recovery and measured delivery costs | Physical-device or screen-reader acceptance |
| Human/editorial acceptance | Observed first visits, return visits, accessibility use, difficulty review and source/rights review | A representative market forecast |

A room must not skip a gate because another gate has an impressive count. Hundreds of simulated paths do not replace one observed player misunderstanding a clue. A long playtime is not automatically advanced reasoning.

## A complete author packet

Record the player role, objective, ending, setting constraints and emotional tone. Inventory every inspectable object, its reason to exist, visible states and allowed actions. Keep clue text, world-state facts and hypotheses separate. Draw both a clue-dependency graph and a mechanism-transition graph. Include sources, intended derivations, acceptable alternatives, meaningful wrong routes, three-stage help, explicit worked solution, story-off copy and equivalent nonvisual information.

Use one authoritative variable for each movable item's location. State whether operations consume, move, copy or transform resources. Explain irreversible fictional actions and prove a recovery route. A changed object must have an observable description. Document what happens to drafts, selected objects and focus after each action.

Retain the editable source for art and sound, their provenance and the required fallback text. Start the first room with simple diagrams and native controls. Produce polished media after the puzzle survives review; an expensive scene should not make a flawed mechanism too costly to replace.

## Difficulty and originality review

Assess inference depth, interaction between constraints, representation changes, branching width and the amount of information the player must integrate. Separately assess text/controls friction, unnecessary searching, repeated operations and memory burden. Reduce the latter without flattening the former.

Before admitting a new room, compare its core operation, dependency shape, reveal and intended aha with existing rooms. A new title, color, code or seed does not demonstrate originality. Reusing a well-understood tool is acceptable when the new room asks a different question or uses it in a different relationship.

The initial two specimens teach the authoring model. Later Conservatory and Signal House batches target advanced reasoning. Do not label those rooms Expert/Master or publish completion-time claims until real observations support the labels. Keep assisted, repeated, abandoned and unassisted sessions distinguishable.

## Diagnostic playtest protocol

Use small, varied sessions to find problems, not estimate population-level retention: newcomers, experienced puzzle players, someone returning after a break and accessibility users when available. Ask permission before collecting observations. A user-reviewed local receipt can use #455; no automatic recording or new analytics service is required.

Ask the participant to identify the objective, choose a first lead, explain what they think a mechanism does, recover from a wrong attempt, request help and resume after a pause. Neutral prompts such as "What are you trying to establish?" are preferable to teaching the solution. Record where an interpretation changed and which clue caused it. Keep negative observations and incomplete runs.

Useful measures: time to first meaningful action; mistaken interpretation versus input error; repeated unproductive attempts; hint stage requested; ability to explain the result; participation balance in co-op; successful return-and-resume. Report denominators and conditions. Do not turn solve speed or a satisfaction score into a sole difficulty metric.

## Control and recovery matrix

For every room, exercise the shortest authored route, an alternative legal order, each meaningful wrong input, each reusable item moved away and back, all mechanism settings, help without progression, explicit worked-solution disclosure, undo, restart/cancel and completion idempotence. At least one test must intentionally create a model with a losing branch while another branch wins, proving the analyzer is not merely a walkthrough checker.

For a future player surface: 320/390px portrait, 844x390 landscape and desktop; enlarged text; keyboard and non-drag pointer paths; reduced motion; muted and forced-color modes; no essential hover or color-only facts. Source text resembling markup must remain text. No future-object information through hidden controls, descriptions or stale handlers. Dynamic announcements and focus must remain useful rather than flooding the player after every action.

For host promotion, additionally test revision-pinned reload, old/future saves, stale tabs, route disposal, backup preview/cancel/recovery, denied/quota storage and interrupted optional installation. Keep existing origins and budgets. A memory-only rehearsal does not claim these behaviors.

## Delivery waves and stop rules

**Wave A:** source contract, recovery diagnostics and the two workshop specimens. Stop adding rooms if the object/action vocabulary causes avoidable confusion or if authors cannot repair diagnostics.

**Wave B:** three Conservatory rooms. Observe the first before multiplying its visual conventions. Reject transplanted grid puzzles whose props do not add any new reasoning or discovery.

**Wave C:** three Signal House rooms. Validate parallel branches and resource recombination. Stop if parallelism means waiting, repeated reading or one player dominating the work.

**Wave D:** four public/capstone rooms. Prove real transfer to a new representation. Do not require recalled passwords or access to unavailable older collections.

No dates, production budgets or commercial launch are promised. Each wave produces useful accepted rooms independently; a failed experiment may be archived with its findings. Preserve an explicit status for treatment, authored source, tested rehearsal, accepted host integration and shipped room.
