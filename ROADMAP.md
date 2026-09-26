# Alibi roadmap

**Last reconciled: 23 September 2026**

This roadmap starts from the published 0.11.5 release rather than preserving the old 0.3/0.4 launch chronology as though it were still future work. It separates shipped capability, active quality work, planned implementation, and optional later services.

The governing rule is simple: **preserve local play, versioned content, and truthful evidence while the experience grows.** A seeded issue or design document is not a shipped feature. A green synthetic test is not physical-device acceptance. A larger catalogue is not automatically a better puzzle collection.

## Published browser baseline: 0.11.5

The recorded 0.11.5 browser/PWA release includes:

- thirteen puzzle families and 376 catalogue entries;
- five illustrated casebooks, including Bellweather and the invitation sequence;
- interactive lessons, selected current-board deductions, and reopenable completion explanations;
- revision-pinned saves, notes, undo/redo, favorites, recovery, and JSON backup paths;
- the Games Room, tactile Block Cabinet, experimental Cascade store, Quiet Wing, Curation Cabinet, gardens, companions, and optional room/media delivery;
- the local asset gallery as a developer-only source preview (`npm run assets:gallery`), not as a public app surface;
- local authoring, uniqueness checks where supported, pack export, and stable content IDs/revisions;
- a complete offline core, two verified public origins, release archives, deployment receipts, and real-browser save/update coverage;
- a Capacitor transition architecture and package map, separate from the published browser artifact.

The [release record](docs/RELEASE-0.11.5.md) and its dated per-origin receipts are the source of
truth for publication. The latest recorded Cloudflare and Sites builds differ; this reconciliation
does not re-probe either live origin. Merged source improvements are not automatically deployed.
Open pull requests remain candidates until reviewed and verified.

## Implemented source preview: Android CAP04

The repository now includes the pinned Capacitor Android preview flavors, a strict native
bootstrap and reproducible sync/build boundaries. The [dated CAP04 record](docs/STATE-ARCHIVE-2026-09-23.md)
records debug and release-like preview APK compilation plus sampled Android 36 emulator
install, offline launch and force-stop/save-restoration checks. These are local debug-signed
preview artifacts using `example.unapproved.alibi.preview`, not a production identity, AAB,
Play Store release or completed native acceptance.

Every-feature offline play, minimum-WebView support, physical-device/accessibility testing,
recovery, transfer, production signing and publisher approval remain open under #126 and the
other [Capacitor packages](docs/capacitor/README.md).

## Horizon A — player-calibrated quality

**Outcome:** the catalogue becomes easier to understand, better paced, and supported by human evidence rather than only author intuition and automated completion.

- Playtest representative puzzles from every family on phone and desktop.
- Record instruction ambiguity, actual solve time, difficulty, hint usefulness, comfort, and story response.
- Revisit provisional labels only from collected evidence; preserve prior revisions for existing saved games.
- Curate the Bellweather, Invitation, Briar House, Expert, and anthology arcs as coherent experiences rather than independent JSON records.
- Improve first-run family discovery, puzzle continuation, journal language, keyboard focus, panning, and narrow-board controls.
- Keep every content correction revision-aware when it can alter a saved puzzle’s meaning or solution.

**Exit evidence:** a dated player-QA sample across every family, accepted editorial changes, regression coverage for changed definitions, and no silently invalidated saves.

## Horizon B — explainable solver and authoring contracts

**Outcome:** Alibi can state precisely what each solver can prove and give authors safer tools without pretending all puzzle families share one search model.

- Maintain explicit definition-solving, state-solving, and capability contracts.
- Fail closed for partial-state requests when zero, absence, or final-accusation semantics cannot be represented safely.
- Add richer current-board deductions only where they can be explained and tested without consulting the shipped answer.
- Add draft history, portable unfinished-draft export, ambiguity comparison, clue consistency checks, and revision previews.
- Keep local creation separate from trusted/public publication; installation of a local pack is not endorsement or moderation.
- Preserve deterministic, bounded validation and input immutability across browser and worker seams.

**Exit evidence:** per-family capability tests, malformed/contradictory-state tests, documented refusal behavior, and authoring fixtures that prove revision and uniqueness handling.

## Horizon C — Wrenmere as the coherent mobile home

**Outcome:** the optional house experience becomes a credible, calm primary interface without breaking the classic cabinet or forcing a large initial download.

- Continue the mobile-first room and destination model, family-first browsing, compact resume flows, and accessible filter sheets.
- Improve in-game phone toolbars, hints, completion, short-landscape behavior, safe-area handling, and return-focus contracts.
- Keep the classic experience available as a recovery path while Wrenmere is evaluated.
- Retain optional/on-demand assets, tested budgets, offline fallback, and explicit readiness states.
- Connect rooms, casebooks, gardens, companions, and rewards through meaningful progress rather than arbitrary engagement loops.
- Treat Cascade and other experiments as separate versioned stores until a reviewed migration or integration contract exists.

**Exit evidence:** physical iOS/Android browser checks, VoiceOver/TalkBack sampling, keyboard and reach testing, offline/recovery evidence, and a deliberate owner decision on default experience.

## Horizon D — Capacitor Android implementation

**Outcome:** package the trusted web application for Android without inventing a second product, losing saves, or weakening offline and privacy guarantees.

Implementation follows the package and release-gate map in `docs/capacitor/`.

- Extend the existing pinned native preview toolchain and reproducible sync/build checks into the remaining release gates.
- Bundle trusted application code; do not replace it with a remote-webview shell.
- Keep IndexedDB authoritative unless a reviewed migration changes that contract.
- Implement explicit transfer and bounded recovery checkpoints for supported data domains.
- Preserve stores that are outside the first transfer baseline until their owning package lands.
- Verify back navigation, files, sharing, lifecycle interruption, updates, storage pressure, accessibility, safe areas, and device performance.
- Keep signing keys, publisher identity, store listing, data-safety declarations, screenshots, and rollout decisions human-controlled.

**Exit evidence:** signed test builds, real-device matrices, reproducible build receipts, save-transfer and rollback proofs, accessibility checks, and explicit approval before any store publication.

## Horizon E — publication and optional services

These directions are conditional on demonstrated use. They are not promises attached to the current release.

### Trusted content publication

A public pack ecosystem would need provenance, schema compatibility, moderation, content safety, revision ownership, revocation, and recovery rules. Local export/import should mature first.

### Accounts and sync

Guest/offline play remains the baseline. Sync requires identity, encrypted transport, conflict semantics, deletion/retention policy, recovery, and a way to keep playing when the service is unavailable.

### Multiplayer and public scoring

Local and private-room experiments do not establish a public service. Competitive features require anti-abuse boundaries, moderation, availability expectations, privacy decisions, and an honest distinction between puzzle skill and client-controlled data.

### Payments

Payments are downstream of a product and operating model. They must not become a shortcut around unresolved licensing, store, account, support, or entitlement questions.

## Continuous release discipline

Every horizon retains the same non-negotiable release habits:

- version content deliberately and preserve playable historical revisions;
- keep missing or unsupported evidence visible rather than converting it to success;
- publish from reviewed source and record the exact source/build relationship;
- verify offline install/update/save behavior on real origins;
- keep optional usage sharing off by default, consented, content-free, and reversible;
- separate automated evidence from human play, accessibility, editorial, and physical-device acceptance;
- update `docs/STATE.md`, release notes, deployment receipts, and this roadmap when the product boundary materially changes.

## Not currently claimed

Alibi does **not** currently claim:

- a production Android release, production-signed AAB, Play Store listing, or completed native acceptance;
- cloud sync, a hosted account service, public multiplayer, or tamper-resistant scoring;
- universal solver support for arbitrary partial player states;
- calibrated difficulty and solve-time labels across the full catalogue;
- a public content marketplace or moderation system;
- a reuse licence for the source.

Owner/device decisions remain in [HUMAN_TODO.md](HUMAN_TODO.md). The live implementation handoff remains in [docs/STATE.md](docs/STATE.md).
