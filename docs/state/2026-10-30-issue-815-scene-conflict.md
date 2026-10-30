# Scene clue-conflict diagnosis (issue #815)

Branch `claude/scene-conflict-815`, based on `328d5dcd` (PR #814 merge).

## Changed

When verification finds no arrangement, the existing worker now explains why instead of the
generic "No solution fits" error. It first proves the clue-free layout independently
(`solveDefinition` with `clues: []`); if that has no arrangement it replies
`diagnosis: { kind: 'layout' }`. Otherwise deletion-based reduction returns a minimal set of
0-based clue indices that cannot all hold (`kind: 'clues'`); removing any one of them restores
an arrangement. Verification and every diagnosis solve share one aggregate 250,000-node
ceiling (each call receives the remainder). Exhaustion at any step throws the solver's existing
"Solver budget exceeded" refusal, so no partial or guessed conflict is ever sent. The unique and
ambiguous paths, the 25-second worker deadline, schemas, backups and deployment are unchanged.

The editor validates the reply strictly (kind, non-empty sorted unique in-range integer indices,
empty `solutions`, otherwise "invalid result"), stores `draftConflict` (array of clue indices;
empty means layout) behind the existing epoch, never marks the draft verified or saves it, and
renders `#draft-conflict`, focused after keyboard verification like the comparison. Each clue
is a `Clue N` button (the draft clue list is now numbered the same way) that focuses that
clue's existing remove control. Edits, Undo/Redo (through `dirtyDraft`), regeneration, verify
start and route entry clear it; Add & play and Export still require fresh uniqueness.

## Verified

- `node --test` on the five directly affected files: 84 pass, 0 fail
  (`tests/scene-conflict.test.cjs` new; `scene-ambiguity`, `workshop-worker-race`,
  `workshop-history`, `workshop-ownership` updated).
- Against the unmodified worker and app, 11 of those tests fail (diagnosis, minimality,
  layout proof, shared budget, refusal, acceptance, invalidation); they pass with the change.
- Wider focused run (budget, workshop, scene, validator, pack-validator, asset suites): 311
  tests, 310 pass. The one failure needs `dist-android/` from `build:android`, which was not
  built here.
- Web build: JavaScript gzip 134,503 (ceiling 135,808). Precached shell 1,419,699 bytes against
  the unchanged 1,419,736 ceiling (37 bytes under; the first draft was 454 over and was trimmed
  by dropping a custom budget message and prose, not by changing any limit).
- Prettier check and `git diff --check` clean on changed files.

## NOT verified

`tests/browser_ui.py` was updated (390/1440 seed 7: add a contradicting June row clue, verify
by keyboard, conflict focus, `Clue N` links focus the matching remove controls, Undo,
re-verify, exact export, Redo, Undo) but not run. No `build:android`, full `npm run verify`,
real-origin browser suite, hosted or physical-device check. Byte headroom is 37 shell bytes.

## Residual risk

The reduced set is minimal, not the only conflict; other disjoint conflicts may remain after a
fix. Budget exhaustion on a hard draft shows the generic solver-budget message with no
explanation. Owner acceptance remains in [HUMAN_TODO.md](../../HUMAN_TODO.md).
