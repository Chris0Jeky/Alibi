# Assets, offline play and update ownership

**Proposed; CAP-02/#124 and CAP-07/#129 implement it.** Current source paths and cache behaviour: [audit](SOURCE-AUDIT.md). The web and Android targets share assets and rules, but not a release mechanism.

## First native release: bundle before optimizing distribution

Package the current production runtime and media needed by all advertised features. Preserve lazy loading/execution so opening a small puzzle does not decode the whole castle, realm and film library. Do not copy the entire Git repository: exclude tooling, docs, source masters, development files, test fixtures, secrets and hosting-only outputs.

The initial implementation must measure four different costs: AAB/device download, installed files, JavaScript/worker runtime, and decoded GPU/audio/image memory. A compressed 300 KB picture can consume many megabytes after decoding; package size alone is not the performance budget. Prefer one complete, verified native release over an elaborate downloader introduced before there is a measured need.

A proposed first-review download budget is **50 MiB of compressed device-delivered app content**, with a separate report for installed/runtime memory. This is an engineering review threshold, not Google's limit and not a measured current AAB size. Crossing it requires a size report and a deliberate bundle/optional-content decision, never silent removal of features. Keep existing PWA budgets unchanged.

## Asset classes

| Class | Android MVP | Later delivery policy |
| --- | --- | --- |
| Application JS, lazy activity JS, workers, CSS, WASM if introduced | Bundled and hash-receipted | Store update only under this plan |
| Published rules/definitions and legacy compatibility | Bundled with readers | Data packs only after explicit compatibility and authenticity design |
| Compact artwork, icons, essential controls, offline room equivalents | Bundled | Must remain a complete usable fallback |
| Production room images, audio and films currently shipped | Bundle first; lazy decode/play | Optional media packs only when measurements justify the complexity |
| Editable source masters / modelling files | Never runtime assets | Retain in source/art pipeline and provenance |
| Player-created backups/packs | User-controlled data | Never mixed into an asset eviction cache |

A folder labelled "optional" may contain executable code today. Classify individual outputs rather than trusting the folder name. No active scene should discover that its JS exists only on the current web deployment.

## Shared manifest and resolver

Build one logical inventory from source. Each entry has stable ID, content revision, target-relative path, SHA-256, byte size, MIME type, role, compatibility and provenance reference. Keep the resolver contract separate from transport:

```text
resolve(assetId, revision) -> {
  status: bundled | verified-local | compact-fallback | unavailable,
  url, bytes, digest, releaseReference
}
```

The renderer receives only a verified URL for a known ID. Native local-file conversion happens inside the adapter; callers cannot supply arbitrary device paths. Relative web assets resolve under the bundled local origin, not by prefixing the production website. Test worker URLs, CSS background URLs, dynamic imports, audio/video ranges, images, model buffers and CSP under the real WebView.

In the PWA, the existing SW and optional-pack cache rules stay authoritative. In Android, the bundled manifest establishes installed readiness. A successful `cache.addAll` or a fake service-worker-ready flag is not the native readiness check. Initially the adapter can bypass redundant native Cache Storage downloads because the bytes are already packaged.

## Optional media pack protocol (deferred until needed)

Use an authenticated manifest whose key/authority is pinned in trusted app code. HTTPS plus a payload hash is not sufficient if an attacker can replace both manifest and payload. A future signed manifest needs explicit key rotation/revocation and minimum-reader/maximum-format checks.

Each pack proceeds through:

```text
absent -> declared -> downloading -> verifying -> staged -> active
                         |               |          |
                         +------ failure/cancel -----+ -> previous active or compact fallback
```

Download into a pack-specific app-private staging area with total/per-file byte ceilings, a disk-space reserve and bounded concurrency. Verify MIME, length, digest and allowed roles before publishing an atomic active manifest. Never activate partial bytes, replace the current pack during a game, or delete a predecessor still referenced by a saved content revision. Do not follow arbitrary mirror redirects or accept archive paths outside the staging root.

Resume only when the transport's validator/range semantics prove it is the same immutable content. On restart, reconcile staging by manifest/digest; do not trust a progress percentage. Expose size, progress, pause/cancel and removal controls. Removing HD assets preserves saves and fallback art. Low-storage failure should leave the game playable.

Use the current FileTransfer API where appropriate rather than deprecated Filesystem `downloadFile`. It does not, by itself, provide a guaranteed OS-persistent background download manager. Keep foreground transfer for the first optional pack; a later WorkManager implementation requires persistent operation IDs, network constraints, completion reconciliation, battery/notification review and process-death tests. See [S03](SOURCES.md#s03--device-apis).

Avoid large base64 arrays crossing the bridge. Native transfer verifies files natively, then returns bounded metadata and controlled URLs. Decode only visible/current assets. Release ImageBitmap/texture/audio/worker resources on scene disposal; cap pixel ratio and preload concurrency from device evidence.

## Three independent update lanes

### Web/PWA

Existing reviewed source -> web build -> Cloudflare -> waiting SW -> explicit safe activation. Keep the old site and old-origin exports. A server rollback does not undo IndexedDB or instantly replace every installed SW.

### Native executable

Reviewed source -> bundled target -> tested/signed AAB -> Play internal/closed/production. The installed Android application continues using its bundled release after a newer website deployment. Do not point the release WebView at `server.url`, install a live-code updater, or fetch new game scripts as if they were inert media.

No-OTA-code is this project's chosen first-release boundary, not a claim that every possible web-content update is categorically forbidden by every store policy. A future change needs its own ADR, security/compatibility tests and current policy review.

### Future inert content/media

A compatible, verified, versioned pack may add content after user consent to the download. Imported or remote content never escalates into arbitrary HTML, scripts, native method names or plugin configuration. Readers retain old definitions for unfinished games. Downloads do not force mid-game activation.

## Version dimensions

| Identifier | Meaning |
| --- | --- |
| Git SHA | Exact source tree |
| Payload digest | Exact built unsigned web/native asset set |
| App version / Android versionName | Human-facing release label |
| Android versionCode | Unique monotonic installer/release counter |
| Rules/content revision | Semantic interpretation of puzzles and replays |
| Save envelope/schema version | Reader/writer compatibility |
| Vault generation | Recovery-write concurrency, not source chronology |
| Signing certificate lineage | Distribution identity and upgrade continuity |

Never use one number for all eight. Record them together in the release receipt. A restored old replay may validly coexist with a new application; a lower app version cannot safely be assumed to read a newer save schema.

## Failure and rollback expectations

A failed media upgrade rolls back its active manifest without touching saves. A failed web deployment can revert web assets, subject to SW lifecycle. A failed native update requires a higher-versionCode compatible repair for users already updated; halting the rollout only stops further distribution. Do not uninstall/reinstall as a rollback plan. Keep prior source, exact artifacts, schema fixtures and pack manifests for diagnosis and roll-forward.

Tests must cover first offline launch, absent optional assets, corrupt/truncated/oversized packs, update interruption, stale revisions, low space, context loss and old-to-new app upgrades. Include all shipped Games Room/Quiet Wing/castle entry points, not only the main puzzle page. See [ACCEPTANCE.md](ACCEPTANCE.md).
