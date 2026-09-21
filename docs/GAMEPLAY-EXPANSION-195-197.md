# Lantern Gardens and Archive Heist expansion

Status: source candidate tracked by PR #201 for issues #195 and #197.

## Additive content

- Lantern Gardens adds `garden-7`, `garden-8`, and `garden-9` without changing the six published IDs or revisions.
- Archive Heist appends rooms 7–9 without changing the first six numeric save identities, the replay schema, or the warehouse engine contract.
- Existing saves, undo/redo histories, records, and local backups remain compatible.

## Mechanical evidence

- An independent connected-region enumerator requires exactly one solution for every Garden board and checks authored solutions against it.
- The bounded Archive solver confirms every room is solvable and that each added room has a longer shortest walking plan than the original six.
- A separate minimum-push search pins the added Archive rooms at 7, 8, and 11 pushes, proves a strictly increasing sequence, and proves the final room exceeds every original room's minimum.
- Chromium coverage traverses all nine Gardens at 320px, 390px, and 1440px, including touch-target geometry, panning, undo, and contained layout.
- Chromium coverage completes all nine Archive rooms through production movement controls, reopens/restores the final room through undo/redo, and confirms standard restart confirmation clears only that selected new room.

These are mechanical progression and control claims, not human-calibrated difficulty labels. Physical-device touch, TalkBack, sustained comfort, and human difficulty acceptance remain tracked in `HUMAN_TODO.md`.
