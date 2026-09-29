# Generated native inputs: review repair for PR #485

Refs #120, #126, #132 and #133. This extends the existing plugin-free Capacitor host,
not the application runtime or save model.

## Reason and contract

The first native sync audit checked copied web bytes and plugin JSON but did not check
executable generated Gradle scripts. An empty plugin registry does not prevent a generated
script from adding a local project or Java dependency. `native:sync` and its `--check` path
now enforce reviewed SHA-256 identities for all four generated Gradle scripts. Only CRLF to
LF normalization is allowed. Paths, Java target, version defaults and hooks cannot change
silently. Missing files, symlinks (including parent aliases), oversized inputs and unexpected
module Java/JAR/resource/configuration files are rejected before Gradle runs.

The generated Cordova module retains its reviewed source inventory. Its `build/` outputs
are allowed so the same check can run after compilation; the pinned scripts do not treat
that directory as an extra source or local-library location. Manifest semantics remain the
responsibility of the actual-APK merged-manifest audit, not these source hashes.

## Provenance and compatibility

Fixtures reproduce the plugin-free output of Capacitor CLI 8.5.2. The settings, app script
and variables are derived from `installGradlePlugins` / `handleCordovaPluginsGradle` in
[the pinned CLI source](https://github.com/ionic-team/capacitor/blob/8.5.2/cli/src/android/update.ts).
The generated module script derives from
[the pinned module template](https://github.com/ionic-team/capacitor/blob/8.5.2/capacitor-cordova-android-plugins/build.gradle),
Git blob `5edcbfd2c21f14844f5fe6128b9994f480105d24`, with the CLI's empty-dependency substitution.
The fixture directory retains the upstream MIT licence. No upstream version is upgraded.
The four accepted normalized digests live in `android/gradle/generated-inputs.json`.
A future plugin or CLI update needs an explicit policy/fixture review, not automatic trust.

## Observed verification and remaining gates

The new 19-case suite produced 17 failures and two passes against the previous missing
boundary. All 19 then passed; together with the retained sync and native/bootstrap suites,
51 Node tests passed, zero failures/skips, on Linux using the recovered source. This is
source-fixture evidence. Actual fresh CLI generation, formatter, full application verification,
strict native compilation, APK inspection and emulator tests still require current-head CI.

The earlier native run 36607566884 reached strict Gradle dependency verification and stopped
on two metadata artifacts. A separate checksum-only repair is requested on #485; do not disable
verification to get a green build. Installed-APK receipt binding and #486's emitted-CSS review
finding remain separate continuation tasks. Physical Android, TalkBack, publisher identity,
signing and Play publication are not established by this patch. HUMAN_TODO.md remains the
owner/device gate; no existing gate is closed here.
