# Touch keyboard help (#420 item 3)

Keyboard help stays in the accessibility tree on touch-only devices. The CSS visually clips `.kb` only when `hover: none`, `pointer: coarse`, and no fine pointer is available. A mixed-input device with `any-pointer: fine` and desktop retain visible help. Both inline spans and full help paragraphs use the existing markup.

Verified: `node --test tests/curation-copy.test.cjs` (3 passed), Prettier check for changed CSS/test, and `tests/browser_keyboard_help.py` with actual Chromium touch and desktop contexts. Both geometry and accessibility-tree checks pass; injecting the former display:none rule removes the text and is detected in each context.

Not verified: physical mixed-input tablet/keyboard, Android/TalkBack, full application UI suite and final emitted release inspection. `HUMAN_TODO.md` physical-device gates remain open. Offline404 and HTML-alias items belong to the separate active PR; this slice only addresses item3.

Coordinator release/build gate: own `npm ci` and `npm run build` pass, and `dist/assets/alibi.d96adf3204a5.css` contains the corrected rule. The full UI suite passed177 assertions, then timed out at `browser_ui.py:169` while `dismiss()` selected hidden `[data-action="close-dialog"].first` after a bad pack. The initial attempt had timed out at the unchanged home screenshot's5s budget; a runner-only60s screenshot budget let the suite proceed, without changing tracked tests or assertions.

The hidden-close failure reproduced in a narrow bad-pack probe against the unaffected Games Room evidence checkout (product source2758d91). Baseline blobs: app.css `2d3a8013937875b0c0da659c973677245e5bb433`, browser_ui.py `2aafea8e2abfd6b17ebb1d59f7296ebb5810cf49`. The baseline probe sees a hidden first close control, and the same five-second click times out. This patch does not alter that helper or import flow. Full UI is not green; no runtime defect in this CSS seam was reproduced.

Independent Grok4.7 high read-only review completed with no major issues. Its twelve-turn partial was finalized in the same review session; no fix loop. Phone/desktop generated screenshots (`tests/screenshots/mobile-aquarium.png`, `desktop-lightup.png`) were visually inspected: controls and board layout remain intact. Hosted release, service worker and deployment are untouched.
