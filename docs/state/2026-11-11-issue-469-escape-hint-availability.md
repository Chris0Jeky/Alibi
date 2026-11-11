# Escape hints use visible clues

Refs #469. Prepared in `codex/escape-hint-availability-20261111` from
`ca052b9a95a1d7b95013afc90bef2bdd35eccd5b`.

- Clockmaker's maintenance hatch points to the visible dials and spring train. Its method starts
  from the turn counter when the dials still need aligning.
- Counterweight's loft hatch points to the visible latch and shaft before the tool compartment opens.
- Printmaker's press points to the press instructions, cabinet and job rack before the plate can
  be inspected.

Five hint rungs changed in both story modes. A parsed comparison against the base confirmed that
room and action IDs, revisions, transitions, answers and worked solutions are identical. The
existing editorial ledger in [anthology-review.json](../escape-rooms/anthology-review.json) binds
the new full-source hashes. The separately developed Escape persistence change pins whole room
JSON. Land these hint edits first, then regenerate its pins from the merged room sources before
qualifying persistence. This base keeps Escape progress in memory.

The independent transition enumeration now checks the three ladders before and after their clues
become visible, in both story modes. The checks reproduced all three defects against the original
wording. They check these specific clue references. The existing getter test in
`tests/escape-state.test.cjs` checks that projection never reads accepted answers or worked solutions.

- `node --test tests/escape-*.test.cjs tests/castle-escape-*.test.mjs` passed 105, with one named-pipe
  test skipped on Windows. This includes all six source bindings, model and adapter tests.
- `node_modules/.bin/prettier.cmd --check tests/escape-content.test.cjs` and `git diff --check` passed.
- The web build and Castle asset test passed. The standalone Chromium suite passed its actual-control
  completion paths for all six rooms, including keyboard checks. Hosted and full verification remain
  pending. The Castle-origin browser suite completes Tidekeeper
  and opens Counterweight, leaving five Castle completion paths uncovered. A focused Castle check
  can open the three affected actions before revealing their clues and assert that each of the
  three hint presses leaves room progress and any input draft intact.
- The Castle route still has no deliberate worked-answer control. Human playtesting is separate
  from these checks.

Owner decisions remain in [HUMAN_TODO.md](../../HUMAN_TODO.md).
