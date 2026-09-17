# Discovery receipts and cross-game entitlements

Status: pure reducer contract plus an unwired central IndexedDB compare-and-swap adapter for issue
#30. The adapter is emitted as a hashed hosted-release asset, but no player route, save, backup,
reward surface or standalone loader invokes it yet.

## Why this boundary exists

Alibi currently has several deliberately separate persistence domains:

- the cabinet uses `alibi-device` version 1 with `runs`, `packs` and `meta` stores;
- the Games Room uses `alibi-afterhours-v1`;
- Quiet Wing uses `alibi-quiet-wing-v1`;
- registered challenges use `alibi-challenges-v1`;
- Castle has its own notebook and recovery boundary.

Those stores already serialize writes, retain recovery data and protect unknown or future records.
They do not share a transaction. A reward system must therefore avoid pretending that a completion
in one database and an unlock in another database can commit atomically.

`src/discovery-entitlements.js` defines the pure part of that problem. It accepts validated source
registrations, durable receipts and entitlement definitions, then returns a complete next state.
It has no DOM, clock, network, database or game-engine dependency.

## Stable identities

Five identities stay separate:

| Identity | Example | Changes when |
| --- | --- | --- |
| Semantic source | `catalogue:scene-01` | the activity itself becomes a different source |
| Content revision | `alibi-starter:scene-01@2` | the published definition is revised |
| Receipt | `receipt:catalogue:scene-01` | never for retries or later revisions of the same source |
| Entitlement | `cosmetic:observatory-brass` | the owned capability or cosmetic is different |
| Delivery grant | `grant:cosmetic:observatory-brass` | never for retries of the same entitlement |

App versions, build hashes, run IDs, save revisions and database versions are not substituted for
these identities. Editorially revising a puzzle cannot mint the same reward again.

## Version-1 records

Every interpreted record has `schema: 1` and rejects unknown fields. A future record is preserved by
its storage owner and is not normalized into version 1.

### Source registration

A source registration names one semantic activity and the exact content revisions that may prove it.
Each revision carries a build-generated content key and a deterministic definition fingerprint.

```json
{
  "schema": 1,
  "sourceKey": "catalogue:scene-01",
  "kind": "catalogue",
  "authority": "official",
  "packKey": "alibi-starter",
  "contentId": "scene-01",
  "rewardEligible": true,
  "revisions": [
    {
      "schema": 1,
      "revision": 1,
      "contentKey": "alibi-starter:scene-01@1",
      "definitionFingerprint": "0123456789abcdef0123456789abcdef"
    }
  ]
}
```

`authority: "local"` and `kind: "local-import"` are always ineligible. A local pack may retain its
own receipt for history, but it cannot satisfy an official entitlement. Legacy catalogue bootstrap
also requires `authority: "official"`; registered challenge or story sources need their own committed
receipts. The fingerprint prevents an edited local copy with a reused ID and revision from passing
bootstrap. It is an integrity and identity check, not a secret or competitive anti-tamper mechanism;
Alibi is a static local app.

### Discovery receipt

A receipt is append-only evidence that one semantic source occurred. Its timestamp is supplied by
the validated source record; the reducer does not read the clock.

```json
{
  "schema": 1,
  "receiptKey": "receipt:catalogue:scene-01",
  "sourceKey": "catalogue:scene-01",
  "contentKey": "alibi-starter:scene-01@1",
  "revision": 1,
  "occurredAt": "2026-09-01T09:00:00.000Z",
  "evidence": {
    "schema": 1,
    "kind": "first-completion",
    "recordKey": "scene-01@1"
  }
}
```

Duplicate or out-of-order copies reduce to one canonical receipt. A later content revision retains
the same receipt key, so retries, restore replay and editorial revisions remain idempotent.

### Entitlement definition and prerequisites

An entitlement has one category and a bounded prerequisite tree. Version 1 supports a registered
source, `all` and `any`. Groups are non-empty, deduplicated, sorted and limited in width and depth.

```json
{
  "schema": 1,
  "entitlementKey": "room:archive",
  "category": "room-access",
  "prerequisite": {
    "schema": 1,
    "op": "all",
    "terms": [
      {
        "schema": 1,
        "op": "source",
        "sourceKey": "catalogue:scene-01"
      },
      {
        "schema": 1,
        "op": "source",
        "sourceKey": "challenge:bellweather-observatory"
      }
    ]
  }
}
```

The categories are `evidence`, `room-access`, `cosmetic` and `skill-progress`. Entitlements never
become receipts. Granting a cosmetic therefore cannot fabricate story evidence, unlock a room or
advance a skill prerequisite.

### Reducer state and durable outbox

The state contains the receipt ledger, permanent ownership and unacknowledged delivery grants:

```json
{
  "schema": 1,
  "generation": 4,
  "receipts": [],
  "owned": [],
  "outbox": []
}
```

`apply` requires the caller's expected generation. It validates and merges receipts, evaluates each
entitlement once, and adds ownership plus an identical outbox grant in the same returned state.
`acknowledge` removes only a delivered outbox entry. Ownership and receipts are never removed by an
acknowledgement, source retirement or definition removal.

The deterministic grant timestamp is the latest timestamp among the prerequisite receipts that
actually satisfied the definition. An `any` prerequisite chooses the smallest satisfied witness by
explicit UTF-16 code-unit order, so browser locale and input ordering cannot alter the state. The
maximum aggregate witness is bounded to the same 32 receipts accepted by a grant.

## Central metadata compare-and-swap

`AlibiDiscoveryStorage.compareAndSwapMeta(store, key, expectedGeneration, value)` is the transaction
owner for one versioned record in the existing `alibi-device` `meta` store. It clones the proposed
value before asynchronous work, then performs the read, schema/generation comparison and replacement
inside one IndexedDB `readwrite` transaction. A stale tab receives `GenerationConflictError`; a
malformed or differently versioned existing record receives `ProtectedRecordError` and remains
unchanged.

The adapter refuses the local-storage and in-memory fallbacks instead of presenting a sequential
read/write as cross-tab safety. Real-browser acceptance opens two same-origin tabs against the same
IndexedDB, explicitly loads the adapter, races generation-two writers, proves exactly one commit,
then verifies stale retries, future-schema records and malformed records cannot replace the committed
bytes. The Node fallback contract proves a refused CAS does not create central state.

`src/discovery-storage.js` is minified into a content-hashed asset, included in the release fingerprint
and offline service-worker shell, and exposed through `ALIBI_DISCOVERY_STORAGE_URL`. It is deliberately
absent from the initial JavaScript bundle, preserving the cabinet's startup budget while the feature
has no runtime consumer. The standalone HTML does not load this adapter yet and must not be described
as discovery-ready.

This remains a generic storage adapter. It does not choose the production metadata key, run the
discovery reducer, derive receipts or deliver grants.

## Proposed persistence sequence

The central owner should be a versioned discovery record in the existing `alibi-device` `meta` store.
The dedicated compare-and-swap adapter now supplies the required single-database transaction, but
runtime wiring should land only with backup/restore coverage and a proven idempotent target adapter.

A delivery adapter should follow this sequence:

1. Read and validate the central state and its generation.
2. Derive source receipts only from validated committed records in their owning domain.
3. Run the pure reducer.
4. CAS-write the whole receipt/ownership/outbox state as one central transaction.
5. Deliver each outbox grant to its target domain using the stable `grantId` as that domain's
   idempotency key.
6. After the target domain confirms its durable write, CAS-acknowledge the outbox grant.

A crash before step 4 leaves the prior state unchanged. A crash between steps 4 and 5 replays the
outbox. A crash after target delivery but before step 6 repeats the same grant ID, which the target
must recognize without duplicating inventory. No step claims a cross-database transaction.

Storage quota, blocked transactions and version conflicts must keep the previous bytes intact and
leave the outbox pending. Delivery code must not acknowledge first and attempt the target write
later.

## Legacy cabinet bootstrap

`bootstrapCatalogueReceipts` inspects existing version-1 cabinet runs. It emits a receipt only when:

- `firstCompletedAt` or `completedAt` already exists;
- the saved puzzle ID and revision match a registered official catalogue source;
- the complete saved puzzle snapshot has the registered definition fingerprint; and
- the source is reward eligible.

It chooses the earliest retained completion for a semantic source and never invents moves,
activities, timestamps or historical discoveries. Unknown run schemas, unsolved records and edited
copies are skipped without modifying their saves.

## Bounded behaviour

Version 1 caps source registrations, source revisions, receipts, definitions, grants, prerequisite
width, depth, aggregate witnesses and bootstrap runs. It rejects malformed provenance, duplicate
identities, stale expected generations, mismatched outbox entries, future schemas and unknown fields
before changing the caller's objects.

The focused contract suite covers:

- exact legacy bootstrap and edited-import exclusion;
- duplicate, replayed and out-of-order receipts;
- content revision changes without duplicate ownership;
- deterministic `all` and `any` witnesses;
- category separation and local-source ineligibility;
- stale-tab conflicts and idempotent acknowledgement;
- removed content without revocation;
- future-schema, unknown-field and provenance rejection;
- input and expression bounds with caller immutability; and
- real two-tab IndexedDB CAS, unsafe-fallback refusal and protected-record preservation.

## Work still required before player use

This foundation deliberately does not close issue #30. Follow-ups must generate the official source
registry from the build catalogue, register challenge/story sources, choose the production metadata
key, add a reviewed hosted/standalone loader at the actual runtime boundary, include discovery state
in bounded backup and restore, fault-inject real IndexedDB quota and interruption cases, and implement
at least one idempotent target-domain delivery. UI, rewards and narrative content should wait until
those persistence proofs pass.
