# Alibi lantern and counters: optional v2 motion preview

Open `index.html` locally. It compares the untouched v2 static master with a separate inline-SVG motion alternative. Edit the standalone SVG, `preview.css` and `preview.js`; keep the source hash updated only when intentionally revising art. The source copy is byte-identical to revision `05a04ca2f2258a2b1553e0585d6bf8b0c258b21b`; SHA-256 `1af0dd98e94878a19437b640ae4f20104f92444bd01f29fa47260f73461344e3`.

## Limited owner answer — 13 October 2026

Chris's “Yeah, I guess these are good enough for being SVGs” provisionally accepts the immediately displayed v2 LAS workshop and Alibi lantern renders, plus the responsive LAS card. It does not approve the later failed coarse studies, pixel variant, licensing, runtime deployment or a merge. The proposed conversion pivot is stopped. The original art files and earlier archives remain unchanged.

## Motion contract

Gentle flame illumination and rising steam; the lantern, counters, board and leaves remain stationary. Motion never deforms geometry or moves the whole scene. Static counterparts remain complete, script-free native SVGs without embedded raster content. Named original layers/IDs and all object paths survive; preview-only wrapper groups carry CSS transforms/opacity. No new dependency or runtime infrastructure.

The page starts still, with explicit Play and Pause buttons. Reduced motion disables Play and displays a still; changing that preference requires a fresh Play request. User pause preserves time. Hidden/offscreen observation pauses and resumes only a prior Play request. Unsupported visibility observation keeps the still. Train occlusion, where enabled, uses an unchanged stationary window clip and later window joinery; the off-window reset is discrete and entirely clipped.

## Verification

Run `python verify_preview.py --evidence <output-folder>` with the repository's existing Playwright/Pillow tools. It opens actual local files offline, compares initial pixels with the standalone master, checks controls and reduced motion, observes real scrolling, and compares rendered loop endpoints. Hidden-document handling uses an explicit DOM visibility-contract probe; physical device/minimized-window behavior is not certified by that probe. Exported video, if delivered, is illustrative and not the editable source.

Source-only addition. No catalogue or runtime/precache registration, budget change, merge or deployment. Existing owner choices remain open. See the draft PR for exact-head hosted checks and unrun gates.
