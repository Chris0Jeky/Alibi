# fix-serve-harden: dev servers must survive per-request filesystem errors

## Reproduction
Two converged reports (wave-007 `serve.cjs:69` medium, wave-008
`readSecurityPolicy` residual), both orchestrator-confirmed by reading:
1. `tools/serve.cjs` `readSecurityPolicy` (lines 5-15) rethrows non-ENOENT
   I/O errors; called at line 69 inside the request handler with no
   try/catch, so an unreadable `dist/_headers` (EACCES/EISDIR) crashes the
   dev server.
2. Both servers call `fs.statSync` after `fs.existsSync` with no guard
   (`serve.cjs:52,54,57,80`, `serve-assets.cjs:69,73`): a file deleted
   between the two calls throws ENOENT uncaught and kills the process.
3. Both pipe `fs.createReadStream` with no `error` handler
   (`serve.cjs:108,116`, `serve-assets.cjs:108`): a mid-stream read failure
   raises an unhandled stream `error` event and crashes the process.

## Exact change
1. `tools/serve.cjs` `readSecurityPolicy`: return `null` for ANY I/O error
   reading `_headers` (keep the warn-once `console.error` path for the
   missing/empty case). Behaviour for valid files unchanged.
2. Extract `createHandler(root, fs)` in `tools/serve.cjs`, exported
   alongside `readSecurityPolicy` (keep the `require.main` guard): the
   routing/stat phase runs in try/catch and answers `500` on unexpected
   filesystem errors instead of throwing; stream errors call `res.destroy()`
   (headers may already be sent — destroy, never crash, never second
   `writeHead`). Wire the live server to `createHandler(root, fs)`.
3. Same `createHandler` extraction + 500 + stream-destroy in
   `tools/serve-assets.cjs`. Add a `require.main` guard ONLY after verifying
   no in-repo file requires it (session-1 deliberately left the listen
   behaviour alone); if any requirer exists, export without the guard and
   report file:line.
4. No routing, range, 404/405/416, or allowlist behaviour changes: all
   pre-existing cases in `tests/serve-gallery.test.cjs`,
   `tests/serve-headers.test.cjs` and `tests/serve-not-found.test.cjs` keep
   passing byte-for-byte.

## Tests that must fail first (RED on unpatched code)
Extend `tests/serve-headers.test.cjs` (serve.cjs unit surface, no spawn):
- `readSecurityPolicy` on a fixture root whose `_headers` is a DIRECTORY
  (EISDIR) returns `null` (RED: old code throws).
- `createHandler` with a stub `fs` whose `statSync` throws answers `500`
  with a stub res (RED: old code has no such export / throws).
- `createHandler` with a stub `fs.createReadStream` emitting `error`
  destroys `res` without throwing (RED: unhandled error event).
Same two handler cases for the gallery export in
`tests/serve-gallery.test.cjs` (unit-style, no spawn; keep existing spawn
cases untouched).

## Proving check
`node --test tests/serve-headers.test.cjs tests/serve-gallery.test.cjs tests/serve-not-found.test.cjs`
Repo gates that must stay green: `npm.cmd run format:check`.
Dev-only tools; no player-facing or budget impact.
