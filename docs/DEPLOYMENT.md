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

1. Run `npm ci`, `npm run verify`, and all browser acceptance suites in CI. Inspect mobile and desktop.
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
its root, all hashed assets, manifest, worker and `_headers`. `wrangler.jsonc` now selects the owner-requested separate `alibi-after-hours-preview` Worker.
The existing authenticated account was verified; this does not replace the original Sites origin.

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

## Cloudflare After Hours preview

Use `npm run cloudflare:check` for an assets-only dry run and `npm run cloudflare:deploy` for the
selected static preview. There is no application backend binding in this configuration.
Cloudflare Workers Static Assets applies the emitted `_headers` and correct image MIME types.
Verify those responses and the real-origin/offline suites after publishing; do not infer success
from the bundle's screenshots. Publication receipts record the actual URL and deployed build.

## Optional rooms (not enabled by static deployment)

`optional-online/wrangler.jsonc` packages the same front end with the Room and Quota Durable Objects.
Run the local runtime using the CI command, then `python tests/browser_rooms.py`. This exercises two
separate browser sessions against real local Cloudflare storage, including a lost join response.
`node tests/rooms.test.mjs` exercises 89 protocol assertions in a serial storage fixture.

For a future hosted room service: use the reviewed optional config, set a random `RATE_SALT` secret,
check account usage controls and expiry, and verify with two physical devices. No hosted rooms,
public account, cloud sync or ranked score service is currently activated. `DEV_LOCAL` is only
for the test runtime. Keep it absent from deployed configuration. Serve the front end and `/api`
on the same Worker origin: the shipped CSP intentionally permits only same-origin API requests.
A separate API origin requires an explicit, reviewed CSP allowlist as well as exact CORS origins.

Create/join requests use a client-generated request ID and 256-bit seat credential. Retries keep
the same intent; the authority stores hashes and returns the original seat. Credentials stay in
sessionStorage and are excluded from backups. Room invite codes are not move credentials. The
in-memory pending intent currently survives retries in the same tab, not a full process kill.

Current references: [Static Assets](https://developers.cloudflare.com/workers/static-assets/),
[headers](https://developers.cloudflare.com/workers/static-assets/headers/),
[Durable Objects](https://developers.cloudflare.com/durable-objects/),
[secrets](https://developers.cloudflare.com/workers/configuration/secrets/).
