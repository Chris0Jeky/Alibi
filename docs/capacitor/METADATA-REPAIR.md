# Reviewed native metadata repair, not yet applied

Refs #126/#133 and PR #485. **The canonical `android/gradle/verification-metadata.xml`
remains unchanged.** This deliverable is an exact, locally apply-checked patch and its provenance,
not a claim that native CI is repaired. Apply it on the existing PR branch, commit the resulting
canonical XML and rerun strict native checks before treating that blocker as resolved.

## Exact evidence

Read-only run [36640697713](https://github.com/Chris0Jeky/Alibi/actions/runs/36640697713)
succeeded at source `539a0a8e509d758f421b126b5f6dcc464a4907a7`. Artifact 11066148422 was
downloaded, inspected and verified against ZIP SHA-256
`4824076c58aefac4a223a5d431ea4c3811cbeba24919a39e3e20f5dbfae17112`.
No trust metadata or source file was edited by that workflow.

Guava's 20,206-byte `guava-parent-33.3.1-jre.pom` came from the fixed HTTPS Maven Central
endpoint. Its SHA-256 is `55441db27e8869dfefe053059bdf478bdc7e95585642bf391f0023345fd56287`.
That endpoint did not publish a SHA-256 sidecar (404). Instead, the complete downloaded file's
Git blob hash was independently computed as `12c82a046ff012bb99e41e40789f7b4c9f77fef0`, exactly
matching the upstream [Guava v33.3.1 root POM](https://github.com/google/guava/blob/v33.3.1/pom.xml)
retrieved through the GitHub connector. The declared group, artifact and version were inspected.
This is exact full-file agreement with the upstream release, not just matching the version label.

JUnit's 6,995-byte `junit-bom-5.10.2.module` declares the expected release component and Gradle
platform constraints. Its SHA-256 is
`de23b114b3e4119a8fe6eb17bed5a3852816698bace67071579d6d927ebb080a`, independently recomputed
from the downloaded bytes and matching the published Maven Central `.sha256` sidecar. This
is not a claim of publisher-signature verification. The read-only workflow preserves the exact
fixed source URLs and labels automatic retrieval `trustApproved:false`; the two specific
checksum additions in this patch were manually reviewed against the evidence above.

## Apply and verify

Start with the canonical XML Git blob `aa58f817f15e5b7dbd20d4e5219f1c9272064829`, SHA-256
`f104aa9b18ef575cf97b76541943093c53f6b5dd12df16297d4b34b33886adad`. If it has changed, reconcile
new trust entries instead of overwriting them. The patch adds eight lines, removes none, preserves
all previous text exactly and introduces no new version selection, repository or verification mode.

```sh
git apply --check docs/capacitor/patches/native-metadata-review.patch
git apply docs/capacitor/patches/native-metadata-review.patch
# Expected SHA-256: aa12c80d3baf0c65e251b7391e75b1e76c4e9bf1b292dd666d3bfff1e9a89b95
sha256sum android/gradle/verification-metadata.xml
git diff --check
git diff -- android/gradle/verification-metadata.xml
```

Both `git apply --check` and actual application succeeded in a disposable local directory;
reverse checking also succeeded. Removing the two inserted blocks reproduced every original byte.
XML parsing verified 391 old components become 392: only the Guava parent component is new;
within existing components only the JUnit 5.10.2 module artifact is added, keeping its previous POM
checksum. The machine receipt records exact before/after/patch digests and explicitly says the
canonical metadata has not been updated. This guards the handoff against silently replacing the
trust database with the small patch or declaring its existence a passing Gradle build.

After committing only the intended canonical XML change, run the current native workflow with
`--dependency-verification=strict`, without automatic metadata regeneration. Additional missing
artifacts, if any, require the same individual investigation. APK assembly, merged-manifest and
payload audits, alignment/signature checks, installed-sourceDir binding and offline emulator
controls must all complete before a native CI pass is claimed. Physical-device, recovery/migration,
minimum-WebView and publisher/Play gates remain separate and open.
