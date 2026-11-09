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
