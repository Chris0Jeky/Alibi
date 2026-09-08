# Deployment

The selected Sites project is pinned in `.openai/hosting.json`:

- Site: **Alibi**
- Origin: **https://alibi-puzzle-club.jeky-tck.chatgpt.site**
- Public source: **https://github.com/Chris0Jeky/Alibi**
- Public output: **dist/**

See STATE.md for the currently verified deployment status. Registration alone is not a deployment.
The site contains static assets only. No backend, application database binding, runtime secret or
paid external service is needed. Never create another project just to publish an update.

## Release procedure

1. Run `npm ci`, `npm run verify`, and both browser acceptance suites. Inspect mobile and desktop.
2. Review the exact change, resolve confirmed blockers, and merge with CI green.
3. Build the merged source. Record its full Git SHA and `build-info.json`.
4. Use the Sites hosting skill and the existing project ID. Acquire a short-lived source write
   credential, push the exact source with a per-command authorization header, and never persist
   that credential in Git config, files or remote URLs.
5. Package `dist/` using the Sites helper, save that exact version and deploy to the authorized
   audience. Poll until deployment actually succeeds.
6. Verify HTML, hashed assets, manifest, icons, security headers, IndexedDB and offline play on
   the deployed HTTPS origin using a disposable test profile. Keep rollback artifacts.

For another static host, `npm run build` produces `alibi-deluxe-cloudflare.zip` with index.html at
its root, all hashed assets, manifest, worker and `_headers`. The optional `wrangler.jsonc` is a
portable example, not an authorized second destination. Do not run it against a guessed account.

## Saves and updates

Player storage belongs to an origin and browser profile. Changing domain or browser does not
migrate IndexedDB. Export on the old origin, import on the new one, and retain the old site long
enough to recover data. A redirect alone cannot move browser saves.

The active worker serves one coherent cached release. A new release waits for Save & update;
other open pages are not forcibly reloaded. Worker caches never contain or delete game saves.
A server rollback does not reverse IndexedDB or immediately replace all installed workers.

The app requests no remote player data, analytics, ads or fonts. The hosting platform may still
process ordinary request logs and browser/security cookies. On-site privacy copy must distinguish
the game's device-local behavior from the host's infrastructure.

Physical Android install, file-picker and TalkBack acceptance remain separate from desktop/mobile
emulation. See docs/ANDROID.md and HUMAN_TODO.md.
