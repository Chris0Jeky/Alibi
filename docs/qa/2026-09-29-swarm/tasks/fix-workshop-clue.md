# fix-workshop-clue: validate workshop clues at entry, not just at boot

## Reproduction
1. `addClue` (`src/app.js:2478`) builds `{kind, who}` from raw `FormData`
   with no check that `kind` is known or `who` is a draft person id, and
   stores `Number(value)` which can be `NaN`.
2. The clue is persisted via `dirtyDraft`/`saveDraft` (`src/app.js:2394-2403`).
3. On the next boot, `C.validateSceneDraft` (`src/core.js:905-981`) rejects
   the draft (unknown kind at line 978, unknown `who` at 969, non-integer
   value at 973-977) and `src/app.js:205-213` silently restores nothing — the
   player loses the whole draft over one bad clue (`quarantined++`, no
   message, no recovery).

## Exact change
1. Add a pure `validateSceneClue(clue, draft)` helper in `src/core.js`,
   exported alongside `validateSceneDraft`, enforcing the same clue shape:
   known `kind`; `who` in draft people ids; relational kinds need `other` in
   ids and `other !== who`; `room`/`notRoom` need integer value within
   `roomNames.length`; `row`/`col` within size; `near` within cells;
   `edge`/`notEdge` carry no value. Throw `Error` with a player-worded
   message on violation.
2. `addClue` calls it before the duplicate check and lets the Error propagate
   (same UX as its existing throws). No change for valid input. Keep the
   boot-time quarantine as the backstop for malformed stored bytes.

## Tests that must fail first (RED on unpatched code)
- New `tests/workshop-clues.test.cjs` (Node, importing `src/core.js` the way
  existing engine tests do): unknown kind rejected; unknown `who` rejected;
  `NaN`/out-of-range value rejected; self-relational rejected; a valid clue
  of each kind accepted. RED on old code because the helper does not exist.

## Proving check
`node --test tests/workshop-clues.test.cjs`
Repo gates that must stay green: `npm.cmd run format:check`.
Watch the application-JS budget: only 75 bytes of headroom — keep the helper
tight and do not duplicate validation tables.
