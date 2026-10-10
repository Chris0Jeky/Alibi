# Applied native metadata repair

PR #485, refs #126/#133. The canonical `android/gradle/verification-metadata.xml` now contains
both reviewed additions. Earlier retry records that call the patch unapplied describe older
heads and are superseded by this record. The patch remains as historical review evidence;
do not apply it a second time. A repaired trust file is not by itself a passing native build.

## Exact scope

The original 176,838 bytes, Git blob `aa58f817f15e5b7dbd20d4e5219f1c9272064829`, SHA-256
`f104aa9b18ef575cf97b76541943093c53f6b5dd12df16297d4b34b33886adad`, become 177,437 bytes,
Git blob `e183f62061b9bffc512ce69eaecdaaabd007214d`, SHA-256
`aa12c80d3baf0c65e251b7391e75b1e76c4e9bf1b292dd666d3bfff1e9a89b95`.
Only eight lines are added. Removing the two added blocks reproduces every original byte.
The component count changes from 391 to 392; all old artifacts and digests remain untouched.
No dependency version, repository, lockfile or verification mode changes.

The additions are the Guava parent 33.3.1-jre POM and the existing JUnit BOM 5.10.2 module.
Guava SHA-256: `55441db27e8869dfefe053059bdf478bdc7e95585642bf391f0023345fd56287`.
JUnit SHA-256: `de23b114b3e4119a8fe6eb17bed5a3852816698bace67071579d6d927ebb080a`.

## Provenance and publication

Read-only run [36640697713](https://github.com/Chris0Jeky/Alibi/actions/runs/36640697713)
retrieved the two public Maven Central artifacts. Artifact 11066148422 has archive SHA-256
`4824076c58aefac4a223a5d431ea4c3811cbeba24919a39e3e20f5dbfae17112`.
The complete 20,206-byte Guava POM agrees with the official
[Guava v33.3.1 root POM](https://github.com/google/guava/blob/v33.3.1/pom.xml),
Git blob `12c82a046ff012bb99e41e40789f7b4c9f77fef0`. Its SHA-256 sidecar was not published.
The 6,995-byte JUnit module agrees with its published Maven Central SHA-256 sidecar. These
checks are not represented as independent publisher-signature verification.

The exact transformation was rerun locally and checked against the retained after-digest.
[Run 36650833301](https://github.com/Chris0Jeky/Alibi/actions/runs/36650833301), source `ba4a851`,
then staged only that immutable Git blob. Its fixed inline job did not check out or execute
repository code, change branches, commit, merge, sign or deploy. The connected GitHub tools
published the canonical file in a separate commit and removed that one-use workflow from the
candidate tree. Routine native CI remains read-only and uses strict dependency verification.

## State history and remaining verification

The previous shortening of `docs/STATE.md` broke the phone-action history regression. Restore
the exact main state blob `d56913b39599122905728f409a226de31dea5714` rather than altering the
test or losing history. Current native-specific evidence lives in `docs/capacitor/` and the PR.

After this commit, strict compilation, lint, APK assembly, actual package/signature/alignment
audits and installed-package offline instrumentation must run again. No new APK or emulator
success is claimed by this document. Physical devices, TalkBack, minimum WebView, recovery,
PWA transfer, publisher identity and release approval remain independent open gates.
