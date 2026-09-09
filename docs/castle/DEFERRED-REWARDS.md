# Deferred rewards: one safe observatory vertical

Status: implementation plan for epic `#29` and its existing children `#30`–`#37`. This document does not close or edit issues and does not claim that the plan
is shipped. The copied source of the plan is `.castle-input/production-docs/design/DEFERRED-SYSTEMS.md`, with progression rules in
`.castle-input/production-docs/design/PROGRESSION-AND-QUESTS.md` and current Quiet Wing behavior in `src/quiet-wing/engine.js`, `src/quiet-wing/pets.js`,
`src/quiet-wing/pet-view.js`, `src/quiet-wing/folio.js`, and `src/quiet-wing/city.js`.

## Existing boundary

The Quiet Wing currently owns a schema-1 local state with a personal realm, pets, garden, calm games, field notes, and settings. `src/quiet-wing/engine.js`
exposes scene sizes 14, 20, and 28, six crop definitions, six pots, three bouquet slots, four named companions (`Miso`, `Fern`, `Pip`, `Nimbus`), and bounded
editing. The current `TYPES` registry includes existing buildings, terrain, castle modules, orchard, boat, bridge, and decorative objects. `pet-view.js`
presents three-dimensional pets when WebGL/assets work and has a procedural/vector fallback; it is a view, not a second state owner. `folio.js` keeps films
explicit and uses `preload="none"`.

Available now: local realm editing, existing object IDs/types, the six crops, bouquet arrangement, existing pet actions/bond fields, Field Notes, and explicit
film/portrait/companion presentation. Planned: cross-store receipts and outbox (`#30`), reproducible Blender masters and 2D fallback (`#31`), meaningful
companion roles (`#32`), reviewed new seeds/garden progression (`#33`), coherent kits/palettes (`#34`), bounded town expansion (`#35`), and full
backup/offline/accessibility acceptance (`#37`). `#36` is not part of the supplied deferred-system plan.

No planned reward may rewrite the authored castle map, replace a personal town, remove an existing object, make a companion solve a puzzle, punish time away, or
require an unskippable animation.

## The vertical: “Under the Dome”

This is a deliberately small observatory collection. A trusted official observatory completion creates one semantic event. A later player choice applies some or
all of its entitlements in Quiet Wing. The proposed names and art are editorial choices for implementation, not shipped assets.

```js
// bounded source event; generated only after a committed official completion
{
  schema: 1,
  eventId: 'castle:observatory:under-dome',
  eventVersion: 1,
  source: {
    system: 'castle',
    definitionId: 'clock',
    definitionRevision: 1,
    completionId: 'castle-clock-official',
  },
  semanticKey: 'wrenmere.observatory.under-dome',
  evidenceRefs: ['maintenance', 'ticket'],
  payload: { route: 'observatory', collection: 'under-dome' },
}
```

The event is valid only when `definitionId` and `definitionRevision` are in the trusted official registry and the completion is a committed official run. Guided
completion may count where the castle rule permits it. A custom pack, a decorative visit, a reset, or an unfinished pinned run cannot create this event.
`evidenceRefs` are bounded provenance references; they do not copy private notebook text into another store.

```js
// one idempotent target entitlement; ownership is separate from placement
{
  schema: 1,
  entitlementId: 'quiet:under-dome:telescope',
  semanticKey: 'wrenmere.observatory.under-dome.telescope',
  entitlementVersion: 1,
  sourceEventId: 'castle:observatory:under-dome',
  source: { system: 'castle', definitionId: 'clock', definitionRevision: 1 },
  kind: 'realm-kit',
  itemId: 'wrenmere-telescope',
  display: { name: 'Under the Dome telescope', description: 'A brass instrument with an indigo case.' },
  state: 'owned',
}
```

The first collection has four bounded, optional entitlements: `quiet:under-dome:telescope`, `quiet:under-dome:brass-indigo`, `quiet:under-dome:moonflower`, and
`quiet:under-dome:owl-lens`. The telescope and material are realm kit entries, the moonflower is a reviewed seed, and `owl-lens` is an optional companion
accessory. They are shown with source and ownership, then the player chooses whether to place, plant, or equip them. Ownership is durable; placement, planting,
and equipping are reversible local choices.

## Delivery, replay, and recovery

The castle completion commits before a delivery record is queued. The two local stores have no transaction spanning both databases; the implementation must say
“recoverable outbox”, never “atomic cross-store grant”.

```js
{
  schema: 1,
  outboxId: 'castle:observatory:under-dome->quiet',
  kind: 'entitlement-delivery',
  sourceStore: 'castle',
  targetStore: 'quiet-wing',
  sourceEventId: 'castle:observatory:under-dome',
  targetSemanticKey: 'wrenmere.observatory.under-dome',
  payload: { entitlementIds: ['quiet:under-dome:telescope', 'quiet:under-dome:brass-indigo'] },
  attempt: 0,
  state: 'pending', // pending | applied | blocked
}
```

The payload is a registry reference, not an unbounded copy of castle content. Proposed caps are 4 KiB per event or entitlement, 4 KiB per outbox payload, and 32
pending outbox entries. The Quiet Wing acknowledges the semantic event after its CAS write. A duplicate event ID, or an already-owned semantic key at the same
entitlement revision, is a no-op. The same event ID with a different payload is rejected and retained for diagnosis. An unknown future event/entitlement version
is preserved as protected raw data and not applied.

Import and replay rules:

1. Validate schema, IDs, revisions, source registry, bounds, and event/entitlement linkage before writing anything.
2. Apply an older backup as a merge that cannot remove newer ownership; preserve unknown fields and refuse unsupported future revisions.
3. Replayed exports and repeated retries are idempotent by `eventId` and `semanticKey`.
4. If Quiet Wing is unavailable, offline, or its write fails, leave `pending`; retry on the next eligible visit. Never mark `applied` on a timeout without a confirmed target write.
5. A two-tab race uses each store's existing CAS/revision behavior. The loser reloads and observes the winner's event, producing no second grant.
6. A bounded retroactive reconciliation may scan committed official completions once and emit the same event identity. It must exclude custom packs, decorative visits, and unfinished runs.

## Issue sequence and concrete acceptance

### `#30` — receipts and entitlements

Implement the pure validation/idempotency contract first. Keep completion identity, puzzle definition revision, app/build version, event version, and
entitlement version distinct. Test fresh completion, replay, same-event/different-payload rejection, old import, future-version protection, CAS race, and
retroactive official completion. Do not add a reward wallet or silently award an item while a player is only browsing the castle.

### `#31` — Blender masters and fallback

For the telescope and owl accessory, retain editable masters with deterministic part names, a documented Blender/exporter version, bounded geometry, named
materials, and short clips only where needed. Proposed caps per asset are 20,000 triangles, two 1024px textures, a compressed GLB of
512 KiB, and at most four clips of four seconds at 30 fps. The 2D fallback should be a reviewed
SVG/vector portrait under 50 KiB, using the existing layered style in `src/quiet-wing/pets.js`. The 3D viewer must pause on hidden pages and respect reduced
motion, as the current view does.

Acceptance is a real master opening in Blender, a deterministic export report, a phone-sized render, and a fallback render with the same labels and interaction.
No runtime dependency on Blender is allowed. The owner still chooses the final visual names, proportions, and licence/attribution.

### `#32` — one meaningful companion role

Start with Pip's proposed “reference keeper” role. After the player has read an already-earned observatory record, Pip can point to the relevant Field Note or
offer an observation prompt. Pip never supplies a solution, changes an answer, or gates the official story. Role progress is separate from affection, bond,
cosmetics, and puzzle completion. One committed distinct `companion-observation` event can grant role XP; repeated taps, reloads, and replays are no-ops. There
are no hunger, neglect, forced timers, or away-time penalties. Miso, Fern, and Nimbus names, progress, actions, and existing presentation remain intact.

### `#33` — reviewed seed and garden progression

Add `moonflower` only after its entitlement is owned. Proposed bounded seed metadata is:

```js
{
  id: 'moonflower', name: 'Moonflower', introducedBy: 'quiet:under-dome:moonflower',
  growthSeconds: 900, stages: 3, palette: ['indigo', 'cream'],
  visualDescription: 'A night-opening flower for the observatory kit.',
}
```

The current six pots, three bouquet slots, six existing crops, offline growth, reload behavior, and eight-hour elapsed-growth clamp remain the baseline. Growth
is deterministic and has no neglect penalty. The current validator rejects an unknown crop in a pot; a future migration must explicitly register a new crop
before accepting it, and must protect an unsupported import rather than silently converting it. Planting is explicit, previewable, and undoable through normal
garden actions; the authored castle memorial garden remains distinct from the player's personal garden.

### `#34` — coherent kit and palette

Register `wrenmere-telescope`, `brass-indigo`, and `owl-lens` as additive IDs. The kit may be placed in the personal realm or displayed in a Quiet Wing
presentation, never injected into the authored castle map. Preview shows footprint, support, contrast, and undo. Colour is never the sole identifier: each item
has a text name, icon/shape, and accessible description. Existing scene tiles, item IDs, palettes, and user placement order survive an import or expansion.

### `#35` — bounded city expansion

Treat expansion as an explicit user choice after the vertical, with a boundary preview and undo. The current sizes are
14, 20, and 28; the current scene's every tile and item ID must be copied forward. Expansion must preserve occupied
cells, stable building IDs, pets, garden state, and camera settings. It must never regenerate a personal town from a new random seed or overwrite the authored
Wrenmere geography. Proposed first cap is a 28×28 scene and 250 KiB serialized scene payload before a larger size is considered; measure actual device
performance before changing it.

### `#37` — integration, backup, and accessibility acceptance

Run the full matrix against fresh, migrated, exported, imported, offline, interrupted, and two-tab states. Include reduced motion, keyboard-only operation,
screen-reader labels, explicit film loading, absent optional media, and a phone-sized performance run. Verify duplicate delivery, old/future backups, failed
target writes, recovery after restart, and preservation of every existing object. Do not call simulated browser evidence physical Android/iOS acceptance.

## Privacy, performance, and human choices

Keep events and outbox records free of private Field Note text, account data, telemetry, or hidden analytics. A reward banner is dismissible, keyboard
reachable, labelled, and static under reduced motion. Proposed list caps are 256 entitlements and 64 KiB indexed ownership metadata; measure before raising
them. Keep the optional telescope media out of the automatic castle scene pack and load film/poster/captions only on explicit playback, matching the existing
media boundary.

Owner acceptance remains explicit for physical Android/iOS interaction, TalkBack/VoiceOver, reduced-motion comfort, sustained battery/performance, asset style,
Blender master quality, attribution/licensing, and whether the reward feels meaningful. Those are existing human acceptance responsibilities, not new permission
gates invented by this plan. The implementation sequence can proceed with simulated fixtures while recording each physical check as pending.
