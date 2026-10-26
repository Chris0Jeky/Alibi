# PR 758: share projection merge and review

## Changed

Reviewed the PR's own diff against local `origin/main`, then the merged working files.
The starting head was `aefc1e0cb9d3625b7e632cd2b3cf026fc387bac3`; both
`origin/main` and the pending merge head were `7a7640ddaf23d4f49f253cda5d9a47a2a2914b7a`.
Evidence below applies to the uncommitted working files, not a newly published head.

- Resolved the sole conflict in `docs/cases/README.md` by retaining the share section
  and main's story-mode parity and future-locale contracts. Clarified that progress validation
  reads step IDs/prerequisites while excluding private prose and save fields.
- Tightened `share()` identity checks to the authoring contract's ID grammar and title bounds.
  The added malformed-ID regression failed before this correction.
- Preserved invitation whitespace in the preview, so the displayed text matches copied text
  for valid titles containing repeated spaces or newlines. The browser regression failed
  before this correction.
- Extended getter traps to injected device, notebook and save fields. Added browser coverage
  of denied clipboard writes and exact copying of hostile, whitespace-containing titles.
- Preserved all pre-existing incoming main changes; production routes, content IDs,
  saves and backup/export behavior receive no additional changes from this review.

## Verified

Windows, Node `v24.13.1`, local Chromium `151.0.7922.34`:

- `node --test tests/case-*.test.cjs`: 140 tests, 139 passed, zero failures,
  one platform skip (named-pipe refusal on Windows).
- `node_modules/.bin/prettier.cmd --check 'tools/case-*.cjs' 'tools/cases/*.js'
  'tools/cases/*.css' 'tests/case-*.test.cjs'`: passed.
- `PYTHONUTF8=1 py -3 tests/browser_case_workbench.py`: passed at 320, 1280 and
  844 widths, plus hostile text. Cancel caused zero writes; explicit Copy wrote exactly
  the preview text; denied Copy retained the invitation and focused its fallback text.
  Story-mode parity controls passed. Zero external requests or script errors were observed.
  Inspected the share-panel screenshots at all three widths. Receipts and images are ignored
  artifacts in `test-results/case-workbench/`.
- `node --test tests/budget.test.cjs tests/type-scale.test.cjs`: 25 passed.
- `PYTHONUTF8=1 py -3 tests/browser_ui.py`: 187 browser checks passed, including
  all thirteen game controls, responsive overflow, workshop, backup and save-revision checks.
  Full log: ignored `test-results/pr-758-browser-ui.log`.
- `npm.cmd run verify`: formatting passed and the web build completed (`d304ead602c1`,
  570 puzzles). Android derivation then correctly refused the uncommitted merge with
  `Android builds require a clean source tree.` The aggregate gate is **not green**.
  Full log: ignored `test-results/pr-758-verify.log`.
- `git diff --check`: passed; README conflict markers have been removed.

## NOT verified

- Full Android derivation and the aggregate Node gate: blocked by the required clean-source
  identity while the caller explicitly prohibits Git writes. No guard was bypassed.
- Hosted CI, reviews, publication, merge and head aging: network access was prohibited.
- Real system clipboard, physical phones, screen readers and human playtesting.

## Residual risk and resume

The README's contents are resolved, but its Git index entry remains unmerged because
`git add` is prohibited. The caller must stage the resolution and final changes, finish
the pending merge/commit, and rerun `npm.cmd run verify` on a clean tree before qualifying
the resulting head. No Git-writing command was issued during this repair.

`HUMAN_TODO.md` remains authoritative and unchanged: physical Android/TalkBack,
publisher/signing, creative and other owner acceptance is not inferred from these checks.
Method labels, landing links and a production share surface remain outside this slice.
