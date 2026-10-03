# Challenge ownership recovery

Refs #416 item 3 and #560. This branch incorporates the reviewed Games Room
integration from #556; merge #556 first and retain its branch until dependents
are accepted. The new challenge delta remains separate from Club gameplay.

## Correctness boundary

A view-instance token owns challenge loads, exports, recovery and imports.
Leaving disposes and clears the handle. Delayed A/B/A reads, recovery exports,
worker replies and restore completions cannot act on the new view merely
because its challenge ID matches. Each file handler clears its own captured
input. Save validation, existing storage protection and import limits remain.

The independent review found a further ordering case: an initial read could
mount an editable old board while an already-admitted restore was pending.
The corrected host becomes inert and disposes its handle before calling
restore; initial loading cannot mount during restoration. Failed current
restores recover the prior board; success mounts the restored run. A transaction
already admitted to storage is not cancelled by navigation, but its UI completion
is suppressed. No schema, content definition or numerical byte ceiling changes.

## Recovery evidence

The reviewed production correction is in `c6c45c2699c168880aadf7628cc827568cc6d3d9`
with sixteen host source cases and a completed clean Codex re-review. Its browser
run `37085789648` passed four phone scenarios before a test predicate failed:
`document.querySelector` cannot locate the actual host inside Quiet Wing's open
ShadowRoot. That run was not a twelve-scenario pass.

Test-only commit `bb53518692eb92d8816d9f4c8ac9864058899e61` binds the test probe to
the actual mounted host. Both readiness predicates require a connected,
non-inert host and a current non-disposed handle, retaining their original
restored-log or replacement assertions. Two extracted predicates failed before
the fix; three regression cases pass after it. The committed unit suite exercises
the full browser script, not an unrelated copy. No production CSP is weakened.

Clean integration `43cef9cdb31def7226b067e25bd67397f4504eff` passed `npm run verify`
in reconciliation run `37087320621`. It incorporates #556's exact `fc51d98` tree,
resolves only additive state notes, preserves every parent note and changes
neither reviewed runtime delta. The temporary publisher removes itself before
commit. This document is the only subsequent addition.

## Acceptance still required

All twelve actual-origin browser scenarios, final-head full CI, review and
repository aging must pass before merge. The browser lane delays real worker
replies and IndexedDB operations; it does not replace their semantics. It also
covers old-board detachment and restored progress surviving reload. Earlier
partial results and source tests are not substitutes for this gate.

Physical Android, TalkBack and real device lifecycle acceptance remain in
`HUMAN_TODO.md`. This PR does not claim deployment, complete challenge-library
acceptance or automatic cancellation of already-admitted transactions.
