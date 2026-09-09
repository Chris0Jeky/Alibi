# Online photographs

The implemented delivery contract is [ASSET-DELIVERY.md](ASSET-DELIVERY.md). This file records
the photographic edition’s editorial/provenance decisions; it does not define a second loader.

| Surface | Photo source | Complete offline edition |
| --- | --- | --- |
| Bellweather / lighthouse | [Erik Mclean, Pexels](https://www.pexels.com/photo/scenic-white-lighthouse-on-coastal-cliff-30210002/) | Original storm-and-lighthouse painting |
| Glasshouse | [Josh Hild, Unsplash](https://unsplash.com/photos/a-large-glass-building-with-plants-growing-inside-of-it-Kfnys94_hhw) | Original illuminated conservatory painting |
| Night Train | [Red Shuheart, Unsplash](https://unsplash.com/photos/a-train-traveling-down-train-tracks-next-to-a-forest-T6vHYXQ-KIs) | Original coastal night-train painting |
| Cartographer | [Suhash Villuri, Unsplash](https://unsplash.com/photos/brown-wooden-handle-on-white-and-brown-textile-DYWHwLZyJ64) | Original map-and-islands painting |
| Listening room | [Ayşe İpek, Pexels](https://www.pexels.com/photo/lamp-shade-between-black-armchairs-13278838/) | Original reading-room illustration |

Source pages and the [Unsplash License](https://unsplash.com/license) and
[Pexels License](https://www.pexels.com/license/) were checked on 2026-09-09. These are scenic
presentation images, never fictional evidence or implied provider endorsement. The earlier
unverifiable lighthouse candidate from PR #26 was replaced before release.

`assets-source/online/after-hours.json` records selection and rights. The acquired receipt records
exact URL, MIME, bytes, dimensions, SHA-256, CORS response, photographer and source page.
`node tools/acquire-theatre-assets.cjs` is an explicit editorial operation, never a build step.
It resumes matching receipts and refuses to overwrite a changed input. Reacquisition that changes
bytes requires deliberate source/receipt review. The release includes exact same-origin mirrors.

The five 1400px WebP photos together are 972,304 bytes. All nine image enhancements, including
museum detail, total 3,303,960 bytes, outside the offline shell. The optional-image budget is 4 MiB;
the existing core, JS, CSS and Wing budgets are unchanged. An image is at most 1 MiB.

Photographs appear only after byte validation and decode; credits appear with them and disappear
when returning to the painting. `connect-src` permits the two exact provider origins; image
rendering uses validated `blob:` URLs. Runtime scripts and required packages stay same-origin.
No tracking query, account, gameplay data, credentials or referrer is sent by the image loader.
The privacy page discloses ordinary provider request metadata and the Painted edition opt-out.
Network hints do not guarantee reachability: CDN/CORS/transform failure retains the painting.

See [THEATRICAL-EDITION.md](THEATRICAL-EDITION.md) for how images, sound, vector motion,
short films and playable worlds fit together. Physical-device sensory/accessibility acceptance
remains in [HUMAN_TODO.md](../HUMAN_TODO.md).
