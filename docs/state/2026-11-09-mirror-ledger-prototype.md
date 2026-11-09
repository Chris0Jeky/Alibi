# Mirror Ledger prototype handoff

## Changed

Standalone memory-only two-board Sun & Moon experiment in `prototypes/mirror-ledger/`, with eight provisional 4×4 pairs. Each board has balanced rows and columns, no triples, distinct rows and columns; labelled cross-board same/opposite clues are necessary. The native controls support keyboard entry, clue endpoint outlines, undo, restart, check and solution-independent exhaustive hints. The README explains local serving, design alternatives, primary rule sources, limitations and a human observation protocol. No existing activity, saves, catalogue, dependency or startup asset is changed.

## Evidence

The independent test enumerates all 65,536 possible bit boards and compares the whole-pair solution set with the model. Each pair has exactly one solution, both boards have multiple solutions in isolation, and removing each link independently makes the pair ambiguous. It also checks contradictory entries, fixed clues and hint independence from any supplied answer. `tests/browser_mirror_ledger.py` and its path-filtered workflow exercise native controls, focus, links, 320px/1280px layouts, clue highlighting, restart, undo and no external requests. Browser checks and workflow outcome remain pending; the local browser binary is unavailable. Python syntax, Node tests, formatting and diff checks are recorded with the final change.

## Not verified and remaining gates

No physical-device, assistive-technology or real-player evaluation, human difficulty ordering, fairness, novelty, hosted CI or production deployment is claimed. These boards are unranked and need player explanations and mobile comparison, including whether switching attention between boards creates insight or bookkeeping. Dedicated workflow artifacts must be reviewed. The standalone does not participate in normal app saves, backup, installed offline use or Lab ratings. Existing HUMAN_TODO release, sharing and device gates remain unchanged.

Independent review found focus loss after changing puzzles and the final Undo. The follow-up preserves the chooser and returns a disabled Undo to the selected cell, with browser assertions. Model checks now refuse missing, null and sparse input explicitly; all four focused Node tests pass. Undo retains the last 40 changed states, repeated marks do not add history, and restart renders once. Browser and physical acceptance remain pending.
