# Contributing

Read AGENTS.md for the project map, invariants and scoped proving checks. A small change should
solve one real player or maintainer problem. Keep puzzle identities and saved definitions stable.

Use Node 22+, `npm ci`, `npm run verify`, then `npm start`. Python browser setup is described in
the README. Test phone widths first. New behavior needs a direct regression, not a test of its
implementation details. Avoid new runtime dependencies unless the player benefit justifies them.

Open ready-for-review pull requests with the problem, resulting behavior, proving checks and
remaining limitations. Never include progress backups, notes, tokens or test browser profiles.
Use synthetic fixtures for bug reports. Do not silently alter published puzzle rule fields.

The repository has no reuse license until the owner chooses one. Please settle contribution
licensing with the maintainer before submitting independently owned material.
