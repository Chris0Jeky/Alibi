# Desk hierarchy and phone metadata

Candidate following PR #227, originally based on `f07eb747b8ab2dbd840a43cd8a989a5fc324df7b`.
Refs #219 and the QA tracker #218. This is not a deployed release or a completed design system.

## Player outcomes

The desk page title should establish the page hierarchy before the featured story. On a phone,
the difficulty, board size, move summary and save status should remain readable without competing
with the board. Board-first layout, controls, content, saved runs and theme choices remain unchanged.

## Reproduction and correction

The new browser assertions reproduced twenty heading failures: each of the four editions at
320, 390, 768, 1280 and 1440 pixels. At 1440 pixels the feature H2 measured 44.64px against the
page H1's 40.32px. Three further failures reproduced 9px play metadata on 320/390px phones and
10px in 844x390 landscape.

The late-loaded After Hours stylesheet bounds the feature heading to `clamp(24px, 2.6vw, 40px)`,
leaving the existing H1 hierarchy, serif font and line-height intact. At 1440 pixels the feature
heading is 37.44px beneath the 40.32px page heading; its phone floor is 24px. Phone/short-landscape
metadata uses 12px and the board heading label uses 11px. Review identified an explicit save-status
font rule bypassing inheritance; a direct-element regression reproduced another three failures at
9/9/10px before the save-status override was corrected to 12px. No renderer or save owner changes.

Seven unused colour custom-property declarations were removed. Exact-name source inspection
found no CSS or JavaScript consumers. Referenced brass and shadow variables remain. The strict
33 KiB compressed stylesheet cap is unchanged.

## Executable evidence

The permanent `tests/browser_mobile_qa.py` has nine scenarios: the seven parent scenarios plus
heading hierarchy and phone metadata. It rotates all four editions through Next edition, checks
hierarchy and containment, rejects overflow and measures actual labels, including save status.
Parent readiness, target-geometry and zoom-settlement guards remain intact.

Local red: 23 initial typography subcheck failures plus three separate save-status failures.
Local green: nine UX scenarios and 182 existing UI checks. Nine supplementary comfort combinations
exercise themes, forced colours, contrast and larger clues; they are not extra permanent methods.
Local checks use an isolated source DOM, not an HTTP-origin, IndexedDB, service-worker or native
host. The local full Node command retains 303 passes and 12 missing-build/dependency failures.

Product-code head `0e9215832b1ec59fda2dab4a3573db95aa4425d3` passed the entire normal workflow
**35606531041**: build, Node, budgets, browser, offline, release-update and optional-room checks.
Artifact **10643078895** was SHA-256 verified as
`a81712dc2f56e472f057fa629a5df252e8dafabd0c896a63c13effedf8d2e5f2`; build **86be37859b13**.
Its twenty actual-built-origin typography measurements pass. Four Bridges islands remain visible
at 320/360/390/430px portrait; short landscape retains two and ordinary scrolling. There is no
document overflow. Actual built-origin phone and desktop screenshots were visually inspected.

The live-state review correction is in `e2a6295f12728e81e4994a674330e2e66ff6c510`; both review
threads are resolved. That documentation head's full run is 35608939221. These earlier receipts
must not be projected onto a subsequently integrated source head. CI retains typography and board
screenshots/measurements under `test-results/mobile-qa/` through permanent read-only verification.

## Parent reconciliation checkpoint

Parent #227 advanced concurrently to `60c37062dbc7234459f69e300008b5920bc62cab`, incorporating
platform, Android, Sudoku and catalogue work. Preserve every parent file; do not replace it with
the older ZIP. Against that parent, the only overlapping child file is `docs/STATE.md`.

The exact three-way document inputs are base blob `40577a7809ae9dedac27be46837f97af47e21e4b`,
child blob `423e2dd5fb3ee859e740c36ade6b1f007d8e168d`, and parent blob
`449c124148670a8529d31cc9b977e7f1fa15648a`. Local `git merge-file` returns zero and preserves both
new parent entries plus the corrected child top section, producing blob
`bfdf6c14470d856471f6422623f7afb9ca35534a`. A subsequent combined commit must retain that content
and receive its own exact-head CI; preparing this document merge is not evidence of publication.
The source CSS and browser test remain the previously verified blobs
`c3371fe1a0fa46f2005a71c330832a16d490c9a6` and `1fab9a78ed615623085dcdcd484ad7b10a9742a2`.

## Remaining work

Keep #219 open for a cross-room type ramp and migration of other headings. Radius/button recipes
remain #220/#221; routing remains #213/#224. Physical Android, TalkBack, system-font enlargement
and installed safe-area acceptance stay in `HUMAN_TODO.md`; browser simulations do not close them.
After integrating the stable parent, verify the full final head, then retarget to main after #227
lands and revalidate. No PR merge, version bump or deployment is included in this continuation.
