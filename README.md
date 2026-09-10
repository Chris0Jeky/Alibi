# Alibi

**A little room to think.** Thirteen kinds of puzzle, four illustrated mystery casebooks, and a
workshop for making a case of your own. No account. No lives. No rush.

[Play Alibi — primary site](https://alibi-after-hours-preview.commit-atlas.workers.dev/) ·
[Fallback site](https://alibi-puzzle-club.jeky-tck.chatgpt.site/) · [Project map](docs/PROJECT-MAP.md) ·
[Roadmap](ROADMAP.md) · [Make a puzzle](docs/AUTHORING.md)

Cloudflare is the main site; the existing ChatGPT Sites address remains a fallback for existing
installations. Saves do not transfer between addresses. Before moving, export the cabinet, Club
and Quiet Wing backup, plus each challenge you want to keep, then import at the destination.

![The last light at Bellweather](src/artwork/bellweather.webp)

## Open the cabinet

- **332 puzzles, thirteen families:** crime scenes, logic grids, witness deductions, nonograms,
  tidal bridges, lanterns, tents, aquariums, networks, number trails, Sudoku, binary puzzles and Futoshiki.
- **The Last Light at Bellweather:** six original timed records, a consistent cast, and earned
  chapter revelations. Three earlier anthology casebooks remain available.
- **Learn by doing:** every family includes a miniature interactive lesson. Selected number and
  picture games and Bridges explain a deduction from your current board without consulting the stored answer.
- **Review the evidence:** completed mysteries explain the final placements, pairings or truth
  assignments. Reopen the record from a solved board.
- **Keep your place:** automatic device-local saves, undo/redo, notes, favorites and JSON backups.
- **Make it yours:** paper/evening themes, larger clues, reduced motion, optional sound and timer.
- **Play offline:** a complete cached core with real artwork and controls; sharper museum images load when available and retain compact offline equivalents. Optional activities have separate downloads. See [asset delivery](docs/ASSET-DELIVERY.md).
- **Build a mystery:** edit a scene, verify a unique solution, then export or install a local pack.

## Run locally

Node.js 22 or newer. The game and static build have **zero runtime dependencies**; development tools
are pinned separately. Windows PowerShell users can substitute `npm.cmd` for `npm`.

```sh
npm ci
npm run verify
npm start
```

Open **http://127.0.0.1:8787**. The server serves the last build, so run `npm run build` after editing.
It binds to your computer only. On a phone, use the HTTPS play link instead of localhost.

Optional browser acceptance tooling:

```sh
python -m venv .venv
# Activate .venv with your shell, then:
python -m pip install -r requirements-dev.txt
python -m playwright install chromium
python tests/browser_ui.py
python tests/browser_origin.py
python tests/browser_update.py
python tests/browser_expedition.py
```

On Windows use `.venv\Scripts\python.exe` and set `PYTHONUTF8=1`. The origin suite needs `npm start`
running; the update suite starts its own disposable fixture server. The isolated UI suite completes
one puzzle in every family through controls. CI also checks real IndexedDB and offline behavior.

## Inside the box

| Layer | Files |
| --- | --- |
| Pure engines and data contracts | `src/core.js`, `src/engines.js`, `src/bridges.js` |
| Reasoning hints and evidence recaps | `src/insights.js` |
| Save transactions and recovery | `src/storage.js` |
| Player, lessons, workshop and PWA | `src/app.js`, `src/presentation.js` |
| Mobile cabinet and board design | `src/app.css`, `src/cabinet.css`, `src/expedition.css`, `src/artwork/` |
| Published puzzles and compatibility | `content/`, `schemas/`, `examples/` |
| Build and acceptance | `tools/`, `tests/`, `.github/workflows/` |

The [full map](docs/PROJECT-MAP.md) explains every part of the original bundle. The source was
imported in logical commits and formatted before development; original puzzle IDs and revisions
remain stable. The untouched supplied bundle stays outside Git's working source.

## Android and future development

Install the PWA from a supported phone browser. Its manifest, maskable icons, safe areas and offline
shell are already the browser-to-Android foundation. The [Android checklist](docs/ANDROID.md) covers
physical testing and the later store-packaging decisions. No APK or App Store release is claimed.

[AGENTS.md](AGENTS.md) is the agent entry point; [STATE.md](docs/STATE.md) is the live handoff.
[CONTRIBUTING.md](CONTRIBUTING.md) describes scoped changes and verification. The next milestone is
human playtesting of Bellweather and the bridge charts, followed by deliberate content revisions.

## Privacy, provenance and limitations

Progress stays in this browser on this device. There is no cloud sync, advertising, analytics SDK,
account system or payment service. Export a backup before moving browsers, origins or devices.
Hosting infrastructure may process ordinary request data; see [deployment](docs/DEPLOYMENT.md).

Solutions ship with the app for offline checking and explicit reveals. Scores are not competitive
or tamper-resistant. Difficulty/time estimates need human calibration. See [security and privacy](docs/SECURITY-AND-PRIVACY.md),
[asset provenance](docs/ASSETS.md), [NOTICE.md](NOTICE.md), and [owner decisions](HUMAN_TODO.md).
The source currently has no reuse license; the owner decision is pending.


## After Hours

The new games room adds **Lantern Duel**, **Pocket Borough**, and six **Archive Heist** rooms.
Choose reversible assistance, rotate or pin the illustrated desk, explore the living harbour,
or enter Zen. The original 116 puzzles and four casebooks remain available with their saves.

[Full bundle map](docs/AFTER-HOURS-MAP.md) · [Cloudflare deployment](docs/DEPLOYMENT.md) ·
[Owner/device follow-up](HUMAN_TODO.md). Settings can export cabinet, Club and Quiet Wing together;
challenge exports remain separate. Export before moving to another website address. Optional private-room server source is included and tested
locally, but a static deployment does not enable public online play.

## Quiet Wing and Curation Cabinet

The optional wing includes a realm builder, four companions, a timestamp garden, relaxing games,
classic boards, credited museum artwork and 59 separately versioned challenges. Enter from the
home desk or main navigation. The Curation Cabinet adds 208 puzzles across four anthologies,
bringing the core catalogue to 324. Difficulty remains provisional and missing times are not invented.
Settings exports cabinet, Club and Quiet Wing sections together; challenge exports are separate.
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
