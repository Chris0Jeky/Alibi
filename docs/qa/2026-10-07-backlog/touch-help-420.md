# Touch keyboard help (#420 item 3)

## Current qualification, 2026-10-11

The resumed candidate uses the same coarse-primary/no-fine-pointer boundary with
absolute positioning and `clip-path: inset(50%)`, retaining accessibility-tree
text. The helper now renders the actual Bridges inline hint and Network help
paragraph, checks both input profiles, accessibility, overflow and display:none
negative controls, and exercises Network ArrowRight/Enter/Shift+Enter controls.
It is wired into full CI. Viewport screenshots retain the pointer profile;
full-page capture changed Chromium's input media during the earlier probe.

Clean source 56c5be27 builds web ddb50c87bb28 / Android 083ab530 and passes 21
emitted/budget/Android/copy/wiring cases, 37 keyboard-help checks and all 184 UI
checks, with no page errors. Phone/desktop rendered boards are visually inspected.
Node's budget measurement is CSS gzip 34,454 against strict 34,464 and shell
1,412,625 against strict 1,412,792.32; JavaScript gzip is 132,892. No ceiling changed.
Actual main 666cbb79 merges without content changes; nine catalogue/copy/wiring
source cases pass afterward. Independent production-seam and capture-fix reviews
found no HIGH/CRITICAL finding. Exact-head hosted CI remains required.

The actually-started hosted verify run 38108652168 failed three old core-cabinet
copy assertions: whole-board text includes the intentionally clipped accessible
guidance. Its 51 passes and three failures are retained. The fixture now reads
Network's primary instruction and checks computed clipping separately for Network
and Sudoku. An initial local selector correction used a nonexistent control note
and timed out; the selector is corrected to the actual primary instruction.
At local 974be5c4, serving the unchanged clean 56c5be27 artifact, all 55 actual-origin
core-cabinet checks pass with no page errors. A display:none control fails exactly
both computed-clipping assertions while both primary-copy checks pass. This check
measures computed styling; the separate 37-check helper supplies Bridges/Network
accessibility-tree evidence. No independent Sudoku AX claim is made. Current main
f8d5093e is incorporated, with no new runtime/CSS bytes. Fresh scoped fixture review
has no HIGH/CRITICAL finding; current-head hosted CI must still pass.

Physical mixed-input hardware and Android/TalkBack remain unverified in
[HUMAN_TODO.md](../../../HUMAN_TODO.md). No primary deployment is claimed.
This supersedes the budget/UI blockers below, which retain historical evidence.

## Historical candidate evidence

Keyboard help stays in the accessibility tree on devices with a coarse primary pointer and no available fine pointer. A mixed-input device with `any-pointer: fine` and desktop retain visible help. Both inline spans and full help paragraphs use the existing markup.

Verified: `node --test tests/curation-copy.test.cjs` (3 passed), Prettier check for changed CSS/test, and `tests/browser_keyboard_help.py` with actual Chromium touch and desktop contexts. Both geometry and accessibility-tree checks pass; injecting the former display:none rule removes the text and is detected in each context.

Not verified: physical mixed-input tablet/keyboard, Android/TalkBack, full application UI suite and final emitted release inspection. `HUMAN_TODO.md` physical-device gates remain open. Offline404 and HTML-alias items belong to the separate active PR; this slice only addresses item3.

The first candidate exceeded the unchanged offline shell ceiling. The coordinator removed unnecessary clipping declarations and the redundant hover restriction. Actual touch/desktop geometry, accessibility, no-horizontal-overflow and both negative controls pass after this correction. The corrected Android build passes; its offline shell is 1,411,612 bytes below the unchanged 1,411,624.32-byte limit, and JavaScript gzip is 134,907 bytes below 134,944. The CSS gzip is 34,181 bytes against the strict 34,176-byte ceiling: the budget gate still fails by five bytes. Published for review with merge blocked; no ceiling was raised. The corrected rule requires a completed independent review before merge.

Coordinator release/build gate: own `npm ci` and `npm run build` pass, and `dist/assets/alibi.d96adf3204a5.css` contains the corrected rule. The full UI suite passed177 assertions, then timed out at `browser_ui.py:169` while `dismiss()` selected hidden `[data-action="close-dialog"].first` after a bad pack. The initial attempt had timed out at the unchanged home screenshot's5s budget; a runner-only60s screenshot budget let the suite proceed, without changing tracked tests or assertions.

The hidden-close failure reproduced in a narrow bad-pack probe against the unaffected Games Room evidence checkout (product source2758d91). Baseline blobs: app.css `2d3a8013937875b0c0da659c973677245e5bb433`, browser_ui.py `2aafea8e2abfd6b17ebb1d59f7296ebb5810cf49`. The baseline probe sees a hidden first close control, and the same five-second click times out. This patch does not alter that helper or import flow. Full UI is not green; no runtime defect in this CSS seam was reproduced.

Independent Grok4.7 high read-only review completed with no major issues. Its twelve-turn partial was finalized in the same review session; no fix loop. Phone/desktop generated screenshots (`tests/screenshots/mobile-aquarium.png`, `desktop-lightup.png`) were visually inspected: controls and board layout remain intact. Hosted release, service worker and deployment are untouched.

Baseline timing detail: one final probe initially observed a visible close control, then its `not visible` assertion passed before the click; the click still timed out and the dialog was no longer open afterward. This is a transient asynchronous dialog-close race, not evidence that the first control is always permanently hidden. The baseline probe command was the shared venv Python running `test-results/baseline-dialog.py` in the unaffected347 checkout (exit0).
