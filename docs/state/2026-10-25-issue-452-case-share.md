# Issue 452: spoiler-aware case share projection

Refs #452 (parent #439). Authoring workbench only; no production route, storage, save, backup or
export path changed.

## Scope

- `tools/case-session.cjs`: `share(definition, completed)` returns a frozen
  `postern-case-share-1` object from an allowlist (`caseId`, `revision`, fixed invitation `text`
  with the case title). It refuses unknown case formats and malformed identity, validates progress
  with the session's own rules and discloses none of it.
- `tools/cases/preview.js` / `preview.css`: a "Share invitation" control opens a text preview
  with Copy and Cancel. Only Copy calls `navigator.clipboard.writeText`; nothing is posted.

## Evidence (2026-10-25, Windows, Node 22, local Chromium via Playwright)

- `node --test tests/case-share.test.cjs`: 5 failed before the change, 5 passed after.
  Covers exact key allowlist, every progress boundary (0-3 stages) against every non-public
  authored string, getter traps on all private fields plus injected note/device/save fields,
  future revision, future format and hostile identity refusal, and malformed progress.
- `node --test tests/case-share.test.cjs tests/case-session.test.cjs tests/case-preview.test.cjs`:
  32 passed.
- `py -3 tests/browser_case_workbench.py` (PYTHONUTF8=1): passed at 320, 1280 and 844 widths
  plus hostile text. Against the old `preview.js` it fails waiting for `#share`. The share text is
  identical at 0 and 3 stages, Cancel records zero clipboard writes, Copy records one write equal
  to the previewed text, no external requests. Share panel screenshots inspected at all three widths.
- `npm run verify`: see the PR for the exact-head result.

## Not verified

- The real system clipboard: the browser test replaces `navigator.clipboard` with a recording
  stub. The blocked-copy fallback message is not exercised.
- Physical phones, screen readers and human playtesting.
- Optional method labels and landing links are not implemented; they wait for the #440 visibility
  contract and the #442 adapter.
