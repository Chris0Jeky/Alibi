# Contributing

Read AGENTS.md for the project map, invariants and scoped proving checks. A small change should
solve one real player or maintainer problem. Keep puzzle identities and saved definitions stable.

Use Node 22+, `npm ci`, `npm run verify`, then `npm start`. Python browser setup is described in
the README. Test phone widths first. New behavior needs a direct regression, not a test of its
implementation details. Avoid new runtime dependencies unless the player benefit justifies them.

Use `npm run verify` for full acceptance. It builds both payloads once before testing.
`npm test` now checks the source commit, clean working tree, payload identities and build
receipts first; missing or stale artifacts stop with a rebuild instruction instead of misleading
suite assertions. Commit or stash source edits before `npm run build:android`, as that build
records an exact clean source commit. For a quick source-only edit/test loop, use
`node --test tests/<name>.test.cjs` on suites that do not read emitted artifacts. The preflight
does not replace the full artifact-policy or browser suites. See issue #264.

Open ready-for-review pull requests with the problem, resulting behavior, proving checks and
remaining limitations. Never include progress backups, notes, tokens or test browser profiles.
Use synthetic fixtures for bug reports. Do not silently alter published puzzle rule fields.

The repository has no reuse license until the owner chooses one. Please settle contribution
licensing with the maintainer before submitting independently owned material.
