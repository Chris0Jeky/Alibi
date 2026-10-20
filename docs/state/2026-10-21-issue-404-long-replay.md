# Block Cabinet long replay persistence qualification (#404)

This bounded test-only slice extends the fixed, valid 268-placement terminal replay
through the actual `AlibiClub` lifecycle in the Club test harness. It covers cold
restore, room rendering, undo, saved bytes, a fresh Club session, and redo. The
fixture remains below `blockCabinet.maxMoves` (500); no production source, save
format, published content, or numerical budget changed.

The Club harness now offers an optional `beforeInit` callback after loading the
real Club and engine sources but before persisted state validation. The regression
uses it only to count engine moves during initialization. A cold restore validates
all 268 moves once, and opening the room reuses that replay. Undo persists the
267-move active history plus the final action in `redo`. A fresh Club session
restores those bytes, validates the history and redo continuation, and opens the
267-move state. Redo restores the original 268-move terminal state. Move counts
also pin the expected cache rebuild when the active log is shorter than the
validated redo continuation.

Verification: the focused Block Cabinet, replay-cache, Club lifecycle, and related
Club-room suites passed (10 test files, no failures). The changed CommonJS files
pass the repository-pinned Prettier 3.9.6 check. This is source-level lifecycle
and serialized-storage evidence using the in-memory storage port in the test
harness; it is not a real-browser IndexedDB, constrained-device, memory, or
physical-phone measurement.

The 500-placement cap remains unchanged. This 268-move fixture does not establish
valid play or reload at the cap, arbitrary 1,000-move replay support, memory
headroom, or constrained/physical-device latency. Keep #404 open for those
remaining qualifications before considering any cap increase. `HUMAN_TODO.md`
remains authoritative for physical-device acceptance.
