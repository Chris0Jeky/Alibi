# Desk hierarchy and phone metadata

Candidate following PR #227, based on `f07eb747b8ab2dbd840a43cd8a989a5fc324df7b`.
Refs #219 and the QA tracker #218. This is not a deployed release or a completed design system.

## Player outcomes

The desk page title should establish the page hierarchy before the featured story. On a phone,
the difficulty, board size and move summary should remain readable without competing with the board.
The board-first layout, controls, content, saved runs and theme choices remain unchanged.

## Reproduction and correction

The new browser assertions reproduced twenty heading failures: each of the four editions at
320, 390, 768, 1280 and 1440 pixels. At 1440 pixels the feature H2 measured 44.64px against the
page H1's 40.32px. Three further failures reproduced 9px play metadata on 320/390px phones and
10px in 844x390 landscape.

The late-loaded After Hours stylesheet now bounds the feature heading to
`clamp(24px, 2.6vw, 40px)`, leaving the existing H1 hierarchy, serif font and line-height intact.
At 1440 pixels that gives a 37.44px feature heading beneath the 40.32px page heading. At phone
widths the feature floor is 24px. Phone/short-landscape play metadata uses 12px and the board
heading label uses 11px. No JavaScript renderer, save owner or route changes are required.

Seven unused colour custom-property declarations were removed. Exact-name source inspection
found no CSS or JavaScript consumers. Referenced brass and shadow variables remain. The strict
33 KiB compressed stylesheet cap is unchanged; only the actual built artifact can qualify it.

## Executable evidence

`tests/browser_mobile_qa.py` adds two scenarios to the seven existing tests. It rotates all four
editions using Next edition, checks title ordering and card containment, rejects page overflow,
and checks readable metadata and unchanged move counts. The existing board visibility, zoom,
44px controls, optional context, modal lifecycle and navigation scenarios remain intact.

Local red: 23 failing subchecks before editing product CSS. Local green: all nine scenarios pass.
Mobile and desktop screenshots were inspected. These local results use an isolated source DOM
fixture with generated catalogue/media from the recovered build, not an HTTP-origin, IndexedDB,
service-worker or final-production-build proof. The two published source blobs match the tested
local bytes exactly. Pinned dependencies and final-head build/budget/browser validation run in
GitHub Actions through the parent's permanent read-only workflow, not a self-writing helper.

CI retains `test-results/mobile-qa/type-*.png`, `typography-metrics.json` and board screenshots.
Use the exact final PR-head runs and their logs/artifacts as the authoritative integration receipt.

## Remaining work

Keep #219 open: a cross-room type ramp and migration of other headings remain separate work.
Radius and button recipes remain #220/#221; route policy remains #213/#224. This patch does not
claim all typography is unified, every board fits one screen, or physical Android/TalkBack and
system-font enlargement have passed. Those acceptance gates remain in `HUMAN_TODO.md`.

After #227 merges, retarget this child to main, reconcile any later CSS edits, and rerun its
normal exact-head checks before review. No merge, version bump or deployment is included.
