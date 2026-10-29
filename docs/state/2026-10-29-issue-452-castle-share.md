# Issue #452: experimental Castle case invitation

The Castle experimental case now offers the existing `postern-case-share-1` invitation.
The player previews the exact allowlisted text before an explicit copy. Cancel makes no
clipboard request; pending copy disables actions, rejection keeps selectable text, and route
disposal ignores late completion. The projection reads no notebook, answers, hints, future
evidence or private save data, does not disclose progress, and never sends anything. The
Castle notebook and its existing backups remain unchanged. Clipboard requests already made
cannot be undone by navigation.

This uses the existing validated `Session.share` projection and a memory-only player
controller. The #455 playtest receipt remains available in the authoring workbench, not the
Castle player; actual human observations remain outstanding. No telemetry, new save authority,
method labels, landing links or automatic posting is introduced.

## Verification and limits

- Before implementation `node --test tests/castle-case-share.test.mjs` failed because the
  new controller did not exist. After implementation the controller, existing projection and
  Castle-case tests all pass under the local Node test runner. Controlled tests cover cancel,
  exact copy, rejection, duplicate requests, pending cancellation, progress invariance and
  late completion after disposal.
- `tests/browser_castle_case.py` adds actual-control coverage at both 320 and 1280 pixels
  before and after completion: notebook and future-title exclusion, cancellation, exact copy,
  rejected/pending copy and unchanged saved state. It has not run here: Playwright 1.62.0 is
  installed in the test environment, but its pinned Chromium executable is absent.
  No physical-device, accessibility, real-clipboard or human acceptance is claimed.
- With #787's separate preference-refresh source included, `tools/build-castle.cjs` produced a
  101,080-byte core Castle script within its unchanged 101,120-byte ceiling. Optional player
  grew from the #786 baseline of 12,380 to 13,685 bytes (+1,305, including #787's lifecycle
  return); total measured Castle delivery is 1,312,859 bytes. This is not a full release build.
- `npm run build:web` passed with synthetic local commit `8f9e74ab` and a dirty source tree;
  this is build diagnostics, not the reviewed source SHA. Exact-head full verification,
  actual-origin controls, independent review and hosted checks remain necessary.
  [HUMAN_TODO.md](../../HUMAN_TODO.md) retains the physical-device, editorial and owner gates.
