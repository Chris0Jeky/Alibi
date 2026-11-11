# ADR: escape-room adapter for the Castle inspector (#467)

Status: accepted for the memory-only slice, 26 October 2026. Refs #461, #463, #467; #47, #442, #433.

## Context

Castle inspectables (`src/castle/objects.mjs`) are schema-1 records with `inspect` and `note`
actions only. They cannot represent a handle moving from cabinet to hand to winch. The
`postern-escape-1` model (`tools/escape-state.cjs`) already has finite state, availability, deterministic
effects, no-op wrong input and proven all-state recovery for six rehearsal rooms.

## Decision

`src/castle/escape-room.mjs` adapts an escape room to the Castle inspector instead of extending the
public authored-object format.

- **Stable IDs.** Every control carries a handle `room@revision/object/action`, built only from
  source IDs and the source revision. A handle from another room, an older or newer revision, a
  hidden object, an action not currently offered, or a mismatched object/action pair returns
  `stale` and changes nothing.
- **Objects.** Visible objects use the runtime inspector fields (`id`, `room`, `n`, `t`, `a`) plus
  current observations and actions, so `appendObservation` and Castle's notebook work unchanged.
- **Items.** A variable whose domain contains `held` is one portable item. The inventory is the items
  whose value is `held`. One variable holds one value, so an item has one location and cannot be
  cloned by repeated pickup or placement.
- **Two representations.** `roomMarkup` (list path, every visible object with its actions) and
  `inspectorMarkup` (one object's dialog body) render the same handles with Castle's `button` and
  `escape` helpers. The list's opener (`data-do="escape-object"`, `data-value=<object id>`) is the
  key Castle's existing `close()` uses to return focus while that object remains visible.
- **Navigation.** `createEscapeHost` keeps one session per room and issues a new token on each
  `enter`. A control rendered before the latest route change is refused, so A/B/A navigation
  cannot commit an earlier visit's action, and B's controls never act on A.
- **Reversibility.** Sessions reuse `tools/escape-session.cjs` (64-step undo, restart). Its new
  `state()` returns a copy and is read only to derive the inventory.

## Authority and boundaries

- Lifecycle and saves: the existing `CastleStore` from the completed #442 case-host work remains
  the only Castle save authority. This memory-only adapter writes nothing, so it cannot clear
  unknown saves or overwrite a concurrent edit. Escape-specific mounting and recovery acceptance
  remain with open #467 and must use the existing CastleStore and its current revision-pinned,
  compare-and-swap and import safeguards. Do not add a competing store or reopen #442.
- Source revision: room `id` and `revision`, with the existing SHA-256 source receipt from
  `escape-authoring.cjs` for authoring evidence.
- Bundles: `src/castle/entry.mjs` does not import the adapter. The Castle script measured 99,515
  bytes before and after this change, against its 101,120-byte ceiling. One room source alone is
  10-16 KB, so live delivery needs a separately fetched, offline-cached asset under #433, not a
  higher ceiling. The softlock proof (`escape-authoring.cjs`) never enters a player bundle.
- No change to published Castle rooms, Wrenmere content, the six room sources or their format.

## Mounted slice (9 November 2026)

The six rooms are playable at `#/quiet/castle/case/escape` behind the Castle navigation link
"Experimental escape rooms". `src/castle/escape-player.mjs` (player, adapter and six sources) is
built as its own on-demand module (`./assets/escape/rooms.<hash>.js`, 86,261 bytes, 88 KiB budget)
and is neither precached nor imported by the Castle script, which stays within its unchanged
101,120-byte ceiling. The player listens for its own `escape-*` controls and uses Castle's
`show()`/`close()` for the inspector and focus return. Progress, drafts and hint stages are
session-only module state; nothing is written to the CastleStore. The inspector's notebook control
was removed for that reason. Evidence: `docs/state/2026-11-09-escape-rooms-playable.md`.

## Remaining for #467

Durable escape progress and its recovery acceptance using the existing CastleStore authority
(revision-pinned, compare-and-swap and import safeguards), and offline delivery of the room module
under #433.
