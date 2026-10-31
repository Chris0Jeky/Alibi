# Shared signal — shared-signal-1

One original fictional, untimed two-dossier experiment for #451. Serve this directory over local HTTP; `index.html?role=archive`, `?role=field` and `?role=solo` use exactly the same revisioned source cards in `case.mjs`. The solo sheet combines both roles without extra evidence. This directory is excluded from the app release and has no startup registration, storage, database, backup, network, telemetry or dependency change.

The standalone browser preview holds only in-page work. Pause/resume retains it; restart, reload or a change of dossier clears it. After the first load it can be used without a network, but it supplies no service worker or offline navigation guarantee. Print the current player sheet with its print button; screen controls, feedback, hints, reveal and facilitator links are omitted. `facilitator.html` is the separately versioned solution. Role separation prevents casual spoilers, not access by a curious reader or developer tools.

## Source and formalization

All wording and the signal case are original for this repository; no external puzzle, art or named fictional canon is incorporated. The product treatment comes from `docs/research/POSTERN-2026-09/CASES.md` section 6 and architecture ADR6. Rights follow the repository licence. Revision 1 has five source cards:

| Card | Status                                             | Formal content                             |
| ---- | -------------------------------------------------- | ------------------------------------------ |
| A0   | Superseded, never installed                        | Context only; refused as a current premise |
| A1   | Installed calibration B, 6 May, applies 7 May bell | `pulse = (upper != lower)`                 |
| A2   | Installed branches B, same bell                    | `quay + yard = pulse`, with Boolean values |
| B1   | Observation, 7 May bell                            | `upper != lower`                           |
| B2   | Observation, same bell                             | `yard = false`                             |

`model.mjs` enumerates all 32 states of upper/lower shutters, pulse, Quay and Yard. Only current cited premises filter worlds. A supported claim holds in every nonempty remaining world; refuted means false in all; uncertainty preserves true and false witnesses. Invalid evidence and zero worlds are unavailable. The player's proposed verdict/explanation never filters the worlds. Hints teach source selection and quantifiers; an explicit reveal shows only consequences of the selected evidence, not the unseen dossier.

The joint conclusion is Quay on, with upper/lower orientation undecidable. Every current card is necessary for Quay. A0 is a distinguishable historical plan, not an unmarked red herring or an alternate installed rule. The separately versioned facilitator solution gives the dependency chain and two countermodels. Independent editorial/formalization review remains necessary: enumerating a mistaken translation would not repair its wording.

## Proof and limits

`node --test --test-concurrency=1 tests/two-dossiers.test.mjs` checks an independent truth-table oracle over all 32 worlds and all 16 current citation subsets, invalid input, contradiction, current-versus-superseded evidence and false certainty. `tests/browser_two_dossiers.py` exercises actual controls, 320/390/1440 layouts, role isolation, equivalent story modes, pause/focus, hints/reveal, restart/reload and printed output. It preserves source hashes, PNG/ARIA and PDF files. CI supplies the browser; no local substantial job is implied.

Machine proof and simulated print do not establish a physical printer result, TalkBack, role balance or useful conversation. The consented split-versus-solo comparison must include confusion, accessibility, explanations and contrary outcomes. Use separate participants or explicitly document counterbalancing/carry-over. Do not contact, record or transmit participant information automatically. Stop before transport if splitting evidence adds only transcription or waiting. #451 remains open for human evidence and a separate promotion decision; existing release, sharing, native and human-learning gates stay open.
