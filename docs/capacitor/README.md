# Alibi → Capacitor Android

**Architecture proposal · 11 September 2026 · no native app shipped by this PR.**

Program: [#120](https://github.com/Chris0Jeky/Alibi/issues/120). Implementation: **14 linked work packages, #123–#136**. Audited main: `f931d85162146e03fd85351e78dc16f48e305575`. The current PWA remains the baseline, not a disposable prototype.

## Recommendation

Maintain one game core and renderer, with an explicit web target and a bundled Capacitor Android target. Use native APIs through narrow adapters for lifecycle, user-directed documents, feedback and recovery. Preserve all existing save formats and web origins. Improve touch/rendering in the shared game layer, then measure on real Android devices.

The first native version should run from packaged assets at `https://localhost`, without the PWA service worker, a remote main page or an OTA JavaScript updater. Bundle the current production assets first, execute/decode lazily, and add optional media downloads only when measurements justify them. Keep native telemetry, hosted rooms, ads, accounts and billing out of this transition.

**The difficult parts are reliable progress, interruption handling, real-device quality and release ownership—not generating a wrapper.**

## Read by responsibility

| Document | What it answers |
| --- | --- |
| [Source audit](SOURCE-AUDIT.md) | What exists now, exact integration seams, five-domain transfer baseline and separate Cascade boundary |
| [Architecture](ARCHITECTURE.md) | Decisions, target graph, bootstrap and native/plugin boundaries |
| [Data and migration](DATA-AND-MIGRATION.md) | Authority, native recovery checkpoints, transfers, partial restores and process death |
| [Assets and updates](ASSETS-AND-UPDATES.md) | Bundle contents, optional packs, compatibility, memory and separate update lanes |
| [Native UX](NATIVE-UX.md) | Touch, back, insets, audio, lifecycle, accessibility and measured snappiness |
| [Security and privacy](SECURITY-AND-PRIVACY.md) | Bridge trust, permissions, external content, backup policy and Data Safety evidence |
| [CI/CD and release](CI-CD-AND-RELEASE.md) | Native CI, signing, version allocation, Play promotion, beta and incident response |
| [Acceptance](ACCEPTANCE.md) | 26 scenarios, evidence levels, fixtures, device matrix and unresolved production gates |
| [Roadmap](ROADMAP.md) | All issue links, dependencies, waves, effort assumptions and agent handoff |
| [Sources](SOURCES.md) | Dated official guidance and separately observed package-version candidates |
| [Verification receipt](VERIFICATION.md) | What this planning pass actually checked and did not check |

## Machine-readable / design assets

- [plan.json](plan.json): issue dependency graph, preserved origins, current save-domain inventory, candidate toolchain and unresolved release gates.
- [Platform contracts](contracts/platform.d.ts): design-only types for device operations and existing save adapters; no plugin is registered or executed.
- [Capacitor config example](examples/capacitor.config.json): inactive preview identity with explicit local origin and security defaults. Its WebView floor is a candidate requiring testing, not a support certification.
- [Validator](validate-plan.mjs) and [negative tests](validate-plan.test.mjs): dependency, inventory, path, unsafe-config and false-release-claim checks. They use Node built-ins and do not contact external services.

```sh
node docs/capacitor/validate-plan.mjs
node --test docs/capacitor/validate-plan.test.mjs
# Expected to exit 1: no native release can be authorized by this planning package.
node docs/capacitor/validate-plan.mjs --release
```

Do not copy the sample applicationId into a production project. No root Capacitor configuration, Android project, SDK, dependency installation, signing key, active publication workflow or account provisioning is included here. The native runtime is future implementation; only the planning checker/test is executable now.

## First implementation sequence

Start with [CAP-02/#124](https://github.com/Chris0Jeky/Alibi/issues/124) and [CAP-03/#125](https://github.com/Chris0Jeky/Alibi/issues/125), then [CAP-04/#126](https://github.com/Chris0Jeky/Alibi/issues/126). Prove a real offline Android vertical slice before expanding native integrations. Keep the PWA green at every step. The roadmap sequences durability, migration, assets, lifecycle, security, CI and Play delivery after that.

The Block Cabinet work in #115/#117 is merged into the reconciled base. Cascade is a current separate web save domain, excluded from the first native transfer and combined backup until CAP-05/CAP-06 define an explicit route that preserves its export and recovery behaviour. Existing physical issues #2/#11/#13/#118 remain visible and must not be closed by emulator screenshots.

## Owner decisions versus agent work

Architectural work and a clearly labelled non-publishable native preview can proceed without a domain purchase or Play account. Before production identity/signing, the owner must settle publisher/application ID, custody and account verification. Before launch, physical device acceptance, genuine tester participation, current Console requirements and an explicit release approval must be recorded. No agent should invent those outcomes.

See [HUMAN_TODO.md](../../HUMAN_TODO.md) and [the Android entry point](../ANDROID.md). Current hosted release status remains in [the main state log](../STATE.md); this proposal is not a deployment receipt.
