# 0.11.3 — A clearer Expert collection

Published on both existing origins from merged source
`dc8e3ef4222d8d887edda10e702405ff1f3e542f`, build `01501bb6797b`, on 2026-09-12.
[PR #143](https://github.com/Chris0Jeky/Alibi/pull/143) passed both Castle and both full verification
jobs at final head `3865700a6e9281f13b27d6ef12b701fbecda9aa4` before merge. The merged rebuild
reproduced the validated release. [Downloads](https://github.com/Chris0Jeky/Alibi/releases/tag/v0.11.3)
include the complete static ZIP and self-contained HTML preview.

Expert Aquarium revision 2 corrects the reservoir count while retaining its board, targets and
solution. Expert Nonogram revision 2 introduces the original Bellweather beacon picture with
independently verified uniqueness. Both retain their IDs. Existing revision-1 saved definitions
remain playable; an unsaved old revision URL retains the revision-unavailable behavior.

Quiet Wing recovery retains keyboard focus when offline readiness redraws Settings. A controlled
experiment reproduced the pre-existing failure exposed by CI run 34701821332: controllerchange
removed the focused button and Enter stayed on Settings. The stable control ID fixes that path;
the regression forces the event, checks focus and presses Enter at 390/1440px. No timeout was increased.

## Publication and delivery

- [Primary](https://alibi-after-hours-preview.commit-atlas.workers.dev/): Worker version
  `ed410dc7-bce9-4851-b8ad-0dab2569561c`. All 282 public files match exact release bytes. HTML,
  JavaScript and manifest MIME types, CSP, no-referrer and nosniff were verified.
- [Fallback](https://alibi-puzzle-club.jeky-tck.chatgpt.site/): Sites version 15, deployment
  `appgdep_6aa5785657088191ae5ac5811f33e34e`. All 278 non-HTML files match exactly; each of the
  four HTML pages retains exact source plus the known 938-byte hosting challenge. Provider
  header/MIME behavior remains the documented [#6](https://github.com/Chris0Jeky/Alibi/issues/6) limitation.
- The fallback source branch matches the full merged SHA above. Its validated local archive
  contains 284 files, is 30,119,803 bytes, and has SHA256
  `8b4c5b79398cc46ec1f9eaed11d79c741d6469020811c695a2a1f555de853a52`.
  No runtime bindings or audiences changed.

## Verification

Full local verify passes 245 Node tests plus supplementary suites; the isolated UI suite passes
182 assertions. Initial JavaScript is 127,530 gzip bytes within unchanged budgets. The required
asset catalogue was refreshed after its check detected the source hash change.

Each HTTPS origin passes 92 real IndexedDB/offline checks with zero browser errors. Hosted primary
controls pass 20 Aquarium, 33 Nonogram and 26 other Expert assertions, completing all twelve
Expert family-pack records through actual controls. Quiet Wing keyboard route/dialog focus passes
at 390/1440px. Native and independent Python solvers agree on one lighthouse solution in 24 nodes;
the complete picture was inspected in normal-board view at phone-size and desktop widths.

Disposable Chromium contexts stayed open from 0.11.2 across publication. Both origins kept the old
build while an update waited, accepted another actual Sudoku move, and preserved exact state and
the pinned definition through Save & update and offline reload into 0.11.3.

Evidence, screenshots, validated archives and restart notes are retained locally under
`release/goal2-2026-09-12/`. Rollback references are primary Worker
`1f88ec05-b78c-46be-9b7b-e70b54cc98b2` and fallback Sites version 14. No rollback was executed.

## Remaining limits

Human difficulty, physical Android recovery, TalkBack, narrative and audio-comfort acceptance
remain in [HUMAN_TODO.md](../HUMAN_TODO.md). Both revised Expert puzzles remain provisional.
[#144](https://github.com/Chris0Jeky/Alibi/issues/144) tracks deterministic unavailable-revision
test completion. [#147](https://github.com/Chris0Jeky/Alibi/issues/147) tracks the journal total
counting two completed revisions as two puzzles; both saved definitions remain intact.
