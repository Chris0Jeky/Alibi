# Alibi roadmap

**Last reconciled: 15 September 2026**

This roadmap starts from the public 0.11.3 release rather than preserving the old 0.3/0.4 launch chronology as though it were still future work. It separates shipped capability, active quality work, planned implementation, and optional later services.

The governing rule is simple: **preserve local play, versioned content, and truthful evidence while the experience grows.** A seeded issue or design document is not a shipped feature. A green synthetic test is not physical-device acceptance. A larger catalogue is not automatically a better puzzle collection.

## Shipped baseline: 0.11.3

The current public browser/PWA product includes:

- thirteen puzzle families and 355 catalogue entries;
- five illustrated casebooks, including Bellweather and the invitation sequence;
- interactive lessons, selected current-board deductions, and reopenable completion explanations;
- revision-pinned saves, notes, undo/redo, favorites, recovery, and JSON backup paths;
- the Games Room, tactile Block Cabinet, experimental Cascade store, Quiet Wing, Curation Cabinet, gardens, companions, and optional room/media delivery;
- the local asset gallery as a developer-only source preview (`npm run assets:gallery`), not as a public app surface;
- local authoring, uniqueness checks where supported, pack export, and stable content IDs/revisions;
- a complete offline core, two verified public origins, release archives, deployment receipts, and real-browser save/update coverage;
- a proposed source-level Capacitor transition architecture and package map, but no native application claim.

The release record and deployment receipts are the source of truth for published versions. Open pull requests may refine this baseline; they do not change it until merged, released, and verified.

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

- Establish the pinned native toolchain and reproducible local/CI build.
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

- an Android APK, AAB, Play Store listing, or completed native acceptance;
- cloud sync, a hosted account service, public multiplayer, or tamper-resistant scoring;
- universal solver support for arbitrary partial player states;
- calibrated difficulty and solve-time labels across the full catalogue;
- a public content marketplace or moderation system;
- a reuse licence for the source.

Owner/device decisions remain in [HUMAN_TODO.md](HUMAN_TODO.md). The live implementation handoff remains in [docs/STATE.md](docs/STATE.md).
