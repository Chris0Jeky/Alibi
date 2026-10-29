# Issue #433: advisory collection status from the existing pack store

The curated collection dialog now asks the existing Store for a fresh, bounded read-only
IndexedDB packs cursor each time it opens. It validates each stored row with the same
`AlibiCore.validatePack(..., false)` policy used by atomic admission and checks cursor,
row and pack IDs agree. A matching ID is described only as a matching pack ID; the UI
explicitly says it has not verified that row against the curated collection. Absence is
only the snapshot result, and Add remains available in every state. The existing atomic
admission transaction still makes the final decision after a download and handles races.

Unavailable, session/local fallback, timed-out, aborted, damaged, unsupported or mismatched
storage gives unknown status. Closing the dialog aborts an outstanding read and ignores late
results. The read makes no writes and creates no second index. A fresh open sees the current
store after same-tab import, restore or a different tab; offline reopening requires the
existing optional adder module to be available. The static standalone shelf still cannot
inspect local installs and correctly says so. No provenance or official identity is inferred
from imported IDs.

The source-level tests cover fresh reads, malformed/future rows, mismatched cursor/row IDs,
3,000-puzzle bounds, abort-throws and stalled partial transactions. The watchdog cannot
interrupt synchronous validation; it bounds pending transaction time once the event loop
runs. The browser fixture adds empty,
installed, stale-tab, offline-reopen and unsupported-row checks without reloading the stale
tab. The existing full row-preservation and duplicate-admission checks remain. This fixture
is prepared for hosted Chromium; it has not been run locally. No local full build was run
because available disk was below 200 MB during preparation. In-memory shelf generation measured the standalone adder at 6,176 raw / 3,003 gzip bytes;
the final candidate including the #799 receipt helper measures 6,275 raw /
3,050 gzip, below the existing strict 3,072 gzip ceiling. All 25 focused checks pass after
composition. These are focused measurements,
not a complete build. Hosted exact-head build, byte budgets and actual browser checks remain
required, with ceilings unchanged.

No `src/app.js` change is needed: the existing build-only pack-desk composer passes the
already-owned Store to the optional module. The final candidate includes only #799's exact,
already-reviewed `fetchPack` module-admission hunk, so hosted checks qualify the combined
shared-module bytes before either feature is composed on main. It adds no Castle feature
files. A compatibility regression first failed without that hunk, then passed for the known
receipt identity and rejected traversal or other module names before any request. The helper
only returns verified bytes; it does not execute them. Merge this follow-up after #799, retaining
both features. #433 remains open for its other acceptance work, including
restore/future-definition coverage and constrained-device measurements. Physical
Android/TalkBack and player calibration remain separate HUMAN_TODO.md gates.
