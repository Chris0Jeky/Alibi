# Actual APK audit continuation

PR #485, 30 September 2026. The canonical metadata repair at `c3b396b` unblocked strict
Gradle compilation, lint and both `assembleDebug` and `assembleCapacitorPreview` in run
[36651012385](https://github.com/Chris0Jeky/Alibi/actions/runs/36651012385).
The unit-test tasks reported `NO-SOURCE`; successful task invocation is not Android unit-test coverage.
The job then stopped in the actual APK audit on the declared permission's protection value.
No emulator or release acceptance follows from that build.

Artifact 11070422735 was downloaded and its ZIP SHA-256 checked:
`b02a2f41753f5c8949fbf1db7f0cbe0f2bf72ea39a4992c94ce1dd4c816ee289`.
Direct inspection of the compiled preview APK's binary XML found only the expected internal
`example.unapproved.alibi.preview.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` declaration,
with integer type `0x11` and value `0x2`. Android defines `PROTECTION_SIGNATURE` as integer 2:
[official reference](https://developer.android.com/reference/android/content/pm/PermissionInfo#PROTECTION_SIGNATURE).

The audit previously accepted the symbolic value or eight-digit hex only. It now additionally
accepts decimal `2` and short hex `0x2`, without masking flags or accepting broader protection.
Three new regression groups first rejected the two equivalent decoded spellings, then passed;
18 weak, combined, malformed and unknown values and a different permission name remain rejected.
All nine retained synthetic package groups and seven receipt groups also passed locally.
The workflow runs the new tests and preserves the SDK-decoded debug and preview manifests before
policy evaluation so future decoding failures retain their evidence. No dependency, manifest,
permission, production behavior or verification mode is changed by this audit compatibility fix.

Current-head CI must independently confirm both package audits, signature/alignment checks and
installed-APK offline instrumentation. This document does not treat a synthetic manifest test as
an audited build. Physical Android, accessibility, recovery/transfer and signing/publication gates
remain in HUMAN_TODO.md and the existing CAP issues.
