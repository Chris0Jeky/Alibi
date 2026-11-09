# Eclipse Lab

Eclipse Lab is a separately loaded set of Sun & Moon experiments. Open **Eclipse Lab** in the navigation or follow the link in **Workshop**. The direct route is `#/quiet/eclipse`. These 32 experimental levels are separate from the official puzzle catalogue, achievements and Cabinet saves.

## What changes between games

Every mode has eight levels: four 4×4 boards followed by four 6×6 boards. Sun means 1 and moon means 0 in the source data; the player uses named symbols, not a colour-only distinction.

| Experiment | Rules | Main deduction |
| --- | --- | --- |
| Constellation | Equal suns and moons in every line; no three consecutive equal symbols; distinct completed rows and columns; marked same/opposite neighbours. | Follow implications through linked cells and combine them with line limits. |
| Eclipse | Constellation rules plus exact sun counts in marked 2×2 windows. | Combine overlapping local windows with whole-line constraints. |
| Harbour | Specified sun totals for every row, column and marked window. Triples and repeated lines are allowed. | Compare overlapping sums and use differences between regions. |
| Switchback | Equal suns and moons in each line, plus exact counts of adjacent symbol changes. Triples and repeated lines are allowed. | Reason about runs, boundaries and the remaining number of changes. |

Solved levels carry a check mark in the level list, including after reloading or restoring a backup. The complete rules and textual clues remain visible beside each board. These combinations are experiments, not claims of a newly invented puzzle tradition. See [the research note](research/2026-11-09-eclipse-lab.md) for sources and the alternatives considered.

## Controls

Choose a Sun, Moon or Clear brush and select a cell. Arrow keys move within the board; S, M and Backspace apply a named mark, while Enter or Space cycles a cell. Fixed clues can receive focus but cannot be edited. Undo and Redo retain up to 40 moves, and restarting a level is itself undoable.

**Preview linked group** outlines every cell connected to the selected cell. **Fill linked group** applies the chosen symbol and its implications as one undoable move; fixed clues cannot be overwritten. Selecting a textual clue outlines its cells. No dragging is required.

**Check** evaluates the active constraints. **Hint** derives a forced mark from current clues and entries; it does not read the supplied solution. A wrong assumption may leave no available local hint, and a complete board must still pass all rules.

## Ratings and feedback

Each level accepts an optional enjoyment rating from 1–5, a difficulty impression and a note of up to 2,000 characters. **Save feedback** keeps this on the current device. Unsaved drafts survive navigation within the app and must be saved or discarded before a software update or export.

On the primary Alibi site, **Review and send saved feedback** opens the existing Voices composer with the saved experiment ID, revision, mode, rating, difficulty and note. Review or edit the message, then press **Send** to submit it to the maintainer through Pulseboard. Opening or canceling the composer sends nothing; editing its text does not rewrite the saved Lab note. Save or discard a local draft before opening it. If the note plus experiment details exceeds the message limit of 2,000 characters, the Lab explains how much to shorten and preserves the complete note.

These are ordinary feedback messages in the maintainer's Voices inbox, not the official-puzzle rating survey. They carry no survey identity and use an empty official-puzzle subject. The composer also shows the app version, screen and device class. Existing [Voices delivery and retention](FEEDBACK-AND-SURVEYS.md) apply: up to 20 explicit submissions may wait on the device for up to 30 days; accepted feedback is retained by Pulseboard for 365 days. This is client behavior, not evidence of a new production deployment or live collector acceptance.

**Share feedback on GitHub** opens a prefilled issue containing the saved experiment ID, revision, mode, rating, difficulty and note. Review and submit it yourself; GitHub sign-in is required. The link does not include board entries, save histories or recovery data, and clicking Save feedback never uploads anything. The separate Lab backup also includes saved feedback for a private record or manual sharing.

The direct-send button is absent from previews, the fallback origin, standalone files and Android. Those copies retain the explicit GitHub handoff and local backup options.

Difficulty labels are provisional. Automated uniqueness checks establish a single answer under the implemented rules; they do not establish enjoyment, teaching quality or a human difficulty ranking. Player reports should guide changes before any experiment becomes an official family.

## Saves, recovery and offline play

The Lab uses its own bounded record, `alibi.eclipse.v1`. **Export lab backup** and **Review lab backup** are scoped to the Lab. The combined Cabinet/Club/Wing/castle backup does not contain it. Restoring requires a preview and confirmation, checks that the current save has not changed, and retains a recovery copy.

Unknown, malformed or future save data is preserved. If storage is blocked, Web Locks are unavailable, another tab changes the record, or a bounded save limit is reached, the Lab either retains the edit in an explicitly labelled session or refuses it before acceptance. Export session work before closing the page. A backup of protected data retains the original bytes; restoring it does not silently discard them.

The one hashed Lab asset is downloaded on entry and cached separately. Wait for the offline status before disconnecting. It contains the controls, styles, rules and all 32 levels, so the Lab can reopen through the existing application service worker without installing a second service worker or downloading the larger Quiet Wing assets.

## Implementation and verification

- `src/eclipse-lab/model.mjs`: strict definitions, constraint checks, bounded solver, local hints and linked-cell operations.
- `src/eclipse-lab/puzzles.mjs`: pinned level definitions and explanatory lessons.
- `src/eclipse-lab/storage.mjs`: validation, serialization, write locks, conflict detection, exports and recovery.
- `src/eclipse-lab/player.mjs`, `style.css`, `entry.mjs`: controls, local feedback, preferences and the optional activity lifecycle.
- `src/eclipse-lab/feedback.mjs`: admission-checked adapter for reviewing saved impressions in Voices; it never reads board, answer or recovery fields.
- `tools/build-eclipse.cjs`: one self-contained asset with a separate 64 KiB uncompressed ceiling. Existing startup and core-shell limits remain unchanged.
- `tests/eclipse*.test.*` and `tests/browser_eclipse_lab.py`: independent uniqueness, poisoned-answer hint checks, save boundaries, keyboard control, phone layout, feedback, restore and offline reloads.
- `tests/browser_voices.py`: intercepted collector checks for the Lab composer, explicit-send payload, draft freshness, limits, origin admission and focus at 320/390/1280px. This is not a live collector receipt.

The browser workflow checks the precise pull-request head and retains source/tree identifiers, the build receipt and screenshots. Physical Android, TalkBack and human enjoyment/difficulty assessment remain separate release and playtest work.
