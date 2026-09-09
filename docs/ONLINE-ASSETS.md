# Online asset enhancement strategy

Alibi remains an offline-capable, device-local PWA. Online media is an enhancement layer, not a new dependency model.

## Contract

The shipped local experience is the baseline. A player must be able to install, reopen, browse, understand and play Alibi without contacting an image CDN or asset service. When a network connection is available, selected surfaces may upgrade themselves to higher-fidelity or more varied remote media.

Remote media must therefore obey all of these rules:

1. **Local first.** Render the local asset immediately. Never leave a blank box, skeleton or generic placeholder while waiting for a remote image.
2. **Progressive replacement.** Preload the remote candidate separately. Replace the local image only after the candidate has decoded successfully.
3. **Meaning survives offline.** A remote image cannot be the only clue, instruction, state indicator, control, answer, credit or semantic representation.
4. **Failure is invisible.** DNS failure, CDN errors, CSP rejection, captive portals, timeouts and aborted requests leave the local asset in place. They are not player-facing errors.
5. **Respect constrained connections.** Do not request optional enhancement media when `navigator.connection?.saveData` is true. Prefer skipping it for `slow-2g` and `2g`; callers may also impose route and viewport budgets.
6. **Bound the work.** Do not eagerly fetch the whole remote catalogue. Load only assets relevant to the current visible or imminently visible surface.
7. **Do not block startup.** The boot path, puzzle catalogue, saves, update recovery and navigation must not await optional network media.
8. **Credits remain attached.** If a third-party image is displayed, its provider/source attribution remains discoverable from that surface or the existing Sources area.
9. **No save coupling.** Save records store stable semantic IDs, never expiring CDN URLs or assumptions that a remote rendition exists.
10. **Reduced capability is still a designed state.** Local fallback art must be composed, branded and appropriate to the same module. Offline mode is not a degraded placeholder mode.

## Curated After Hours layer

`assets-source/online/after-hours.json` records the first curated enhancement set. It deliberately focuses on prominent atmosphere rather than gameplay:

- Bellweather: real lighthouse photography online, existing Bellweather gouache offline.
- Glasshouse: real illuminated conservatory photography online, existing Glasshouse gouache offline.
- Night Train: real blue-hour railway photography online, existing Night Train gouache offline.
- Cartographer: real map/compass photography online, existing Cartographer illustration offline.
- Reading room: real lamplit library photography online, existing deterministic room vignette offline.

The online files are optional presentation candidates. They do not supersede the existing rights/provenance records for local artwork.

## Runtime shape

The intended generic loader is small and presentation-only. A surface gives it a local element that is already displaying its fallback plus a manifest asset ID. The loader checks policy/network conditions, resolves the remote URL, preloads and decodes it, and then swaps `src`/background only if successful.

Pseudo-contract:

```js
upgradeVisual(element, assetId, {
  visible: true,
  timeoutMs: 5000,
  signal,
});
```

Expected behavior:

- returns immediately after scheduling optional work;
- never changes gameplay state;
- never rejects into the UI;
- cancels when the route/surface is disposed;
- avoids duplicate in-flight requests for the same rendition;
- can expose diagnostic outcome (`local`, `remote`, `skipped`, `failed`) without telemetry;
- keeps the current local source if the remote asset does not decode.

The service worker does **not** need to make arbitrary third-party CDNs part of the guaranteed offline shell. A future implementation may opportunistically cache vetted remote responses where CORS/cache semantics permit it, but correctness must not depend on that cache. The shipped local fallback is the offline guarantee.

## CSP and privacy

The current release CSP allows only same-origin images. Enabling this enhancement layer therefore requires an explicit reviewed `img-src` allowlist for the exact providers actually used, rather than `https:` or `*`. Start with the hosts present in the curated manifest and expand only through reviewed provenance entries.

Remote image requests reveal ordinary request metadata such as IP address and user agent to that provider. The UI/privacy copy must not describe Alibi as making no remote requests when optional online enhancements are enabled. It can still accurately state that puzzle progress, saves and player data remain device-local and that remote media is optional presentation content.

Use `referrerpolicy="no-referrer"` for third-party visual requests where supported, and do not add analytics parameters or player identifiers to media URLs.

## Performance policy

Remote upgrades should improve perceived quality, not compete with interaction:

- local hero/fallback paints first;
- online hero may be requested after first meaningful render, not before app startup;
- below-the-fold upgrades use visibility-based loading;
- only one or a very small number of hero-quality requests should run concurrently on mobile;
- route changes abort obsolete requests;
- decode before swap to avoid a flash of broken/empty media;
- CSS transitions should be short and disabled under reduced motion;
- remote dimensions/aspect ratios are known in advance so layout does not shift.

Measure local first render and interaction independently from remote enhancement completion. A slow CDN must not regress the offline/local performance budget.

## Ownership boundaries

The generic runtime loader/network policy may be implemented separately from this visual-redesign branch. This branch owns the curated After Hours manifest, fallback choices and presentation styling. When integrating another asset-availability branch, preserve these contracts and reconcile the allowlist rather than duplicating loaders.

Do not merge a runtime CDN change solely because remote images happen to render in a normal desktop session. Acceptance should include airplane/offline reload, failed-domain simulation, Save-Data/slow-connection behavior, route cancellation and verification that every affected surface remains complete with only local assets.
