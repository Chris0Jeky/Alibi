# Issue 891: phone starter and final-stage message

## Changed

- `src/club.css`: at widths up to 900 px the home "letter" is no longer hidden. The compact
  treatment that only `.club-letter.has-run` had (eyebrow, heading, line, 44 px button) now
  applies to every letter, so the #824 "Find my first puzzle" button and the post-solve
  "Find another puzzle" button are visible and tappable on phones. Desktop CSS is untouched.
- `src/castle/case-player.mjs`: the accepted-stage message omits "Choose the next stage above."
  after stage 3. It tests the stage index (`stage < 2`), which equals the accepted count minus
  one in that branch.
- Tests: `tests/browser_mobile_qa.py` gains two phone checks (touch, 360/390/430/768 wide, fresh
  profile): the starter is visible, at least 44 px tall, inside the viewport, tapping it opens
  nonogram-01 with its lesson; after a real first solve the home letter offers "Find another
  puzzle" and tapping it opens the library. `tests/browser_castle_case.py` asserts the message
  keeps "next stage" for stages 1-2 and drops it for stage 3.

## Verified

- Mutation proof: with origin/main's `club.css` and `case-player.mjs` restored and rebuilt, both
  new phone tests fail (starter hidden at every width) and `browser_castle_case.py` fails on the
  new assertion; with the fix they pass.
- `npm run build:android` (clean tree), then `node --test --test-concurrency=2 tests/*.test.cjs
  tests/*.test.mjs` after merging origin/main (#890): 2506 tests, 2484 pass, 0 fail, 22 skipped.
- `browser_ui.py`: 298 checks pass. `browser_mobile_qa.py` (real origin on port 18891): 24 tests
  pass. `browser_castle_case.py`: passes, no errors.
- Screenshots looked at (390x844 touch and 1440x900): fresh profile and after a first solve.
  Phone shows the compact letter directly under the hero with the full-width button; desktop is
  unchanged (tall letter in the right column).
- Budgets: no ceiling changed. The Castle case player chunk is 16374 bytes against its 16384
  bound (10 bytes left; the first attempt, `record().answers.length < 3`, was 16391 and failed,
  so the shorter stage-index test is deliberate). `club.css` shrank. The asset catalogue test
  passes unchanged.

## NOT verified

- Physical phone, hosted origins, Android build behaviour. Real-origin run was a local
  `tools/serve.cjs` build only.
- The 360 px letter in dark theme was not inspected visually (the same compact rules apply).
- The LOW cosmetic note in the issue (library selects truncating at 390 px) is not addressed.

## Residual risk

- The player chunk has 10 bytes of headroom, so the next change there needs a documented raise.
- Phones now always show a small "A note from the club." card on home, a deliberate extra
  block above "Recently at Alibi".
