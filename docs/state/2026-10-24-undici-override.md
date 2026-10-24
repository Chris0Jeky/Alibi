# Override undici to 7.30.1 under miniflare (Dependabot alert 67)

Branch: `fix/undici-override`.

## Changed

Dependabot alert 67 (high: undici denial of service via an unhandled error on excessive
content-encodings) could not be fixed by Dependabot: its security update job failed with
`security_update_not_possible` because `miniflare` (dev-only, via `wrangler` 4.146.0) pins
`undici` at exactly 7.29.1. The newest `wrangler` (4.152.0, miniflare 5.20261019.2-beta) still pins
7.29.1. `package.json` `overrides` now pins `undici` to 7.30.1, the lowest patched version, the
same pattern as the `sharp` override (#705). `package-lock.json` changes only the undici entry's
version, resolved URL and integrity; regenerating it with the local npm would have dropped the
`libc` fields on the sharp platform packages, so it was edited by hand and validated by `npm ci`.

## Verified

- `npm ci` accepts the lock; `npm ls undici` shows `undici@7.30.1 overridden` under miniflare.
- Emitted build: all 307 `dist/` files compared with a build of the previous package files; the
  only differences are the build identity (`ALIBI_CONFIG.build`, platform identity file and the
  hashed names that reference it). No shipped code changes.
- `npm run cloudflare:check` (wrangler deploy dry run) passes; `wrangler dev` serves `/` (200,
  correct title) and `/sw.js` (200, text/javascript) with no undici errors.

## NOT verified

Hosted Cloudflare deployment (not changed by this PR). Full `npm run verify` runs in hosted CI.

## Residual risk

Low: dev-only tooling on a patch release within undici 7.x. Remove the override once miniflare
pins a patched undici.
