# Lantern hypothetical-conflict guards

Maintenance fix for #362, based on main `f1cd4cf2fabc28dae957b802153e51d4f943c556`.
This follows the merged Sun & Moon hint work, without changing its deductions.

## Defect and bounded correction

The preceding helper validated current marks but not the move it recommended.
Incorrect crosses can make a numbered wall force a bulb beside a zero wall, or
make a lit-square/full-wall cross remove another wall's last possible lantern.
Two neighbours forced by one wall can also jointly overfill another wall even
when placing either neighbour alone passes validation.

The existing result helper is scoped inside deduction so it can validate copied
hypothetical cells for Lanterns only. Single-square claims check that square;
wall claims check the whole forced unknown-neighbour set together. A violation
returns the engine's conflict and involved cells without a move value. A legal
claim retains the selected square, value and rule title. Other families retain
the same result shape without extra validation. No hypothetical state is saved.

A request makes at most the existing current-state validation plus one Lantern
proposal validation. There is no recursive search, solution read or automatic
move. These are conditional deductions from current marks, not a certificate
that earlier guesses or the entire puzzle are globally solvable.

## Reproduction and source evidence

Six new tests fail on preceding source blob `a447102934aaee81bf213306fd9d2196e1d5b73a`
and pass on the correction. They cover three bulb/cross contradictions, a jointly
invalid forced set with individually valid bulbs, a published-board witness and
an independent enumeration of arbitrary partial marks. The independent checker
uses its own adjacency, wall-capacity and visibility rules, not engine helpers.
Across four small layouts it checks 1,924 locally legal states: 1,402 legal
recommendations, 512 conflict reports and ten positions without a local hint.

The published witness is lightup-02: after clue-derived marks at zero-based cells
13=1, 3=0, 8=0, 18=0, 4=1 and 7=1, wrongly cross B5 (21). The preceding helper
recommends crossing C4 (17), removing the last neighbour available to the C5 wall.
The correction gives conflict guidance instead. A throwing solution getter and
before/after state comparisons protect no-answer lookup and immutable requests.

All 31 focused new/existing Lantern, Tents and shared reasoning tests pass. The
retained Lantern oracle checks 6,588 deductions on 6,977 completable partial states;
477 existing official Lantern steps and 621 Tents steps remain in that local run.
These local counts cover the ZIP catalogue, not the newly integrated Night packs.

## Build and real-control gates

Touched pre-change runtime and browser files were reconciled against GitHub blobs;
the new published blobs match the locally tested bytes. The broader local workspace
is the older c2e86011 ZIP plus verified runtime reconciliation, not a full current-main
checkout. A first full attempt correctly refused a dirty Android source tree. After
committing the candidate locally, formatting and web/Android preview builds passed;
the Node stage passed 549 tests and failed two: missing @capacitor/core in the native
flavor test and missing uuid in dependency-patches. No failure was waived. Both
Quiet Wing suites were then run directly and passed.

The first implementation exceeded the existing app limit. Sharing the result helper,
merging the identical wall branches and tightening repeated wording gives a local
130,302-byte gzip application, below the unchanged strict 130,304-byte ceiling.
The two-byte margin is narrow. Final current-main emitted bytes must pass in CI;
no cap, compression option, dependency or required check is relaxed.

The existing browser driver now continues lightup-02 through the wrong B5 mark,
checks a pure conflict dialog, undoes the mistake and requires normal C4 advice
again at 390px and 1440px. It uses real brush, cell, Hint and Undo controls, never
injected run data. Python compilation passes; local-origin browser navigation is
restricted in this environment, so no new local browser pass is claimed. The
existing read-only reasoning workflow already runs this driver and retains receipts.

Keep the PR draft until exact-head full Verify, affected browser/Android workflows
and independent review pass. Keep #161 and HUMAN_TODO q-8 open for human explanation,
difficulty and physical Android/TalkBack acceptance. No puzzle identity, definition,
save format, native validator, release or deployment change is included.
