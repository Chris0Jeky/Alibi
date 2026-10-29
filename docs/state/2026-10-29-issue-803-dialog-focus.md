# #803: preserve newer focus after a queued dialog close

The app's shared dialog-close listener restored the previous opener or fallback
unconditionally. Closing an HTML dialog queues its close event; a new control can
be focused before that event arrives. The old listener then steals the newer focus.
The source-level regression extracts the actual listener and first reproduced that
behavior: a newer external focus still caused an opener focus call.

The listener still clears staged Cabinet data and opener ownership, and still ignores
an old close when the dialog has reopened. It restores the opener, its current
replacement, or the main fallback only when the active element is missing, the body,
the document element, or an element inside the now-closed dialog. Existing useful
external focus stays where it is. This does not alter the dialog's native focus steps.
The tracked lesson source catalogue was refreshed for the changed app bytes.

The existing Domino browser test now holds one actual queued close event after the
OUTCOME-6 reset at desktop width, uses the actual controls for the first keyboard move,
and delivers the close event after the status has focus. It then checks that status
remains focused. The hook removes itself, and all original outcomes, focus assertions
and deadlines remain. The fixture is prepared for hosted Chromium; no local browser
or full build ran because Chromium was unavailable and disk space was constrained.

Focused verification: extracted listener regressions 3/3 (including normal opener,
replacement, main fallback and reopened-dialog behavior), backup route/race tests
21/21, Cabinet export/close tests 21/21, and asset catalogue tests 2/2. The browser
fixture compiles. Exact-head hosted build/budgets, browser controls and full CI are
required. Physical Android, TalkBack and owner release acceptance remain in
HUMAN_TODO.md.

The first #800 full run 40814568363 / job 123252523832 failed the original OUTCOME-6
status focus assertion; it did not capture the active element or focus-event ordering.
This independently reproduced race is a real defect, but its role in that historical
failure remains unproven. Do not replace or hide the retained failed attempt.
