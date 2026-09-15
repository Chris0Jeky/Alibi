# Web and bundled Android build targets

**Status:** CAP-02 implementation contract. This produces a native-ready web payload, not an Android
project, APK/AAB, application ID, signing identity or Play release. Host generation remains CAP-04.

## Commands and outputs

| Command | Output | Purpose |
| --- | --- | --- |
| `npm run build` / `npm run build:web` | `dist/`, `alibi-deluxe-play.html`, `alibi-deluxe-cloudflare.zip`, `build-info.json` | Existing PWA, standalone preview and Cloudflare release path |
| `npm run build:android` | all web outputs above, then `dist-android/` | Derive a bundled local payload from the same reviewed graph |
| `npm run check:android` | JSON result; non-zero on any policy or receipt error | Recompute every Android asset receipt and target invariant |

`build:android` deliberately invokes the regular web build first. It does not maintain a second
catalogue, engine bundle, activity list or asset compiler. The Android directory is a deterministic
derivation of that graph.

## Runtime target identity

`standalone` remains the self-contained demonstration flag. It changes media and worker delivery and
must not be reused as a native flag.

The Android document loads one small, content-addressed marker before all other scripts:

```js
globalThis.ALIBI_BUILD_TARGET = 'android';
```

The shared application reads this target to select native-safe boot behaviour. Web remains the
default when the marker is absent. Android:

- treats the successfully loaded local payload as offline-ready;
- never registers or waits for the PWA service worker;
- hides browser installation controls;
- describes updates as host/store package updates, not `skipWaiting()` activation;
- does not load the optional Observatory adapter;
- keeps IndexedDB and current reducers authoritative until the CAP-05 save-domain registry exists.

The intended local origin remains `https://localhost`; this slice does not create or configure the
Capacitor host.

## Android payload policy

`dist-android/` contains the current executable and media closure, including lazy activity code,
workers, Quiet Wing, castle assets, Block Cabinet motion assets, and the Wrenmere script, stylesheet
and Classic/offline fallback configuration. Shared files are copied byte-for-byte from `dist/`.
Only the target marker and Android `index.html` policy are target-specific.

The derivation removes web-host controls:

- `sw.js`;
- `manifest.webmanifest`;
- `_headers`;
- `404.html`;
- the online-only content-hashed Observatory adapter.

It does not add `server.url`, a CDN runtime import, source map, signing material, source master,
secret, live-code updater or native dependency. The Android CSP is closed to the local origin,
`data:`/`blob:` image data and blob workers. Optional online enhancements therefore fail to their
bundled local presentation instead of becoming a release prerequisite.

## Receipts

`android-assets.json` is the sorted file inventory. Each entry records:

- relative path;
- installed/downloaded byte count;
- SHA-256;
- MIME type;
- decoded-memory cost class and whether the current value is a measured amount or an explicit
  measurement boundary.

Compressed raster, audio, video and model files cannot be translated into trustworthy resident
memory solely from package bytes. Their entries therefore remain marked for CAP-09 runtime/device
measurement rather than presenting package size as decoded memory. Text and executable assets have
a byte lower bound. The manifest summary totals installed bytes and identifies unresolved decoded
costs.

`android-build-identity.json` records build identity separately from any future Android
`versionCode`:

```text
target
appVersion
sourceSha
payloadSha256
webBuild
contentManifestRevision
rulesCompatibility
saveEnvelopeVersions
assetManifest
files
```

The save envelope record intentionally says `pending-CAP-05`. CAP-02 knows the current cabinet and
combined backup envelope versions, but it does not invent a completed native save registry.

## Determinism and verification

A clean checkout with one dependency lock must produce the same unsigned payload digest when the
Android derivation is repeated. The test suite derives two temporary copies from one web graph and
compares their complete manifests and identities.

The checker also rejects:

- missing, duplicate, escaping or unlisted files;
- byte, MIME, SHA or aggregate payload drift;
- host-only files or an Observatory script;
- a remote URL or web manifest in `index.html`;
- a missing/late target marker;
- missing Quiet Wing or Wrenmere executable assets;
- stale source, rules, content or web-build identity;
- any claim that CAP-05 save-domain work is complete.

The Chromium target test boots `dist-android/` under `https://localhost`, proves no `sw.js` request or
registration occurs, verifies browser install and usage-sharing controls are absent, and opens the
Wrenmere desk from bundled script/style files without a remote request.

## Existing web guarantees

The regular build remains the source of truth for:

- coherent service-worker installation and explicit activation;
- previous-shell retention;
- current PWA budgets and asset accounting;
- standalone output;
- Cloudflare headers and ZIP packaging.

CAP-02 tests both target outputs and the existing service-worker/core tests. Native additions must
not be charged to, hidden inside or used to relax the PWA budgets.

## Follow-on packages

- CAP-03 supplies platform capability ports.
- CAP-04 generates and reviews the non-publishable Capacitor/Android host.
- CAP-05 inventories save domains and replaces the pending identity field.
- CAP-07 owns native asset/runtime policy beyond the first complete bundle.
- CAP-09 records emulator and physical-device performance/memory evidence.

No output from this target is store-ready until those packages and the human publisher/signing gates
are complete.
