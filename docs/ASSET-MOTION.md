# Alibi motion library

Current integration: all eight rendered cuts appear in the actual app at `#/quiet/folio` under
Screening room. Playback and orientation are deliberate; leaving disposes playback. The files
are included in the static distribution but excluded from both automatic and explicit offline
packs. HyperFrames source and masters remain development-only. The production-only boundary
described below belongs to the initial asset pass.

This directory contains the authored HyperFrames source and delivery derivatives for the Alibi
promotional films. Editable compositions remain development sources; the runtime uses their
rendered derivatives.

The films use the current local Alibi app at `http://127.0.0.1:8787` as their capture source. The
captures were made on 2026-09-08. They show the current product surfaces and existing artwork:
116 puzzles, 13 families, four casebooks, Quiet Wing, companions, exportable saves, and the Tidal
bridges collection. Online play is not enabled and is not claimed. Captures are still product
screens; the films do not imply that a filmed person interacted with the app.

## Library

| Source | Delivery | Length | Framing |
| --- | --- | ---: | --- |
| `intro-landscape/index.html` | `renders/alibi-intro-landscape.mp4` | 36s | 1280×720 |
| `intro-portrait/index.html` | `renders/alibi-intro-portrait.mp4` | 36s | 720×1280 |
| `quiet-wing-landscape/index.html` | `renders/alibi-quiet-wing-landscape.mp4` | 12s | 1280×720 |
| `quiet-wing-portrait/index.html` | `renders/alibi-quiet-wing-portrait.mp4` | 12s | 720×1280 |
| `bridges-landscape/index.html` | `renders/alibi-bridges-landscape.mp4` | 12s | 1280×720 |
| `bridges-portrait/index.html` | `renders/alibi-bridges-portrait.mp4` | 12s | 720×1280 |
| `ambient-lamplight/index.html` | `renders/alibi-ambient-lamplight.mp4` | 5s | 1280×720 |
| `ambient-earned-stamp/index.html` | `renders/alibi-ambient-earned-stamp.mp4` | 5s | 1280×720 |

Every delivery has a matching JPG poster in `posters/`. The two ambient pieces are decorative preview
cuts: lamplight is a Quiet Wing interlude, and earned-stamp uses the verified 116-puzzle count as a
reward motif. Neither depicts a new product interaction or unlock system.

The normalized catalogue is [`assets-source/library/motion/catalogue.json`](../assets-source/library/motion/catalogue.json).
Paths in that file are relative to `assets-source/library/motion/` and contain no machine-specific
paths. Each item records its source, MP4 and poster derivatives, dimensions, duration, claims,
capture provenance, integration boundary, and QA state.

## Rebuild

The source is seekable and renders without a CDN. The local GSAP copy is in each composition's
`library/gsap.min.js`; its package and licensing receipt is
[`library/gsap-license.txt`](../assets-source/library/motion/library/gsap-license.txt). The
tested local creative-toolchain provides HyperFrames 0.8.31, GSAP 3.14.2 and FFmpeg. The shared
toolchain workspace was not modified.

Run from the repository root with the tested toolchain on `PATH` (or provide its executable path):

```powershell
hyperframes check assets-source/library/motion/intro-landscape --at "0,6,12,18,24,30,35.8" --strict
hyperframes snapshot assets-source/library/motion/intro-landscape --at "0,18,35.8" --output assets-source/library/motion/snapshots/intro-landscape
hyperframes render assets-source/library/motion/intro-landscape --output assets-source/library/motion/renders/tmp-intro-landscape.mp4 --quality draft --resolution landscape --workers 1 --strict
ffmpeg -i assets-source/library/motion/renders/tmp-intro-landscape.mp4 -vf scale=1280:720:flags=lanczos -c:v libx264 -crf 20 -pix_fmt yuv420p -movflags +faststart -an assets-source/library/motion/renders/alibi-intro-landscape.mp4
ffprobe -v error -show_entries format=duration,size:stream=width,height,codec_name,pix_fmt,r_frame_rate -of json assets-source/library/motion/renders/alibi-intro-landscape.mp4
```

Use `--resolution portrait` and `scale=720:1280` for the portrait sources. Feature sources are
checked at `0,6,11.8`; ambient sources at `0,2.5,4.8`. The source snapshots and decoded delivery
frames were inspected at start, middle and end. The intro deliveries were decoded specifically at
0s, 18s and 35s in both orientations; all three positions are populated.

The committed MP4 set is 16,909,677 bytes total. All eight files are H.264, 30 fps, no audio track, with
durations of 36s, 12s or 5s as listed above.

The compiler reported populating its Inter font cache during checks. Authored CSS uses local
system font stacks and contains no font CDN reference; the game receives no new fonts or media
SDK. Retained JSON receipts omit personal cache paths. The combined catalogue groups the six
landscape/portrait cuts as three original films and the two ambient pieces as two originals.
Final Chromium playback/seek results and actual decoded frame contact sheets are in
`assets-source/library/evidence/`. Speech is absent, so no speech-caption track is required.

## QA and boundaries

- HyperFrames strict lint, runtime, layout and contrast checks pass for all eight compositions.
- Start/mid/end source snapshots were visually inspected before full render.
- Final MP4s were downscaled to practical delivery dimensions and verified with `ffprobe`.
- No speech, voiceover, music, external network asset or new paid media was introduced.
- Artwork is reused from the existing seven Alibi covers; no fake gameplay or invented app screen
  is presented as a product capture.
- No `HUMAN_TODO.md` item was closed by this asset slice. Owner decisions, physical-device checks,
  publishing and hosted release gates remain with the parent task.
