# Delivery review and measurement ledger

The house's real startup saving is its on-demand two-file pack: neither script nor stylesheet is requested during classic entry or shell installation. A served-browser test proves that property; entering the desk then caches the pack and supports offline reload. The optional payload is 48,044 raw / 15,622 combined gzip bytes at the tested component checkpoint. This is not an app-wide speed measurement.

## Separate code and editorial data honestly

The existing budgets separately constrain initial application JavaScript, official content, combined initial downloads and the total offline shell. The scene names, routes, artwork keys and media provenance from `content/theatre.json` were previously serialized inside the application-code file. They now live in the already-loaded official-content file alongside other authored editorial metadata. No executable game or navigation implementation moves to the content asset. The deferred script order stays boot, official content, application, motion loader.

This **does not remove or defer those metadata bytes**. `officialContentBytes`, its gzip count, `initialCodeAndContentGzipBytes` and total offline accounting include them. The new theatre test proves assignment location, consumer ordering and exact combined-byte accounting. All numeric budget limits remain unchanged. A smaller application-code metric must not be advertised as a smaller combined startup transfer.

A controlled comparison using the built `fe821fb` artifact measured 178,200 bytes for code plus official-content gzip before regrouping and 178,256 after; raw combined bytes were identical at 820,641. Therefore this packaging change is a content/consumer boundary correction, **not a transfer reduction**. Final release hashes and separately emitted loader bytes affect final exact counts; inspect final-SHA build-info.

## Rejected experiment

The `a4f56a8` checkpoint tried esbuild's UTF-8 output mode. It reduced raw output by 893 bytes but increased initial gzip from 128,438 to 128,622 bytes. It was reverted. Source: https://esbuild.github.io/api/#charset (checked 2026-09-12). No screenshot or source-only assertion is used to claim the experiment succeeded.

## Evidence authority

House workflow `34669327748` on `fe821fb` passed source, production-origin and four real offline/cache scenarios. The initial-code budget at that checkpoint still failed. Subsequent final-SHA checks must pass before this is considered merge-ready. PR #138 remains opt-in and draft pending complete checks and independent review; physical-device and HUMAN_TODO gates are not waived.
