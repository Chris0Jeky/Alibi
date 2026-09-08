# Alibi · A little room to think

Version 0.2.0. An expanded, local-first puzzle PWA: 102 puzzles, twelve engines, three mystery casebooks, twelve interactive lessons and a visual scene workshop. This is a playable release candidate, not a claim of completed Android or hosted-production certification.

## Play or publish

For a single-file preview, open `alibi-deluxe-play.html` in a browser that permits local JavaScript. File-preview apps may not execute it. For installation and durable progress, publish `alibi-deluxe-cloudflare.zip` to one permanent HTTPS address.

The deployment ZIP already contains `index.html` at its root. Upload that ZIP, NOT the source archive or full publishing bundle. There is no build step for the first deployment. Cloudflare Pages Direct Upload provides a documented browser-only initial deployment and subsequent production updates. Cloudflare Drop is another convenient initial upload route; its unclaimed preview expires after one hour. Full instructions: `docs/DEPLOYMENT.md` and the bundle's `START-HERE.html`.

## Work on the source

Install Node.js 22 or later. The application and build have no npm dependencies. From this folder:

```sh
npm run build
npm test
npm start
```

Open `http://127.0.0.1:8787`. The local server binds only to your own computer. Stop with Ctrl+C. Opening localhost on your phone refers to the phone, not your computer; use a hosted HTTPS preview for phone testing.

```sh
node tools/validate-pack.cjs examples/twelve-families.json
npm run bundle
```

The optional browser suite needs Python and Playwright, separately from the app:

```sh
python -m pip install playwright
python -m playwright install chromium
python tests/browser_ui.py
```

`CHROMIUM_PATH` can select a system Chromium binary. This UI suite uses an isolated browser document. It does not substitute for the hosted acceptance checklist.

## Where things live

`src/core.js`: original five engines and scene generator. `src/engines.js`: seven additional engines and validation. `src/storage.js`: IndexedDB and labelled fallbacks. `src/presentation.js`: rules, lessons, original SVG artwork and icons. `src/app.js`: route, player, workshop, saves and PWA interface. `src/app.css`: responsive themes. `content/catalog.json`: published definitions. `content/casebooks.json`: anthology chapter order. `tools/build.cjs`: reproducible static build, coherent offline release and ZIP writer. `tests/`: executable checks and their actual reports. `docs/`: architecture, authoring, deployment, security, release and maintenance guidance.

## Boundaries

No accounts, remote saves, purchases, ads, leaderboard, push notifications, APK, Play Store listing or server-generated daily content. Daily selections rotate from the included catalogue using the device's date. Casebooks link existing standalone puzzles; they are not additional puzzles or branching stories. Solutions are shipped to support offline checking and optional reveals. Difficulty and time labels are estimates, not player-study results.

The original forty puzzle IDs, revisions and rule fields are preserved. Saved definitions remain attached to their runs. IndexedDB database identity and version remain `alibi-device`, version 1. The application cache is separate from saves. Back up before upgrading a live installation.

Alibi is a working title. Trademark clearance, a public support address and final operator-specific privacy wording remain release-owner decisions. See `NOTICE.md`.
