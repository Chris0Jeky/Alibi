# Issue #455: Castle playtest receipt host

This handoff records the local source implementation for the Reading Room Castle host. It is
source and test evidence, not evidence of a public deployment or a human playtest.

## Implemented

- The Castle case reuses `tools/case-playtest-receipt.cjs`; no second collector, save authority,
  telemetry store or transmission service was added.
- Collection remains off until the tester selects **Start local playtest receipt**. The review,
  editable observation, exact JSON preview, explicit copy and cancel controls live in the
  consent-loaded receipt module. Clipboard copy is the only output.
- Player integration passes only booleans and citation counts from draft shape checks. It does not
  pass verdict values, source IDs, answer text, citations, notebook text, save contents, device data
  or timings. Counts start at consent. A one-bit-per-stage snapshot of the current saved
  hint/reveal indicators establishes `priorAssistance`; later hints/reveals remain event counts and
  are not relabeled as prior help. It is not an exhaustive cross-tab or historical record.
- The receipt module is a content-hashed ESM asset in `assets/cases`, excluded from the core
  precache and included in Castle's full delivery-byte accounting. The player verifies the listed
  size and SHA-256 before dynamic import and stores verified bytes in the existing
  `alibi-case-pack-<case SHA>` cache. A cache miss while offline leaves collection off and asks the
  tester to reconnect. The first opt-in may request the same-origin module code; it sends no
  receipt or player data.
- The browser's `import()` can issue its own request when the page has no controlling service
  worker. The first fetched and checked response alone therefore does not prove which exact bytes
  the engine executes. The implementation keeps the existing same-origin content-hashed module
  boundary and does not introduce blob imports, a second cache or a new service-worker policy.
- The optional player plus its bundled Castle session logic remains below the existing 16 KiB
  build limit. The receipt module is counted separately in full; no limit was raised.

## Local verification

The source-level receipt/controller tests cover consent-off behavior, allowlisted shape data,
review rendering, editing, copy denial/success, cancel, and disposal. The asset test checks both
content hashes, exact byte accounting, the player size ceiling, and that neither receipt code nor
the optional player enters the core precache. The browser fixture exercises actual Castle controls
at 320 and 1280 pixels, including lazy load, corrupt bytes rejected before import, offline miss,
prior-assistance baseline, late clipboard completion after navigation, and controlled-cache offline
return. Chromium was unavailable in the local environment, so that browser fixture must run in
hosted CI before treating it as verified.

## Acceptance still outstanding

No real participant observation has been collected, and this change does not establish editorial,
physical-device or production deployment acceptance. Keep issue #455 open until its remaining
human/owner acceptance is recorded separately. Do not treat the synthetic fixture observation as
human feedback.
