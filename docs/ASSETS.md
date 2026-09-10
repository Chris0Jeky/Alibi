# Artwork and provenance

The 0.2.0 source, 102 puzzle definitions, SVG board previews and install icons were supplied by
the project owner in `alibi-deluxe-publish-bundle/`. The original build `04628f8c5791` was reproduced
before changes. This is provenance, not a third-party rights audit.

The following original illustrations were generated for this project on 2026-09-08 using OpenAI
image generation, then encoded as WebP without changing their composition:

| File | Subject | Size |
| --- | --- | --- |
| `src/artwork/briar-house.webp` | Country-house study, envelope, lamplight | 1024 x 683 |
| `src/artwork/night-train.webp` | Coastal night train and railway signal | 1024 x 683 |
| `src/artwork/glasshouse.webp` | Lanterns inside a glass conservatory | 1024 x 683 |
| `src/artwork/bellweather.webp` | Storm, tidal causeway and lighthouse beam | 1024 x 683 |
| `src/artwork/evidence.webp` | Blank logbook, tide map, key and blue cord | 1024 x 683 |
| `src/artwork/cartographer.webp` | Model island crossings on a lamplit chart | 1024 x 683 |
| `src/artwork/quiet-town.webp` | Layered coastal street and warm windows | 1024 x 683 |

Direction: textured gouache, deep ink/petrol blue, warm amber light; no people, lettering or logos.
The After Hours bundle re-encodes all seven images to 1024 x 683; together they now total 418,376 bytes (about 409 KiB), down from 1,231,240 bytes.
The originals were visually inspected as full-size PNGs before conversion (Sharp WebP, quality 81,
effort 6 for the expedition images). Build fingerprints cover the exact bytes. All seven images
ship in the offline shell and single-file preview. No original PNG or private machine path ships.

The lighthouse follows the player into Bellweather chapters; the evidence still life appears
only with solved chapter revelations. The cartographer illustration identifies the Bridges
collection and its playing surface. The coastal street leads to the existing Lanterns puzzles.

The current build uses local artwork, bundled code and system fonts. Approved immutable image
mirrors can be configured for progressive detail; complete local versions remain available offline.
See [ASSET-DELIVERY.md](ASSET-DELIVERY.md) for delivery classes, budgets and CDN requirements.
Five approved photographs use optional Unsplash/Pexels delivery with exact same-origin mirrors. Node developer tools and Python Playwright carry their own upstream licenses. See NOTICE.md
for the source-license decision and HUMAN_TODO.md for publisher/name decisions.

After Hours also supplies 22 editable SVG motifs in `src/illustrations/`. Ten motifs are new;
the others reuse existing family previews. The player generates these vectors in `club.js`.
The harbour uses local Canvas drawing instructions; no image or video stream is required.

## Optional online enhancement catalogue

The integrated After Hours edition binds five acquired and credited photographs to the rotating
home covers and listening room, through the shared `AlibiDelivery` loader. Every photograph has
a complete local illustration, an exact same-origin mirror and an acquisition receipt. The
unverifiable lighthouse candidate was replaced with a source-verified Pexels photograph.

See [ONLINE-ASSETS.md](ONLINE-ASSETS.md) for sources and [ASSET-DELIVERY.md](ASSET-DELIVERY.md)
for the implemented contract. [THEATRICAL-EDITION.md](THEATRICAL-EDITION.md) maps eight local
SVG emblems, six weather treatments, procedural sound, recordings, films and playable worlds.

## Local production library

The asset-library branch adds twelve original editorial SVG vignettes and compact WebP
derivatives to selected existing puzzle cards, plus 31 distinct earned/locked stamp silhouettes
bound to the existing six Club and 25 Quiet Wing award rules. Gouache covers and all seven
museum pictures remain unchanged. These vectors contain no lettering or answer data.

[ASSET-LIBRARY.md](ASSET-LIBRARY.md) maps the editable masters, exact category/interface exports,
actual teaching captures, portable realm kit and companion states, locally synthesised sound
and authored HyperFrames films. Its source-hashed catalogue distinguishes reused designs from
new work and production previews from in-game bindings. The local gallery does not enter the
offline PWA build. New original work does not change the repository's source-rights decision.
