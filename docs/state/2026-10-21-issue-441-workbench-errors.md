# Issue #441 workbench correction flow

This follow-up addresses the accessibility review on merged PR [#458](https://github.com/Chris0Jeky/Alibi/pull/458): an unsuccessful reasoning check previously reported only its first error in a generic status paragraph and moved focus away from the verdict and citation controls. Issue [#441](https://github.com/Chris0Jeky/Alibi/issues/441) remains open pending the patched actual-browser checks. A closure audit found the requested finite-world model, citation/session validation, locked steps, and repeated-submission source coverage already delivered in #458. Human playtesting, physical-device acceptance, and host promotion remain separate gates.

`tools/cases/preview.js` now presents the complete validation count, adds inline error text associated with each affected claim, marks the claim fieldset and its invalid verdict or citation controls, and returns focus to the first invalid select or citation group. The citation group is named with its claim and can receive focus before keyboard navigation continues into its checkboxes. After a failed check, edits revalidate the retained draft: fixed field errors clear while unresolved errors and other answers remain. `tools/cases/preview.css` gives the error text and focused citation group visible treatment.

`tests/browser_case_workbench.py` now covers an empty stage with all three claims invalid, keyboard focus and tab order, accessible error associations, a correct-verdict submission with one incomplete evidence bundle, and correction followed by a successful recheck. The new browser assertions are compiled but were not executed locally: the pinned Python Playwright dependency installed, but its matching Chromium download returned an invalid/truncated archive before a browser could launch. Hosted browser CI is required before merge. No TalkBack, screen-reader, physical-device, or human-playtest evidence is claimed. The separate Android/TalkBack owner gate remains open in [HUMAN_TODO.md](../../HUMAN_TODO.md).

Verified locally:

- `node --test tests/case-*.test.cjs` — 95 passed.
- `node --check tools/cases/preview.js` — passed.
- Prettier 3.9.6 check of `tools/cases/preview.js` and `tools/cases/preview.css` — passed.
- `python -m py_compile tests/browser_case_workbench.py` — passed.
- The standalone preview generator completed; its source digest remains `6b86c2495fdf4b8c720203b00b4765772aeac0505614b31be4b1aa378cfb6a2c`.

The full application verification and hosted CI were not run. The bounded source/browser issue can close after the patched browser lane and full exact-head CI pass; human and physical-device acceptance remain separate where required. The finite model verifies verdicts, not formal minimality of each editorial citation bundle. The standalone preview remains an experimental memory-only artifact outside the official registry and production routes.

An independent read-only review found no blocking defect in the retained drafts, error associations, focus restoration, explicit resubmission boundary, or safe text rendering. Browser execution and actual screen-reader output remain separate evidence.
