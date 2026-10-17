# Validation, accessibility and useful measures

## Five distinct receipts

1. **Structural:** schema, bounds, references, dependency order and visibility are valid.
2. **Semantic:** a solver, exhaustive bounded model or independent derivation verifies the intended claims and counterexamples. Record assumptions and model limits.
3. **Editorial:** clues, sources, character identity, chronology and uncertainty make sense together. Self-review is labelled as such.
4. **Interaction/integration:** actual controls, focus, pointer/keyboard alternatives, offline/reload, persistence and recovery work at the tested source. A memory-only preview cannot claim durable save acceptance.
5. **Human/device:** real newcomers, returners and accessibility users encounter the experience on actual devices. Do not infer this from CI, simulated viewports or machine solve counts.

## First case protocol

Recruit a small varied sample as a diagnostic study, not a population estimate: puzzle newcomers, experienced solvers, someone returning after a gap, and accessibility users where feasible. Obtain permission for observations; no automatic recording of notebook text, private backups or personal information. Record source SHA, case revision, device, story mode and any assistance.

Ask participants to find the first question, identify relevant sources, explain a proposed conclusion, request a hint, revise a mistaken interpretation and return to an unfinished step. Use neutral prompts such as “What are you trying to establish?” rather than teaching the answer during the task. Afterwards ask what remains unknown and which clue changed their mind. Keep unsuccessful runs and contradictory comments.

## Measures that do not erase difficulty

| Measure | Meaning | Misuse to avoid |
| --- | --- | --- |
| Time to first meaningful action | Orientation friction | Treating fast completion as universal quality |
| Valid interpretation before submission | Whether the player understands the task | Counting lucky correct clicks as deduction |
| Hint stage used, with explicit request | What help was useful | Inferring frustration from time alone |
| Post-solve explanation and counterexample | Transfer and justified uncertainty | Using a satisfaction rating as proof of reasoning |
| Return-and-resume success | Whether state and context remain legible | Hiding resets behind successful fresh sessions |
| Error recovery and retained input | Whether mistakes are safe | Counting an error message as adequate recovery |
| Qualitative productive struggle vs interface friction | Separates hard puzzle from bad controls | Automatically lowering difficulty for slow players |
| Author repair time and diagnostic accuracy | Whether tools shorten iteration | Optimising number of generated cases |

Use medians/ranges only with denominators and source conditions. Separate assisted and unassisted observations, abandoned and completed sessions, first and repeat attempts. Report small samples as descriptive evidence; do not claim causal retention gains. The owner's data-first difficulty approach remains in HUMAN_TODO q-8 and docs/CALIBRATION.md.

## Accessibility and atmosphere acceptance

The product target is at least 44px controls, while WCAG's AA/AAA distinctions remain accurately labelled (S8/S9). Test 320/360/390/430px portrait, 844×390 landscape and desktop; 200% text; keyboard-only; meaningful headings and labels; focused status/error messages; reduced motion; forced colours where supported; and a fully muted path. No exclusive clue in sound, colour, hover, dragging or visual texture.

For the workbench, verify actual file-open offline operation, no network requests, all three classification values, citation selection, missing/wrong submissions, explicit next step, staged hints, explicit reveal, restart and story-mode parity. Focus after rerender must remain on a sensible control. Check adversarial authored strings such as `<script>` and `</script>` remain text and cannot run.

For live integration, additionally exercise existing save ownership/CAS, old and future revisions, concurrent tabs, navigation disposal, interrupted optional download, quota denial, backup preview/cancel/restore and update acknowledgement. Use synthetic fixtures in public artifacts. Physical TalkBack, audio comfort, touch feel and affected-Android recovery remain separate gates.

## Release and rights

No copied puzzles, glyphs, character designs, paid asset assumptions or external runtime fonts. Keep authored source/provenance and an editable master for media. Every release claim names exact source, content revision, tested artifact and remaining limits. A solver receipt does not grant rights; a hash does not confer official identity; an approved plan does not prove implementation.
