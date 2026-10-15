ALIBI — CLUB OBJECTS, FIRST PAINTED ASSET WAVE
1 October 2026

Eight original AI-assisted painted vignettes for Alibi's welcome desk and seven Games Room cards. The user authorized creating, editing and publishing assets into Chris0Jeky/Alibi PRs. These images have not yet been integrated or accepted by a repository test/build.

source-webp/: full-resolution lossless RGBA WebP sources derived from the original generated PNGs. The original PNGs remain preserved separately in the producing workspace.
runtime/: 320px and 640px derivatives, with alpha retained. Prefer 320px for the existing small cards; keep the 640px variant only if its rendered size and the project budget justify it.
build-derivatives.cjs: reproducible Sharp derivative builder. Run with the repository's existing Sharp dependency, not a new runtime dependency.
derivatives.json: dimensions, encoded sizes and hashes.
checksums.json: complete file integrity manifest for this transfer package.

Subjects: club-welcome (letter, tea, fountain pen); lantern-duel (lantern and two-sided discs); tic-tac-toe (X/O pieces); lantern-gardens (miniature garden and lantern); block-cabinet (wooden polyomino tray); pocket-borough (three coastal model houses); archive-heist (archive drawer and key); living-atlas (map, lighthouse and compass).

Art direction: ivory paper, petrol teal, sage, brass and muted terracotta. Gouache/colored-pencil texture and small editorial objects. No third-party asset files or named-artist imitation were used. Each image was generated separately with the built-in image generation tool and then inspected and converted locally with Sharp. Treat illustrations as decorative; they must not replace gameplay state, instructional diagrams, text labels or accessible names.

Integration targets: existing desk welcome and Games Room card-art seams in src/club.js. Preserve current layout, state/saves, Zen and reduced-motion behavior. Do not embed source masters into the runtime build, standalone HTML or service-worker precache. Measure emitted bytes and offline behavior. Do not remove existing license/provenance records. Record generation and optimization accurately in the repository's existing asset catalogue/provenance conventions.

This package is file-only. Do not transmit its binary/base64 content through chat or tool-message text. Move it using normal file transfer, then extract safely and compare hashes. No script in this package needs credentials, a paid API, network access or a background service.
