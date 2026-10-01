# Club pictograms

Twenty-nine original, hand-authored SVG path masters supplied for the Alibi asset refresh on
2026-10-01. Creator: Alibi project. Method: native vector geometry, not generated raster imagery.
These original project assets follow the repository's PolyForm Strict License 1.0.0. No external
artwork, icon font, remote sprite or additional runtime dependency is used.

`pictograms.json` is the reviewed editable source. Each standalone SVG uses a 24×24 viewBox,
currentColor and 1.6px rounded strokes; it is decorative and does not provide a control's label.
`hashes.json` records SHA-256 of the source and exact SVG exports.

From the repository root:

```sh
node tools/assets/club-pictograms.cjs
node tools/assets/club-pictograms.cjs --check
node --test tests/club-pictograms.test.cjs
python tests/browser_club_pictograms.py
```

The generator updates matching existing icons in `src/presentation.js`, plus Bridges, Quiet Wing
and Castle; seedling retains the existing plant key. Other masters are retained for later selected
surfaces. The standalone exports stay outside the runtime precache. The live paths remain inline
in the existing application bundle: no extra request or loader is needed, including offline/Zen.

The desktop and phone destination buttons keep their labels, route targets, dimensions and active
states. Games uses the table, Quiet Wing the leaf and Castle the battlements. Gameplay sun/moon
symbols and generic undo, arrows, check, close, playback, download and other controls are retained.
The existing unknown-key Sudoku fallback remains unchanged. No puzzle data or save contracts change.
