# #433: atomic Workshop pack admission

## Scope and decision

The application checked pack IDs, puzzle IDs and its 3,000-puzzle limit against
one tab's in-memory catalogue, then unconditionally wrote the pack. A tab opened
before another installation could overwrite that pack or admit overlapping puzzle
IDs. The same gap affected manual imports, curated downloads and generated packs.

Move admission to the existing Cabinet Store. One packs read/write transaction
walks current records, validates their readable identities, checks the incoming
IDs and total against the official catalogue plus committed custom packs, and
adds the new record only after the checks succeed. A cursor avoids assembling a
second full catalogue in memory. The application publishes the pack after commit.

A preliminary database read followed by the old write would retain the race. A
second installed index would introduce another authority and consistency problem.
The existing pack store therefore remains authoritative; this is not the later
installed-status presenter requested by #433.

## Preservation boundaries

- Existing pack and puzzle IDs remain reserved, including deferred official
  listings. Unsupported schema or definitions, damaged records and mismatched
  stored keys refuse admission and remain unchanged. Same-schema extension metadata
  is ignored by the existing validator and the original record is preserved.
- Admission uses only the packs object store; it changes no runs, metadata, backup
  recovery or database version. Restore already uses a transaction including packs,
  so its writes serialize with admission. Existing write operations also receive
  the error-reporting correction described below.
- Input validation captures the candidate before asynchronous work. A failed
  transaction does not publish the pack in the tab. Write promises settle on the
  transaction's abort event so a bubbling request error cannot reject with a null
  transaction error before the abort supplies its terminal error.
- LocalStorage fallback cannot atomically coordinate tabs, so this path now
  refuses new persistent packs there. Existing local reads/exports and generic
  settings operations remain. Session-only packs retain their existing ephemeral
  per-Store behavior; checks and insertion do not yield.
- The bounded worker still validates rules and uniqueness before installation.
  Admission does not grant imported content official status.

## Evidence at preparation

The new stale pack-ID, overlapping puzzle-ID, simultaneous duplicate and stale
3,000-puzzle-limit regressions failed against the original application path.
The admission contract cases pass after the change, including preservation of
same-schema extension metadata and a quota error that bubbles before abort. Focused
storage regressions exercise the same error ordering for put, save and restore.
The queue fixture explicitly models ordering and abort; it is not a real IndexedDB
acceptance claim.

Existing source storage/Workshop ownership contracts pass. The first broader
test selection also included storage-bootstrap.test.cjs before a build existed;
that test failed for missing dist/assets, not a storage assertion. The clean
build/full verification and exact-head hosted gates are required before merge.

The existing actual-control fixture now keeps a second tab open before installs,
checks duplicate pack and puzzle refusal with complete stored-row equality, admits
an unrelated pack from that tab, reloads all installed packs offline, and verifies
preservation of a future-schema record at 320/1280 pixels. Existing download,
cancellation, retry, play, undo/redo and offline assertions remain. The fixture
compiles locally; browser execution is assigned to exact-head CI.

## Remaining work

#433 remains open for a truthful installed-status UI, broader old/future-definition
and restore acceptance, and constrained-device memory measurements. This change
does not synchronize every tab's displayed catalogue automatically. Reload reads
the complete committed pack set. Numerical budgets are unchanged. Physical
Android, TalkBack, player calibration and other owner gates remain in
HUMAN_TODO.md.
