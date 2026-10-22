# Android SDK setup diagnostics (#133)

## Changed

The emulator preparation step now records the SDK Manager version, disk
availability and installed package identities before and after installation.
Emulator and API 36 system-image installation output and the SDK Manager/tee exit
statuses are retained in the existing native artifact.

Both package installs still return the SDK Manager exit status. An install
failure records the available diagnostics and exits with that status. The
existing apt sequence, package arguments, emulator-version check, final package
listing, native smoke, timeout and artifact retention are unchanged. There is no
automatic retry or alternate package.

## Evidence and verification

On main commit `224f0df85e860f90f054d1bb40d0d15963d3f30b`,
[Android run 39517992683](https://github.com/Chris0Jeky/Alibi/actions/runs/39517992683)
failed in both attempts while preparing `x86_64-36_r07.zip` with
`Error on ZipFile unknown archive`. Build, compile, lint, APK assembly and package
audit passed; instrumentation did not run. The existing logs do not establish
transport truncation or disk exhaustion.

Successful exact-head Android runs for
[#726](https://github.com/Chris0Jeky/Alibi/actions/runs/39516519552) and
[#727](https://github.com/Chris0Jeky/Alibi/actions/runs/39516149772) installed the
same system-image revision and emulator package and passed the installed-app
smoke. The successful #726 run also used the failed retry's runner-image release
and region.

Local validation parsed the workflow YAML and checked its shell syntax. Eight
stubbed executions of the complete preparation block covered clean setup,
existing emulators, emulator and system-image failures, diagnostic tee failure,
combined SDK/tee failure, and the original emulator-version failure gate.
Installation failures preserved exit codes 17 and 23; emulator-version failure
preserved 19. Both applicable existing workflow contract tests passed.
Independent read-only review found no failure-propagation or gate regression.
Full hosted verification and native instrumentation remain required for the PR.

## Not verified and residual risk

This supplies diagnostics, not a causal repair for the invalid archive. The
archive can still fail to install, and that failure remains a failed check.
These receipts record disk/package state and setup output; they do not promise
HTTP-byte or archive-checksum evidence if SDK Manager does not emit it. They do
not resolve the earlier app callback stall.

No runtime, APK identity, production budget, device-save behavior or release
acceptance changed. #133 remains open. `HUMAN_TODO.md` retains physical-device and
owner acceptance.
