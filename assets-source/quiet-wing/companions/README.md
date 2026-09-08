# Animated companion candidates

Downloaded 2026-09-08, parsed and rendered in local Chromium. These are selected source assets;
they are not yet wired into the game or included in the offline download.

- `owl.glb`: Gobkit Owl, CC0 1.0. Source https://gobkit.itch.io/gobkit-free-animal-pack-vol-2 .
  Exact model URL and creator-supplied animation ranges/licence are in OWL-METADATA.json, obtained
  from https://gobkit.com/api/free . One clip, 16 bones. Slice the idle clip to frames 0–29 at 24 FPS;
  never play the full attack/death timeline as ambient motion. The walk segment is frames 90–119.
- `fox.glb`: Khronos sample Fox. Original model by PixelMannen (CC0); rigging/animation by
  tomkranis (CC BY 4.0); glTF conversion by AsoboStudio and scurest (CC BY 4.0). The original
  source/legal document is retained in FOX-LICENSE-AND-SOURCE.md. Keep attribution with the
  packaged asset and in the public credits. One skeleton with 24 bones and Survey/Walk/Run clips.
  Source https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Fox .

SHA-256, size and animation inventory: download-receipt.json. Both are self-contained GLB 2.0
files with embedded buffers/textures. The fox is authored at a much larger scale; normalize its
bounding box for the display only, without changing saved identity or walk timing.

Local previews and render measurements: `release/asset-downloads/companions/` (ignored). Both
were visually inspected after playing their idle animation. Cat/dragon sourcing, in-game actions,
reduced-motion/fallback rendering, cache loading and persistence coverage remain to implement.
