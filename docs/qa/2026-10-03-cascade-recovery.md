# Cascade narrow-control recovery

Refs #418 item 3 and #562. This is a follow-up to #556, not a second replay fix.
Merge the Games Room parent first, retain its branch, then retarget this child
to main and check the resulting comparison and all final-head evidence.

## Retained correction

The interrupted branch already contained a ten-line CSS correction and an
actual-origin control probe. Below 371 CSS pixels, Cascade's five labelled
actions use three columns and normal dialog flow. This allows two rows without
covering the selectable tray. Wider screens and Classic retain their existing
rules. The saved state note records Rotate and Cancel labels extending beyond
their buttons in the original 320px probe; that historical note is not a current
browser qualification.

The test opens the real Cascade dialog at 320x640, 390x844 and 1280x900. It
requires all five actions, individual label containment, 44px control targets,
no horizontal escape and tray/action separation at the narrow width. It then
selects a piece, rotates it, cancels by keyboard and checks the focus target,
selection state, close action and focus return. Geometry and screenshots remain
available on failure. No test threshold is relaxed by this recovery.

## Integration and remaining gates

Clean integration `707757453a81ab902fdec5a5e187048bb9a8289c` incorporates the exact
reviewed Games Room parent `fc51d98808774b67e48129cdc7a2aa79409b4fd7`. Only additive
state-note conflicts were eligible for resolution, with every line from both
histories retained. CSS, browser fixture and read-only workflow remain
byte-identical to the saved `d870804` source. The branch-only reconciliation
publisher removes itself before committing and runs full source verification
before publication. This note is the only subsequent addition.

The older head's workflow results were `action_required`, not passes. This
native documentation commit requests normal refreshed PR checks; repository
approval and protection rules remain in force. All three current-head Cascade
scenarios, full repository verification, independent review and the repository
aging gate must pass before merge. Do not substitute source-only geometry or
an earlier head's result for those checks.

Physical Android, TalkBack and real device text scaling remain under
`HUMAN_TODO.md`. No deployment, content revision, save schema or numerical byte
ceiling changes are part of this PR.
