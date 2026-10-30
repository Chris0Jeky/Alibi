# Cold pages in a deferred chunk (#825)

Branch `claude/cold-pages-825`, based on `aeb6656e` (origin/main, PR #816 merge).

## Changed

Privacy & credits, About and the sign-in note (`#/privacy`, `#/about`, `#/login`) moved byte-identical
from `src/app.js` into `src/cold-pages.js`, a hashed, precached chunk (`assets/cold-pages.<hash>.js`)
loaded by `loadRoute` the first time one of those routes opens. Until it loads the page shows an
`role="status"` line; if the load fails it shows a short error with a "Try again" button
(`retry-route`, which re-runs `loadRoute`). Every post-render hook (`AlibiUsageSlot`, Voices) runs on
the same `render()` as before, so the `#usage-sharing-slot` on Privacy, the Beta button and the Voices
panel are unchanged. The standalone file inlines the source (`cfg.cold` is `null` there). What's new
stays put: its body is `AlibiUpdates.page()` (1.9 KB) over release data that is already in the
precached official-content chunk, so there was nothing to gain.

`tests/budget.test.cjs`: JS gzip ceiling lowered by the measured saving, new test that the chunk is
emitted, precached, named in the config, absent from `index.html`, and that unique sentences from each
page are in the chunk and not in the startup bundle. Fixtures in `deferred-route`, `sw-offline-navigation`
and `pulseboard-host` tests follow the new names; the asset catalogue was regenerated for `src/app.js`.
`tests/browser_cold_pages.py` (wired into `check.yml`) covers offline rendering and the retry path.

## Measured (same machine, origin/main vs this branch)

| Metric | Before | After | Ceiling |
| --- | --- | --- | --- |
| `javascriptGzipBytes` | 134,165 | 131,422 (-2,743) | 135,808 -> 133,065 |
| Precache shell (`coreOfflineBytes` - official) | 1,418,442 | 1,419,153 (+711) | 1,419,736 (unchanged, 583 headroom) |
| Cold chunk | - | 8,543 bytes, 3,627 gzip | < 10 KiB |
| Initial code + content gzip | 203,821 | 201,076 | 225,280 |

The shell is a raw-byte total, so moving code into a precached chunk cannot shrink it: the +711 is the
loader, the failed-load state, the `retry-route` case and the chunk wrapper. No ceiling was raised.

## Verified

- `npm ci`, `npm run build`, `npm run build:android` (clean tree) succeed.
- Rendered markup of all three pages is identical to origin/main's functions (same `B`/`esc`/`cfg`
  stubs, string equality: 6,844 / 874 / 626 characters).
- `node --test tests/budget.test.cjs tests/pulseboard-host.test.cjs tests/voices.test.cjs` and the full
  `tests/*.test.{cjs,mjs}` run after `build:android`: 2,300 tests, 2,278 pass, 22 skipped, 0 fail. The new budget test fails on origin/main's
  `dist` (no cold chunk; JS gzip over the lowered ceiling).
- Pinned Prettier check on changed files; `git diff --check`.

## NOT verified

`tests/browser_cold_pages.py` was written but not run here, nor were the other Python browser suites
(`browser_boot.py`, `browser_voices.py`, `browser_observatory.py` exercise these routes). No physical
phone, no hosted response check; the Cloudflare/Sites origins serve `/assets/*` as immutable files like
the Voices chunk.

## Residual risk

A first visit to these routes now needs the chunk: offline it comes from the service worker cache (the
shell installs it), and an uncached offline first run shows the retry state instead of the page. Deep
links to `#/privacy` paint the status line first, then the page.
