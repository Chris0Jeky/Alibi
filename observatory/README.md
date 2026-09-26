# Pulseboard integration

Since 0.13.1 Alibi ships the Pulseboard SDK v3 (Pulseboard issue #105) instead of the aggregate
statistics embed. `observatory/pulseboard.js` is the unedited output of Pulseboard
`observatory/adapters/build-sdk.mjs` for project `alibi`, pinned by `observatory.lock.json`
(`"sdk": "3.0.0"`, SHA-256 per target). `node observatory/check.mjs` verifies the pin, the builder's
header hash, the collector origin (`https://pulseboard-observatory.commit-atlas.workers.dev`), that
the package version is the release built into the artifact and listed in its closed release
contract, and that the artifact defines `window.Pulseboard` in a fake window without a network call
before mount and stays inert off the registered origin or under automation. `check.local.mjs` then
checks the built site: CSP `connect-src`, one deferred hashed SDK script loaded last, the in-flow
`[data-pulseboard-bar]` space as the first element of `<body>`, the `#pulseboard-slot`, and that
neither the offline shell nor the standalone file carries the SDK.

## Rebuilding

The artifact embeds its release. A new Alibi version must first be registered in Pulseboard
(`observatory/src/alibi-releases.mjs`, then a collector deploy) or its counts are refused. From a
Pulseboard checkout: `git rm observatory/pulseboard.js` here, then
`node adapters/build-sdk.mjs alibi <Alibi checkout> observatory/pulseboard.js <version>` in
Pulseboard's `observatory/`, and put the printed SHA-256 into the lock. Pulseboard's `sync:alibi`
still targets the old `observatory/browser.js` embed and needs an SDK v3 update before
`npm run release:prepare` works again.

0.13.1's artifact was built from Pulseboard `0ed1dcb` with `0.13.1` appended to the release list,
before Pulseboard registered it: the bytes equal what Pulseboard builds once it lists `0.13.1`.

## Host integration

- `tools/build.cjs` emits the SDK as `assets/pulseboard.<hash>.js`, the last deferred script of the
  web index, outside the initial bundle and the offline shell. The standalone file never loads it;
  the Android build strips the script, the notice space and the slot.
- `<div data-pulseboard-bar style="min-height: 2.5rem">` is the first element of `<body>`. The SDK
  renders the one-line Beta notice into it, in flow, and releases it once a choice is recorded.
  `min-height`, not `height`: on a 390px phone the notice wraps and pushes the game down.
- `<div id="pulseboard-slot" data-pulseboard-slot hidden>` exists before the SDK mounts, so the
  collapsed Beta button renders inline in that element, never as a fixed pill.
  `src/pulseboard-host.js` moves it into `#usage-sharing-slot` in Settings and Privacy and parks it
  hidden on every other route.
- The same glue reports hash routes with `Pulseboard.route` (`home`, `puzzle`, `castle`,
  `quiet-wing`, `other`) and a bounded journey with `Pulseboard.count` plus `Pulseboard.track`:
  `puzzle.started {puzzle}`, `puzzle.completed {puzzle, seconds, hints, attempts}`,
  `puzzle.failed {puzzle, seconds, attempts}`, `hint.requested {puzzle, hint}`. Only official
  catalogue ids leave the device (`custom` otherwise); never answers, boards, notes or typed text.
  Every call is guarded, and without the SDK the glue releases the reserved space.

## Tests

`tests/pulseboard-host.test.cjs` runs the glue against a stub and against the real artifact in a
fake DOM; `tests/browser_observatory.py` serves the build under the public origin at 390px with a
fake collector and checks the in-flow notice, that no game control is overlapped or covered, the
inline Beta button in Settings and Privacy, journey payloads, EEA, non-EEA, GPC and a blocked SDK.
Neither proves the live collector, a physical phone or storage/offline behaviour
(`tests/browser_origin.py` on each deployed origin).
