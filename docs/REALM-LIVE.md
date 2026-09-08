# Realm live geometry

Quiet Wing now renders eight original models from the local production library in the actual realm:
the cottage, barn, kitchen garden, orchard, round tree, boat, bench and village well. They remain
the existing saved type IDs (`cottage`, `barn`, `farm`, `orchard`, `tree`, `boat`, `bench` and
`well`), so existing scenes, palettes, quarter-turns, Canvas rendering, SVG postcards and OBJ
exports use the same state contract.

`tools/assets/import-library-models.cjs` converts the concrete GLB exports at
`assets-source/library/realm/glb/` into `src/quiet-wing/assets/library-models.json`. It converts
glTF Y-up coordinates to the one-plot Z-up `{ v, f, c }` format used by `realm.js`, preserves
outward triangle winding, and rejects stale output with `--check`. The checked-in runtime data is
compact: 8 models, 1,415 vertices and 753 triangles.

`assets-source/library/realm/details/` adds three original low-poly Blender exports and measured
PNG thumbnails: the planked boat (103 triangles), slatted bench (144), and `well-fountain` (178).
The fountain is deliberately mapped to the existing `well` type because Realm has no `fountain`
save ID. Each stays below the 250-triangle budget and uses the local petrol, cream, amber and sage
colour language.

The imported barn and cottage retain the saved colour story on their terracotta roofs. The
windmill deliberately keeps its procedural body and moving sails: there is no corresponding source
library GLB, and its motion is part of the current Realm behaviour.

This live-placeable mapping adds no GLB download, database change or new placeable type. Compact
geometry is inlined into the optional Quiet Wing activity; Field notes separately loads the original
GLB derivatives on demand. Editable masters stay in the source library. `tests/realm-library-models.test.cjs` proves the
conversion is current and that finite, bounded geometry is used by the saved-placeable path.

Physical-device performance and external OBJ-editor interoperability remain open in
[HUMAN_TODO.md](../HUMAN_TODO.md), q-4 and q-5.
