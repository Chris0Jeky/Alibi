# Android path

The browser game is already packaged as an installable PWA: manifest, stable identity, standalone
display, normal and maskable icons, safe-area spacing, offline shell and explicit update activation.
That is the current Android scaffold. No placeholder APK project or signing key is included.

1. Open the final HTTPS play link in Android Chrome.
2. Use Install Alibi or the browser Install app / Add to Home screen command.
3. Wait for Offline ready; close and reopen in airplane mode.
4. Make another move, close/reopen, export a backup and restore it in the same profile.
5. Check large system font/display settings, landscape controls and TalkBack.

Physical checks are tracked in HUMAN_TODO.md. Emulated phone layouts do not prove installation,
file-picker behavior or accessibility on a real phone.

Before Play Store distribution, choose the publisher/package identity and signing-key ownership.
Evaluate a Trusted Web Activity if the browser capability set is sufficient, or Capacitor only for
specific native capabilities. Store signing, privacy disclosures, closed testing and review must be
verified against current store requirements at that time. Browser IndexedDB and wrapper storage may
belong to different profiles: provide export/import migration, never assume shared saves.

Future iOS work starts with Safari installation/offline/file-picker checks and an explicit decision
about whether a native wrapper adds enough value. No store publication is claimed by this release.
