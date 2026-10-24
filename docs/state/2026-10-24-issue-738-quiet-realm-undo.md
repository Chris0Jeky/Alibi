# Failed Quiet Wing realm replace no longer leaves an undo entry (#738 item 4)

Branch: `fix/738-quiet-realm-undo`.

## Changed

The realm branch of the Quiet Wing import confirmation pushed a whole-scene undo entry and cleared
redo history before `await S.replace(...)`. When the replace was refused or failed, the session kept
a phantom undo step for a scene that was never committed and lost its redo history.
`src/quiet-wing/app.js` now builds the entry first and records it, clears redo and adopts the new
state only after the replace commits. Wing restores and the restore-once guard (#740) are unchanged.

## Verified

- New handler test in `tests/quiet-wing/contracts.cjs` runs the real `reviewImport` confirmation
  with a realm import whose `replace` rejects: undo history stays empty, redo is kept, state is
  unchanged, the button is re-enabled and the error is shown. It failed before the fix
  (`A.history` held one entry) and passes after; the suite reports 123 assertions.
- Prettier check on both changed files; asset catalogue regenerated with no change.

## NOT verified

Real-browser realm import, physical devices. Remaining #738 items (Club `runs: []` load,
Cabinet revision high-water mark, Add-missing revision bumps, shared modal close, recovery-copy
draft validation) stay open there.
