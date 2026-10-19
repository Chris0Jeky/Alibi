# Native foundation implementation plan

**Goal:** make the existing non-publishable Android host continuously inspectable and fail closed at sync/package boundaries.

**Spec:** [Native readiness audit](NATIVE-READINESS-2026-09-29.md). Refs #126, #132 and #133; inset work is a separate #130 slice. Execute in the current isolated archive-derived branch and publish all source, tests and documents through PRs.

## Constraints

Keep `example.unapproved.alibi.preview`, `https://localhost`, Capacitor 8.5.2, Gradle 8.14.3, AGP 8.13.0, SDK 36/minSdk 24 and existing locks. No new game/save schema, plugin, remote URL, production signing, budget increase or generated assets committed. Do not conflate debug-signed non-debuggable preview with release-minification coverage. Use the existing JDK 21 language target. The checked-in wrapper checksum must be verified before execution.

## Interfaces and work units

### 1. Fail-closed native sync

Files: `tools/android-host-policy.cjs`, `tools/sync-android.cjs`, `tests/android-host-policy.test.cjs`, existing `tests/android-build.test.cjs` fixtures.

- [ ] Write regressions against `checkPublicPayload({source, target})` for missing/empty trees, symlinks, unexpected executable Cordova bytes, malformed/nonempty plugin registry, changed server/config and stale/missing copied files. Observe the baseline failures.
- [ ] Implement `checkPreviewConfig(value): string[]` with the exact reviewed configuration and no unknown fields. JSON object-key order must not matter. Keep policy independent of build dependencies.
- [ ] Reject non-regular generated inputs before reading them, validate the source config before invoking sync, then check the generated config, empty plugin registry, empty Cordova files and exact copied bytes. Return bounded diagnostics, not successful empty inventories. No silent repair or output mutation during checking.
- [ ] Update the old permissive fixture to the actual pinned upstream empty-plugin format. Run source regressions and all existing platform suites.

### 2. Inspect the package, not just source config

Files: `tools/check-android-package.py`, `tests/test_android_package.py`, explicit manifest cleartext setting.

- [ ] Write synthetic ZIP/decoded-manifest tests for valid debug and preview packages, missing/extra/tampered web and native bridge assets, duplicate/unsafe/symlink entries, unexpected native libraries, source identity mismatch and manifest policy violations. Label these as synthetic, not APK compilation.
- [ ] Implement an offline package inspector. The CLI invokes `apkanalyzer manifest print` on the exact supplied APK; it cannot accept a caller-substituted manifest file. Compare the complete APK asset set to checked sync assets plus the pinned Capacitor native bridge. Validate preview identity, SDK/version, backup/cleartext/debug flags, exported components and permissions.
- [ ] Write a source/APK/hash-bound JSON receipt only after all checks pass. Use synthetic fixtures only in public artifacts. Native libraries remain an explicit newly required review, not an automatic allow.
- [ ] Run the Python tests and rerun related Node suites.

### 3. Real native CI and first installed-host smoke

Files: `.github/workflows/android-native.yml`, a small Android instrumentation test under `android/app/src/androidTest/`, supporting source checks as needed.

- [ ] Use read-only permissions and SHA-pinned checkout/setup/artifact actions, checkout the PR head explicitly, disable persisted checkout credentials and preserve full source SHA receipts. No `pull_request_target`, environment secrets, signing keys, source edits, commits or deployment.
- [ ] Validate the wrapper, install locked dependencies, build/sync once and run locked Gradle lint/tests plus debug and non-debuggable preview assembly without regenerating locks/verification metadata.
- [ ] Audit the actual APKs and capture toolchain/payload/package receipts. Retain failure diagnostics without representing failed checks as passing.
- [ ] Add a real WebView instrumentation smoke for native origin/adapter, hydrated UI and no service-worker registration. Run with emulator network disabled. Keep gameplay/process-death/picker/minimum-WebView and physical acceptance explicitly outside this first smoke.
- [ ] Review exact-head workflow output and package evidence. Request independent review and only merge under existing gates. If CI cannot complete, leave a clearly explained draft and preserve runnable work.

## Review focus

Generated config is privileged input, not trusted because the CLI wrote it. JSON key order is irrelevant but unknown configuration is not. Empty source trees must never pass. A library asset outside `assets/public` must still be bound. Debuggable manifest defaults differ across variants. XML resources and manifest merging need real-tool evidence. A WebView bridge existing does not establish app hydration. No fallback should turn a failed emulator check into a desktop-browser success.

## Execution ledger

Baseline source/native tests: 6 passed. npm offline dependency installation: blocked by uncached `youch-core@0.3.3`; full application verification is not available locally yet. Subsequent task evidence belongs in a dated PR receipt. Planned steps above do not claim completed implementation.

Candidate source evidence: 36 Node tests passed (26 sync-policy cases, four workflow/manifest
contracts and six existing adapter/bootstrap tests). The old sync checker failed 24 of the new
policy cases before implementation. Nine Python synthetic-package test groups and shell syntax
validation passed. Native compilation/instrumentation and full repository verification remain
pending exact-head CI; workflow source is not execution evidence.
