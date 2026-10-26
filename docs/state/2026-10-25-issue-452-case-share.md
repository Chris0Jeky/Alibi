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

## Maintenance review and clipboard lifecycle repair (2026-10-26)

Independent source review of `aefc1e0cb9d3625b7e632cd2b3cf026fc387bac3` found no
private-field disclosure. It reproduced the pending-copy race already recorded in the PR:
Cancel could claim nothing was copied while an earlier clipboard request was still pending.

The workbench now disables Copy, Cancel and the share toggle while copying, guards duplicate
requests and permits retry after rejection. Restart invalidates the request's UI callback;
it does not cancel or undo a clipboard request already sent to the browser. Late success or
failure cannot replace the restarted preview's status or close a newly opened share panel.

- Executed actual session source: all four progress boundaries match; five malformed progress
  states are refused; private-field getter traps remain unread.
- Executed actual preview source in a minimal DOM harness: initial Cancel makes no request;
  pending controls and duplicate guards, rejection and retry, successful copy, and late success
  and rejection after Restart pass. This is handler evidence, not a real browser or clipboard.
- Node 24.22.1: `node --test tests/case-share.test.cjs tests/case-session.test.cjs
  tests/case-preview.test.cjs` passes all three files. Python compilation and `git diff --check`
  pass. Browser regressions were added for pending controls, blocked-copy retry and Restart,
  but were not executed here because the pinned Chromium download failed in this environment.
- All seven GitHub Actions workflows returned success for the original reviewed SHA. The
  repaired and reconciled head requires fresh CI and independent review before merge.

## Not verified

- The real system clipboard: the browser test replaces `navigator.clipboard` with a recording
  stub. The blocked-copy fallback has handler evidence only in the maintenance review.
- Physical phones, screen readers and human playtesting.
- Optional method labels and landing links are not implemented; they wait for the #440 visibility
  contract and the #442 adapter.

Current-main reconciliation preserves the complete #447 parity checks and #443 documentation.
HUMAN_TODO.md remains the authority for physical-device and owner acceptance.
