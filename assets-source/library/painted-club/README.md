# Painted club objects

Sixteen original AI-assisted gouache-style decorative vignettes created specifically for Alibi, October 2026: welcome desk, seven Games Room cards, four supporting surfaces and four themed collections. This shelf contains source artwork, not a deployed UI change.

## Files

- `id.webp`: full-resolution lossless-alpha master
- `id-320.webp` / `id-640.webp`: card derivatives; supporting art uses 280 / 560
- `manifest.json`: all 48 binary byte lengths, SHA256/Git hashes and recorded encoder settings
- `wave-*-generation-prompts.json`: exact generation prompts
- `wave-*-derivatives.json` / `wave-*-README.txt`: original package records; their historical `runtime/` and `source-webp/` prefixes map to the basenames in this flat repository shelf
- `build-derivatives.cjs`: byte-checked regeneration using the repository's Sharp dependency

Run `node assets-source/library/painted-club/build-derivatives.cjs --check` from the repository root. It verifies all input hashes and regenerates 32 derivatives in memory without changing files. Omit `--check` to write verified outputs. Recorded Sharp/libvips/WebP versions and per-wave shrink-on-load settings preserve the original export paths. A different encoder version may require deliberate requalification; hashes are never silently rewritten.

The original PNGs remain preserved by the art producer. Master WebPs reproduce their visible/premultiplied pixels exactly; this does not claim to preserve invisible RGB under zero alpha. These are flat bitmap masters, not layered vector or native illustration files.

## Integration boundary

Keep masters and unused variants outside runtime/precache. The 16 selected small versions total 375,498 bytes. Prefer the existing optional enhancement delivery system with meaningful SVG fallback rather than inflating the core shell. The eight-slot cache does not guarantee all16 painted enhancements offline. Preserve labels, route targets, focus, game rules, saves and collection identities. Use contain with card padding; artwork is decorative, never a clue or answer diagram. Newly generated gallery scenes are not copies of credited museum works.

Runtime wiring, catalogue registration, combined-tree budgets and application acceptance remain separate work. No merge or deployment is implied. Use direct file/Git transfer rather than binary/base64 conversation payloads.
