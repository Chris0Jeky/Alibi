# Alibi local-first review: 23 September 2026

**Status:** draft decision candidate, not an accepted ADR or a sync implementation.
Relates to #282; PR #281 remains subject to a maintainer architecture skim.

## Spoken summary

Alibi already has device-local play, revision-conditional saves and player-owned backups.
Keep those contracts. A future sync service must preserve conflicting boards as alternatives,
not silently combine hypotheses or choose a timestamp winner. No accounts, server, outbox or
replication library are introduced by this proposal. The useful next step is to exercise recovery
and conflict drills against the existing implementation, then decide whether users need sync.

## Scope and provenance

The original scout commit `4ab1f9ae456bc9a4617c6e31d47c2c307f8161d2` referenced ADRs and
acceptance files under a machine-local handoff directory. Those files are not reviewable from
this repository. This revision replaces those pointers with the Alibi-specific candidate and
acceptance matrix below; it does not claim to recover or approve the absent originals.

The cross-repository Taskdeck and Action Stack proposals belong in their own repositories.
Their issue numbers and alleged implementation status are not acceptance evidence for Alibi.
The prior scout's broad "2026 LWW practice" claim is not used to justify a decision here.

## Existing authority

[Architecture and invariants](../ARCHITECTURE.md) remains authoritative, especially **Save
transaction model**, **Backup and restore**, and **Offline release coherence**. This proposal
was reconciled against source snapshot `bda28b1dad5ec500808ef758ed1d05c0425868e2`.

- A run is pinned to `id@revision` and carries its own definition. Application, content and
  database versions are separate identities.
- IndexedDB writes compare an expected revision in a transaction. Stale writers stop rather
  than reporting success. localStorage and session fallbacks are labelled and do not claim the
  same atomic restore or cross-tab guarantees.
- Backups are player-controlled, unencrypted JSON. Validation precedes admission; replacement
  requires confirmation and an IndexedDB pre-restore copy. Application-file refresh must not
  erase player databases.
- Future authenticated sync and its outbox are a design direction, not a shipped service.

## Candidate ADR-PLF-04: retain local authority

**Decision proposed:** reaffirm the existing architecture without adopting a replication runtime.
Offline play and independent export remain available without an account. Do not introduce cloud
credentials into the static client or infer consent from installing or opening the application.

Before any later sync implementation is approved, its separate proposal must specify user
identity and authorization, revision-conditional writes, bounded requests, idempotent retries,
an explicit local outbox, deletion/retention policy and failure recovery. The outbox is future
work, not something this document asserts already exists.

Concurrent puzzle boards remain two alternatives until the player resolves them. Never merge
contradictory hypothesis cells automatically or use last-write-wins timestamps as the whole
conflict strategy. Add-missing backup import is not a cell-level merge.

**Trade-off:** retaining separate alternatives costs UI and storage work, but preserves what each
player actually entered. A general CRDT library does not establish the meaning of a valid puzzle
board. No library evaluation, runtime dependency or multi-device guarantee is authorized here.

## Acceptance matrix

These are review/drill requirements, not checked-off release claims. Use synthetic saves in a
disposable profile; never run destructive drills on a player's only copy.

| Drill | Expected observation | Existing evidence entry point |
| --- | --- | --- |
| Stale writer in two tabs | Losing writer stops and offers export/reload; winning save remains unchanged | `tests/storage.test.cjs`, `tests/club-storage.test.cjs`, `tests/browser_origin.py` |
| IndexedDB unavailable | Storage mode is labelled; fallback does not claim transactional replacement | `tests/storage.test.cjs`, `tests/club-storage.test.cjs`, `tests/browser_origin.py` |
| Invalid or interrupted backup import | No invalid partial admission; original save remains available | `tests/app-backup-import.test.mjs`, `tests/browser_backup_import.py`, `tests/browser_backup_worker.py` |
| Explicit replacement and recovery | Confirmation precedes replacement; independent export and pre-restore recovery remain usable | `tests/browser_origin.py`, `src/storage.js`, `src/backup-validation.js` |
| Offline/update/retry | Existing run survives an explicit update; refresh affects app caches, not player databases | `tests/browser_update.py`, `tests/browser_boot.py` |
| Unknown newer data version | Compatibility stop instead of an apparently empty alternative save store | `tests/storage.test.cjs`, `tests/browser_origin.py` |
| Future remote conflict | Two alternatives, explicit resolution, authorization and idempotent retry | Not implemented; requires a separate design and tests before enabling sync |

Record source SHA, target/flavor, browser/device, storage mode, command, result and limitation
for each executed drill. Receipts must omit backup contents, notes, personal URLs, credentials
and persistent user identifiers. Store only synthetic IDs and minimal pass/fail evidence.

Source-only proving loop:

```sh
node --test tests/storage.test.cjs tests/storage-revision.test.cjs tests/club-storage.test.cjs tests/club-revision.test.cjs tests/app-backup-import.test.mjs
```

The maintenance session ran this command: 13 tests passed. That is not a multi-device, physical
Android or recovery-release acceptance. For built HTTP checks, use the existing full verification
and browser workflow; record its exact source/head rather than borrowing an unrelated green run.

## Maintainer review and non-goals

- [ ] Confirm this restates, rather than replaces, `docs/ARCHITECTURE.md`.
- [ ] Review the proposed future conflict/consent boundary before accepting ADR-PLF-04.
- [ ] Record any newly executed browser/device drills separately from source-only tests.

No code, schema migration, CI changes, account service, cloud deployment, CRDT rollout, queue
product, design-system work, automatic merge authority or closure of human/device gates.
Do not close #282 solely because this research document exists.

## Background reading from the original scout

These links are retained as optional reading, not as verification of current APIs, costs or
product capabilities. The local contracts and tests above carry this proposal's evidence.

- https://www.inkandswitch.com/essay/local-first/
- https://electric.ax/docs/sync/guides/writes
- https://doc.replicache.dev/concepts/how-it-works
