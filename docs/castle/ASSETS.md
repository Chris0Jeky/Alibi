# Wrenmere Castle scene assets

The castle activity uses a small optional scene pack. Its editable source is kept under
`assets-source/castle/`; generated files under `dist/assets/` are content hashed and are not source
files.

## Inventory

| Purpose                        | Source path                                                                                                                         | Delivery             | Reuse disposition                                                                                                                           |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Original procedural art source | `assets-source/castle/art.js`                                                                                                       | Source only          | Preserve as the editable reference for future variants; the activity uses the reviewed SVG exports below.                                   |
| Estate maps                    | `assets-source/castle/rooms/estate-today.svg`, `estate-1911.svg`                                                                    | Automatic scene pack | `castle.media['estate-today']` and `castle.media['estate-1911']`; the 1911 export is sanitized at build time until the deduction is earned. |
| Room illustrations             | `assets-source/castle/rooms/{cartography,conservatory,gatehouse,library,museum,observatory,orangery,study,west-stair,workshop}.svg` | Automatic scene pack | `castle.media[roomId]`; these are the original room illustrations, not reused Alibi paintings.                                              |
| Prologue film                  | `assets-source/castle/prologue/wrenmere-prologue.mp4`                                                                               | Explicit on demand   | `castle.film.src`; never included in `castle.files` or the install cache.                                                                   |
| Film poster                    | `assets-source/castle/prologue/prologue-poster.png`                                                                                 | Explicit on demand   | `castle.film.poster`; never included in `castle.files` or the install cache.                                                                |
| Captions and transcript        | `assets-source/castle/prologue/prologue.vtt`, `prologue-transcript.txt`                                                             | Explicit on demand   | `castle.film.captions` and `castle.film.transcript`; never included in `castle.files`.                                                      |
| Rights and provenance          | `assets-source/castle/NOTICE.md`                                                                                                    | Repository source    | Keep with the source assets when copying or revising this pack.                                                                             |

Measured source files:

| Path                                                    |   Bytes |
| ------------------------------------------------------- | ------: |
| `assets-source/castle/art.js`                           |  12,311 |
| `assets-source/castle/NOTICE.md`                        |   1,054 |
| `assets-source/castle/rooms/cartography.svg`            |   2,430 |
| `assets-source/castle/rooms/conservatory.svg`           |  13,152 |
| `assets-source/castle/rooms/estate-1911.svg`            |  27,703 |
| `assets-source/castle/rooms/estate-today.svg`           |  27,484 |
| `assets-source/castle/rooms/gatehouse.svg`              |  11,561 |
| `assets-source/castle/rooms/library.svg`                |  11,432 |
| `assets-source/castle/rooms/museum.svg`                 |  11,715 |
| `assets-source/castle/rooms/observatory.svg`            |   3,196 |
| `assets-source/castle/rooms/orangery.svg`               |   3,898 |
| `assets-source/castle/rooms/study.svg`                  |  11,437 |
| `assets-source/castle/rooms/west-stair.svg`             |   1,722 |
| `assets-source/castle/rooms/workshop.svg`               |  11,601 |
| `assets-source/castle/prologue/wrenmere-prologue.mp4`   | 828,098 |
| `assets-source/castle/prologue/prologue-poster.png`     | 216,679 |
| `assets-source/castle/prologue/prologue.vtt`            |     289 |
| `assets-source/castle/prologue/prologue-transcript.txt` |     334 |

The current source measurement is 12 SVGs / 137,331 bytes; the delivered scene derivative is
137,225 bytes, within the 180 KiB scene budget. The bundled script is 69,015 bytes. The prologue
MP4 is 828,098 bytes and must remain at or below 1 MiB. The poster, captions and transcript are
also included in the returned castle byte accounting, although all four remain on demand. The
asset-only integration checkpoint's combined castle accounting was 1,251,640 bytes. Use the
current build receipt for the final UI's size. The builder reports `scriptBytes`,
`sceneBytes`, `originalSceneBytes`, `filmBytes` and the combined `bytes` value for release
accounting.

## Runtime contract

Hosted builds expose this shape through `globalThis.ALIBI_QUIET_CONFIG.castle`:

```js
{
  script: './assets/quiet-castle.<12 hex>.js',
  files: [
    './assets/quiet-castle.<12 hex>.js',
    './assets/quiet-castle.<12 hex>.<scene-id>.svg', // twelve entries
  ],
  build: '<12 hex script hash>',
  media: {
    'estate-today': '<one files URL>',
    'estate-1911': '<one files URL>',
    library: '<one files URL>',
    // the other ten room IDs follow the same form
  },
  film: {
    src: './assets/quiet-castle.<12 hex>.mp4',
    poster: './assets/quiet-castle.<12 hex>.png',
    captions: './assets/quiet-castle.<12 hex>.vtt',
    transcript: './assets/quiet-castle.<12 hex>.txt',
  },
}
```

`files` is the automatic offline set: one activity script and twelve hashed, same-origin SVGs.
The prologue URLs are deliberately separate so opening the activity does not fetch the film or
poster. `castleBytes` includes every emitted script, scene, film, poster, caption and transcript
file for the release ledger; it does not make those optional files automatic.

The standalone build receives `castle.source` and twelve `data:image/svg+xml;base64,...` values in
`castle.media`. Its `castle.film` value is `null`, which makes the absent film explicit in a file
that has no same-origin media directory.

`src/castle/art.mjs` reads the configured media URLs at render time. `estate('today', false)` and
`estate('1911', false)` contain no service-route label. After the inference is completed, the
`secret` argument permits the service-route caption and matching SVG overlay. The 1911 master contains a dashed service
route, so `tools/build-castle.cjs` removes that one authored route from the delivered derivative;
the original master remains unchanged in `assets-source/castle/rooms/estate-1911.svg`.

The cache accepts exactly thirteen URLs: one `quiet-castle.<hash>.js` and twelve
`quiet-castle.<hash>.<scene>.svg` URLs. It rejects foreign origins, query or fragment suffixes,
wrong extensions, malformed hashes, duplicates and count changes. It keeps the current pack and
one predecessor. A partial match, failed `addAll`, failed completeness check or failed cleanup
leaves `available()` false and removes the current pack where storage permits.

## Provenance and licensing

The supplied `NOTICE.md` identifies the Wrenmere art, code and story as authored proposal material,
with no third-party paintings, stock images, fonts, paid generation, British Museum photographs or
Blue Prince art bundled here. The MP4, poster, captions and transcript are copied unchanged from
the supplied proposal media. Rights statements are not inferred from visual similarity; any future
replacement must carry its own source and permission record beside the asset before delivery.
