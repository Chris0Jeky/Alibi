# Progression without turning discovery into work

## Implemented rules in the standalone build

Each of the ten distinct activities awards ten discovery points on its first valid completion. The maximum is 100. Repeating an answer, resetting a board or reopening an exhibit never awards another ten. Guided completion earns the same points and is recorded as guided. Visits, elapsed time, hints and decorative clicks award nothing.

The first-chapter route is knowledge-gated, not gated by a large global XP total:

```text
Library ordering -> maintenance slip -> Observatory time correction --+
                                                                    +-> Study inference -> Unrecorded Stair
Gatehouse lock --------+                                            |
Museum Bridges proof --+-> Map Room -> feasible route ---------------+
Museum Lo Shu ---------+

Orangery lanterns, recursive workshop and Ur model: optional questions
Two museum completions: curator's additional drawer text
Conservatory: always available, existing-Alibi links only
```

The opening has no randomly selected required content. A fresh state can always reach the ending. All ten questions can be finished without changing the device clock, visiting the live site or downloading optional content. The movie contains no exclusive clue. The 1911 lens is optional supporting scenery rather than a required precision interaction.

Twenty-two directory locations are planned. No score opens them in this build. An explicit notice says so. The first-chapter score is not linked to the user's current 324-puzzle catalogue, pets, garden or town.

## Proposed production model

Use four separate concepts rather than one ambiguous level number:

| Concept | What it means | What it must not imply |
|---|---|---|
| Room familiarity | Distinct curated questions explored in this room | That a player read or understood every clue |
| Evidence | A particular record or inference has been established | That a high score proves a narrative claim |
| Access | A location is currently reachable through an authored rule | That all unopened doors are grindable |
| Ownership | A permanent decorative item or capability is available | That the player placed it, used it or has a compatible asset pack loaded |

Persist the evidence needed to derive these states; avoid independently incrementing several counters in different stores. Keep authored access rules in a versioned content registry. Validate all identifiers and references. A room that is not shipped is a release/content state, not a player lock.

### A first tuning proposal, not calibrated balance

A family room can have an introductory question, three to six curated ordinary questions and an optional expert shelf. Ten familiarity points per distinct ordinary question is an understandable starting scale. At 10, a small room detail changes; at 30, a cabinet or local keepsake becomes available; at 60, a deeper decorative restoration or expert shelf appears. These values require human playtesting. Do not apply them retrospectively to make existing tools unavailable.

Required story evidence should also have a focused “investigate this record” route. A player who demonstrates the relevant method and collects the necessary records can progress without finishing six unrelated Sudoku boards. Optional expert puzzles can award a named distinction, but not the only key to the ending.

Global progress should summarise rather than dominate. A portfolio of room discoveries can suggest a newly available wing. It should not randomly assign a puzzle the player dislikes as the sole path forward. Permit equivalent methods where they genuinely test the same requirement; do not accept unrelated busywork as evidence.

### Example: the Observatory

A first calibration question makes a previously contradictory instrument legible. A small curated track of Sun & Moon and number-order puzzles helps the player interpret reference frames. Three distinct completions can open the instrument drawer. A source-linked museum investigation can open the same drawer by a knowledge route. The central story correction still requires the actual clock evidence.

Later cosmetic rewards might be a brass telescope module, an indigo material palette and a moonflower seed. Those grants are deferred under #30, #33 and #34. The standalone prototype grants none of them.

### Example: the Glass Orangery

A visible light puzzle restores a lattice. Existing Lanterns-family content can later form a themed room track, but the prototype's reversible switch board is not the same engine as Alibi's Lanterns/Akari family. Preserve that distinction when importing the implementation. The first task concerns the effects of a move; the wider family concerns illumination constraints.

Local secrets might include a planting drawer, an old horticultural notebook and a glasshouse shortcut. Only the narrative note can supply a story fact. A decorative plant does not silently claim the player solved the note.

## Quest design

A quest is a short chain of meaningful state changes. Give each one a question, not merely an instruction list. “Why does the ticket disagree with the bell?” is better than “Complete five puzzles.” Show the nearest useful action without revealing the deduction. Let players pin one question in the notebook and leave the rest unpinned.

Each quest record should identify starting cues, prerequisite records, valid conclusions, wrong-but-plausible alternatives, unlock effects, optional character material, accessible interactions and a hint ladder. Separate the player's notes from the canonical evidence graph. The app can offer “these two records may be worth comparing” but should not silently rewrite a player's hypothesis.

The main quest graph must be acyclic at the level of required evidence. Optional routes can loop spatially, but an item must never require entry to the very room it unlocks. Validate graphs over both fresh and migrated states, all allowed museum alternatives and unavailable optional packs.

A secret should normally progress through three intelligible stages: a reason to suspect it, a method to investigate it and a clear confirmation when it is found. The method may be subtle. The confirmation should not be.

## Reward loop for later implementation

```text
Committed official completion
  -> validated semantic receipt
  -> evidence / room access update
  -> idempotent permanent entitlement
  -> optional presentation in the Quiet Wing
  -> player chooses whether and where to use it
```

Do not use an arbitrary DOM event as authority. A receipt must originate in a trusted completion path and refer to a registered content item. This protects consistency and provenance; it does not make a static local game tamper-proof. Competitive online scoring would need a separate architecture.

A semantic reward identity should survive ordinary editorial revisions without minting a second reward. A genuinely new challenge can have a new identity. App version, build hash, puzzle definition revision, run ID and reward identity are distinct. Preserve pinned unfinished runs.

Where multiple databases are involved, persist an outbox or reconciliation record with the source of truth, acknowledge delivery idempotently and tolerate interruption. Never claim cross-database atomicity. A unavailable optional wing can receive its presentation later without losing the underlying entitlement.

## Pet experience proposal

Keep affection, learned behaviour, cosmetic ownership and narrative evidence distinct. Affection can respond to small interactions without becoming a currency. Experience should come from distinct shared experiences rather than repeated taps. A companion may learn to settle in a new room or point out an already-inspectable detail.

A pet should not solve the player's puzzle, reveal a stored solution or create a breed-specific hard gate. An owl's reference suggestion must have a notebook equivalent; a fox's environmental cue must be discoverable without owning the fox. Time away does not hurt the pet. The game should be glad the player returned.

A first production experiment should be one companion, one useful optional role and a few expressive states. The data/animation work is #31 and the behaviour work is #32. There is no implemented companion XP in this package.

## Garden and city proposal

Reward coherent sets with a relationship to the discovered place. The Observatory can inspire a telescope and night palette. A bridge investigation can inspire a footbridge kit. A museum exhibition can inspire a display stand. Completing the final story can make a memorial planting set available without forcing the player to use it.

The authored estate and the personal town are separate. Restoration changes the story's scenery, not the user's hand-built city. A player can preserve an old town indefinitely. Increasing capacity must be optional, previewed and bounded by device and save budgets, not merely by earned points.

## Pacing and measurement

Measure attempts, voluntary hint use, abandon/resume patterns and whether players can explain an inference during consented playtests. Do not collect the contents of private notebooks by default. Completion time is descriptive, not a measure of intelligence. Accessibility assistance is not cheating.

A first reward should be understandable before a second economy is introduced. Avoid adding pet XP, gardening currency, town permits and room stars to the same onboarding screen. Start with the puzzle, a record and a door. Add systems when they offer a new kind of pleasure.
