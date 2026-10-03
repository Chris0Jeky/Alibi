# fix-gallery-traversal: test the gallery allowlist against the resolved path

## Reproduction
1. `node tools/serve-assets.cjs` (localhost gallery, default port 8790).
2. `GET /docs/../package.json`: the allowlist at line 44 tests the RAW decoded
   name (`startsWith('/docs/')` passes) while `path.resolve` at line 33
   normalises `..` to `<root>/package.json`, which passes the root-containment
   check at line 45. Any in-repo file is readable via a `/docs/../...` URL
   (verified by reading lines 26-48; confirm live before fixing).

## Exact change
In `tools/serve-assets.cjs`, compute the resolved path FIRST, then test the
allowlist against the resolved repo-relative form:
- `const rel = path.relative(root, file);` reject when `rel` starts with
  `..` or is absolute;
- normalise separators to `/` and test each allowed prefix against `rel`
  with segment safety: directory prefixes (`.../`) must match `rel === dir`
  or `rel.startsWith(dir)`; file prefixes (`src/app.js`) must match exactly.
- Keep the existing 403/404 responses and the `/` mapping. No new deps.

## Also (same worker, same files): method and range handling
`tools/serve-assets.cjs` answers every method with content (no 405; only HEAD
is special-cased at line 79) and rejects suffix ranges (`bytes=-N` 416s,
unlike `tools/serve.cjs:71-74` which supports them).
- Return `405` for methods other than GET/HEAD (mirror `serve.cjs:60`).
- Support suffix ranges (mirror `serve.cjs:71-74`: last-N-bytes semantics).
- Extend `tests/serve-gallery.test.cjs`: `POST /` → 405 (RED: old code
  answers 200); `Range: bytes=-10` on an allowed file → 206 with the last 10
  bytes (RED: old code answers 416).

## Tests that must fail first (RED on unpatched code)
- New `tests/serve-gallery.test.cjs`, mirroring the spawn/freePort pattern in
  `tests/serve-not-found.test.cjs` with `PORT` env:
  - `GET /docs/../package.json` → 403 (RED: old code answers 200);
  - `GET /package.json` → 403;
  - `GET /` → 200 gallery index (allowed surface still works).

## Proving check
`node --test tests/serve-gallery.test.cjs`
Repo gates that must stay green: `npm.cmd run format:check`.
Dev-only tool; no player-facing or budget impact.
