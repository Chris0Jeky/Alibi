# Security and privacy for the Android host

**Proposed controls; CAP-10/#132 verifies them.** This is an owned-application defensive design, not evidence that a native build has passed an audit. Primary references: [S02–S07](SOURCES.md).

## Trust model

The bundled application is trusted executable code with access to a native bridge. Imported puzzles/backups, external links, remote media, document-provider results and launch intents are untrusted input. A WebView bridge increases the impact of a script-injection defect; keeping the content inside a native package is not a security boundary against bad imported markup. See [Android bridge guidance](SOURCES.md#s04--android-data-and-security).

| Boundary | Risk | Required control / test |
| --- | --- | --- |
| Imported JSON to UI | Script/markup injection or prototype/path confusion | Strict bounded schemas, own-key checks, escaped text; no imported HTML/JS/native names |
| External navigation to privileged WebView | Remote code gains plugin reach | External browser/approved safe routes; no production remote main URL or extra navigation domains |
| JS to RecoveryVault/documents | Arbitrary private-file read/write or destructive restore | Allowlisted IDs, opaque handles, byte/time limits, native validation, explicit restore preview |
| Optional media to local pack | Tampering, oversized payload, archive traversal | Pinned manifest authority, hashes, type/size checks, staging and atomic activation |
| Deep link / restored picker result | Forged operation or duplicate write | Validate route/operation ID; restore review first; idempotence and expiry |
| Save/backup transport | Loss, unintended disclosure or stale overwrite | CAS, recovery-before-restore, per-domain outcomes, voluntary export and protected unknown data |
| CI to signing/Play | Untrusted code reads credentials or promotes another artifact | Separated jobs, protected environments, exact artifact digest, least privilege |

These controls reduce exposure; they do not justify loading arbitrary untrusted documents inside a bridge-enabled origin. Native code must reject unsafe inputs even when the JS caller appears to be the application.

## Release configuration policy

Require a local bundled main document at the locked native origin. Reject `server.url`, non-empty `server.allowNavigation`, `server.cleartext`, Android mixed content, release WebView debugging, production console logging and unapproved plugin registrations. The checked-in [example config](examples/capacitor.config.json) is deliberately non-publishable; inspect the **effective** generated config and final artifact too.

Keep remote credit/support pages outside the privileged view. Normalize URLs and disallow unexpected schemes, local paths and redirect escalation. The local hostname is not an authentication secret: other applications can also use localhost. Any future backend must authenticate requests rather than treating a permitted CORS origin as identity.

Serve a restrictive, target-aware CSP from the native document. The website's `_headers` is not automatically enforced by WebView. Verify local workers, existing inline styles and controlled blob usage before tightening directives; do not break the application and then disable CSP globally. No arbitrary remote script, `eval` or live-code updater. Remote SVG/HTML is not a safe inert image format without a reviewed sanitization/rendering boundary; prefer bundled trusted SVG and verified raster media for downloads.

Review exported Android activities/services/providers, intent filters, custom plugins and FileProvider paths. A file sharing provider exposes only the intended temporary export directory with temporary grants, never a wildcard root. Set release debuggability in the merged manifest and test the produced bundle/APKs. A config source file alone is not proof.

## Permissions and network

Start with only permissions justified by the host and reviewed plugins. INTERNET may support optional network access; vibration/network-state permissions must be justified by actual features. No all-files access, location, camera, microphone, contacts, advertising identifier, notification prompt or background service merely for packaging. SAF uses user-selected documents rather than blanket external-storage permission.

The optional room service remains off. Relative `/api` would point at the local native origin; a future service needs an explicit endpoint, authentication, consent/retention design, exact CSP/CORS policy and real two-device tests. Do not globally patch fetch/XHR to native HTTP as a generic CORS workaround. Prefer shared web networking where it works and bounded native transfer only for a defined file operation.

For each permitted endpoint, retain purpose, fields, whether enabled by default, destination, retention, ownership and withdrawal behaviour. Audit a fresh offline install, fresh online install, resumed app, content download, consent change and support export. Include transitive SDKs and image hosts, not just explicit analytics calls.

## Observatory and diagnostics

Current `observatory/browser.js` is gated to the Cloudflare primary origin and HTTPS. Android's local origin is intentionally outside that gate. Do not add a wildcard localhost exception. The native MVP has no new remote telemetry; existing web consent behaviour stays unchanged.

A later native collector requires an independently reviewed configuration/consent path, actual network capture, accurate Data Safety declarations and supported withdrawal. Consent cannot be inherited simply by importing a game backup. No notebook text, custom pack content, puzzle answers, document paths, arbitrary URLs or device identifiers in routine diagnostics.

A small local diagnostic ring can retain error codes, approved route IDs, versions, save mode and recovery lag. The user previews a support export before sharing. Native Play vitals and JavaScript errors are different coverage; neither should be advertised as comprehensive monitoring. Keep native mappings and private source maps in appropriately restricted release storage. Public CI artifacts must contain synthetic data only.

## Automatic backup and transfer policy

Proposed first-release default: exclude private player state, RecoveryVault, caches and transient credentials from automatic cloud backup and automatic device-to-device transfer. Provide explicit user-controlled export/import instead. Implement both relevant legacy backup configuration and Android 12+ data-extraction rules, considering device-protected and credential-protected storage as applicable. Exclude bulk assets even if a future approved backup mode includes saves.

Verify restore/uninstall/device-transfer behaviour on supported platforms. Android documents manufacturer-specific differences; `allowBackup=false` by itself does not establish a universal guarantee. Reflect verified behaviour and limits in user-facing privacy/support text. A user choosing a cloud document provider for an explicit export is a separate, voluntary action.

This conservative default avoids an accidental privacy change during migration, but it is a trade-off: automatic device replacement becomes less convenient. Revisit it only through an explicit owner decision with consistent recovery semantics, disclosure and device-transfer tests.

## Plugin and dependency review

Maintain an inventory for each direct and transitive plugin: maintainer, licence, exact version, last review, permissions, native libraries, network/data access, platform floor and uninstall/upgrade implications. Prefer official narrow APIs; no abandoned all-purpose helper simply to save a few lines of native code.

Inspect `.so` libraries even when Alibi contains only JS/Java/Kotlin source. Validate ABI and 16 KB compatibility against current guidance; don't assume a storage or crash SDK is Java-only. Validate Gradle wrapper/distribution and dependency integrity. Audit configured trust roots and cryptographic receipt handling independently of asset parsing.

## Play disclosure worksheet

Before beta/production, complete a field-to-evidence matrix:

| Area | Evidence to gather | Current planning position |
| --- | --- | --- |
| Accounts / login | Native entry and server inventory | None introduced |
| Game progress | Domain registry, backup/transfer paths | Device-local; explicit export/import |
| Optional usage data | Actual collector payload/network and consent | Native collection disabled in MVP |
| Infrastructure requests | Media/update/support hosts and logs | Audit actual enabled paths |
| Crash/performance SDK data | Dependency scan plus network capture | No new SDK assumed |
| Advertising / purchases | Manifest, SDK and UI scan | Out of scope; no adverts or billing added |
| Content/audience | Actual shipped puzzles, story and workshop behaviour | Accurate rating/target-audience review required |
| Asset rights | Provenance, licence and generated-asset terms receipts | Review shipped assets; public source is not a licence grant |

Every listing needs accessible privacy/support information matching the released binary and its optional behaviours. Do not choose "no data collected" solely because the app has no accounts. Stale deployment prose about analytics must be corrected in the implementation/disclosure review. Final classifications are based on the current Play definitions and observed build, not this proposal.

## Security acceptance

Test hostile imports, future envelopes, unexpected content URIs, rejected navigation schemes, forged deep links, oversized media, corrupted checkpoints, low space, cancelled permissions and untrusted-PR credential isolation. All tests target owned fixtures and Alibi's own build. Record exact source/artifact/policy versions and unresolved findings. Any route from untrusted content to arbitrary native operations, or unexplained save loss, blocks release.
