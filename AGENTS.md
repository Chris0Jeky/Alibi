# Alibi development

Alibi is a mobile-first, device-local puzzle PWA: thirteen pure engines, 335 puzzles, four
casebooks, four After Hours games, a workshop and offline saves. It builds to static files with no runtime dependency.
The root is the working source. The deluxe, After Hours and Quiet Wing bundle directories are ignored input.
Quiet Wing is an optional lazy activity; its source and recovery map is `docs/QUIET-WING.md`.

Start with `docs/STATE.md` and `docs/PROJECT-MAP.md`. The global agreements apply. Authority
is `.agent-harness/tier.json`; owner decisions are in `HUMAN_TODO.md`.

## Run and prove

Node 22+. On Windows use `npm.cmd` if PowerShell blocks the wrapper.

```sh
npm ci
npm run verify
npm start
node tools/validate-pack.cjs examples/twelve-families.json
```

The local server prints `http://127.0.0.1:8787` and serves the last build; rebuild after edits.
Browser checks use Python + `requirements-dev.txt` in `.venv`. Set `PYTHONUTF8=1` on Windows.
`tests/browser_ui.py` completes all thirteen games in an isolated document. `tests/browser_origin.py`
uses real IndexedDB and service workers in disposable profiles. Neither proves a physical phone.

| Changed seam | Required evidence |
| --- | --- |
| Engines, puzzles, saves | Build + Node suites and regression for changed behavior |
| Player, controls, styling | Above + UI suite and phone/desktop visual inspection |
| Storage or offline release | Above + real-origin browser suite |
| Build, assets, hosting | Verify + emitted-file inspection and actual hosted responses |
| Documentation | Compare claims to code and measured state |

## Boundaries that matter

- Edit `src/` and `content/`, never generated `dist/`; deploy the complete release.
- Preserve published IDs/revisions and `content/legacy.json`; saved runs pin their definitions.
- Keep `alibi-device` database version 1, puzzle revision, app version and build hash distinct.
- Never clear unknown saves, silently overwrite concurrent edits, or activate updates mid-game.
- Backups retain pre-restore recovery; destructive restore is refused in fallback modes.
- Validate imports in the bounded worker. Locally imported packs are not publicly published.
- Families need a bounded solver, structural validation, renderer, accessible controls and lesson.
- Test actual controls. Count semantic solutions, not equivalent rotations/encodings.
- Do not regenerate published content without reviewing the diff. Prefer quality to volume.
- Reasoning hints in `insights.js` must not read `solution`; optional reveals are labeled separately.
- Drafts may be unsolvable while being edited. Validate their shape without erasing unfinished work.
- No credentials, private saves or generated test profiles in Git or client assets.
- Cloudflare is primary (`wrangler.jsonc`); Sites is the fallback (`.openai/hosting.json`).
  Preserve both existing origins and their separate saves; see `docs/DEPLOYMENT.md`.
- One writer per checkout; coordinator integrates research and reviews. Use Luna xhigh for bounded tasks and Terra high when debugging or architecture needs it, following the owner’s After Hours request. Keep routine checks inline; never spawn Astra children.
- Split integrations into incremental, tested, reviewable commits as each coherent layer is ready.
- Keep tooling small: no speculative MCP servers, command-deny hooks, accounts or native wrappers.

For a new worktree, first verify its resolved root and Git identity and read these instructions.
Use the global detach-from-origin/main protocol; every worktree's files stay within its own root.
Before closeout, update `docs/STATE.md`, surface `HUMAN_TODO.md`, and report changed / verified /
NOT verified / residual risk. Keep hosted, simulated and physical-device evidence distinct.
