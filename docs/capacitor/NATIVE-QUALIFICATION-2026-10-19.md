# Native foundation qualification at 08680d4

This record qualifies the bounded native-foundation checks completed for the non-publishable
Android preview. It does not close CAP-04, CAP-10, CAP-11, the larger native transition, or any
physical-device or release gate.

## Exact source and native evidence

- **Source:** `08680d45549b2c00673e0c6314edb7437f8505cd`, reconciled with main
  `aea3dda641edcee9c0e52126abe0aa0288344406`.
- **Native run:** [39306446758](https://github.com/Chris0Jeky/Alibi/actions/runs/39306446758),
  exact source head above, completed successfully on 19 October 2026.
- **Artifact:** [12213928744](https://github.com/Chris0Jeky/Alibi/actions/runs/39306446758/artifacts/12213928744)
  (`android-native-08680d45549b2c00673e0c6314edb7437f8505cd`), archive SHA-256 `c48a4d73dce79a0bd616bef08e3f9315b6936798d8875b5e4df36de4a0bdd9c9`,
  34,536,770 bytes. The artifact's source receipt names the same full source SHA.
- The job passed the native payload build, strict Gradle compilation/lint/assembly, static audits of
  both APKs, signature and 16 KiB alignment checks, emulator preparation, offline installed-host
  instrumentation, and its unchanged-source/dependency-lock check.

The debug package receipt reports SHA-256
`88efcaec0158d31ddeac9b075348b7f0cdcc71253191cd894fb4227edf281ec4` and 35,044,964 bytes. The
installed smoke receipt binds this identity to the package read from Android's installed
`sourceDir` both before and after instrumentation, and records package-receipt SHA-256
`8bf8ae2da322f07deb23dbd0ad6f29b3d7d10110d1443dd5fa3908b534eb1708`. The debug APK binary is
not in the archived artifact; this digest comes from the on-device identity and package receipts,
not a re-hash of an archived debug APK.

The instrumentation XML records exactly one test:
`NativeOfflineSmokeTest.nativeHostBootsAndNavigatesOffline` — 1 test, 0 failures, 0 errors, 0
skipped; test time 15.138 seconds and suite time 16.958 seconds. The emulator was API 36 with
airplane mode enabled. The test checked the local `https://localhost` origin, native/preview build
identity, offline-ready status, Settings navigation, and absence of PWA service-worker
registrations. The receipt explicitly records `physicalDeviceAccepted: false` and
`productionApproved: false`.

The runner selects `:app:connectedDebugAndroidTest`, the installed app's instrumentation task.
A prior aggregate selector also reached the generated
`capacitor-cordova-android-plugins` library's separate test-APK variant and failed on duplicate
Kotlin stdlib classes. The qualified app test does not claim that generated library variant has
its own instrumentation coverage; the app's required project dependencies still build.

The preview `capacitorPreview` APK was statically audited at SHA-256
`c0a20d7f2ac22035d4cb5a9380fc106aec7e97c58a29fa6b8f1c1bb22420f51c` and 33,946,442 bytes. Its
archived APK was re-hashed. The audit accepted the two pinned baseline profiles. The preview APK
was built and audited, but this run did not install or launch it; the installed smoke used the
separately audited debug APK.

This is one installed-host smoke, not gameplay coverage. It does not prove that every advertised
game works offline, that a release-like preview launches on-device, or that process-death,
recovery, document-picker or minimum-WebView behaviour is accepted. This native workflow receipt
also does not stand in for the separate full-repository `verify` workflow; consult the exact PR
checks before claiming that gate passed.

## Separate full-repository qualification

All nine PR workflows for the source above completed successfully before #485 merged as
`27c2d76162689cccc1a0fb450ef342ca770043c2`. The separate
[full verification run 39306446580](https://github.com/Chris0Jeky/Alibi/actions/runs/39306446580)
reported **1,959 tests, 1,959 passed, zero failures or skips**. It also completed Quiet Wing
581,856 engine assertions and 91 adapter assertions, the full browser/storage/offline sequence,
18 mobile QA tests, release-update preservation and the local Cloudflare fixture.

That workflow checked out synthetic merge `123c0f12d1044b56f1b9c27b8e755ab8d69ee4a8`, whose
tree is identical to the exact PR head: `5aa5fffd99b70452f1ca68e8d2dc128472f115d2`. Its build
identity correctly names the synthetic SHA; the native receipts above name the exact head.
Application gzip was 134,682 bytes against 134,944, and initial code/content gzip was 203,172
against 225,280. No limit was raised. These are source-specific results; later source changes
require their own qualification.

## Remaining engineering and owner acceptance

The native-foundation slice supplies a pinned host, fail-closed generated-input and APK checks,
and a bound offline debug-host smoke. The referenced work packages remain open because their
acceptance is broader than that slice:

- **CAP-04 / #126 — pinned Android host:** still needs evidence for every advertised game in
  airplane mode, the chosen minimum WebView, release-like preview launch, and complete bounded
  startup/recovery behaviour. The current run assembles and audits the preview APK but only installs
  the debug APK.
- **CAP-10 / #132 — security and privacy:** package/config/manifest checks do not complete the
  network/request inventory, Data Safety and privacy review, Android/OEM backup-transfer behaviour,
  or security testing for imported files, external paths and deep links. The broad FileProvider path
  policy remains a gate before enabling native document transport.
- **CAP-11 / #133 — native CI:** the current lane now builds and audits actual APKs and executes one
  installed offline smoke. Continue the OS/WebView, feature, lifecycle, upgrade and transfer/recovery
  coverage as CAP-05 through CAP-09 land; keep physical-device evidence distinct from emulator
  results.
- **CAP-05/#127, CAP-06/#128, CAP-08/#130 and CAP-09/#131** still own save registry/recovery,
  user-controlled document transfer, lifecycle/back/insets/external results, and physical game feel,
  accessibility and performance. They are not established by the current host smoke.

Owner gates remain separate in [HUMAN_TODO.md](../../HUMAN_TODO.md): affected-phone installation,
offline relaunch, backup export, large text and TalkBack; publisher/name and signing ownership;
physical accessibility/performance checks; and genuine store testing and approval. All seven release
gates in `docs/capacitor/plan.json` remain pending. No issue closure, physical-device acceptance,
production identity, signing approval or Play release is claimed here.
