# Alibi

**A little room to think.** Twelve kinds of puzzle, three illustrated mystery casebooks, and a
workshop for making a case of your own. No account. No lives. No rush.

[Play Alibi](https://alibi-puzzle-club.jeky-tck.chatgpt.site) · [Project map](docs/PROJECT-MAP.md) ·
[Roadmap](ROADMAP.md) · [Make a puzzle](docs/AUTHORING.md)

![The Briar House study](src/artwork/briar-house.webp)

## Open the cabinet

- **102 puzzles, twelve families:** crime scenes, logic grids, witness deductions, nonograms,
  lanterns, tents, aquariums, networks, number trails, Sudoku, binary puzzles and Futoshiki.
- **Three casebooks:** Briar House, The Midnight Departure, and Secrets Under Glass. Four chapters
  each, drawn from the existing catalogue; these are anthologies rather than branching stories.
- **Learn by doing:** every family includes a miniature interactive lesson. Selected number and
  picture games explain a deduction from your current board without consulting the stored answer.
- **Review the evidence:** completed mysteries explain the final placements, pairings or truth
  assignments. Reopen the record from a solved board.
- **Keep your place:** automatic device-local saves, undo/redo, notes, favorites and JSON backups.
- **Make it yours:** paper/evening themes, larger clues, reduced motion, optional sound and timer.
- **Play offline:** installable PWA with a complete cached release, including the artwork.
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
```

On Windows use `.venv\Scripts\python.exe` and set `PYTHONUTF8=1`. The origin suite needs `npm start`
running; the update suite starts its own disposable fixture server. The isolated UI suite completes
one puzzle in every family through controls. CI also checks real IndexedDB and offline behavior.

## Inside the box

| Layer | Files |
| --- | --- |
| Pure engines and data contracts | `src/core.js`, `src/engines.js` |
| Reasoning hints and evidence recaps | `src/insights.js` |
| Save transactions and recovery | `src/storage.js` |
| Player, lessons, workshop and PWA | `src/app.js`, `src/presentation.js` |
| Mobile cabinet and board design | `src/app.css`, `src/cabinet.css`, `src/artwork/` |
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
one carefully curated, human-playtested casebook rather than hundreds of generated puzzles.

## Privacy, provenance and limitations

Progress stays in this browser on this device. There is no cloud sync, advertising, analytics SDK,
account system or payment service. Export a backup before moving browsers, origins or devices.
Hosting infrastructure may process ordinary request data; see [deployment](docs/DEPLOYMENT.md).

Solutions ship with the app for offline checking and explicit reveals. Scores are not competitive
or tamper-resistant. Difficulty/time estimates need human calibration. See [security and privacy](docs/SECURITY-AND-PRIVACY.md),
[asset provenance](docs/ASSETS.md), [NOTICE.md](NOTICE.md), and [owner decisions](HUMAN_TODO.md).
The source currently has no reuse license; the owner decision is pending.
