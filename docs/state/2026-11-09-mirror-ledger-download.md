# Mirror Ledger downloadable preview

## Changed

Added a fixed-source builder, `node tools/build-mirror-preview.cjs`, that bundles the existing Mirror Ledger prototype with the pinned esbuild into one self-contained `test-results/mirror-ledger/mirror-ledger.html`. A separate deterministic `build-receipt.json` records the esbuild version, SHA-256 hashes of bundle inputs and builder, and the resulting HTML. The builder refuses unexpected bundle inputs, extra output imports, CSS asset references and fetched template assets. The prototype runtime and eight boards are unchanged. The README describes local build and CI artifact download; the standalone remains memory-only and outside app registration, storage and deployment.

The existing browser fixture now exercises the same actual controls via both loopback HTTP and a direct `file:` URL at 320 and 1280 pixels, checks the built file against the build receipt, verifies reload resets the session and records the transport and file hash. The dedicated workflow installs the locked dependencies, builds the HTML and uploads it with browser evidence. It must pass before browser behavior of the file can be claimed.

## Verified locally

- The builder ran twice with esbuild 0.28.2; both HTML and build-receipt hashes were identical. The HTML was 10,554 bytes, SHA-256 `ef3e4f673f0b9e2d42bf57f300fd66cf9f4e19c6adc4fc02b51fa853e7adfc02`.
- An HTML parser found one inline script, one inline style and no fetched asset tags; the extracted bundled JavaScript passed `node --check`.
- The focused model suite passed 4/4; the builder and Python browser fixture passed syntax checks, focused Prettier passed, and `git diff --check` passed.

## Not verified and remaining gates

No actual browser test was run for this change: the local Chromium binary is absent and the coordinator reported the official Playwright download unavailable. The dedicated CI workflow and its screenshots/receipt still require review on the final head. No physical-device, screen-reader or real-player result is implied; the existing [HUMAN_TODO.md](../../HUMAN_TODO.md) release, sharing and physical-device decisions remain open. This change does not deploy, publish, or supply installed-app offline behavior.
