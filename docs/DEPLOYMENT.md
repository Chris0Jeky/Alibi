# Deployment

The owner selected Cloudflare as primary on 2026-09-09. Both existing host identities remain:

- Primary: **https://alibi-after-hours-preview.commit-atlas.workers.dev/**
  (`wrangler.jsonc`, Worker `alibi-after-hours-preview`). Its historical name is retained to preserve the origin.
- Fallback: **https://alibi-puzzle-club.jeky-tck.chatgpt.site/**
  (`.openai/hosting.json`, existing Alibi Sites project).
- Public source: **https://github.com/Chris0Jeky/Alibi**
- Public output: **dist/**

See STATE.md for the currently verified deployment status. Registration alone is not a deployment.
The site contains static assets only. No backend, application database binding, runtime secret or
paid external service is needed. Never create another project just to publish an update.

## Release procedure

0. Write the new first record in `content/releases.json` (version, date, title, `v` tag,
   `docs/RELEASE-<version>.md` receipt, player-facing changes), then run
   `npm run release:prepare -- <version> --publish`. It sets the package version, registers the
   release label in a temporary Pulseboard worktree, regenerates the pinned Observatory adapter
   here and opens the Pulseboard PR. Commit the Alibi files with the release. After the Pulseboard
   PR merges, deploy its collector (`npm run deploy` in `observatory/`) before deploying Alibi, or
   the collector rejects the new release's usage counts.
   Since 0.14.1 the pinned artifact is the Pulseboard SDK v3 (`observatory/pulseboard.js`), which
   Pulseboard's `sync:alibi` does not yet regenerate: until it does, register the release in
   Pulseboard `observatory/src/alibi-releases.mjs`, rebuild with
   `node adapters/build-sdk.mjs alibi <Alibi checkout> observatory/pulseboard.js <version>` after
   `git rm observatory/pulseboard.js`, update `observatory.lock.json`, and run
   `node observatory/check.mjs` after a build.
1. Run `npm ci`, `npm run verify`, and all browser acceptance suites in CI. Inspect mobile and desktop.
2. Review the exact change, resolve confirmed blockers, and merge with CI green.
3. Build the merged source. Record its full Git SHA and `build-info.json`.
4. Run `npm run cloudflare:check`, then `npm run cloudflare:deploy` for the primary site.
   Record the returned Worker version and verify actual HTTPS files, headers, saves and offline play.
5. Update the fallback from the same validated build. Use the Sites hosting skill and the existing project ID. Acquire a short-lived source write
   credential, push the exact source with a per-command authorization header, and never persist
   that credential in Git config, files or remote URLs.
6. Package `dist/` using the Sites helper, save that exact version and deploy to the authorized
   audience. Poll until deployment actually succeeds.
7. Verify HTML, hashed assets, manifest, icons, security headers, IndexedDB and offline play on
   both deployed HTTPS origins using disposable test profiles. Keep rollback artifacts.

For another static host, `npm run build` produces `alibi-deluxe-cloudflare.zip` with index.html at
its root, all hashed assets, manifest, worker and `_headers`. `wrangler.jsonc` selects the existing
`alibi-after-hours-preview` Worker as primary. Keep the Sites fallback available; do not redirect
installed users or delete its stored data. New public play links and repository metadata use Cloudflare.

## Saves and updates

Player storage belongs to an origin and browser profile. Changing domain or browser does not
migrate IndexedDB. Export on the old origin, import on the new one, and retain the old site long
enough to recover data. A redirect alone cannot move browser saves.

### Origin migration inventory

Before any future origin migration, enumerate these records explicitly. This is the persistent
fallback inventory for the three adapters tracked by issue #110; the challenge and Wrenmere Castle
stores have separate export contracts and are intentionally outside this table. Session-only data
is not a migration input. Copying or replacing a fallback must not turn a blocked, newer or
unreadable IndexedDB database into a writable older save.

| Area | IndexedDB store | Persistent fallback | Recovery and migration constraint |
| --- | --- | --- | --- |
| Cabinet | `alibi-device` v1: `runs`, `packs`, `meta` | `localStorage` keys `alibi.v1.runs.<key>`, `alibi.v1.packs.<key>`, and `alibi.v1.meta.<key>` | If local storage is unavailable, the fallback is session-only memory. Version and blocked errors stay protected and create no competing fallback. |
| Games Room | `alibi-afterhours-v1` v1, object store `club`, keys `state` and `recovery` | One `localStorage` envelope at `alibi-afterhours-v1` | The local fallback is single-tab. Its recovery copy is IndexedDB-only; `sessionStorage` key `alibi-club-room` is transient room UI state, not a save. |
| Quiet Wing | `alibi-quiet-wing-v1` v1, object store `saves`, keys `state` and `recovery` | `localStorage` keys `alibi-quiet-wing-v1:fallback` and optional `alibi-quiet-wing-v1:fallback:recovery` | The local fallback is single-tab. Restore is refused there, so it must not synthesize a recovery record; raw export preserves either fallback byte string. |

The fallback contract suites assert these exact keys, reload visibility and preservation behavior:
`tests/storage.test.cjs`, `tests/club-storage.test.cjs`, and `tests/quiet-wing/contracts.cjs`.
They use deterministic storage fixtures rather than claiming a browser-origin migration or
physical-device acceptance.

The active worker serves one coherent cached release. A new release waits for Save & update;
other open pages are not forcibly reloaded. Worker caches never contain or delete game saves.
A server rollback does not reverse IndexedDB or immediately replace all installed workers.

### Pulseboard SDK rollout

The Pulseboard SDK is a content-hashed online-only asset (`assets/pulseboard.<hash>.js`, the last
deferred script of the web index) outside the service-worker shell. A browser still running the
previous cached shell can request the previous SDK name after a host has removed it. This fails
closed: `src/pulseboard-host.js` releases the reserved notice space, no Beta notice shows and nothing
is sent until the player applies the coherent app update. The 0.14.1 rollout replaces the old
`observatory.<hash>.js` adapter the same way: an old shell that cannot fetch it shows no control.
Never add the SDK to the offline shell merely to hide this condition without rechecking the budget.

The app requests no remote player data, ads or fonts. On the primary Cloudflare
origin, the Pulseboard SDK's Beta notice sits in flow at the top of the page and its
Beta button renders inline in Settings and Privacy only, never as a popup or fixed pill.
The Sites fallback stays outside collector admission. The hosting platform and collector may process ordinary
request logs and browser/security cookies. On-site privacy copy must distinguish
the game's device-local saves from aggregate counts and host infrastructure.

Physical Android install, file-picker and TalkBack acceptance remain separate from desktop/mobile
emulation. See docs/ANDROID.md and HUMAN_TODO.md.

## Cloudflare primary site

Use `npm run cloudflare:check` for an assets-only dry run and `npm run cloudflare:deploy` for the
selected primary static site. There is no application backend binding in this configuration.
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

## Adaptive assets

Deploy the complete output including `enhanced-*` artwork. These optional files are excluded
from core installation, not from publication. Preserve the emitted CSP (`img-src` allows decoded
blob images; `connect-src` lists only configured mirror origins). Five photographic alternatives
use approved Unsplash/Pexels endpoints plus exact same-origin copies; museum detail stays local.
Before changing a source, verify actual CORS/MIME/fingerprints and failure recovery on both
app origins using [ASSET-DELIVERY.md](ASSET-DELIVERY.md). A first-party or CDN outage must retain
the same complete compact artwork, and must never change save stores or force an app update.
