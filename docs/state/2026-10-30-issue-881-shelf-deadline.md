# Issue 881 item 2: Add shelf download deadline (2026-10-30)

Branch `claude/shelf-deadline-881`. Item 1 (restore skips the 3,000-puzzle bound) needs a product
call and is untouched. Admission (#798) and the importer handoff are unchanged.

## Changed

- `src/workshop-add.mjs`: `fetchPack()` races each `reader.read()` against a 10-second inactivity
  timer (`IDLE_MS`, the same figure as `validator-loader.js`'s deadline). Every chunk resets the
  timer, so a slow but progressing download is never cut off. On expiry the read rejects with
  "That download stalled, so it was stopped. Nothing was installed or changed."; the existing
  `catch` cancels the reader (which closes the network body). The dialog's existing failure branch
  shows that text in the status line and re-enables every `[data-add]` button, so the user can retry.
  Dialog close still aborts via `lifetime.signal` and is still reported as a cancel.
- `tests/workshop-add.test.mjs`: two cases on a mocked clock (no real 10-second wait). One stalls
  a body with `fetchPack` (stalled stream is cancelled; a body with three 6-second gaps, 12 seconds
  in total, still completes). One drives `open()` with a minimal fake document: Add is disabled
  during the download, then after the deadline the status reads stalled, Add is enabled again and
  the dialog stays open.
- `tests/budget.test.cjs`: the optional adder's gzip ceiling moves 3 KiB -> 3 KiB + 64 bytes. The
  adder grew 3,050 -> 3,102 gzip bytes (measured by building main's file and this one); excess 30
  over 3,072, 34 left, no feature room. The adder is lazy, never precached, and not a startup script.
  `src/app.js` is untouched, so the catalogue was not regenerated.

## Verified

- Mutation: with `src/workshop-add.mjs` restored to main, both new tests fail (they hang until the
  8-second test timeout); with the fix, `tests/workshop-add.test.mjs` passes 13/13.
- `npm run build:android` succeeded on a clean tree.
- `node --test --test-concurrency=2 tests/*.test.cjs tests/*.test.mjs`: 2,488 tests, 2,466 pass,
  0 fail, 22 skipped.
- `tests/workshop_add_browser.py` against `PORT=18881 node tools/serve.cjs` (stopped afterwards):
  no failures. It covers the real shelf download, tamper and abort refusals, and install paths.
- Prettier check on the changed JS.

## NOT verified

- The browser suite does not stall a body mid-stream (Playwright `route.fulfill` cannot), so the
  stall path is proven in Node with a mocked clock and a fake DOM, not in a real browser or on a
  physical phone.
- A server that stalls before sending headers is out of scope here; the fetch itself still has no
  deadline (only the body read does).

## Residual risk

- Low. The timer is per read and cleared in `finally`; a cancel during a pending read behaves as
  before. The deadline is a module constant, not configurable.
