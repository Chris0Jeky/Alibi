# 2026-10-30 fourth composition: practise a technique, hint follow-ups, print-sheet flake

Branch `claude/compose-wave4-20261030`, based on `87285e0d` (main after #869). Each reviewed PR
head is merged unchanged so one CI run qualifies the tree that lands:

- #870 practise a technique from the completed record (#835 slice 2; research session; independent
  review on the PR), head `c2f4e1d8`.
- #872 hint follow-ups, closes #865: techniques test records solution reads; WeakMap memo per puzzle
  object (Sonnet reviewer SHIP).
- #873 print-sheet board box read atomically, closes #871 (test-only).

## Composition-only changes

- `tests/budget.test.cjs`: #869 and #870 both moved the shell ceiling against their own bases; one
  measurement replaces #870's entry. Startup gzip 134,463 (ceiling 127 KiB + 4,480, 65 left); shell
  1,438,968 (1.32 MiB + 54,847.68; ceiling + 54,912, 64.32 left).
- `assets-source/library/catalogue.json` regenerated from the merged `src/app.js`.

## Verified

See the PR for the local `build:android` + full Node suite and browser runs on this tree.

## NOT verified

Physical phones and printers, Firefox/Safari, screen readers (HUMAN_TODO q-2). The #871 flake is not
reproducible on demand; its fix is reasoned from Playwright semantics.
