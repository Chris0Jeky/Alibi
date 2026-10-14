# fix-serve-headers: local server must survive a missing/unparseable _headers

## Reproduction
1. Have a `dist/` that serves files but lacks `_headers`, or whose `_headers`
   has no `Content-Security-Policy:` line.
2. `GET /` (or any servable path) with `node tools/serve.cjs`.
3. Line 58 `fs.readFileSync(..._headers...)` throws ENOENT, or line 59
   `.match(...)[1]` throws TypeError, inside the request handler with no
   try/catch — the dev server dies on a routine request.

## Exact change
1. Extract `function readSecurityPolicy(root)` in `tools/serve.cjs`: return the
   CSP value string, or `null` when the file is missing or has no
   `Content-Security-Policy:` line. Never throw for those two cases.
2. Handler: `const csp = readSecurityPolicy(root); if (csp) res.setHeader(...)`.
   Emit one `console.error` per process when falling back (so a dev notices),
   keep serving.
3. Guard the `.listen(...)` chain behind `if (require.main === module)` and
   export `{ readSecurityPolicy }` so the helper is unit-testable without
   binding a port. CLI behaviour unchanged.

## Tests that must fail first (RED on unpatched code)
- New `tests/serve-headers.test.cjs`: `readSecurityPolicy(tmpdir)` returns
  `null` for a missing file, `null` for a CSP-less file, and the exact policy
  for a valid file. RED on old code because the module exports nothing
  (and binding on require breaks the test process).
- Existing `tests/serve-not-found.test.cjs` must still pass (spawn behaviour
  unchanged).

## Proving check
`node --test tests/serve-headers.test.cjs tests/serve-not-found.test.cjs`
Repo gates that must stay green: `npm.cmd run format:check`.
Dev-only tool; no player-facing or budget impact.
