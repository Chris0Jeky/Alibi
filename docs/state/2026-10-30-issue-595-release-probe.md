# Release receipt and origin probe (issue #595, item 1) — 30 October 2026

## Changed

- `tools/probe-origin.cjs [origin] [--expect <dist>] [--timeout <ms>]`: fetches `index.html`,
  `sw.js`, the platform identity script and every asset `index.html` references, and compares
  them byte for byte with the local `dist/`. `dist/` ships no `build-info.json`, so the served
  identity is the platform identity (source SHA, version, payload digest) plus the `sw.js` build
  hash. Exit 0 match, 1 mismatch or fetch failure, 2 usage. Default origin: the primary one in
  `docs/DEPLOYMENT.md`, cross-checked against the Worker name in `wrangler.jsonc`.
- `tools/release-cloudflare.cjs`: refuses a dirty tree, a detached HEAD and (with `--deploy`) a
  commit not in `origin/main`; builds; checks `dist/` carries that clean commit; runs the
  wrangler dry run; writes `release-receipt.json` (SHA, branch, `build-info.json`, identity, sha256
  of every `dist/` file, timestamp, Worker version id, probe result). Without `--deploy` it
  publishes nothing and skips the probe (the live site is expected to differ).
- `package.json`: `cloudflare:release`, `cloudflare:probe`. `.gitignore`: `release-receipt.json`.
- `docs/DEPLOYMENT.md`: release steps 3, 4 and 7 and the Cloudflare section use these. Item 2
  (rollback artefact): the receipt's Worker version id plus `wrangler rollback` is named as the path.
- `tests/release-probe.test.cjs` (7 tests): probe against a local stdlib server for match,
  different release (by field), 404, refused connection and a stalled response (timeout); origin
  read from the docs; preflight refusals in a temp git repo; the CLI exiting 1 on a dirty tree
  before building.

## Verified

- `node --test tests/release-probe.test.cjs`: 7 pass.
- `npm run format:check` clean; `npm run build` and `npm run build:android` succeed.
- Full `node --test --test-concurrency=2 tests/*.test.cjs tests/*.test.mjs`: 2484 tests, 2462
  pass, 22 skipped, 0 fail, on a clean tree after both builds.
- `npm run cloudflare:release` (dry run) on the clean branch: built, wrangler dry run passed,
  receipt written (313 files hashed), tree stayed clean, receipt ignored.
- `node tools/probe-origin.cjs` against the live primary origin (read-only) reports FAIL as
  expected. The origin serves source `030d5812` (merge of PR #659, the 0.15.2 artwork release, 13
  October); the local build is a later commit with the same version 0.15.2. Index references,
  `sw.js`, identity SHA and payload digest differ, and five local asset names return 404.

## Not verified

- `--deploy` never ran (no publishing allowed). The Worker version id capture
  (`WRANGLER_OUTPUT_FILE_PATH` entry with `version_id`, falling back to a "Version ID:" line) was
  read from wrangler 4.146.0 source, not exercised. The post-deploy probe on a matching origin
  was exercised only against the local fake server.
- The probe does not check headers, saves or offline play (DEPLOYMENT.md step 7 still applies).
  The live site could not be compared on a matching release, so byte equality of `index.html`
  through the real edge is unproven.
- `wrangler rollback` was not run. Items 3 and 4 of the issue are untouched.

## Residual risk

A probe immediately after deploy could reach an edge still serving the old version and fail;
rerun `npm run cloudflare:probe`. The ancestor check uses the local `origin/main`, so fetch
first. Owner decisions in `HUMAN_TODO.md` are unchanged.
