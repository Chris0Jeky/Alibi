# The artist's cabinet

Local asset production on `codex/asset-library`, based on
`897651e53a27b29e2b9a0a55d75b474ee0de88dc` (0.6.0). Nothing from this session is pushed,
deployed or externally published. The supplied Cloudflare preview was inspected in Chromium;
it still served 0.5.0-preview.1 / `134d93f3d854`. The checkout is the working visual authority.

Run `npm run assets:gallery`, then open `http://127.0.0.1:8790/`. The gallery includes real files,
search/category filters, light/dark paper, small/large previews, locked states, explicit audio/video
playback, model/state preview links, editable sources and source-specific provenance. The solved
evidence still life requires the explicit spoiler checkbox. It is a local production tool, separate
from the game build and its service worker.

## Delivery map

| Family | Delivery | App binding |
| --- | --- | --- |
| Puzzle highlights | 12 original editorial SVG masters + 320×240 WebPs | Existing puzzle cards, including all six Bellweather records |
| Stamps | 31 original silhouettes, earned and locked SVGs | Existing six Club and 25 Quiet Wing predicates |
| Categories | 13 existing exact icons and card treatments | Retained unchanged; exported for inspection |
| Teaching | 13 actual interactive lesson screenshots | Existing lesson controls remain editable and tested |
| Museum and casebook art | Seven original gouache images + seven credited museum images | Reused unchanged in their existing contexts |
| Realm kit | 40 GLBs: 24 retained CC0 modules + 16 new compatible modules | Retained pieces are current; new pieces are preview-only |
| Realm scenes | Harbour, hillfort and farmstead; editable master and alternate views | Production demonstrations |
| Companions | Four existing vector identities; eight named layered states per species | Current designs retained; extra state treatments staged in preview |
| Audio | 20 cues + four 16–22 second loops; WAV/Opus/Ogg and editable recipes | Gallery preview; recordings are not bound to game events |
| Motion | Authored HyperFrames compositions, captures, posters and rendered cuts | Production only; never included in the game runtime |

The exact counts, byte hashes and source paths are in
[catalogue.json](../assets-source/library/catalogue.json). Counts distinguish original designs,
reused designs, composed scenes and derivative encodings; eight states do not become eight new
companions. [coverage.json](../assets-source/library/coverage.json) maps 18 screen/activity groups
and their meaningful states to existing work, priorities, deliveries and outstanding QA.
[STYLE.md](../assets-source/library/STYLE.md) records the shared design rules.

The new vignette language is exact editorial vector art, complementing the retained gouache;
it is not described as a newly generated painting. No new historical art or fictional portrait
canon was needed. Existing cast names, story text, published definitions and all puzzle revisions
remain intact. The images contain no lettering, clue grids, suspect placements or answer data.

## Regeneration and checks

The existing repo toolchain pins Sharp 0.35.4, Prettier 3.9.6, esbuild 0.28.2 and Three 0.185.1.
Shared creative-toolchain doctor passed for local Node, Python, Inkscape, Blender 5.2.1,
FFmpeg 8.1.2 and HyperFrames 0.8.31. Production does not add a runtime package or CDN.

```powershell
npm run assets:visuals
# Captures require a current npm run build and the repo Playwright environment.
.venv/Scripts/python.exe tools/assets/capture-teaching.py --force
npm run assets:catalogue
npm run assets:check
npm run assets:media
.venv/Scripts/python.exe tools/assets/inspect-media.py
npm run verify
```

Visual regeneration is incremental and refuses to replace hand-edited exports without `--force`.
The combined catalogue is rebuilt by `assets:visuals`; after separately regenerating audio,
models, teaching or motion, run `assets:catalogue`. The hash test fails if any file changes without
refreshing that catalogue. See [ASSET-AUDIO.md](ASSET-AUDIO.md), [ASSET-MODELS.md](ASSET-MODELS.md)
and [ASSET-MOTION.md](ASSET-MOTION.md) for the production-specific commands.

## Boundaries and acceptance

Only the highlight derivatives and compact stamp renderer enter the game. Large masters,
GLB staging exports, WAVs and films remain outside `dist/`; no broad precaching or storage
migration is added. Core JS/pack budgets remain unchanged. Baseline core pack: 1,329,465 bytes;
baseline initial JS gzip: 125,138 bytes. Final values and direct test evidence are recorded in
the production ledger. The remaining core-pack headroom is small and must be measured before
adding another in-game asset.

The [production ledger](../assets-source/library/production-ledger.json) gives final counts and
check totals. [Evidence](../assets-source/library/evidence/) retains compact local browser results,
inspected screenshots and before/after payload measurements. The current game build is
`fac4d1d1ad6c`: core 1,362,809 bytes (+33,344), initial JS gzip 127,264 (+2,126), optional wing
1,977,995 (+51). The local startup sample is explicitly unthrottled and has no baseline latency
comparison; it is not a phone-performance claim.

All work uses local synthesis/geometry and unchanged existing art. No purchases, credits,
paid submissions, accounts or overages were used. Existing Kenney CC0 receipts remain attached
to retained models; the new exports include embedded materials. Existing museum attributions
and public-domain receipts remain authoritative. New original project work has no separate
public reuse grant, consistent with NOTICE.md and the unresolved source-licence decision.

Machine decodability, levels and seamless endpoints are proved for audio; auditory/device-volume
review remains pending. Browser viewport evidence does not certify a physical phone, TalkBack,
real haptics or sustained device GPU performance. Existing online-room source is not an enabled
service. No public rankings or fabricated reward records are introduced.

[HUMAN_TODO.md](../HUMAN_TODO.md) remains the owner backlog, particularly q-1 source licence,
q-2/q-4 physical-device acceptance and q-5 exported-model editor interoperability. These items
are not silently marked complete by asset production.
