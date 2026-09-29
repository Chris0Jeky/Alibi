# Live development state

## Native Android continuation, unreleased: 29 September 2026

The native work continues the existing Capacitor program [#120](https://github.com/Chris0Jeky/Alibi/issues/120),
not a second renderer or a new save authority. Start with the
[native-readiness audit](capacitor/NATIVE-READINESS-2026-09-29.md),
[implementation plan](capacitor/NATIVE-FOUNDATION-PLAN.md) and
[retry handoff](capacitor/NATIVE-CONTINUATION-2026-09-29.md).

Two focused drafts contain the deliverables:

- [#485](https://github.com/Chris0Jeky/Alibi/pull/485): generated native-input auditing,
  actual-APK policy and CI, installed-package receipt binding, architecture and continuation evidence.
- [#486](https://github.com/Chris0Jeky/Alibi/pull/486): native inset consumers, responsive isolation
  and verification of the actual emitted stylesheet rather than only its source constant.

Both were reconciled with main `1bbedd87ee2d0eeb3472fd51e7aafd0915eb2476` without replacing
its fourteen non-overlapping changed files. This record does not claim either draft was merged,
an APK was built by this retry, or anything was deployed. Consult their latest exact-head CI and
review receipts before integration; the source-bound results below are not interchangeable heads.

## Checked results and the next blocking step

The repaired native-focused local suite passed 58 Node tests, seven synthetic receipt groups and
one JVM test group exercising the exact installed-APK hashing helper. At `04b2404`, Android
payload verification passed; real Capacitor generation and generated-input checking also passed,
but strict Gradle dependency verification stopped before APK assembly on two missing metadata
checksums. No APK audit or emulator pass follows from those source checks.

The [metadata repair](capacitor/METADATA-REPAIR.md) now contains two reviewed checksum additions,
full provenance and an exact apply-checked patch. Guava's downloaded POM matches its upstream
release file byte-for-byte; JUnit's module digest matches its published checksum. **The canonical
verification-metadata.xml is unchanged.** Apply the reviewed patch on #485, commit that XML change,
and rerun strict native compilation, APK auditing and installed-package smoke. Do not disable
verification, replace old trust entries or treat the patch file as an already applied fix.

For #486, Android payload run 36639371830 passed on `e32a92d`. Its downloaded artifact was
hash-verified: all 144 computed-style scenarios use emitted native CSS, with exact Android/web
index and stylesheet hashes and `sourceDirty:false`. Eight new artifact regression groups also
pass locally. At integrated head `96cbcb9`, Android payload, mobile desk, Wrenmere, numbered import
and planning-vault workflows passed at the last check; broader verification was still running.
These are browser/source results, not actual phone, TalkBack or native inset-injection acceptance.

## Preserved game development and release history

The complete preceding STATE file is retained byte-for-byte in
[STATE-BEFORE-NATIVE-RETRY-2026-09-29.md](STATE-BEFORE-NATIVE-RETRY-2026-09-29.md),
using its existing Git blob `d56913b39599122905728f409a226de31dea5714`. It stays in the same directory
so all relative links retain their meaning. This includes the current session-2 swarm record,
its unresolved backlog, earlier native preview evidence and all release/history sections.
The native handoff does not remove, reclassify or supersede those observed results.

Current shared-code activity remains in [the swarm plan](qa/2026-09-29-swarm/PLAN.md).
Hosted release evidence remains in [RELEASE-0.15.0.md](RELEASE-0.15.0.md) and the archived
per-origin receipts, not in the native draft results above. Existing research/content PRs retain
their own integration ownership; reconcile their STATE changes rather than discarding history.

## Owner and device gates

[HUMAN_TODO.md](../HUMAN_TODO.md) remains authoritative. q-2/q-4/q-11 and issues
#2/#11/#13/#118/#131 require affected-device recovery, real Android interaction, TalkBack,
large text, gestures, IME and sustained game-feel/performance acceptance. q-3/#123 retains
publisher/application identity and signing custody. #127/#128 retain durable native recovery
and explicit PWA transfer. Neither a Chromium viewport nor an emulator can close physical gates.

No player storage was cleared, no save format or puzzle revision changed, no new production
permission or runtime plugin was introduced, and no signing key, Play credential or player backup
was published by this retry. Both existing web origins remain unchanged.
