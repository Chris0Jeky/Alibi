# Quiet fallback rollback (PR 731)

Branch: `fix/731-fallback-rollback`, stacked on `chatgpt/579-quiet-fallback-errors-20261021`.

## Changed

Root cause (Codex P1, `src/origin-transfer.js`): rollback called `ports.write('quiet', before.quiet)`,
and `before.quiet` was derived from the IndexedDB record or live Quiet Wing state. `mirrorQuietFallback`
then rewrote an existing `alibi-quiet-wing-v1:fallback` from that snapshot, so a fallback that differed
from IndexedDB (Quiet Wing previously ran in localStorage mode) was replaced by older data.

`readQuiet` now captures the fallback's raw string (or absent) independently, on the returned section under
a Symbol key. Symbols never reach `JSON.stringify` or structured clones, so export files, recovery copies and
`sameAfterRollback` are unchanged. When `writeQuiet` receives that same section back, it restores the raw bytes
exactly (only when they differ) instead of mirroring. Forward import writes keep their semantics: update or
remove an existing fallback, never create one, propagate errors. An unreadable fallback at read time is left
alone on rollback.

## Evidence

`tests/origin-transfer-quiet-fallback.test.cjs`: three new tests. Before the fix 2 of 8 failed (fallback came
back as the IndexedDB snapshot); after, 8 of 8 pass. Not a real-browser run: the Python browser suite
`tests/browser_origin_transfer_quiet_fallback.py` was not executed.
