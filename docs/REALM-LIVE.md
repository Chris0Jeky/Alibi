# Realm live geometry

Quiet Wing now renders five original models from the local production library in the actual realm:
the cottage, barn, kitchen garden, orchard and round tree. They remain the existing saved type IDs
(`cottage`, `barn`, `farm`, `orchard` and `tree`), so existing scenes, palettes, quarter-turns,
Canvas rendering, SVG postcards and OBJ exports use the same state contract.

`tools/assets/import-library-models.cjs` converts the concrete GLB exports at
`assets-source/library/realm/glb/` into `src/quiet-wing/assets/library-models.json`. It converts
glTF Y-up coordinates to the one-plot Z-up `{ v, f, c }` format used by `realm.js`, preserves
outward triangle winding, and rejects stale output with `--check`. The checked-in runtime data is
compact: 5 models, 616 vertices and 328 triangles.

The imported barn and cottage retain the saved colour story on their terracotta roofs. The
windmill deliberately keeps its procedural body and moving sails: there is no corresponding source
library GLB, and its motion is part of the current Realm behaviour.

This adds no runtime GLB loader, network request, database change or new placeable type. The source
GLBs, Blender master and thumbnails remain in the production library; only compact geometry is
inlined into the optional Quiet Wing activity. `tests/realm-library-models.test.cjs` proves the
conversion is current and that finite, bounded geometry is used by the saved-placeable path.

Physical-device performance and external OBJ-editor interoperability remain open in
[HUMAN_TODO.md](../HUMAN_TODO.md), q-4 and q-5.
