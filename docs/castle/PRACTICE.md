# Castle practice shelves

The Cabinet’s bundled official catalogue currently contains 328 definitions across thirteen
families. The practice adapter gives Wrenmere a small, read-only view of that catalogue. It reads
committed Cabinet runs, keeps only an exact official ID, revision and definition match, and returns
room counts and three curated starter shelves. It never passes a raw run, board state, note,
solution, hint count or custom pack to Castle.

## Stable room bindings

Every official definition is revision 1 at this release. The three shelves below are real bundled
definitions; their provisional editorial difficulty is Gentle. The `nonogram` family uses the
Portrait Gallery’s existing `picture` atlas family as its room alias.

| Cabinet family | Castle room | Starter shelves |
| --- | --- | --- |
| aquarium | `kitchen` · The Old Kitchens (planned) | `curated-aquarium-01@1`, `curated-aquarium-02@1`, `curated-aquarium-05@1` |
| binary | `observatory` · The Observatory | `curated-binary-01@1`, `curated-binary-02@1`, `curated-binary-05@1` |
| bridges | `bridge` · The Seven-Arch Bridge (planned) | `curated-bridges-01@1`, `curated-bridges-02@1`, `curated-bridges-05@1` |
| dossier | `library` · The Long Library | `curated-dossier-01@1`, `curated-dossier-02@1`, `curated-dossier-05@1` |
| futoshiki | `inequality` · The Balancing Hall (planned) | `curated-futoshiki-01@1`, `curated-futoshiki-02@1`, `curated-futoshiki-05@1` |
| lightup | `orangery` · The Glass Orangery | `curated-lightup-01@1`, `curated-lightup-02@1`, `curated-lightup-05@1` |
| network | `workshop` · The Clockmaker’s Workshop | `curated-network-01@1`, `curated-network-02@1`, `curated-network-05@1` |
| nonogram | `portrait` · The Portrait Gallery (planned) | `curated-nonogram-01@1`, `curated-nonogram-02@1`, `curated-nonogram-05@1` |
| scene | `dining` · The Long Dining Room (planned) | `curated-scene-01@1`, `curated-scene-02@1`, `curated-scene-05@1` |
| sudoku | `number` · The Number Cabinet (planned) | `curated-sudoku-01@1`, `curated-sudoku-02@1`, `curated-sudoku-05@1` |
| tents | `orchard` · The Old Orchard (planned) | `curated-tents-01@1`, `curated-tents-02@1`, `curated-tents-05@1` |
| trail | `cartography` · The Map Room | `curated-trail-01@1`, `curated-trail-02@1`, `curated-trail-05@1` |
| witness | `study` · The Keeper’s Study | `curated-witness-01@1`, `curated-witness-02@1`, `curated-witness-05@1` |

“Planned” describes the Castle room state. Its named shelves can be shown as a preview and can
open the official Cabinet puzzle, but they do not imply that the Castle room investigation exists.
The adapter’s return context goes to that room when it is implemented and to the Castle directory
for a planned room.

## Host contract

`AlibiActivities.enter()` forwards the Cabinet-owned adapter to the Castle mount as
`options.practice`:

```js
{
  snapshot: async () => ({
    rooms: {
      [roomId]: {
        family, label, completed, total,
        starters: [{ id, title, completed }],
        detail, implemented,
      },
    },
    available,
  }),
  open: (officialIdOrRevisionKey, roomId) => boolean,
}
```

`completed` is the number of distinct official definitions in that family with a committed
completion. A `firstCompletedAt` marker remains eligible after a restart clears the current
`completedAt` marker. A current `completedAt` without history is accepted only when the host’s
engine confirms the saved state is complete. Repeated records, hints and retries do not create new
credit. Three distinct first official solves reveal one optional room detail; that detail is not
evidence and has no points, shared entitlement or economy.

Malformed records, unknown IDs, revision mismatches, custom definitions and definitions that differ
from the bundled official object are ignored. A committed-store read failure returns
`available: false`. Castle receives no private Cabinet notes or raw save records.

The Cabinet player keeps an in-memory return context for a practice launch. Its “Return to
Wrenmere” control uses an internal `#/quiet/castle/room/<roomId>` or
`#/quiet/castle/directory` route, and is cleared when the player leaves that puzzle. The root
sidebar also names Wrenmere Castle and links to `#/quiet/castle/map` without changing the default
route or player theme.

The remaining playtest decision is tracked in [`HUMAN_TODO.md`](../../HUMAN_TODO.md), q-6:
sample two puzzles per family and record wording, solve time and hint use. Physical Android and
TalkBack checks remain the human-owned q-2 and q-4 gates.
