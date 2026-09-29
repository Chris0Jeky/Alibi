# fix-gallery-methods: 405 for non-GET/HEAD, suffix-range support

Follow-up to `fix-gallery-trav` (traversal scope landed; this method/range
scope did not make that worker's read — verify it is still absent before
changing anything; if present, report back with file:line and no changes).

## Reproduction (orchestrator-verified on unpatched `tools/serve-assets.cjs`)
1. `node tools/serve-assets.cjs` (localhost gallery, default port 8790).
2. `POST /` (or any allowed path) answers 200 with content: only HEAD is
   special-cased (~line 79); there is no method check (compare
   `tools/serve.cjs:60`, which answers 405).
3. `Range: bytes=-10` on an allowed file answers 416: the range regex
   requires leading digits (compare `tools/serve.cjs:71-74`, which serves
   the last N bytes with suffix semantics).

## Exact change (in `tools/serve-assets.cjs` only)
- Return `405` for methods other than GET/HEAD (mirror `serve.cjs:60`).
  HEAD keeps its current behaviour (headers, empty body).
- Support suffix ranges (mirror `serve.cjs:71-74`): `bytes=-N` serves the
  last N bytes with 206 + Content-Range; keep existing 416 behaviour for
  other unsatisfiable ranges.

## Tests that must fail first (RED on unpatched code)
- Extend `tests/serve-gallery.test.cjs` (spawn/freePort pattern, `PORT` env):
  - `POST /` → 405 (RED: old code answers 200);
  - `Range: bytes=-10` on an allowed file → 206 with exactly the last 10
    bytes (RED: old code answers 416).
- All pre-existing cases in that file keep passing.

## Proving check
`node --test tests/serve-gallery.test.cjs`
Repo gates that must stay green: `npm.cmd run format:check`.
Dev-only tool; no player-facing or budget impact.
