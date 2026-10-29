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

The full feature snapshot was subsequently reconstructed and its Git tree matched
`9957b480ae0087546afdb7f1df40b6ba3f13962e`. A clean candidate build measured application
gzip **140,683 bytes** against the existing strict 140,416-byte ceiling, initial code
and content **210,035** against 209,760, and the net precached shell **1,429,342** against
1,428,520.32. The budget test fails. No ceiling was increased. This slice is a draft
until sufficient bytes are reclaimed while preserving these checks; it must not merge
merely because functional tests pass.

All ten transfer test files (109 cases, including 13 Quiet cases) passed on the exact
feature-based candidate. The build reused installed dependencies with matching pinned
esbuild 0.28.2; a full locked npm install was unavailable locally. Hosted exact-head
build/budget and actual IndexedDB fixtures remain the authoritative qualification.
