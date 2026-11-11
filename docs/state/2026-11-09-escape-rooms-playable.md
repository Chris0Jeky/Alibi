# Escape rooms playable in the Castle, 9 November 2026

The six authored rooms in `content/escape-rooms/` are playable inside the shipped Castle as an
experimental, session-only route. Refs #467 (mounting), #469 (hints, partial), #470 (controls,
partial), #471 (untimed baseline). Durable escape saves are not part of this slice.

## What a player gets

- Castle navigation gains **Experimental escape rooms** (`#/quiet/castle/case/escape`). The list
  page and every room say: "Experimental. Untimed. Escape progress is not saved yet: it lasts until
  you reload or close Alibi."
- Each room (`#/quiet/castle/case/escape/<room-id>`) shows its intro, an inventory line, every
  visible object as a button with its current actions underneath (list path), and Undo, Restart
  room (confirmed in a dialog) and a link back to all rooms. Story on/off follows the Castle
  preference.
- An object button opens Castle's own dialog (`show()`), with the same action handles as the list,
  the inventory and a per-action hint ladder (Orientation, Constraint, Method; one stage per press,
  session-only). Castle's `close()` returns focus to the object button. Answer fields keep drafts
  after a wrong answer, accept Enter, and are capped at 64 characters.
- No clock exists (#471 baseline). There is no worked answer: the room `solution` text reveals
  every later step, so it is not shown.

## How it is built

- `src/castle/escape-player.mjs` bundles the player, `escape-room.mjs`, `tools/escape-session.cjs`
  / `escape-state.cjs` and the six JSON sources into `./assets/escape/rooms.<hash>.js` via
  `tools/build-castle.cjs`. It is imported only from the Castle `case` route when the route id is
  `escape`, is not in the Castle pack `files` (13 precached files unchanged) and has its own
  88 KiB budget. `escape-authoring.cjs` (the proof) is not in any player bundle.
- `src/castle/view.mjs` changes: one nav link, the lazy URL key, and `show`/`close` passed to the
  mounted module. The player handles only `escape-*` controls on the shadow root; Castle's own
  dispatcher ignores them.
- Host changes in `src/castle/escape-room.mjs`: `undo`/`restart` are token-guarded like `act`; the
  view carries each offered action's authored hints; the inspector no longer renders "Keep a note"
  (it would have written escape text into the Castle save).
- `src/castle/art.mjs` now imports the shared `escape()` from `html.mjs` instead of an identical
  copy, which paid for the Castle script additions.

## Budgets

| Asset | Before | After | Ceiling |
| --- | --- | --- | --- |
| Castle script (`quiet-castle.<hash>.js`) | 101,080 | 101,060 | 101,120 (unchanged) |
| Escape module (`escape/rooms.<hash>.js`) | none | 86,261 (16,714 gzip) | 90,112 (new) |
| `build-info.json` `castleBytes` | 1,323,654 | 1,409,895 | none |

No ceiling was raised. Initial app bundles are unchanged.

## Verification

- `node --test tests/castle-escape-room.test.mjs tests/castle-escape-host.test.mjs tests/castle-assets.test.cjs`:
  adapter invariants over all 648 reachable states (list/inspector equivalence, no-op unoffered
  handles, no item cloning, hidden-object stale handles, revision mismatch, A/B/A tokens), plus new
  token-guarded undo/restart, wrong-answer and unoffered-item-use no-ops, per-action hint ladders,
  a static session-only check, and the escape asset contract.
- `tests/browser_castle_escape.py` against the built origin at 320x740 and 844x390: opens the
  experimental entry, wrong answer keeps draft and changes nothing, hint ladder, Enter submits,
  handle moves cabinet to hand once, dialog close returns focus to the object, A/B/A hash changes
  plus a forged old route token are refused, undo, completes Tidekeeper's Workshop through list and
  inspector controls, every control is named and at least 44px tall, the Castle IndexedDB record is
  byte-for-byte unchanged, and reload starts the room fresh. A mutation that removed both token
  guards made this test fail.
- Full results are in the closeout for this branch.

## Not verified

Physical phones, screen readers, forced colours, 200% text, reduced motion (no motion is added),
offline play of the escape module (it is not precached), the five other rooms through the browser
(they share the same code path and are covered by the Node all-state suites), hosted responses,
and human playtesting, spoiler review or difficulty calibration. The hint-ladder getter-trap and
every-reachable-state reference acceptance in #469 are not claimed.
