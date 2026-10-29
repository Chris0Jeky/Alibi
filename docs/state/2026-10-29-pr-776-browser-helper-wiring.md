# PR #776 browser helper qualification repair

The exact-head verification failures at f61f74e came from `tests/browser-wiring.test.cjs`: the shared capability helper used the executable-suite `browser_` prefix without being a standalone workflow entry point. The helper is now `tests/fixture_capabilities.py`; both callers import that name. Its capability setup and all browser assertions remain unchanged.

Evidence: failed safety run https://github.com/Chris0Jeky/Alibi/actions/runs/40367295403 and full run https://github.com/Chris0Jeky/Alibi/actions/runs/40367295212. The isolated source wiring regression and Python compilation of the helper and both callers pass after this rename. Complete hosted verification on the new head is required and recorded in the PR checks.

This changes test discovery only. It does not qualify draft #579 for main or close its concurrent-writer, domain-validation, interrupted-recovery, destructive-import acceptance or current-main budget gaps. Physical Android/TalkBack and release decisions remain in `HUMAN_TODO.md`.
