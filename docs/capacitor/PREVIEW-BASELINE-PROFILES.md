# Reviewed preview baseline profiles

The APK audit permits exactly two generated baseline-profile files in the
`capacitorPreview` variant. Both are required. Their byte lengths and SHA-256
digests are literal policy constants in `tools/check-android-package.py`:

| APK path                       | Bytes | SHA-256                                                            |
| ------------------------------ | ----: | ------------------------------------------------------------------ |
| `assets/dexopt/baseline.prof`  |  2499 | `424a8e2a0781c9716324b36469668e9609c7f9a7875b8bccffb7620e6243fa12` |
| `assets/dexopt/baseline.profm` |   233 | `eeb2ed7dc9a760c75e98ccd87f369e683cc3fb8e160cf51c8ccebcd64fccfd60` |

This is a reviewed-byte policy for generated output. It is not a directory
allowance, and the verifier does not calculate its expected digests from the APK,
synced assets or a new build. Missing, changed, extra, duplicate and symlink
profile entries are rejected. Debug APKs must contain neither file. Synced asset
inputs must not supply any `assets/dexopt/` file, including these exact bytes.

## Build provenance

The reviewed pair was extracted from the retained, non-publishable preview APK
from [Actions run 39267119171](https://github.com/Chris0Jeky/Alibi/actions/runs/39267119171),
[job 118109488481](https://github.com/Chris0Jeky/Alibi/actions/runs/39267119171/job/118109488481).
The connector's artifact digest was compared with an independent SHA-256 of the
downloaded ZIP before inspecting its nested APK.

| Evidence             | Identity                                                                  |
| -------------------- | ------------------------------------------------------------------------- |
| Source commit        | `e838e23ee83507672187c7c97e8af7f43b3e371c`                                |
| Source tree          | `1fa3bb897e6449594730733b33f9fb262b0737e4`                                |
| Actions artifact     | `12192639293`                                                             |
| Artifact ZIP SHA-256 | `15ebd5a273a25867e5e075c457640478c4de8890b8bbcf3c5f25ea60ac722f54`        |
| APK path in artifact | `android/app/build/outputs/apk/capacitorPreview/app-capacitorPreview.apk` |
| APK bytes            | `33946014`                                                                |
| APK SHA-256          | `1d2f7aff678a7dc6006d6f791bd168fd7b7a81eead90577788e1bd0d3be50700`        |
| Application ID       | `example.unapproved.alibi.preview`                                        |
| Variant              | `capacitorPreview`                                                        |

The retained `test-results/native/source-sha.txt` identifies the same source
commit. Exact-head logs show strict dependency verification, native sync closure,
lint and assembly succeeding. They include
`:app:mergeCapacitorPreviewArtProfile` and
`:app:compileCapacitorPreviewArtProfile` before successful assembly. The debug
APK audit passed with 310 assets; the preview audit then stopped at its asset-set
check because these two generated files were absent from the old policy.

This provenance records the actual reviewed output of that build. It does not
establish which dependency supplied each profile entry or prove that a new build
will reproduce the same bytes. The archive does not retain the merged profile
intermediates needed for that attribution. If attribution becomes necessary,
retain the inputs and outputs of the merge/compile profile tasks, their resolved
dependency graph and checksums in a strict exact-head build, then compare them
with this pair. Do not replace a failed pin with a digest copied automatically
from the candidate APK.

## Binding and regression evidence

The profile allowance does not replace the existing source and APK checks. The
CLI still requires a clean current checkout and verified native sync. Its audit
compares all other APK assets byte for byte with checked synced assets and the
installed pinned bridge, checks the native build identity against the current
source SHA, and checks the decoded manifest's preview application, version and
variant contract. The receipt retains the whole APK digest, source SHA and
`productionApproved: false`; its new `baselineProfiles` field records the accepted
profile path, length and digest. Debug receipts record an empty list. These checks
do not claim that the APK's DEX is reproducible or independently bound byte for
byte to its source.

The text fixture
`tests/fixtures/native-apk-profiles/reviewed-preview.json` stores the reviewed
bytes as base64 alongside the observed build identities. It is test input only;
the production verifier never loads it. The tests compare the decoded fixture
with the separately declared policy constants and exercise the actual ZIP audit.
They cover the accepted pair, either or both files missing, truncation, growth,
same-length tampering, swapped contents, unknown names, duplicate and symlink
entries, both debug and preview synced-input contamination, and profiles in a
debug APK. Existing manifest, source identity, asset and bridge checks continue
to run with the pair present.

Current-head CI must rerun the full CLI against freshly built debug and preview
APKs before this continuation is considered verified. Local synthetic ZIP tests
and inspection of the retained profile bytes do not replace that run. Emulator
offline/restore evidence, physical-device acceptance, signing and publication
remain separate gates in `HUMAN_TODO.md` and the existing native acceptance plan.
