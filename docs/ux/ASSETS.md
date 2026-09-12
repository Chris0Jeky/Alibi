# Asset ledger and delivery policy

## Shipped

| Asset | Origin | Use | Delivery |
| --- | --- | --- | --- |
| Fifteen line icons: desk, grid, house, notebook, controls, arrow, check, mail, sun, moon, search, close, key, scene, bridge | Original in-code SVG paths in `src/house/components.js` | Shared decorative component vocabulary | Optional script; no external request |
| Study / Library / Map Room engravings | Original SVG paths in the same module | Room cards and observation sheets | Stroke follows text colour; no raster |
| `briar-house` | Existing repository `src/artwork` asset | Desk mystery invitation | Existing hashed/embedded media mapping |
| Miniature sun/moon board | HTML/CSS and original icons | Decorative first-game invitation | No renderer or raster |

No new font, stock photo, video, texture, sound, remote asset origin, analytics request or runtime dependency. Existing artwork provenance remains in the repository catalogues; this revision does not relicense it. Illustrative evidence is repeated in semantic copy. Decode failure leaves readable text and the envelope control.

## External research, not shipped

Pexafy was used to research atmospheric library photography. Shortlist: Peter Herrmann on Unsplash, “a room with a lot of books in it”, https://unsplash.com/photos/a-room-with-a-lot-of-books-in-it-O_DUcg4cDlc (creator: https://unsplash.com/@tama66). Provider license reviewed at https://unsplash.com/license on 2026-09-12.

That photograph is **not downloaded, embedded, hotlinked or shipped**. Existing painted artwork and purpose-built line work offer continuity without an extra raster download. The shortlist is not a universal rights receipt; verify the asset and intended use before acquiring a derivative. Record creator, source, license, retrieval date, crop instructions and checksum.

## Actual optional delivery

An earlier PR checkpoint precached the house script/CSS and exceeded existing initial/core budgets. The revised architecture reuses the existing script loader and removes both optional house files from the core install list. Only explicit preview entry loads them. The separate `alibi-house-pack-<hash>` cache is filled as one two-file batch and retains the current and one previous pack. A failed new batch cannot delete puzzle data, shell caches or the previous pack. The footer indicates whether a preview copy is cached. Cached files alone are not proof that the host service worker or browser storage will remain available forever.

`build-info.json` exposes compiled house JS/CSS gzip bytes and total bytes. `houseBytes` is included in full distribution accounting as a genuine optional pack, not hidden. Existing production caps are unchanged. Additional pack checks require <60 KiB compiled raw and <18 KiB combined gzip. Source checks allow JS <14 KiB gzip, CSS <6 KiB and facade <2 KiB; source whitespace is not a production transfer measurement.

Before richer scenes: measure independently, emit width-appropriate derivatives with dimensions, preserve text/actions on failure, provide a still reduced-motion fallback, and prove navigation with the pack absent. Packaging in Capacitor does not remove decode, memory, layout or input costs.
