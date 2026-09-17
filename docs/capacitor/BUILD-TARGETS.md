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

The Android document loads one small, content-addressed marker before all other scripts. It declares
`globalThis.ALIBI_BUILD_TARGET = 'android'` and decorates the existing diagnostics contract so the
local bundled payload reports the actual target and offline readiness.

Web remains the default when the marker is absent. During derivation, the generated application
bundle is transformed through two exact-match, fail-closed rewrites:

1. the generated configuration changes from hosted/PWA mode to self-contained mode, preventing the
   service-worker and hosted update path from starting;
2. the optional Observatory URL is cleared, preventing usage-sharing code from loading in the native
   target.

The transformed bundle receives a new content-hashed filename and only the Android `index.html`
reference is changed. Source files and the complete `dist/` web artifact remain untouched. Any future
build that no longer has exactly one expected configuration or Observatory assignment fails rather
than silently producing an ambiguous native payload.

The intended Capacitor local origin remains `https://localhost`; this slice does not create or
configure the Capacitor host.

## Android payload policy

`dist-android/` contains the current executable and media closure, including lazy activity code,
workers, Quiet Wing, castle assets, Block Cabinet motion assets, and the Wrenmere script, stylesheet
and Classic/offline fallback configuration.

The derivation removes web-host controls:

- `sw.js`;
- `manifest.webmanifest`;
- `_headers`;
- `404.html`;
- the online-only content-hashed Observatory adapter.

It does not add `server.url`, a CDN runtime import, source map, signing material, source master,
secret, live-code updater or native dependency. The Android CSP is closed to the local origin,
`data:`/`blob:` image data and blob workers. Optional online enhancements therefore cannot become a
release prerequisite.

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
combined backup envelope versions, but it does not invent a completed native save registry,
production approval, application ID or version code.

## Determinism and verification

A clean checkout with one dependency lock must produce the same unsigned payload digest when the
Android derivation is repeated. The test suite derives two temporary copies from one web graph and
compares their complete manifests and identities.

The checker also rejects:

- missing, duplicate, escaping or unlisted files;
- byte, MIME, SHA or aggregate payload drift;
- host-only files or an Observatory script;
- a remote URL or web manifest in `index.html`;
- a missing or late target marker;
- multiple or stale application bundles;
- missing Quiet Wing or Wrenmere executable assets;
- stale source, rules, content or web-build identity;
- any claim that CAP-05 save-domain or store-publication work is complete.

The dedicated Chromium target job boots `dist-android/` under `https://localhost`, proves no `sw.js`
request or registration occurs, verifies browser install and usage-sharing controls are absent, and
opens the Wrenmere desk from bundled script and style files without a remote request. Its build
receipts are uploaded as review evidence.

This is browser simulation of the bundled origin. It is not physical-device, WebView, TalkBack,
keystore, signing, APK/AAB or Play Console evidence.

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
