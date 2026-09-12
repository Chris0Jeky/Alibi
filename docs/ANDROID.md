# Android path

## Capacitor transition proposal

The owner has requested a thorough Android-first Capacitor architecture while preserving the PWA.
Start with [the Capacitor transition package](capacitor/README.md): source audit, platform contracts,
save/recovery and migration, assets, native UX, security, CI/CD, acceptance and a dependency-linked
implementation roadmap. [Issue #120](https://github.com/Chris0Jeky/Alibi/issues/120) remains the program
umbrella; CAP-01–CAP-14 are issues #123–#136.

This is a planning deliverable, not a native release. No Android project, APK/AAB, signing key,
account setup or Play submission is supplied by the architecture PR. The existing browser app and
its published save identities remain unchanged.

The proposed host uses bundled local assets and narrow native adapters. It does not load the live
website as a privileged main document, register the PWA service worker in Android, or introduce an
OTA executable updater. Shared rendering/touch improvements and physical-device evidence remain
necessary; Capacitor alone is not a performance fix.

Publisher/application identity and signing custody are required before production registration.
They do not block the shared build/port work or a clearly non-publishable preview. A custom domain
is optional for this route. Both existing web origins remain available for explicit backup transfer.

## Current PWA device checklist

The browser game is already packaged as an installable PWA: manifest, stable identity, standalone
display, normal and maskable icons, safe-area spacing, offline shell and explicit update activation.
That remains the current shipped Android installation route until a native release is accepted.

1. Open the existing HTTPS play link in Android Chrome.
2. Use Install Alibi or the browser Install app / Add to Home screen command.
3. Wait for Offline ready; close and reopen in airplane mode.
4. Make another move, close/reopen, export a backup and restore it in the same profile.
5. Check large system font/display settings, landscape controls and TalkBack.

Physical checks are tracked in HUMAN_TODO.md and issues #2, #11, #13 and #118. Emulated phone layouts
do not prove installation, file-picker behaviour, accessibility or resolution of the reported
post-completion freezes on a real phone. Do not clear site data to make a test pass.

Browser and native WebView storage are separate. The current combined backup has Cabinet, Club,
Quiet Wing and castle sections; challenges need separate exports until the new registry explicitly
supports them. See [data and migration](capacitor/DATA-AND-MIGRATION.md). Never assume shared saves
or cross-database atomic restoration.

## Store and future-platform gates

Store identity, privacy disclosures, required testing and review must be rechecked against current
requirements at submission. The [dated source receipt](capacitor/SOURCES.md) records the research
baseline, not perpetual eligibility. The [acceptance matrix](capacitor/ACCEPTANCE.md) distinguishes
planning checks, browser tests, Android emulator evidence, physical acceptance and actual Play results.

Future iOS work starts with Safari installation/offline/file-picker checks and its own platform,
storage, signing and store acceptance design. Android scaffolding does not constitute iOS readiness.
