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

The currently deployed 0.7.0 build fetches no stock photography, remote fonts, external music or
third-party runtime code. Node developer tools and Python Playwright carry their own upstream
licenses. See NOTICE.md for the source-license decision and HUMAN_TODO.md for publisher/name decisions.

After Hours also supplies 22 editable SVG motifs in `src/illustrations/`. Ten motifs are new;
the others reuse existing family previews. The player generates these vectors in `club.js`.
The harbour uses local Canvas drawing instructions; no image or video stream is required.

## Optional online enhancement catalogue

The cozy After Hours redesign introduces a **catalogue only**, not yet a merged runtime dependency,
at `assets-source/online/after-hours.json`. It records vetted online presentation candidates and a
meaningful local fallback for every candidate. The first set covers the four rotating home editions
and a reading-room module using Unsplash/Pexels photography.

The contract is deliberately local-first: the app renders the existing local art immediately, then a
future generic loader may replace it only after an allowed remote image has loaded and decoded.
Remote assets must never contain the only clue, answer, instruction, state, control or semantic
meaning. Failure, offline use, Save-Data, slow connections or route disposal leave the local design
intact. Credits remain attached to any remote asset that is actually displayed.

See [ONLINE-ASSETS.md](ONLINE-ASSETS.md) for CSP, privacy, performance, caching and acceptance rules.
This catalogue is designed to integrate with the separate asset-availability/runtime work without
duplicating its loader.

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
