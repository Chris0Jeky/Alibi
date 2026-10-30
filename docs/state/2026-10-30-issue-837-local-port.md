# Local server and browser tests move off port 8787 (#837)

Branch `claude/local-port-837`, based on `328d5dcd9909743f947a3b670a60d24fa6b75539`.

## Changed

On the owner's PC `127.0.0.1:8787` belongs to the always-running estate-console daemon, so
`npm start` could not bind there and browser tests without `ALIBI_URL` were sent to the console.
The one local default moves to **8797** everywhere it is used together: `tools/serve.cjs`
(`PORT` still overrides), `tools/assets/motion-capture.mjs`, every `tests/browser_*.py` and the
other test defaults, the 18 workflows that start `python -m http.server` and probe it, and the
current run instructions (AGENTS.md, README.md, `docs/ux/*`, `docs/EXPERIENCE-INTEGRATION.md`,
`docs/ASSET-MOTION.md`). The change is a literal `8787` -> `8797` substitution in those files
(142 lines, 83 files); no logic, assertion, timeout or workflow step changed. Historical records
(`docs/state/*`, `docs/STATE.md`, catalogue `captureOrigin` entries) keep the port they used.

Local-development saves stored under the old `127.0.0.1:8787` origin are test data; player saves
live on the public origins, which are unaffected.

## Verified

- `grep 8787` finds no remaining default in `tests/`, `tools/`, `.github/workflows/` or the
  current run docs.
- `node --test tests/retired-origin-notice.test.cjs` (the only Node test with the port): 2/2.
- All changed Python files compile (`python -m py_compile`). Prettier check passes on changed
  files inside `format:check`; `tools/assets/motion-capture.mjs` was already outside its globs
  and unformatted on main.

## NOT verified

Hosted workflows on this head are the proof that every server/probe/test pair moved together.
No browser suite was run locally. No deployment, storage or app-code change.

## Residual risk

A workflow or test added after this base that still assumes 8787 would need the same edit.
