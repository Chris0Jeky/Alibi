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

## Reconciliation and the final-diff correction

The first reconciliation copied fourteen non-overlapping files from current main
`1bbedd87ee2d0eeb3472fd51e7aafd0915eb2476`. That was complete for #486, whose final compare
contains only its eight intended feature/document/test files. It was **not complete for #485**:
its retained base was older. The final main-to-candidate comparison at `b58dc74` exposed eight
additional missing or reverted files. They were restored using their exact current-main blobs:

- `src/challenge-storage.js` and `src/validator-worker.js`.
- `tests/challenge-restore.test.cjs`, `tests/core.test.cjs`, `tests/theatre.test.cjs`,
  `tests/validator-worker.test.cjs` and `tests/voices.test.cjs`.
- `docs/qa/2026-09-29-swarm/tasks/fix-serve-harden.md`.

No main branch was changed by the incomplete intermediate draft. The correction is preservation
of existing work, not a new implementation of those fixes. Require a complete main-to-head diff
with no unrelated deletions/reverts and fresh exact-head checks before integration. The prior
STATE file is preserved by its exact Git blob in the same-directory archive linked from STATE.md;
its release and swarm history is not discarded by the new native handoff index.

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

Read-only metadata run 36640697713 retrieved the two public artifacts without changing sources.
The [reviewed repair](METADATA-REPAIR.md) records full-file agreement between the Guava POM and
its upstream release, plus JUnit's published SHA-256 match. The patch was actually applied and
reverse-checked in a disposable local directory while preserving all old trust bytes.
**The canonical Gradle metadata remains unchanged.** Apply and commit that bounded repair on
#485, then rerun strict compilation, actual APK audits and installed-package smoke. Do not replace
the existing trust database wholesale or represent the supplied patch as an already passing build.

[Gradle's verification guidance](https://docs.gradle.org/current/userguide/dependency_verification.html)
explains why generated checksums require review and why disabling metadata verification weakens
protection. A sidecar from the same repository is useful integrity evidence, not an independent
publisher-signature verification. No new signature approval is asserted here.

## Validation scope and owner gates

The repaired local focused suite passed 58 Node tests, seven synthetic receipt groups and one
JVM group exercising the exact test hashing helper. PR #486's eight new artifact groups passed
locally. Its Android payload workflow 36639371830 passed at `e32a92d`; after reconciliation,
Android payload, mobile desk, Wrenmere, numbered-import and planning-vault workflows passed at
`96cbcb9`. Broader checks and fresh independent review remained pending at that observation.
Local complete npm installation/build is unavailable, so source fixtures are not represented as
full application or device verification. Current-source CI and independent review remain gates.

HUMAN_TODO.md q-2/q-4/q-11 and issues #2/#11/#13/#118/#131 retain actual phone, affected-device,
TalkBack, gesture, IME, thermal and game-feel acceptance. q-3/#123 retains publisher and signing
custody. #127/#128 retain durable native recovery and explicit PWA transfer. No origin cleanup,
uninstall advice, automatic cloud backup, production signing, Play upload or deployment occurred.
