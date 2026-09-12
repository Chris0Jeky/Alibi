# Alibi source audit

Audited on **2026-09-11**, against `main` commit **f931d85162146e03fd85351e78dc16f48e305575** ([permanent source](https://github.com/Chris0Jeky/Alibi/tree/f931d85162146e03fd85351e78dc16f48e305575)). Recheck this map before implementing each slice: the repository is active. This audit reads source and repository metadata; it does not establish physical-device or current hosted behaviour.

## What exists

The package is version 0.11.1, uses Node 22+, and builds a mobile-first, device-local puzzle PWA. The source describes 355 puzzles, thirteen families, five casebooks and eight Games Room games, with additional Quiet Wing, castle and challenge experiences. The build uses pinned development tooling and self-contained runtime assets. There is no Capacitor dependency, Android project, Gradle wrapper, APK, signing key or Play workflow in the audited main tree. `docs/ANDROID.md` is the existing packaging checklist.

The two existing origins remain independent, recoverable sources of player data:

- Primary: `https://alibi-after-hours-preview.commit-atlas.workers.dev/`.
- Fallback: `https://alibi-puzzle-club.jeky-tck.chatgpt.site/`.

`docs/STATE.md` records primary 0.11.1 and fallback 0.11.0. Those are repository release receipts, not fresh network probes made by this architecture pass. Keep the historical hostnames; a Capacitor application does not require renaming either site.

## Current-to-proposed integration map

| Current seam | Observed responsibility / risk | Planned change |
| --- | --- | --- |
| `tools/build.cjs` | Shared script concatenation/esbuild, hashed assets, web manifest/SW, standalone HTML, zip and build receipt | Explicit web/native target from one dependency graph; preserve existing output, emit isolated `dist-android` |
| `src/app.js` startup near `AlibiBootReady` and SW registration | HTTPS or localhost qualifies for PWA service-worker registration | Explicit Android branch; never wait for an SW in the bundled host |
| `src/app.js` `apply-update` | Flushes activities, Club and Cabinet before explicit SW activation | Keep for web; native update status and safe checkpoints use a separate coordinator |
| `src/boot.js` | Independent startup timeout/recovery surface | Preserve bounded failure handling beneath the native splash |
| `src/activities.js` | Serialized lazy mount, route/dispose, preferences and flush | Add host lifecycle adapter and domain registry without destroying existing guards |
| `src/club.js` | Legacy engines, replay logs, save queue, complete-page render | Native ports at a bounded integration seam; no per-pointer bridge calls |
| `src/storage.js`, `src/backup-validation.js`, `src/validator-worker.js` | CAS persistence, recovery and bounded import validation | Retain formats/validators; add transport and post-commit checkpoint adapters |
| `src/asset-delivery.js`, `tools/build-delivery.cjs` | Verified enhanced images and exact local mirrors | Platform-aware resolver; preserve compact offline artwork and provenance |
| `tools/build-quiet.cjs`, castle/Quiet Wing entry points | Lazy executable activity bundles and media | Bundle their executable bytes in Android even when execution remains lazy |
| `src/theatre.js`, `src/atmosphere.js`, `src/quiet-wing/gpu.js` | Audio, images, Canvas/WebGL, lifecycle-sensitive resources | Interruption handling, measured decode budgets and explicit disposal |
| `observatory/browser.js`, `src/observatory-loader.js` | Opt-in collector with an exact Cloudflare origin gate | Keep the web gate; native telemetry stays disabled pending its own audit |
| `optional-online/` | Separately configured, disabled room service | Leave disabled initially; relative `/api` must not accidentally target virtual localhost |
| `.github/workflows/check.yml` | Existing comprehensive `verify` job, browser/engine/offline evidence | Preserve required check; add native-specific checks later, not in this planning PR |

### Why a naive wrapper would be insufficient

The existing condition in `src/app.js` is effectively `!standalone && serviceWorkerSupported && (https || localhost)`. Android's proposed local HTTPS origin satisfies it. Copying the web build unchanged would create two competing release mechanisms: an installed application and a browser service worker. Separately, using the current `standalone` flag as a workaround would suppress features that are intentionally different in the downloadable preview. An explicit build target is necessary.

The `apply-update` implementation already understands save errors and queued activity work. The transition should reuse these contracts, not replace them with an unconditional WebView reload or an asynchronous save only at app exit.

## Five-domain native-transfer baseline

The initial native transfer baseline covers the five existing player domains below. It is not a
claim that these are the only IndexedDB databases in the reconciled main branch: the integrated
Cascade boundary is deliberately preserved separately after this table.

| Domain | Source adapter | IndexedDB identity / principal records | Export and fallback boundary |
| --- | --- | --- | --- |
| Cabinet | `src/storage.js` | `alibi-device` v1; `runs`, `packs`, `meta` | Combined backup; `alibi.v1.runs.<key>`, `alibi.v1.packs.<key>`, `alibi.v1.meta.<key>` local fallback |
| Club / Games Room | `src/club.js` | `alibi-afterhours-v1` v1; `club` store, `state` and `recovery` | Combined backup; one localStorage envelope `alibi-afterhours-v1`; local fallback is single-tab |
| Quiet Wing | `src/quiet-wing/storage.js` | `alibi-quiet-wing-v1` v1; `saves`, `state` and `recovery` | Combined backup; `alibi-quiet-wing-v1:fallback` and optional `:fallback:recovery`; fallback restore remains restricted |
| Challenges | `src/challenge-storage.js` | `alibi-challenges-v1` v1; per-challenge entries in `runs` | Separate challenge exports today, not automatically included in the four-section combined backup |
| Castle | `src/castle/storage.mjs`, `backup.mjs` | `alibi-castle-v1`; `chapter-one`, `pre-restore-chapter-one` records | Included in current combined backup; versioned envelopes and protected recovery |

The adapters contain deadlines, revision checks and protected states. Cabinet, Club and Wing fallback details were explicitly documented in the #110 follow-up. Do not replace blocked/newer/unreadable storage with a writable empty fallback. Do not erase unknown records.

The current combined backup is **four separately restored sections**, not one database transaction. A native transfer must also account for challenges and the separately preserved Cascade experiment. `sessionStorage` room credentials (`alibi-club-room`) are transient access material and must not enter exports. Session-only player edits may be exported for recovery with explicit labels; they are not evidence of a committed durable save.

## Integrated Block Cabinet/Cascade boundary

[#115](https://github.com/Chris0Jeky/Alibi/pull/115) and [#117](https://github.com/Chris0Jeky/Alibi/pull/117) are merged into the reconciled main base. Cascade now has the separate `alibi-block-studio` v1 replay store at `src/block-cabinet/replay-store.mjs`, with its own export and protected session fallback. It is a sixth device-local domain, but is intentionally **excluded from the first native transfer and the current combined backup**.

CAP-05/CAP-06 must preserve that exclusion: do not delete, coalesce or silently transfer Cascade data while adding the native save registry. A later native transfer needs an explicit separate export/import route that retains its recovery and refusal behaviour. This planning package still does not certify a native host, physical-device result or deployment for the merged web surface.

[#120](https://github.com/Chris0Jeky/Alibi/issues/120) is the existing native-host umbrella. The new CAP work packages extend it. Reuse #2, #11, #13 and #118 for physical-device acceptance, #119 for Cascade's integration/calibration, #106 for Observatory, #96 for expensive hints, #102 for remount diagnostics and #80 for repeated castle merges. Do not close these based on planning work.

## Discrepancies and release risks

1. Some deployment prose still says there is no analytics while current README/state and Observatory code describe an opt-in pilot. Privacy disclosures must be derived from the executed network graph, not copied from a stale sentence.
2. The primary and fallback have separate saves and documented release versions. Neither a redirect nor an Android package can silently migrate those browser databases.
3. A declared Android minimum OS is not a minimum WebView feature contract. Audit all runtime APIs used by boot, workers, graphics, audio, storage and optional activities.
4. Source build receipts separate compressed JavaScript, core shell and optional assets. Measure the native AAB/APKs, installed size and decoded memory independently; do not extrapolate from a zipped repository or an image's compressed file size.
5. The repeated post-completion freeze in #11 remains a physical gate. Repackaging must not be presented as its fix.

## Repository invariants retained

No new public origin; no modified puzzle IDs/revisions; no silent schema replacement; no database clearing; no new account/payment/advertising service; no remote executable download in the Android MVP; no source-master media shipped; no runtime native bridge dependency for the PWA; no weakened `verify` check. Planning files and examples are not activated app code.
