# Quiet fallback-only rollback (#746 item 4)

This unreleased transfer-branch slice preserves the absence of the Quiet IndexedDB
`state` key when the pre-import Quiet state came solely from localStorage fallback.
The live preimage records this fact in a private in-memory WeakSet; the transfer and
recovery JSON formats do not change. On rollback, an IndexedDB read/write transaction
deletes the key only when it still equals this import's attempted state. An absent key
is already restored; a different or unsupported value aborts the rollback so it is not
deleted, and the existing recovery copy remains. Original fallback bytes are then
restored through the established rollback path.

This does not fix another tab creating or changing the fallback after its snapshot,
provide general ordinary-writer ownership or an atomic five-domain import, or preserve
the private fallback and absence metadata across a crash. The legacy journal is still
insufficient for interruption recovery. Equal-valued concurrent writes cannot be
distinguished without the separate owner/CAS protocol. Existing keys with falsy values
are not classified as absent. No main-release readiness is claimed.

The source under review is based on the transfer files at published #781 head
`c2c059c5149fac706af397e78f23df9bc2de872d`. Before the change, a focused regression
showed a fallback-only rollback wrongly left the `state` key present. After the change,
all ten transfer Node test files pass, including exact fallback bytes and key absence,
and a different intervening record is not deleted. The browser fixture now checks key
presence using real IndexedDB from another tab, but was not run in this environment
because Playwright/Chromium is unavailable. Python compilation and pinned formatting
pass. Exact-head hosted real-origin checks, the unchanged feature-branch budgets,
independent review, and full CI remain required. `HUMAN_TODO.md` remains authoritative
for physical-device and owner acceptance.

## Blocking size evidence

Before the admission guard described below, the full feature snapshot was reconstructed and its Git tree matched
`9957b480ae0087546afdb7f1df40b6ba3f13962e`. A clean candidate build measured application
gzip **140,683 bytes** against the existing strict 140,416-byte ceiling, initial code
and content **210,035** against 209,760, and the net precached shell **1,429,342** against
1,428,520.32. The budget test fails. No ceiling was increased. This slice is a draft
until sufficient bytes are reclaimed while preserving these checks; it must not merge
merely because functional tests pass.

All ten transfer test files (109 cases, including 13 Quiet cases) passed on the exact
feature-based candidate before the admission guard. The build reused installed dependencies with matching pinned
esbuild 0.28.2; a full locked npm install was unavailable locally. Hosted exact-head
build/budget and actual IndexedDB fixtures remain the authoritative qualification.

## Active and retained Quiet admission

The earlier rollback fix covered the direct fallback-read path only. A later regression
demonstrated that a disposed Quiet app can retain unsaved state while the IndexedDB key
is absent; its live snapshot bypassed the absence marker and rollback recreated the key.
The recovery-retain port now refuses a transfer when Quiet has retained state or an active
mount. The player can still export the state; the transfer must wait until active work is
closed and retained progress is exported and resolved. The guard does not clear that state.

The check precedes creation of the transfer recovery journal and all transfer replacement
writes. Existing reads may first attempt a normal pending Quiet flush; this is not a promise
that no ordinary writer ran. The guard is not a lock and does not cover a writer starting
after the check. Item 1, crash recovery and general owner/CAS remain unresolved.

Retained and active fixtures initially reproduced admission instead of refusal; after the
guard they refuse before the journal or transfer writes, leave the absent key and original
fallback bytes untouched, and still permit export reads. A healthy fallback-only snapshot
still reaches the recovery-retain port. The real-IndexedDB browser fixture includes these
scenarios but has not yet been run. The size figures above predate the admission guard;
the new candidate has not been remeasured and remains budget-blocked.
