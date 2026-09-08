# Animated companion candidates

Downloaded 2026-09-08. All three are selected for the optional companion view and its offline pack.
Original source bytes remain unmodified. The public sources page includes the required credits.

- `cat.glb`: J-Toastie, via Poly Pizza, CC BY 3.0. Original source/licence record is in
  CAT-LICENSE-AND-SOURCE.md. One skeleton, one idle animation; interaction props and gentle
  presentation motion are added by Alibi.
- `owl.glb`: Gobkit Owl, CC0 1.0. Source https://gobkit.itch.io/gobkit-free-animal-pack-vol-2 .
  Exact model URL and creator-supplied animation ranges/licence are in OWL-METADATA.json, obtained
  from https://gobkit.com/api/free . One clip, 16 bones. Slice the idle clip to frames 0–29 at 24 FPS;
  never play the full attack/death timeline as ambient motion. The walk segment is frames 90–119.
- `fox.glb`: Khronos sample Fox. Original model by PixelMannen (CC0); rigging/animation by
  tomkranis (CC BY 4.0); glTF conversion by AsoboStudio and scurest (CC BY 4.0). The original
  source/legal document is retained in FOX-LICENSE-AND-SOURCE.md. Keep attribution with the
  packaged asset and in the public credits. One skeleton with 24 bones and Survey/Walk/Run clips.
  Source https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Fox .

SHA-256, size and animation inventory: download-receipt.json. These are self-contained GLB 2.0
files with embedded buffers/textures. The fox is authored at a much larger scale; normalize its
bounding box for the display only, without changing saved identity or walk timing.

Local previews and render measurements: `release/asset-downloads/companions/` (ignored). Both
were visually inspected after playing their idle animation. Nimbus is an original articulated
model in src/quiet-wing/pet-view.js. An external Quaternius dragon candidate was excluded because
its current umbrella licence conflicts with the older model-specific CC0 statement. There is no
external dragon file in this repository. In-game validation is recorded in docs/STATE.md.
