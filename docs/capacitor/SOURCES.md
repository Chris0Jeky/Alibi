# Sources and version receipt

Research date: **2026-09-11**. This is a planning snapshot, not an installed dependency lock or a certification of Play eligibility. Recheck at native scaffolding, every material dependency change and every store submission. Repository evidence is pinned in [SOURCE-AUDIT.md](SOURCE-AUDIT.md).

## S01 — Capacitor toolchain

- [Capacitor 8 migration guide](https://capacitorjs.com/docs/updating/8-0): Node 22+, Android Studio Otter 2025.2.1+, Android minSdk 24 / compileSdk 36 / targetSdk 36. Its migration baseline uses AGP 8.13.0 and Gradle 8.14.3; Kotlin 2.2.20 is relevant when Kotlin is used. Reconcile these with the actual generated template before locking a new host.
- [Capacitor 8.5 migration guide](https://capacitorjs.com/docs/updating/8-5): inspect minor-version changes too. The documented 8.5 migration concerns iOS UIScene; do not assume an Android plan automatically supplies a current iOS release pipeline.
- [Environment setup](https://capacitorjs.com/docs/getting-started/environment-setup) and [Android project workflow](https://capacitorjs.com/docs/android).

The following values were returned by public npm registry `npm view <package> version` queries on the research date. They are **candidate pins**, not a claim that this combination has been built here:

| Package | Observed version | Planned use |
| --- | --- | --- |
| `@capacitor/core` | 8.5.1 | Native runtime entry; do not inject into the web bundle unnecessarily |
| `@capacitor/cli` | 8.5.1 | Development/build tool |
| `@capacitor/android` | 8.5.1 | Android host |
| `@capacitor/app` | 8.1.1 | Lifecycle/back/external results |
| `@capacitor/haptics` | 8.0.2 | Optional feedback |
| `@capacitor/filesystem` | 8.1.3 | Reviewed app-private file operations if needed |
| `@capacitor/share` | 8.0.1 | Optional user-directed sharing |
| `@capacitor/file-transfer` | 2.0.5 | Deferred optional media transfer |

Example immutable registry receipt: [core 8.5.1](https://registry.npmjs.org/@capacitor%2fcore/8.5.1). The CLI reported `node >=22.0.0`. JDK 21 is a **proposed project baseline** to verify against the selected Gradle/AGP template, not a separately verified universal Capacitor requirement. Plugins do not all have the core package's version number. SystemBars is supplied by core; do not invent a separate package for it.

## S02 — Host configuration and storage

- [Configuration](https://capacitorjs.com/docs/config): Android defaults to the HTTPS scheme and localhost hostname; iOS's capacitor scheme is different. Remote `server.url` and extra `allowNavigation` entries are not intended for production. Android's configured error page cannot use Capacitor plugins.
- [Storage guidance](https://capacitorjs.com/docs/guides/storage): browser storage has platform-specific durability limitations; small key/value preferences are not a database substitute.
- [Development workflow](https://capacitorjs.com/docs/basics/workflow): native projects are maintained source; copying/synchronizing built assets is distinct from creating the project.

## S03 — Device APIs

- [App](https://capacitorjs.com/docs/apis/app): lifecycle events, launch URLs, restored external-activity results and back handling. Registering a back listener replaces the default behaviour.
- [SystemBars](https://capacitorjs.com/docs/apis/system-bars): edge-to-edge handling and CSS inset fallbacks, including the documented older-WebView inset issue.
- [Haptics](https://capacitorjs.com/docs/apis/haptics).
- [Filesystem](https://capacitorjs.com/docs/apis/filesystem): `downloadFile` is deprecated in favour of FileTransfer; file-provider/content-URI details require Android testing.
- [FileTransfer](https://capacitorjs.com/docs/apis/file-transfer) and [Share](https://capacitorjs.com/docs/apis/share).

## S04 — Android data and security

- [Storage Access Framework](https://developer.android.com/training/data-storage/shared/documents-files): user-selected documents rather than blanket shared-storage access.
- [AtomicFile](https://developer.android.com/reference/android/util/AtomicFile): a building block for recoverable file replacement, not a cross-database transaction or concurrency lock.
- [Auto Backup](https://developer.android.com/identity/data/autobackup): explicit backup/transfer rules and manufacturer-dependent behaviour need testing; a single manifest flag is not sufficient proof of every transfer scenario.
- [Insecure WebView native bridges](https://developer.android.com/privacy-and-security/risks/insecure-webview-native-bridges): privileged bridge exposure changes the threat model.
- [Android 16 behaviour changes](https://developer.android.com/about/versions/16/behavior-changes-16): review edge-to-edge, back and adaptive layouts for the actual target.

## S05 — Store compatibility

- [Target API requirements](https://developer.android.com/google/play/requirements/target-sdk): the page checked here requires new phone apps and updates to target Android 16 / API 36 from 31 August 2026. Device-category exceptions do not apply to Alibi's proposed phone game.
- [16 KB page-size guidance](https://developer.android.com/guide/practices/page-sizes): inspect transitive native libraries as well as your own code. The page checked here states API-35+ compatibility requirements and a **1 February 2027** update-blocking date. Do not reuse an older date from chat; verify the actual Console warning at submission. Plan to pass compatibility now rather than depend on an extension.
- [August 2026 app-quality guidance](https://developer.android.com/blog/posts/elevating-app-quality-reducing-memory-usage-and-improving-device-migration): review current memory/device-migration guidance during acceptance. Alibi does not need an account system simply because some migration guidance addresses signed-in apps.

## S06 — Play account, testing and signing

- [Developer account setup](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en): registration, verification and current fee. No account was created or fee paid by this plan.
- [New personal-account testing](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en-GB): applicable accounts created after 13 November 2023 need at least 12 continuously opted-in closed testers for 14 days, followed by an application for production access. This is not automatic approval and an internal test is not the qualifying closed test.
- [Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756?hl=en): distinguish upload credentials from certificates used on distributed applications.
- [Staged rollouts](https://support.google.com/googleplay/android-developer/answer/6346149?hl=en): applies to updates, not an initial production launch; a halt does not revert users already updated.

## S07 — Publication automation and disclosures

- [Google Play Developer API setup](https://developers.google.com/android-publisher/getting_started): service-account/API/Play permissions require provisioning and an authenticated proof.
- [GitHub OIDC with Google Cloud](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-google-cloud-platform): workload identity can remove a long-lived service-account key when the chosen uploader supports the resulting authentication.
- [Play Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en): declarations must match the actual application and SDKs, including optional collection. Audit requests rather than inferring privacy from the absence of accounts.

## Evidence discipline

Upstream facts above inform the proposal; architectural choices elsewhere are Alibi-specific recommendations. A documentation check does not test a plugin, emulator, physical phone, account, signing key or Play submission. Do not copy private identity records, tester emails, signing material or player saves into this public repository. Store redacted verification outcomes and exact artifact identifiers instead.
