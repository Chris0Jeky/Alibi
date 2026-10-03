# tst-theatre-voices: pin theatre sanitizer/chooser and voices deliver/route/decorate/tap

## Target
`src/theatre.js` `escape()` (~line 7) and `choose()` (~line 49),
`src/voices-sheet.js` `deliver()` (~line 207), `route()` (~line 85) and
`tap()` (~line 301), `src/voices.js` `decorate()` (~line 69). Orchestrator
verified 2026-09-29: zero precise test references to any of these six
functions (only an unrelated `route() {}` mock in
`tests/activities.test.cjs:114`).

## Behaviours to cover (extend `tests/theatre.test.cjs` and
`tests/voices.test.cjs` in place — do not invent a second harness)
Read both harnesses first and pin the actual contract; at minimum:
1. `escape()` HTML-escapes scene titles, credits and sources (broken escape
   must fail an assertion, not render silently).
2. `choose()` room-selection precedence: pinned choice, hero story, casebook
   artwork, quiet/lab/duel/archive, family fallback.
3. `deliver()` maps collector outcome to sent/refused/waiting counts,
   including the 4s race, and never claims sent without a 202.
4. `route()` maps location hash to the contract route vocabulary
   (home/puzzle/castle/quiet-wing/games/settings/other).
5. `decorate()` injects Feedback button, report button and
   rating/survey/panel slots after every render.
6. `tap()` rating-tap state, local keep, and queue-or-retry (unqueued choice
   not remembered).

## Constraints
- Test-only change: do NOT modify `src/`, `tools/`, or `content/`.
- For each behaviour FIRST check indirect coverage: stub the function and see
  which existing test fails. If already covered, cite file:line and skip it.
- If a behaviour needs DOM beyond the existing harnesses, report it with line
  refs instead of inventing a DOM harness.

## Proving check
`node --test tests/theatre.test.cjs tests/voices.test.cjs`
Repo gates that must stay green: `npm.cmd run format:check`.
