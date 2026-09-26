# Alibi

**A little room to think.**

Alibi is an offline-first illustrated puzzle cabinet, mystery collection, and local authoring workshop. It combines carefully versioned logic puzzles with explainable deductions, durable device-local saves, atmospheric rooms, and a mobile-first path that does not require an account, a subscription, lives, or an always-on connection.

[Play Alibi — primary site](https://alibi-after-hours-preview.commit-atlas.workers.dev/) ·
[Fallback site](https://alibi-puzzle-club.jeky-tck.chatgpt.site/) ·
[Latest release](https://github.com/Chris0Jeky/Alibi/releases/latest) ·
[Project map](docs/PROJECT-MAP.md) · [Roadmap](ROADMAP.md) · [Make a puzzle](docs/AUTHORING.md)

> **Current release: 0.11.6.** Both public sites and the downloadable release are working browser/PWA editions. A non-publishable Capacitor preview APK exists, but no Play Store release or completed physical-device acceptance is claimed.

![The last light at Bellweather](src/artwork/bellweather.webp)

## What Alibi has become

 Alibi started as a compact puzzle club. It is now developing along three connected product lines:

1. **The Cabinet** — a large, versioned catalogue of logic puzzles and illustrated casebooks with lessons, notes, undo/redo, reasoning hints, completion explanations, favorites, and local backups.
2. **The House** — Wrenmere, the Games Room, Quiet Wing, gardens, companions, small creative systems, and optional atmospheric experiences that make the project somewhere to revisit rather than a menu of disposable levels.
3. **The Workshop** — local puzzle authoring, validation, revision-aware content, asset provenance, and increasingly explicit solver contracts for checking definitions without pretending every family supports every kind of partial-state reasoning.

The product direction is not “add every possible minigame.” It is to build a calm, coherent place for deduction, curiosity, and thoughtful play, with strong offline behavior and honest evidence about what has actually been tested.

## What ships today

- **382 puzzles across thirteen families:** crime scenes, logic grids, witness deductions, nonograms, tidal bridges, lanterns, tents, aquariums, networks, number trails, Sudoku, binary puzzles, and Futoshiki.
- **Five illustrated mystery casebooks:** including the six-record *Last Light at Bellweather* sequence and the longer unfinished invitation.
- **Six Games Room games:** Lantern Duel, Pocket Borough, Archive Heist, Tic-Tac-Toe, Block Cabinet, and Lantern Gardens. Legacy Dominoes and Mahjong saves remain readable/exportable for compatibility.
- **A tactile Block Cabinet and experimental Cascade surface:** built on explicit, separate save contracts rather than silently replacing the original game.
- **Learn-by-doing lessons:** every puzzle family has an interactive introduction; selected families can explain a deduction from the current board without reading the stored solution.
- **Reviewable conclusions:** solved mysteries can reopen their final placements, pairings, or truth assignments.
- **Durable local play:** automatic device-local saves, revision-pinned continuations, undo/redo, notes, favorites, recovery checks, and JSON backups.
- **Offline installation:** the complete core remains usable after installation. Optional room and media packs are delivered separately so they do not inflate the critical path.
- **Local authoring:** create and validate a mystery, verify uniqueness where the family contract supports it, and export or install a local pack.
- **Quiet Wing and Curation Cabinet:** relaxing activities, a realm builder, companions, credited museum art, and separately versioned challenge collections. The published 0.11.6 catalogue holds 382 puzzles, including six new 15×15 Picture Logic studies alongside the earlier Expert, crime-scene and advanced variations; difficulty and human-calibration gates remain open pending player feedback.

## Direction

The next work is less about raw catalogue size and more about making the existing world trustworthy, legible, and pleasant to keep using.

### Now: player evidence and content quality

- Human-playtest representative puzzles in every family and record real instruction ambiguity, solve time, difficulty, comfort, and story response.
- Evaluate the opt-in Wrenmere Desk candidate against hosted behavior and physical-device gates before claiming acceptance.
- Curate definitions deliberately while preserving old revisions for existing saves.
- Improve deterministic browser acceptance, publication receipts, update recovery, keyboard behavior, and narrow-screen interaction.
- Keep beta usage data disclosed, answer-free, reversible, and visibly separate from puzzle progress.

### Next: stronger reasoning and authoring contracts

- Separate “solve a definition” from “solve from this partial player state” and fail closed where a family cannot yet support the latter honestly.
- Expand explainable deductions only when they can be tested without consulting a shipped answer.
- Add revision-aware draft history, ambiguity checks, clue consistency checks, and portable unfinished work without conflating local authoring with public publishing.

### Then: deliberate Android delivery

- Implement the reviewed Capacitor packages in dependency order.
- Preserve the PWA, local IndexedDB authority, revision-pinned saves, explicit transfer, and recovery boundaries.
- Complete real Android, TalkBack, keyboard, safe-area, haptic, offline-update, signing, and store-account gates before claiming a native release.

Accounts, sync, payments, remote player data, competitive scoring, and public multiplayer remain optional future services. They should be introduced only when a demonstrated player need justifies the privacy, conflict-resolution, retention, moderation, and operating cost they add.

See the [roadmap](ROADMAP.md) for the evidence gates behind those horizons.

## Run locally

Requirements: Node.js 22 or newer. The game and static build have **zero runtime dependencies**; development tooling is pinned separately.

```sh
npm ci
npm run verify
npm start
```

Open `http://127.0.0.1:8787`. The server serves the last production build, so run `npm run build` after editing. It binds to the local machine only.

Optional real-browser acceptance tooling:

```sh
python -m venv .venv
# Activate the environment, then:
python -m pip install -r requirements-dev.txt
python -m playwright install chromium
python tests/browser_ui.py
python tests/browser_origin.py
python tests/browser_update.py
python tests/browser_expedition.py
```

Windows users can use `.venv\Scripts\python.exe` and set `PYTHONUTF8=1`.

## Architecture at a glance

| Layer | Main ownership |
| --- | --- |
| Pure engines and content contracts | `src/core.js`, `src/engines.js`, `src/bridges.js`, `content/`, `schemas/` |
| Reasoning hints and evidence recaps | `src/insights.js` |
| Saves, revisions, transactions, and recovery | `src/storage.js` |
| Player, lessons, workshop, and PWA | `src/app.js`, `src/presentation.js` |
| House, cabinet, and responsive design | `src/app.css`, `src/cabinet.css`, `src/expedition.css`, `src/artwork/` |
| Build, provenance, and acceptance | `tools/`, `tests/`, `.github/workflows/` |

[AGENTS.md](AGENTS.md) is the agent entry point. [STATE.md](docs/STATE.md) is the live handoff. [CONTRIBUTING.md](CONTRIBUTING.md) explains scoped changes and verification.

## Editions, assets, and deployment

Cloudflare is the primary public site; the earlier ChatGPT Sites address remains a fallback for existing installations. Browser storage does not move automatically between origins. Export the Cabinet, Club, Quiet Wing, and any separate challenge backups before changing site address, browser, or device.

Useful references:

- [After Hours map](docs/AFTER-HOURS-MAP.md)
- [Quiet Wing contracts and recovery](docs/QUIET-WING.md)
- [Theatrical edition](docs/THEATRICAL-EDITION.md)
- [Asset library, provenance, and regeneration](docs/ASSET-LIBRARY.md)
- [Asset delivery strategy](docs/ASSET-DELIVERY.md)
- [Cloudflare deployment and publication receipts](docs/DEPLOYMENT.md)
- [Android and Capacitor transition](docs/ANDROID.md)
- [Player QA and evidence](docs/PLAYER-QA.md)

Run `npm run assets:gallery` to inspect the source-backed production asset library at `http://127.0.0.1:8790/`.

## Privacy, provenance, and limitations

Progress stays in this browser on this device. There is no mandatory account, cloud sync, advertising system, or payment service. On the primary Cloudflare site a one-line Beta notice at the top of the page (never an overlay) explains the beta usage data sent to Pulseboard: usage counts, diagnostics, and journeys with official puzzle ids and numbers only. OK accepts; Choose or the Beta button in Settings and Privacy changes it. EEA visitors get counts only until OK; GPC/DNT turns everything off. The Sites fallback, standalone file and Android app send nothing. Hosting and the collector may process ordinary request data, including IP addresses.

Solutions ship with the application for offline checking and explicit reveals. Scores are not competitive or tamper-resistant. Difficulty and time estimates remain provisional until human calibration. Physical-device accessibility and Android acceptance remain open gates. The source currently has no reuse licence; that owner decision is still pending.

The games room now offers **Lantern Duel**, **Pocket Borough**, **Archive Heist**, **Tic-Tac-Toe**,
**Block Cabinet** and **Lantern Gardens**. Legacy Draw Dominoes and Mahjong Solitaire engines remain
available only for existing-save compatibility. Archive Heist has nine rooms. Choose reversible assistance, rotate or pin the illustrated desk, explore the living
harbour, or enter Zen. The original 116 puzzles and four original casebooks remain available with
their saves; the fifth invitation casebook extends the current catalogue.

[Full bundle map](docs/AFTER-HOURS-MAP.md) · [Cloudflare deployment](docs/DEPLOYMENT.md) ·
[Owner/device follow-up](HUMAN_TODO.md). Settings can export cabinet, Club and Quiet Wing together;
challenge exports remain separate. Export before moving to another website address. Optional private-room server source is included and tested
locally, but a static deployment does not enable public online play.

## Quiet Wing and Curation Cabinet

The optional wing includes a realm builder, four companions, a timestamp garden, relaxing games,
classic boards, credited museum artwork and 59 separately versioned challenges. Enter from the
home desk or main navigation. The Curation Cabinet adds 208 puzzles across four anthologies; later
trusted packs bring the catalogue to 382, published on both 0.11.6 origins.
Difficulty remains provisional and missing times are not invented. Settings exports cabinet, Club and Quiet Wing sections together; challenge exports are separate.
See [integration, evidence and recovery](docs/QUIET-WING.md) and [remaining gates](HUMAN_TODO.md).

## Local asset library

Run `npm run assets:gallery` to inspect the source-backed production library at
`http://127.0.0.1:8790/`: puzzle highlights, real reward stamps, category/teaching exports,
realm modules and companion states, sound previews and authored motion. Large production files
stay outside the offline game build. [Delivery, provenance and regeneration](docs/ASSET-LIBRARY.md).

The [theatrical edition](docs/THEATRICAL-EDITION.md) adds eight atmospheric rooms, locally composed
sound, credited optional photography and short films. The [delivery strategy](docs/ASSET-DELIVERY.md)
keeps complete artwork, controls and play available offline after installation.

## Player feedback update

Version 0.8.1 adds family-first browsing, clearer rules and cell notes, scene candidate letters and
board crosses, dedicated casebook story pages, and four larger 8×8 Sun & Moon boards.
Two real players enjoyed the game; structured physical-device and difficulty checks remain open.
See [the QA plan and evidence](docs/PLAYER-QA.md).
Read [security and privacy](docs/SECURITY-AND-PRIVACY.md), [asset provenance](docs/ASSETS.md), [NOTICE.md](NOTICE.md), and [owner/device follow-up](HUMAN_TODO.md) before making stronger public claims.
