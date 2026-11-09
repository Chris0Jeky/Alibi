# Workshop collection header deadline — 9 November 2026

A curated collection request now has the same ten-second deadline for receiving response headers as
for an idle body read. A linked AbortController aborts the actual request when the header deadline
expires or the player cancels. A late response from a fetch implementation that ignores abort has its
body cancelled. Cancellation remains distinct from a stalled download, and the existing dialog
keeps Add available for retry after a failure. No download is handed to the importer before its
size and SHA-256 checks pass. The optional adder is still loaded on demand, with no budget increase.

The exact `buildShelf` output measured 3,128 gzip bytes against the existing strict 3,136-byte cap.
Small adder copy changes preserve the data-only, offline, existing-ID and provisional-difficulty
explanations. Focused Node tests cover mocked header and body stalls, prompt cancellation and its
precedence, late responses, timer cleanup, retry controls and existing validation. The actual
Workshop browser scenario was exercised in a temporary copy of the d90f25b built origin with only
the fresh adder substituted; it includes both phone and desktop widths, abort, late-body cleanup,
retry and unchanged IndexedDB. This fixture is not an integrated release build or physical-device
evidence. Full integrated CI, hosted release and physical-device checks remain separate; see
`HUMAN_TODO.md` for owner and deployment gates.

## Integrated follow-up

The integrated import source passed the actual Workshop browser suite at 320 and 1280 pixels,
including all 34 header/body stall, cancellation, late-response and retry checks. The separate
restored-capacity journey passed with real IndexedDB and an over-limit backup; its fixture now
derives official totals from the catalogue. The focused integrated Node set passed 141 tests.

The final combined run exposed a second consumer of the shared fetch helper: the optional Castle
case player grew to 16,583 raw bytes, exceeding its unchanged strict limit of 16,448. Shorter player
copy restored it to 16,443 bytes without changing download, save, restore or recovery behavior.
Independent review caught an inaccurate completed-stage label in the first copy reduction; the
follow-up uses causal wording and checks a previously revealed stage after all three answers are
accepted. That browser assertion failed against the earlier wording and passed after correction.
Castle asset and receipt tests passed 6/6; a clean build and the complete actual Castle case browser
journey passed at 320 and 1280 pixels with no page errors. Privacy, notebook export and experimental
status disclosures remain present. No asset ceiling was increased.

The interrupted aggregate run and the earlier failed CI jobs are retained as failed evidence, not
reported as passes. The revised head still requires its full CI and combined-tree qualification.
