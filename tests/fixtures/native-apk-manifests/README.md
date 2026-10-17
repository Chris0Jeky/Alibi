# SDK-decoded manifest regression fixtures

These are exact SDK `apkanalyzer manifest print` outputs from Alibi's own debug and
capacitorPreview APKs at commit `0718924774a5c581d387eb9d64e57087b726b71c`, run
[36652072594](https://github.com/Chris0Jeky/Alibi/actions/runs/36652072594), artifact 11071455122.
Archive SHA-256: `5e74637b414af9e46244a91b6ad63382f0656d8a4273cd4c0d8cf7c0a022ef1e`.
The downloaded archive digest and source-sha receipt were checked before extracting these files.

- debug.xml: `e1362bb2fe8c0662385f6c784cf7195228528575ac9a89bde4e51a84527d3a96`.
- preview.xml: `e4ed1980bf327488b2555d5489f88bdd6f505a1f5902d6943c6c8e65d887acb5`.

The SDK prints signature protection as `0x2` and singleTask launch mode as `2`. The audit
must preserve those exact meanings rather than require source-XML spellings. Android's
[ActivityInfo constant](https://developer.android.com/reference/android/content/pm/ActivityInfo#LAUNCH_SINGLE_TASK)
defines LAUNCH_SINGLE_TASK as 2; other launch modes remain rejected.

The previous policy rejected both complete fixtures and three equivalent launch-mode spellings.
After the representation-only repair, all six enum test groups, nine package groups and seven
receipt groups passed locally. These retained XML tests do not decode a new APK or establish
emulator execution. The CLI still invokes the SDK against the actual package and compares its
complete bytes and identity; no synthetic fixture is used as runtime build evidence.
