# Issue 825: Privacy copy leaves the startup bundle

Branch `claude/cold-pages-chunk`, based on `main` 328d5dcd.

## Scope and outcome

- The Privacy & credits page body moved byte-identically from `privacyPage()` in `src/app.js`
  to `src/privacy-copy.js` (`globalThis.AlibiPrivacyCopy(B)`).
- `tools/build.cjs` emits it as `assets/privacy.<hash>.js` (minified, UTF-8), names it in
  `ALIBI_CONFIG.privacy`, precaches it in the service worker shell and reports
  `privacyChunkBytes` / `privacyChunkGzipBytes` in `build-info.json`. The standalone file keeps
  the copy inline (`privacy: null`), following the insights pattern. The Android payload copies
  `dist/assets`, so the chunk ships there unchanged.
- On entry to `#/privacy` the app renders a heading plus "Opening the small print…", injects the
  chunk once and re-renders when it arrives. The re-render runs the usual `AlibiUsageSlot` and
  `AlibiVoices` hooks, so the Beta button slot and the Voices privacy slot fill as before. A load
  failure shows "This page could not load." with a Retry button; it does not retry on its own.
- About (~1 KB) and login (~0.7 KB) stay in the app bundle: each would need its own loader branch
  for a small saving, and About reads live version and build values.

## Measurements

| Measure | main 328d5dcd | this branch |
| --- | ---: | ---: |
| `javascriptGzipBytes` | 134,166 | 131,760 (-2,406) |
| `initialCodeAndContentGzipBytes` | 203,823 | 201,419 |
| `coreOfflineBytes` | 1,936,061 | 1,936,720 (+659; the chunk is precached) |
| Privacy chunk | n/a | 6,940 bytes, 3,198 gzip |

The application gzip ceiling in `tests/budget.test.cjs` dropped by 2,368 bytes, from
`127 * 1024 + 5760` (135,808) to `127 * 1024 + 3392` (133,440).

## Validation

- `node tools/build.cjs`, then `node --test` over budget, browser-wiring,
  content-budget-accounting, pulseboard-host, voices, insights-delivery, sw,
  sw-offline-navigation, boot-compiled, improve-build, controlled-alias-navigation,
  path-route-aliases, voices-release, voices-gate, sw-redirected-navigation and
  serve-not-found: 165 pass.
- `node tools/build-android.cjs`, then `node --test tests/android-build.test.cjs`: 15 pass;
  `dist-android/assets/privacy.<hash>.js` present.
- Real origin (`tools/serve.cjs`, system Python Playwright, no `.venv`):
  `ALIBI_ONLY=shared_paths py -3 tests/browser_origin.py` passes 56 checks, including the new
  check that offline `/privacy/` under the service worker renders the copy and
  `#usage-sharing-slot`. With the chunk removed from `dist/sw.js` by hand, that check fails as
  intended.
- One-off Playwright scripts, not committed: with the chunk request aborted, the page shows the
  alert and Retry; Retry renders the copy and the slot, and focus lands on `#main`. Opening the page
  from the Settings link also leaves focus on `#main`. The standalone file renders the copy with
  all HTTP refused.

## Not verified

- The full `npm run verify`, `tests/browser_ui.py` and `tests/browser_voices.py` were not run. The
  UI layout pass visits `privacy` and could capture the placeholder before the chunk arrives.
- No check on a physical phone or a hosted origin.
