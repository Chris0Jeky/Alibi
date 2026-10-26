# Issue 746: retained Quiet fallback evidence

This is a test-only follow-up on the #579 feature branch. It covers #746 item 3 only.
The local parent is `956afcb50c2c71ea8c63fa7035d6a6164e58f52f`, with tree
`c8f4ab5cfb73bf66434db0b529f54cd59cca0ac9`, matching remote feature parent
`d4a23c0ae823a100ca6a5ece84902fe24ed44fba`.

## Change

The real-browser Quiet fallback fixture now seeds an exact raw localStorage value containing a
fallback-only sentinel, while the corresponding IndexedDB state has no such field. On both
forward fallback-write failure paths, it checks that rollback preserves the fallback bytes
exactly, the Quiet state remains the original IndexedDB value, and the retained IndexedDB
recovery contains only the public `kind`, `schema`, and `state` Quiet keys with no sentinel.
The no-fallback successful-import assertions remain in place.

No runtime, import validation, timing, retry, workflow, dependency, or budget change is part of
this follow-up.

## Verification

- `python -m py_compile tests/browser_origin_transfer_quiet_fallback.py` and `git diff --check`
  pass.
- `node --test tests/origin-transfer-quiet-fallback.test.cjs tests/origin-transfer-recovery.test.cjs`
  passes (2 test files, zero failures).
- The changed browser fixture passes with cached Chromium `141.0.7390.37`. It exercises actual
  two-tab IndexedDB and localStorage behavior, with synthetic in-memory ports for the other
  domains. This is a narrow local browser result; the hosted workflow's pinned Chromium 151
  run remains pending for the updated fixture.
- No physical device, actual owner transfer, or human destructive-import acceptance is claimed.

## Not resolved

Issue 746 items 1 and 4 remain open: forward-write coordination with ordinary fallback writers
and rollback creating a Quiet IndexedDB record when only the fallback existed before the
transfer. This fixture does not change or settle either behavior.

Draft parent #579 still requires its documented exact-head release gates, including full hosted
verification, browser and actual-origin destructive acceptance, and unresolved save-owner/CAS,
recovery UI, and semantic-validation work. `HUMAN_TODO.md` remains the authority for physical
device and human acceptance gates; none are cleared here.
