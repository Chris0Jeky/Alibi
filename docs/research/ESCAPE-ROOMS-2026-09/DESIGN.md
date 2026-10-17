# A design grammar for Postern escape rooms

These are product proposals derived from the source review, not measured player preferences. The intended experience is discovery, justified experimentation, a visible change to the room and a conclusion earned through understanding.

## What counts as a room

A room has a coherent objective, inspectable sources, mechanisms with legible states, dependencies between discoveries and a meaningful completion event. Escaping can mean opening a passage, restoring a lift, dispatching a message or retrieving an object. It need not mean imprisonment, murder, a countdown or a first-person 3D camera.

| Format | What to learn | What not to import automatically |
| --- | --- | --- |
| Physical room | Spatial context, parallel participation, material feedback, staged reveals | Operator dependence, physical searching fatigue, resets, mandatory group booking |
| Digital room | Deterministic state, undo/recovery, transformed spaces, controlled interactability | Pixel hunts, arbitrary inventory combinations, long walking loops |
| Tabletop/card room | Compact source packets, inspect/combine/transform operations, explicit clue access | Irreversible component destruction or reliance on another app |
| Asymmetric co-op | Different information worth explaining | One player doing all deduction; timers that exclude turn-taking |
| Authored puzzle adventure | Coherent recurring place and method transfer | Endless exposition, unbounded scope or puzzle gates unrelated to the world |

The comparison is a design synthesis using S1-S9, not a ranking of products or formats.

## The room loop

Observe a distinctive object. Form a testable interpretation. Make a reversible or clearly committed action. Receive specific state feedback. Reinterpret an earlier clue or reveal a new space. Combine what the branches established. Complete the objective.

A useful room changes what the player can do or understand. Unlocking another identical number pad is a weak default transformation. Prefer a press that produces a new record, a shutter that reveals an alignment, a counterweight that makes a previously inaccessible compartment reachable, or a signal whose destination becomes observable.

## Progression without a single bottleneck

Use a short linear entrance when teaching a new interaction. For advanced rooms, open two understandable leads and join them at a final mechanism. A player blocked on one line can make progress elsewhere. Do not create six unrelated starts that make relevance impossible to infer.

```
entry observation
  -> inventory/tool path ----\
                              -> combined mechanism -> transformed space -> exit
  -> calibration/info path --/
```

Keep dependencies explicit for authors but implicit and discoverable for players. A room map is stable geography, not a random layout reset. In a solo version, all necessary information can be revisited. In co-op, different views should invite explanation rather than merely split a long reading task.

## Hard, fair and varied

Increase inference depth, interacting constraints, representation changes, dependency width or counterfactual reasoning. Do not increase difficulty through small targets, unexplained encodings, obscure trivia, invisible prerequisites, exact phrasing, memory burdens or withholding error recovery.

Each reasoning task needs a source-to-answer derivation, at least one plausible wrong interpretation and the clue that rejects it. Distinguish a necessary conclusion from a merely possible one. Accept multiple valid configurations when the constraints genuinely permit them; do not force a single arbitrary author preference.

Use codes only when a device and its encoding belong to the place. Balance them with alignment, routing, matching provenance, discrete conservation, ordering, calibration and tool placement. An item should have a recognizable role before the player is asked to try it on every surface. Model its location once so it cannot be duplicated or permanently lost accidentally.

## Fair information and feedback

The interface should distinguish unavailable, available-but-not-yet-understood and completed interactions. An attempt button must not disappear merely because the current dial combination is incorrect. Conversely, a truly hidden object must not be operable through an old event handler.

After an action, explain the observable effect: a handle moves, a channel changes, a proof appears. For a failed attempt, distinguish a malformed input from a mechanism that does not engage without exposing the answer. Retain the draft. No penalty for curiosity, arbitrary lives, automated accusations of cheating or irreversible reset on timeout.

Help belongs to a currently open line of inquiry. Orientation identifies where to look; constraint highlights a relevant relationship; method explains how to reason. A worked solution is a separate, clearly labelled spoiler action. Reading it must not silently complete the room.

## Sensory craft without accessibility debt

Use warm materials, restrained motion and purposeful sounds to confirm actions. Clues must remain complete when muted, with text descriptions and non-color distinctions. A visual scene and a semantic object list are two views of one action model, not separate difficulty modes. Non-drag tap/select controls accompany keyboard controls. Comfort options do not alter clue truth or erase progress.

A phone layout should prioritize the current object and its controls, with a compact inventory/status summary and an easy route back to other leads. Do not place several screens of lore above the first action. Long descriptions can be disclosed without hiding required facts. Focus follows the active object or meaningful result after a change.

## A production rule for quantity

Create reusable interaction primitives, not interchangeable puzzle answers. Grow the library through reviewed batches of two, three, three and four rooms. Reject a batch when one unresolved design problem is being repeated. Track originality by mechanism, representation, dependency structure and intended aha, not filenames or color palettes.

The twelve treatments are a commissioning portfolio. Higher difficulty is a design intention, not a calibrated label. Each room earns promotion independently through source, model, editorial, actual-control and human evidence. A small excellent anthology is preferable to an automatically registered catalogue of near-duplicates.
