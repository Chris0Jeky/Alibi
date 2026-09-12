# Data, recovery and player migration

**Proposed contract.** Implementation: #127 and #128; security review: #132. The exact five-domain baseline is in [SOURCE-AUDIT.md](SOURCE-AUDIT.md). This plan changes neither current databases nor player data.

## Authority and promises

Keep the existing IndexedDB adapters as the initial game-state authority. They already validate records, compare revisions and preserve recovery. Native packaging does not automatically share browser saves or make a last-second JavaScript save reliable. Preferences is suitable for small host settings, not puzzle history or a replacement transaction system. See [S02](SOURCES.md#s02--host-configuration-and-storage).

Expose three different facts in the UI and diagnostics:

| Status | Meaning |
| --- | --- |
| Move accepted | The rules accepted it; transient rendering may already reflect it |
| Device save committed | The authoritative adapter's transaction completed, or a clearly labelled fallback accepted it |
| Recovery checkpoint current | A separately verified native snapshot covers the committed domain version |

Do not collapse these into a green "everything saved" icon. An IndexedDB write can succeed while native recovery is behind. A browser/session fallback must never claim the native checkpoint property. Saved does not mean cloud-synced; local recovery disappears with uninstall/data clearing unless the user made an external backup.

## Save-domain registry

Introduce a registry of `cabinet`, `club`, `quiet-wing`, `challenges` and `castle`. Each adapter supplies:

- Bounded `inspect`, `flush`, `exportCommitted`, `validateImport`, `previewRestore` and `commitRestore` operations.
- Read/write/protected/session status, supported envelope/rules revisions, source revision vector and a canonical payload digest.
- An explicit list of omitted/unreadable records instead of truncating a large export or pretending an unloaded store is empty.
- A disposer for subscriptions and a read-only probe that does not initialize an unrelated scene just to inventory saves.

A domain can contain many independently revised records. Use an opaque revision vector/digest, not a fictional global scalar revision. Do not change `alibi-device` v1 or other database identities merely to introduce the registry. Any necessary envelope/meta extension needs a narrow backward-compatible migration and fixtures. Future Cascade support is conditional on #119 and the Block Cabinet PRs; unknown domains are preserved as opaque export material or refused, never interpreted by an older reader.

## Native RecoveryVault

The recommended public-release safeguard is a small app-private checkpoint plugin. Its inputs are allowlisted domain IDs and bounded, already validated committed payloads. It exposes checkpoint/read/list operations, not arbitrary file access. Native implementation should use a verified atomic-replacement primitive, serialized off the Android UI thread, with checksums and explicit failure results. [AtomicFile](SOURCES.md#s04--android-data-and-security) is a building block, not the whole contract.

A checkpoint envelope contains:

```text
vaultFormat, domain, generation, sourceRevisionVector,
sourceDigest, saveEnvelopeVersions, rulesCompatibility,
payloadLength, payloadSha256, createdAt, operationId
```

`generation` is a native-vault concurrency counter. It is not a puzzle revision, app version, wall-clock order or the source adapter's revision. Timestamps are diagnostic, not authority. The JS coordinator sends an expected generation; stale or duplicate operations cannot overwrite a newer checkpoint. Native code verifies lengths/digests and allowed domain names again.

### Write sequence

1. The existing adapter validates and commits the game change.
2. Its post-commit event requests a snapshot of the committed revision vector. Serialize/canonicalize away from the input path where practical.
3. One queue per domain coalesces redundant requests to the newest **committed** state; keep one pending successor, not an unbounded backlog.
4. Native code checks the expected vault generation, writes a staging file, verifies it, then replaces the domain's active manifest atomically. Keep the previous complete generation.
5. Acknowledge the exact source digest/generation. Only then can the UI describe that checkpoint as current.

Bound operation time and payload bytes in both layers. Start with limits no lower than the largest supported export fixtures, then set documented headroom from measurements. A proposed default recovery retention is two generations per domain plus one in-flight staging object. A proposed coalescing window is at most 500 ms in the foreground; this is a performance policy to test, **not a zero-loss guarantee**. When a valid state exceeds a bound, stop checkpointing that domain, show the reason and allow supported explicit export; never trim notebook entries, custom packs or undo history to fit.

Do not await haptics or a full cross-domain snapshot for every pointer movement. Save rules transitions, not intermediate gesture coordinates. At safe navigation/update boundaries, request a bounded checkpoint barrier; on abrupt process death there may be no final callback. After restart, inspect the authoritative DB and vault separately and explain any lag.

### Read and restore sequence

Read both generations, verify envelope, checksum and compatibility, and retain corrupt/future bytes without interpreting them. A valid older snapshot is a recovery option, not permission to overwrite a healthy newer database. The player reviews a preview, and the existing domain adapter makes its normal pre-restore recovery copy before replacing state. Re-read the domain revision immediately before commit to detect concurrent edits.

A deliberate restore can make source counters or content differ from an earlier branch. Start a new coordinator restore epoch and reconcile the native generation explicitly; do not select a winner by timestamp or decrement the vault generation. Recovery metadata belongs to the registry/vault protocol, not unreviewed fields smuggled into strict game envelopes.

### Failure table

| Fault | Required outcome |
| --- | --- |
| Killed after DB commit, before checkpoint | DB remains authoritative; report older vault, never revert DB automatically |
| Killed during staging or manifest replacement | Read one complete previous/current generation; discard only recognized incomplete staging |
| Disk full or quota error | Preserve existing generations; explain degraded recovery; allow export where feasible |
| Bad hash, future format or ambiguous read failure | Protected state; retain bytes; no writable empty fallback |
| Two callers race / delayed old response | Expected generation and operation ID prevent overwrite; acknowledge exact digest |
| Restore interrupted between domains | Report completed domains and remaining domains from restore journal; no false global success |
| Native plugin absent | PWA contract remains; Android cannot claim native recovery acceptance |

Before release, fault-inject each boundary and verify actual persisted bytes after process restart. A future SQLite move requires its own ADR, transaction model, plugin maintenance/licence/16 KB review and one-way migration proof. Avoid maintaining two competing active database writers.

## Migration from current PWA installations

Browser origin/profile storage and Android app-profile storage are separate. The user journey should be:

**Old Alibi → Export all available progress → Android → Review backup → Choose conflicts → Restore → Verify a known unfinished puzzle.**

The source remains intact. The new app can show instructions and open the correct old website externally, but must not imply it can read Chrome's private IndexedDB. Both old origins remain available. Do not redirect away from a source before export, rename native origin later, or delete the PWA.

### Complete inventory before transfer

Current combined exports contain Cabinet, Club, Quiet Wing and castle. Challenges need their existing separate exports until the registry adds a tested combined format. The wizard must name this limitation and show per-domain counts and unsupported/omitted sections. Include workshop/imported packs required by unfinished saves. Exclude transient room seat credentials, consent tokens, caches, telemetry identifiers and secrets.

Session-only material may be exported as a labelled emergency recovery source, not represented as durable committed state. A user can still recover valuable notes from it. Never silently replace durable data with session material; use the same preview and conflict controls.

### Document transport

Use Android's user-directed Storage Access Framework through an audited adapter. Handle `content://` URI grants, provider timeouts and cancellation; do not request all-files access. See [S04](SOURCES.md#s04--android-data-and-security). Official Share is useful for forwarding an export, but a successful share invocation does not prove the recipient persisted it.

Keep document handles opaque. Enforce byte limits while reading, before decoding/JSON parsing; then validate structure, record counts, IDs, rules and revisions in the existing bounded worker. MIME/name checks are advisory, not validation. Large binary assets are outside the game-backup JSON. If an archive format is introduced, reject traversal, symlinks, expansion bombs and duplicate paths before extraction.

Persist only the minimal pending operation metadata needed to recover a picker round trip. Handle a restored external-activity result once, return to the import **review**, and require a still-valid user decision before writing. The custom plugin must support the App restored-result mechanism; listening for `appRestoredResult` alone cannot fix a plugin that never persists its call. Revoke/expire temporary grants and copies after cancellation or completion.

## Export/restore consistency and compatibility

A combined export acquires a logical quiescence barrier: finish or cancel uncommitted gestures, flush each participating domain, capture committed revision vectors, then verify that the captured set did not change while serializing. Bound retries. If a domain fails, offer a clearly labelled partial export; never name it a complete migration backup.

Restores are **per-domain transactions**. Keep a local restore journal of intended section digests, reviewed conflicts and completed outcomes. A restart resumes review of unfinished sections; it does not replay every import automatically. Preserve each domain's pre-restore recovery. Repeated restoration must not duplicate castle notes or cross-game rewards; coordinate #80 and #30.

Compatibility policy: new readers accept explicitly supported older formats; older readers refuse unsupported future versions without changing existing state. Native-to-web export is permitted only where the web reader supports the included format/rules. Do not promise bidirectional sync merely because both targets use JSON. Record source target, source release and section versions; compare semantic state, not only file sizes.

## Automatic Android backup

Proposed v1 policy: no automatic upload of Alibi's app-private game data/recovery vault or credentials. Explicitly configure legacy backup rules, Android 12+ data-extraction rules and device-to-device handling, then test supported devices/OEMs. Bulk assets should not inflate system backups. A user-selected cloud destination in the document picker is a voluntary export, not hidden automatic sync. Do not claim a universal OEM prohibition based on `allowBackup=false` alone. Policy and test details belong to [security](SECURITY-AND-PRIVACY.md).

## Minimum transfer acceptance

Verify both existing origins, empty and mature accounts-without-login (device collections), all five domains, custom packs, future formats, offline transfers, stale destination edits, provider cancellation, low space, process recreation and repeated imports. Compare known puzzle IDs, progress, undo/redo, notes, garden/city and challenge histories before/after. Retain only synthetic/sanitized fixtures in the public repo. Actual player backups remain private.
