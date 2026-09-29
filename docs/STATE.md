# Live development state

## Android review continuation, unreleased: 29 September 2026

PR [#486](https://github.com/Chris0Jeky/Alibi/pull/486) now reserves the expanded native dock
in the scrollable content, preserves the 95/93/89px responsive bases, and leaves House/fullscreen
Block padding ownership intact. The new regression uses actual #main/playing/body selectors and
hit-tests the final scrollable action. It passed 180 local source-fixture cases. Partial native
lifecycle-suppression CSS is now rejected in inline and external web output; twelve previously
accepted leak subcases now reject. At head `27bcf3fb182dc926f6b07cfbfd592ad695571dfc`, the Android
payload workflow 36644982720, mobile desk and Wrenmere checks passed. Full checks and independent
review remain separate gates; consult the exact-head PR state before merging.

PR [#485](https://github.com/Chris0Jeky/Alibi/pull/485) also pins the generated Cordova manifest,
closing the inventory-only gap for package queries, hardware features and private components.
Four mutation regressions reproduced the gap; 27 generated-input tests pass locally after repair.
The expected manifest comes from the pinned CLI generator, not the different source template.
See [GENERATED-INPUTS.md](capacitor/GENERATED-INPUTS.md).

The two reviewed Maven metadata additions have been reconstructed locally into a complete XML
file and checked against the retained expected after-digest. **The canonical repository XML is
still unchanged.** Its strict Gradle failure therefore remains a build blocker. The authoritative
repair and before/after/patch hashes are in [METADATA-REPAIR.md](capacitor/METADATA-REPAIR.md).
Do not claim an APK or emulator pass from source fixtures or a supplied patch.

## Existing native work and evidence

The existing Capacitor program [#120](https://github.com/Chris0Jeky/Alibi/issues/120) retains one
shared renderer and save authority. Read the [readiness audit](capacitor/NATIVE-READINESS-2026-09-29.md),
[foundation plan](capacitor/NATIVE-FOUNDATION-PLAN.md) and
[retry handoff](capacitor/NATIVE-CONTINUATION-2026-09-29.md). #485 contains generated-input and
copied-payload auditing, actual-APK policy/CI and installed-sourceDir receipt binding. #486 contains
native-only inset consumption and emitted-CSS verification. No new wrapper or native plugin is added.

Both branches preserve main `1bbedd87ee2d0eeb3472fd51e7aafd0915eb2476`. The incomplete earlier
#485 reconciliation was corrected at `f32964a`: eight omitted/reverted main files were restored by
exact Git blobs. Its final main-to-head comparison contained no unrelated source/test reversions.
Older-head results in the handoff are historical, not acceptance of a later candidate.

## Preserved game development and release history

The complete preceding state record is retained byte-for-byte in
[STATE-BEFORE-NATIVE-RETRY-2026-09-29.md](STATE-BEFORE-NATIVE-RETRY-2026-09-29.md),
Git blob `d56913b39599122905728f409a226de31dea5714`. It stays in the same directory so relative
links retain their meaning. This includes session-2 swarm work, its backlog and every earlier
release section. Current shared-code activity remains in [the swarm plan](qa/2026-09-29-swarm/PLAN.md).
Hosted release evidence remains in [RELEASE-0.15.0.md](RELEASE-0.15.0.md), not native draft results.
No deployment or production signing occurred in this continuation.

## Owner and device gates

[HUMAN_TODO.md](../HUMAN_TODO.md) remains authoritative. q-2/q-4/q-11 and issues
#2/#11/#13/#118/#131 retain affected-phone, real Android interaction, TalkBack, large text,
gestures, IME and sustained game-feel checks. q-3/#123 retains publisher identity and signing
custody; #127/#128 retain durable native recovery and explicit PWA transfer. Neither Chromium
fixtures nor an emulator close physical-device gates. No player storage, save formats, puzzle
revisions, application identity, production permissions or existing origins changed here.
