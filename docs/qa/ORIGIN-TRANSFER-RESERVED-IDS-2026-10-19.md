# Origin transfer: protect the Challenge recovery namespace

## Scope and source

This bounded follow-up starts from PR #720 head
`58881d397b705853a3f202bb34655ebab6aae8fa`, origin-transfer source blob
`abff14a8514c5a0df13ff7cbb8dcdd5f3388b0b9`. It is intended for the still-draft
#579 feature branch after #720 merges, not directly for main.

The Challenge device reader and replacement-delete loop already exclude keys
starting with the exact case-sensitive `recovery:` prefix. The transfer shape
validator previously accepted those IDs, allowing imported rows to overwrite a
protected recovery record. The existing validator now refuses that prefix before
preview/confirmation, recovery retention or any save write. Export uses the same
validator and also refuses such rows. A shared local namespace helper keeps all
three checks consistent; the existing read/delete exclusions are unchanged.

The exported schemas, legitimate ID bytes and storage representation are
unchanged. IDs such as `recovery`, `recovery-01`, `xrecovery:note` and
`Recovery:case` retain their existing treatment. This is a namespace reservation,
not general Challenge semantic validation.

## Red and green evidence

`node --test --test-isolation=none tests/origin-transfer-reserved-ids.test.cjs`
against the unchanged exact-head source: two failures (preflight and export
accepted a reserved ID), two passing controls. After the fix, all four groups pass.

`node --test --test-isolation=none tests/origin-transfer*.test.cjs`: 37/37 pass.
The new tests execute the actual source and its public APIs. Checksum-valid
untrusted files are constructed independently of the exporter. Reserved IDs and
the existing empty-ID control reject before any read, retain, write or release;
legitimate IDs complete the confirmed coordinator flow without changing payload
bytes. A callback-based Challenge database fixture checks the actual device-port
read and replacement-delete behavior, including preservation of protected object,
null and empty-string records. It models these callbacks, not real IndexedDB
durability or cross-tab scheduling. No new browser run is claimed.

Pinned Prettier 3.9.6 and `git diff --check` pass.

## Budget evidence and qualification limit

The initial candidate's pinned esbuild 0.28.2, `minify: true`, `target: 'es2022'`:
source 16,268 → 16,357
bytes; isolated emitted module 8,905 → 8,919 bytes; isolated emitted gzip
3,106 → 3,114 bytes. No ceiling changes.

The exact-head hosted safety artifact `12213782576` has verified archive SHA256
`15b211e7fcef0353ef7d613232bdea5e207016c99489583c5d9367c2fd84adcb`.
Its build-info reports core offline 1,904,205 bytes and official content 481,078
bytes: net shell 1,423,127 versus the existing strict ceiling 1,423,144.32.
The isolated +14-byte measurement predicts only 3.32 bytes of remaining net-shell
room. This is not a complete build or budget pass. Fresh exact-head hosted
formatting, build, budgets and the existing real-origin fixtures remain required.
The existing safety workflow already triggers, executes and hashes the new test
through its `tests/origin-transfer*.test.cjs` wildcard.

### Whole-application gzip repair after the initial hosted failure

PR #722 head `4faaa3867de1dd50751546138b6cb2092ad3ee1a` failed the unchanged
application gzip ceiling: 138,466 bytes versus the strict 138,464-byte limit.
Hosted raw net shell was 1,423,083 bytes and passed. The isolated module prediction
above did not establish whole-application gzip qualification.

The adjacent repair replaces the shared prefix constant and three repeated
`startsWith` calls with one local `isRecovery(id)` function using the same exact
`id.startsWith('recovery:')` operation. All three callers retain their existing
string/type/empty-value guards and short-circuit order. No error wording, schema,
storage representation or ceiling changes. All 37 transfer contracts still pass.

The local measurement reconstructs the application's 25 exact-head source inputs
with the unchanged `composePackDesk` helper and pinned esbuild 0.28.2 builder
options. Its baseline is byte-for-byte identical to the emitted application in
primary artifact `12215204628`, archive SHA256
`dcbf0fa45f9d543668becf3dbfabecab639dfec8d8ee3809934863d41a16961b`:
406,608 bytes, gzip 138,466. That primary build names synthetic merge
`c30a3d36698a3264db0ce8b37cb90a1e33988743` for the PR head above.

With the unchanged hosted configuration prefix, the repaired application measures
406,610 bytes and gzip 138,457: nine gzip bytes smaller and seven below the same
ceiling. The repaired module alone measures source 16,345 bytes, emitted 8,919
bytes and gzip 3,115. A new release fingerprint and complete build were not
generated locally; current-head hosted qualification must establish the final
application, startup and raw-shell budget results before merge. No new browser
result is claimed by this measurement.

Parent #579 remains blocked on its other semantic validation, attempted-domain
concurrent-write ownership, startup/crash recovery and inspect/export/restore
flow, truthful post-commit cleanup, export/fallback consistency, main integration
and earlier budget changes. Direct calls that bypass the validated import flow
are not redesigned here. No player import, physical-device acceptance or complete
feature qualification is claimed.
