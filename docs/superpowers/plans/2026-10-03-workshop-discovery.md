# Workshop collection discovery implementation plan

> Execute with superpowers:executing-plans. Keep each independently testable layer
> in its own PR; do not claim the static download shelf is an automatic installer.

**Goal:** Let players discover accepted optional collections without GitHub.

**Architecture:** A build-only, source-pinned catalogue feeds script-free same-origin
collection downloads. The existing Workshop worker/import path owns installation.

**Tech stack:** Node 22, existing CommonJS validators and build pipeline, native HTML
links, Python Playwright and the current Node test glob. No new dependencies.

**Spec:** [WORKSHOP-DISCOVERY.md](../../gameplay/WORKSHOP-DISCOVERY.md).

## Global constraints

Preserve every published JSON byte, puzzle/pack identity, save schema, origin and
numerical byte ceiling. Data downloads are optional, explicit and not precached.
Public metadata is allowlisted; no solutions or installed-state guesses. Keep
#433, physical-device and player-data difficulty gates open.

## Review focus

Stale manifests must fail before output; same-sized changed bytes need full hashes.
Metadata/source disagreement must not silently rename an existing pack.
Duplicate puzzle identities must be refused across optional and official content.
Malformed paths, symlinks and oversized sources must not widen the reader boundary.
Static discovery must not imply installation, offline availability or calibration.

## Task 1: source-bound catalogue, separate PR

Files: create `content/workshop/catalogue.json`, `tools/workshop-catalogue.cjs`,
`tests/workshop-catalogue.test.cjs` and these two documents.

- [x] Write tests for exact 34-board output and preserved bytes; full-hash mismatch,
  wrong size/identity/version, malformed UTF-8/JSON, unknown fields/paths, duplicates,
  invalid production rules, missing files, symlinks, bounds and input preservation.
- [x] Run the tests before the module exists and retain the observed failure.
- [x] Implement `buildCatalogue(policy, readSource, officialIds)` returning public
  `manifest` plus `{ path, data }` download files. Implement `loadCatalogue(root)`
  using bounded regular-file reads and the complete existing official catalogue.
- [x] Provide `node tools/workshop-catalogue.cjs --check`, read-only JSON output.
- [x] Run source tests, formatter and existing Afterlight/Lattice source tests;
  publish the complete foundation in a draft PR and request independent review.

## Task 2: static download shelf and measured integration, child PR

Files: create a shelf renderer and `src/workshop-collections.css`; integrate
`tools/build.cjs`; compose the existing pack desk through the bounded
`tools/workshop-entry.cjs` adapter; preserve original app/catalogue source bytes;
add emitted-output and real-browser tests. The spec records the coupling tradeoff.

- [x] Test script-free/escaped rendering, relative same-origin downloads, digest and
  family totals, missing-source fail-before-write and deterministic output.
- [x] Integrate shelf files into the existing output and payload accounting once.
  Verify exclusion from startup/precache and inclusion in total/Android delivery.
- [x] Link only supported browser targets. Keep exact importer behavior and recover
  added app bytes through shorter equivalent pack-desk copy, not higher limits.
- [ ] Exercise actual shelf navigation, JSON download and Workshop import, duplicate
  refusal, cancelled selection, saved play/undo/reload and offline repeat play at
  phone/desktop sizes. Read-only exact-head CI retains receipts and screenshots.
- [ ] Update STATE with measured results and residual gates. Reconcile current main,
  request independent review and merge only qualifying final heads.
