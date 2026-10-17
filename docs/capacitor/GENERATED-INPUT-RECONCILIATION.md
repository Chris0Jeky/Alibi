# Generated input and formatting reconciliation

Continuation of #485, after the independent generated-input review repair. Native run
36638075149 at `1e1886c4e1d451aa2117d232a11cd38c601f4fc6` retained the four actual generated
Gradle scripts. Artifact 11065432918 was downloaded and its ZIP digest independently checked:
`7fcfc7a81cebf5b9dc7f4c098479d34e2029f32f1bcfae3c03cc4f14d3611f6c`.

Exactly one script differed from the first reconstructed fixture: the Cordova module's
extension section contains `apply from: "cordova.variables.gradle"`. This was not unexpected
third-party code. It is explicitly pushed by `handleCordovaPluginsGradle` in the pinned
[Capacitor CLI 8.5.2 source](https://github.com/ionic-team/capacitor/blob/8.5.2/cli/src/android/update.ts),
blob `16e8c4935f1a1560eb3be9a28ca8ff96cdf8b77e`, before the substitutions previously inspected.
The imported variables file already has its own exact policy digest. The corrected fixture is
byte-identical to the retained generated file and hashes to
`28e3fa281f4d1e388bf98abc7f5bb31e672516e385c165c719d201ed54b8236e`.
The other three accepted hashes are unchanged. No arbitrary-code exception, broader
normalization, dependency upgrade or new trust source is introduced.

Formatter outputs were also recovered from artifact 11064803452, ZIP SHA-256
`a684b6988905b55e63105c5d83b7559186d8dea40d748c657b1423905445b8df`.
Only the changed JavaScript formatting was applied; the CI job itself never rewrites sources.
After both repairs, all 58 focused Node tests and the seven Python receipt groups plus the
one JVM-helper group passed locally. The generated-fixture mutation cases still reject added
Gradle, redirected projects, changed Java targets, missing files, aliases and extra module code.
Fresh generated-output, full application verification, strict native compilation, APK audit
and emulator tests remain exact-head CI gates. The earlier two Maven metadata omissions remain
unresolved here; neither dependency verification nor the physical-device gates are relaxed.
