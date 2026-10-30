# Staged reasoning hints (#823)

## Scope

`src/app.js` `showHint` markup and one `src/cabinet.css` rule. The Hint dialog now shows the
technique name (for example *Only one number fits*) and keeps the exact square and value behind a
native `<details>` *Show the step*. Conflicts (`Revisit …`) and the generic family tip are shown in
full, as before. The optional reveal, its counter, the aquarium outline and Club's forced step are
unchanged. No save, content or insights change.

## Why

Pressing Hint used to hand over the whole deduction at once, so a player who only wanted a nudge
lost the *aha*. Rule titles name a technique, never a square or a value.

## Evidence

- `npm run build`; `tests/budget.test.cjs` and `tests/radius-scale.test.cjs` pass
  (`javascriptGzipBytes` 134,207 on this build).
- Browser suites against the build (local Playwright, Chromium): `browser_binary_hints.py` 26,
  `browser_tents_hints.py` 32, `browser_lightup_hints.py` 14, `browser_expert_aquarium.py` 41
  (includes the aquarium hint journey) — all pass. Existing assertions read `textContent`, which
  includes the closed `<details>`.
- New assertion in `browser_binary_hints.py`: on the first hint the coordinate is absent from the
  rendered text, then present after *Show the step*. It fails against the previous `app.js`
  build and passes on this one.
- Desktop inspection of the staged dialog on `sudoku-01`.

## Limits

Phone-width inspection beyond the 44 px-ish summary target, TalkBack, and player judgement of the
extra tap remain open.
