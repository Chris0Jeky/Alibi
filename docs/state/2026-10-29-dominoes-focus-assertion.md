# Wait for the completed Dominoes keyboard action

Full verification of the unrelated Reading Room preference change failed at
`OUTCOME-3 turn 0: keyboard action retains round context at 1440px` in
[run 40801712526, job 123211107532](https://github.com/Chris0Jeky/Alibi/actions/runs/40801712526/job/123211107532).

The Dominoes play, draw and pass handlers await `commitGame` before focusing the new
`#domino-status` node. The commit updates the replay log and renders before its promise
resolves; the click listener does not wait for the async action's focus continuation.
An immediate `activeElement` snapshot after Playwright's keyboard dispatch can therefore
observe an intermediate state; the failed run did not capture enough focus timing to
prove the precise event interleaving. Waiting only for the replay-log change does not prove
the focus continuation has finished either.

Both post-move status-focus checks now use Playwright's strict `to_be_focused` assertion.
It waits for the same expected result and still fails if focus never reaches that node.
No action, keypress or failed test is retried. Subsequent Tab order, chain pan, legal
outcomes, move counts and saved state checks remain. This changes no player source,
save format or budget.

Independent source review confirmed the asynchronous action/commit boundary. Python compilation
and diff whitespace checks pass; the real browser fixture must qualify on the published
head. The original failure is retained as evidence. This does not establish physical
keyboard or screen-reader acceptance; the existing `HUMAN_TODO.md` gates remain open.
