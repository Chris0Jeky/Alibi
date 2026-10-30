# Aquarium waterline hints — issue #806

This source checkpoint records verification through runtime commit `1433c035` on 29 October.
The final browser, CI and merge receipts are maintained on [PR #808](https://github.com/Chris0Jeky/Alibi/pull/808).

## Changed

Aquarium Hint now derives tank levels from public geometry and row/column totals. Bounded
per-line support propagation retains the clues and contribution bounds used in each explanation.
It requires a complete public-clue witness before returning guidance, so incomplete reasoning,
ambiguous clues and inconsistent clues retain the honest fallback. Player waterlines remain
tentative; existing overfull-line conflicts take priority and satisfied advice is skipped.

The Hint dialog marks the tank and supporting edge clues. The outlines persist on dismissal and
clear with the next board render. No water is applied, no progress is changed, and the separate
confirmed answer-based Reveal remains intact. Guidance has no Club-applicable `value` field.
Published puzzle identities, saves, solver capabilities and dependencies are unchanged.

The initial CI run exceeded the unchanged application JavaScript ceiling. Reasoning now ships as
one hashed, precached script requested by Hint, Club guidance or completed-record review, while
standalone reasoning stays inline. Those callers reject stale requests after a board, navigation,
pause or dialog change. The existing Expert Aquarium browser gate imports its Hint journey helper;
the helper's name no longer misidentifies it as a separate unwired browser suite.

## Verified

- Baseline regression failed because the forced irregular-tank deduction returned `null`; the
  existing conflict regression already passed.
- The focused 55-test set passes, including loader retry/single-flight/standalone behavior and all
  three callers' asynchronous ownership and error handling. An independent exhaustive model covers three tiny tank layouts,
  1,548 inconsistent clue sets and eight ambiguous clue sets. All 819 returned deductions agree
  with every satisfying assignment, including 41 dry-tank and 593 full-tank recommendations.
- Throwing answer getters, altered/absent solutions, tentative states, deterministic selection,
  input immutability, a single-cell Club boundary, standard/Expert fixtures and a 7x7 case pass.
- App syntax and both browser-test modules compile. The UI design detector reports no findings.
- One fresh-context independent adversarial review found no actionable defects in the deduction,
  explanation bounds, solution isolation, caller behavior or test coverage.
- A second scoped independent review found no defects in the deferred loader, offline/build
  packaging or delayed Hint, Club and completed-record callers. The worker test fixture now
  includes the new asset; its 35 source checks pass.
- Hosted `npm run verify` at `1433c035` passes all 2,264 Node tests with no skips or failures,
  plus both Quiet Wing programs. Application JavaScript is 132,981 bytes gzip against the
  unchanged strict 135,808-byte ceiling; the reasoning chunk is 4,143 bytes gzip. Initial
  code/content is 202,638 bytes gzip against 225,280. Android artifact and offline navigation
  checks pass.
- The main hosted gate passed the general UI, keyboard/focus and 390/1280px curation UI checks.
  Actual 390px standard/Expert Aquarium Hint journeys passed offline loading, answer traps,
  highlights, keyboard/focus, conflict handling, unchanged progress, confirmed Reveal and
  ambiguity fallback. Their screenshots were inspected for readable text and visible outlines.

## NOT verified

At this checkpoint the added completed-record browser test selected the background board button
behind an open dialog. The selector is now scoped to the dialog; its rerun, desktop Aquarium
journeys and completion of the full browser matrix remain pending on PR #808. This is a test
selection failure; the reviewed production/runtime code is unchanged.
No deployment, physical Android/TalkBack test or subjective difficulty/enjoyment acceptance is
claimed. [HUMAN_TODO.md](../../HUMAN_TODO.md) retains those owner acceptance items.

## Residual risk

The method intentionally falls back when line propagation cannot certify a complete assignment,
even if a stronger reasoning method could explain a partial deduction. It does not claim to solve
every Aquarium. The remaining browser and exact-head hosted gates must pass before merge.
