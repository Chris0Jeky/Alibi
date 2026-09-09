# Offline capability and adaptive delivery

Alibi can use the internet without depending on it for play. Offline is a complete local
capability, not an error screen. Online media improves that capability after it is usable.
This policy replaces a blanket ban on browser-facing asset hosts with explicit delivery contracts.
The first implementation covers the four Curation Cabinet museum interludes and removes optional
pack downloads from the activity navigation/save-flush wait.

## Delivery classes

| Class | Loading and storage | Useful offline behavior |
| --- | --- | --- |
| Core play | Atomic, versioned service-worker installation; cached shell first | All 324 official puzzles, rules, clues, controls, notes, complete compact artwork and local saves |
| Quiet Wing activity | Lazy local JS/CSS; complete pack cached after entry, outside navigation's promise | Installed activity, its real boards, local models, artwork and controls; first-ever offline entry still needs a previously completed wing download |
| Enhanced images | Compact image immediately; visible images request verified higher detail; separate bounded cache | Cached higher detail when available, otherwise the same entire artwork at 600px with its title, interpretation and credit |
| Field notes media | Existing explicit offline-copy action, separate from core/wing budgets | Downloaded models, illustrations and audio; availability requires that pack to finish |
| Films and optional rooms | Deliberate playback/connection; no automatic film precache | A film cannot be reconstructed from a poster, nor can live multiplayer be simulated as connected. Local games remain available; these features retain their disclosed network requirement |

Do not describe all optional content as installed merely because the core is offline-ready.
Browser storage can be evicted, and a first-ever visit requires network installation. JSON backups
remain the portable preservation mechanism; an image cache is not a save store.

## Implemented image contract

`tools/build-delivery.cjs` takes the existing rights-checked, hash-pinned 1600px WebP derivatives
and emits four `enhanced-*.<hash>.webp` files. These are deployed with the release but excluded
from core precaching. The existing 600px complete derivatives remain in the core and standalone
preview. No new image purchase, hotlink or change to artwork rights is required.

`src/asset-delivery.js` consumes the trusted build manifest, with this order:

1. Render the complete compact local image and its normal accessible description.
2. When visible, check the dedicated enhancement cache using the exact local content URL.
3. If there is no valid cached copy, try one configured HTTPS mirror, then the emitted same-origin
   file. With no mirror configured, use the same-origin file directly.
4. Replace only after successful status, exact MIME/length/SHA-256 validation and image decoding.
   HTTP errors, captive-portal HTML, denied CORS, redirects, partial bodies, corruption, timeouts
   and storage failures retain the compact image.

There are at most two visible-image tasks per mounted gallery. Each candidate gets four seconds
including body transfer; each image is at most 1 MiB. Cache operations have a 1.5-second wait
budget and decoding has two seconds. With one mirror plus the origin, an upgrade can take two
network attempts; local rendering never waits for either. Requests omit credentials and referrers.
The enhancement cache keeps at most eight entries after serialized writes, evicting oldest
entries; it does not open IndexedDB or remove shell, wing, folio or unrelated caches.
The cache is reusable across app releases because every hit is checked against the current
manifest's exact fingerprint. Obsolete detail may be evicted without changing saved puzzles.

The gallery's **Use less data · compact artwork only** toggle persists on this device. In that
mode it does not read the enhancement cache or download detail. Automatic mode respects browser
Save-Data and slow/2g connection hints; already cached detail remains usable. Network hints are
advisory, not proof of reachability: actual requests determine success. Reconnection, returning
to the foreground and connection-policy changes re-evaluate visible images. Route changes and
preference changes abort the old view's requests and release its object URLs. Backgrounding stops
new downloads. The single-file preview retains embedded artwork and makes no upgrade requests.

## Browser-facing CDNs and packages

No external mirror is configured by default. The existing Cloudflare static origin supplies the
first higher-detail implementation. To use an approved CDN, upload the exact emitted image bytes
to an immutable HTTPS URL, then add its asset ID to `content/asset-delivery.json`:

```json
{
  "schemaVersion": 1,
  "mirrors": {
    "met-melencolia": ["https://cdn.example.org/alibi/melencolia.94f08df0b4b8.webp"]
  }
}
```

The URL is an illustration, not a configured or tested provider. A mirror must return CORS-readable
responses (`Access-Control-Allow-Origin` for the app origin, or `*` with omitted credentials),
`Content-Type: image/webp`, no redirect, and bytes matching the pinned derivative. A CDN that
re-encodes automatically needs a separately reviewed derivative and fingerprint; do not disable
validation or accept opaque responses to make it work. The build permits only known asset IDs,
one mirror each and credential-free HTTPS URLs with no query or fragment. It generates the
precise `connect-src` origin list and permits decoded `blob:` images; script policy stays local.
Local development reads the emitted CSP too. Check actual headers on every production host.

Package CDNs may be used during development to acquire pinned, licensed inputs. **Runtime code
is a different trust and availability boundary from images.** Bundle required libraries locally;
keep optional engines lazy-loaded from the coherent local release. Do not introduce a startup
dependency on unpkg/jsDelivr/ESM transforms or evaluate CDN JavaScript through this image loader.
Imported puzzle packs still cannot introduce URLs or code. For future fonts, audio, models or
remote data, define a separate type-appropriate fallback and validator before enabling delivery.
A system font is a functional font fallback; a missing model icon is not a functional 3D editor.

## Performance and release strategy

- Keep the critical route independent of optional networks, cache writes and pack completion.
  Quiet Wing `enter()` finishes after mount; its background pack attempt cannot delay `leave()`
  or save flushing. Complete-pack checks examine every required URL before reporting ready.
- Preserve existing core, initial gzip, content and wing budgets. Report `enhancementBytes`
  separately; adding detail cannot silently increase the installation budget.
- Prefer compact local representations, visible-only upgrades and bounded concurrency to eager
  downloads. Continue existing reduced-motion, lifecycle and deliberate-audio behavior.
- Add other surfaces only with a real offline alternative: equivalent game controls, actual
  compact artwork, a usable local renderer, or explicitly unavailable network-only functionality.
- Deployment always includes the whole release, including optional `enhanced-*` files. Mirror
  failure must not fail shell installation. Do not activate service-worker updates mid-game.

## Evidence and acceptance

`npm run verify` includes delivery response/timeout/cache regressions, the nonblocking activity
regression, emitted-file accounting and the existing shell/budget checks.
`python tests/browser_delivery.py` exercises real-origin 390px/1280px controls, decoded high/low
resolution images, persisted preference, cached detail offline, never-visited gallery fallback,
an actual offline Sudoku move/reload, HTTP failure and reconnection. CI runs it alongside the
existing UI, origin and update suites. Screenshots/results live in `test-results/delivery/`.

Before enabling a real external mirror, additionally verify its actual CORS, MIME, hashes, CSP,
timeout behavior and provider terms from each live app origin. Tests with controlled CDN responses
prove selection and failure behavior; they do not certify an unconfigured external provider.
Physical airplane-mode relaunch, TalkBack, memory pressure and sustained device performance remain
owner acceptance in [HUMAN_TODO.md](../HUMAN_TODO.md), especially q-2 and q-4.

Background: the [offline cookbook](https://web.dev/articles/offline-cookbook) distinguishes
installation-critical resources from optional retrieval; the [MDN Cache API reference](https://developer.mozilla.org/en-US/docs/Web/API/Cache)
documents explicit cache management and storage constraints. Alibi keeps its small existing
service worker rather than introducing a second caching framework.
