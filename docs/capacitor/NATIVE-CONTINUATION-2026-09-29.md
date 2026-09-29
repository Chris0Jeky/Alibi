# Native continuation: current-head review repairs

Refs #120, #126, #130, #132 and #133; PRs #485 and #486. This is an unreleased
implementation handoff, not a claim that Android packaging or physical acceptance is complete.

## Delivered during the retry

PR #485 now audits all four generated executable Gradle scripts and rejects unexpected local
module inputs before compilation. See [GENERATED-INPUTS.md](GENERATED-INPUTS.md) and
[GENERATED-INPUT-RECONCILIATION.md](GENERATED-INPUT-RECONCILIATION.md). The fixture correction
was checked against actual CI output and the pinned CLI source, not accepted by weakening policy.

The smoke now binds its audit receipt to the installed APK's sourceDir before and after controls,
and refuses stale, missing, failed, skipped or wrong-context instrumentation evidence. See
[INSTALLED-APK-EVIDENCE.md](INSTALLED-APK-EVIDENCE.md). This test code is not a production plugin.

PR #486 separately verifies the native style actually emitted into the Android index, rejects
PWA leakage and uses those emitted bytes for its computed-style checks. It preserves the original
responsive assertions. No saved state, game rule, publisher identity or production permission changes.

Both branches are reconciled with main `1bbedd87ee2d0eeb3472fd51e7aafd0915eb2476` through the exact
fourteen non-overlapping changed blobs. The authoritative STATE/swarm records are retained intact.
Fresh integrated-head checks are required; results from earlier heads are identified below.

## Evidence and unresolved native build blocker

At `04b2404f7746539400595310182c0848e755dab2`, Android payload run 36639889451 passed.
Native run 36639889546 passed source/package regression groups and actual Capacitor generation,
including the corrected generated-input policy. It failed at strict Gradle verification before
APK assembly. No APK audit or emulator acceptance is claimed.

Artifact 11065707941 was downloaded and verified against ZIP SHA-256
`814d94809efe22ac3d420ef3d4451718e1732d954096504b07d6a066639a27a4`.
Its Gradle verification report names **missing checksums**, not mismatches, for exactly:

- `com.google.guava:guava-parent:33.3.1-jre`, `guava-parent-33.3.1-jre.pom`.
- `org.junit:junit-bom:5.10.2`, `junit-bom-5.10.2.module`.

The bounded read-only metadata-evidence workflow retrieves only those two public Maven Central
files, records their bytes and SHA-256 values, and compares published SHA-256 sidecars when
available. It refuses redirects, excess size and checksum mismatches. This is retrieval evidence,
not automatic trust: it never edits verification-metadata.xml, runs Gradle in a weaker mode,
changes dependency versions or pushes source. Review the resulting exact bytes and upstream
provenance before adding only the missing trust entries. Then rerun strict native compilation,
actual APK audits and installed-package smoke. Do not replace the existing trust database wholesale.

[Gradle's verification guidance](https://docs.gradle.org/current/userguide/dependency_verification.html)
explains why generated checksums require review and why disabling metadata verification weakens
protection. A sidecar from the same repository is useful integrity evidence, not an independent
publisher-signature verification. No new signature approval is asserted here.

## Validation scope and owner gates

The repaired local focused suite passed 58 Node tests, seven synthetic receipt groups and one
JVM group exercising the exact test hashing helper. PR #486's eight new artifact groups passed
locally. Its Android payload workflow 36639371830 passed at `e32a92d`; broader mobile-desk and
numbered-import workflows had failures requiring reconciliation, not a merge-ready verdict.
Local complete npm installation/build is unavailable, so source fixtures are not represented as
full application or device verification. Current-source CI and independent review remain gates.

HUMAN_TODO.md q-2/q-4/q-11 and issues #2/#11/#13/#118/#131 retain actual phone, affected-device,
TalkBack, gesture, IME, thermal and game-feel acceptance. q-3/#123 retains publisher and signing
custody. #127/#128 retain durable native recovery and explicit PWA transfer. No origin cleanup,
uninstall advice, automatic cloud backup, production signing, Play upload or deployment occurred.
