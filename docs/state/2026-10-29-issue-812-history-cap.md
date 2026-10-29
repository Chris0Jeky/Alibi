# Cancelled room-name edits preserve the full Undo history

Refs [#812](https://github.com/Chris0Jeky/Alibi/issues/812), based on main
`8f0a071db5e8d25f6f134d060470175a3b87fe86`. This follows the shipped
[#811 history slice](2026-10-29-issue-811-scene-draft-history.md).

## Changed

A name-edit session retains the oldest snapshot it temporarily evicted from a full
50-step history. Returning to the original name restores that snapshot instead of
leaving only 49 Undo steps. Committing an actual edit still discards the oldest step;
completed history stays bounded at 50. The active session owns at most one extra
snapshot until blur, Undo/Redo or another edit ends it.

Persistence, worker epochs, verification invalidation, redo branching, storage formats,
published content and byte ceilings are unchanged. No new control or styling was added.
The asset catalogue is refreshed only for the changed app source bytes and digest.

## Verified locally

- New exact-cap cancellation regression on unchanged main: 12 passing history tests,
  one failure (`49 !== 50`), Node exit 1. It exercises the actual input and history
  handlers using the existing source fixture, without a browser or real saves.
- Repair: 53 focused history/ownership/worker/ambiguity tests passed; expanded scene
  and workshop source checks passed 86 tests, zero failures/skips. Repeated cancellation
  preserves all 50 exact snapshots and persistence, then all 50 Redo steps. Existing
  53-edit overflow and stale unique/ambiguous-result tests remain unchanged and pass.
- `node tools/assets/catalogue.cjs` and `git diff --check` pass.

## NOT verified / required qualification

`npm.cmd run verify` exits 1 at `format:check`: Prettier is not installed in this
isolated worktree. It does not reach the build or full suite. No dependencies,
workflow controls or warning/byte budgets were changed to conceal that outcome.
The known Windows symlink-privilege failure in #810 was not retried.

Full supported-runner formatting/build/Node/browser gates, emitted-file/budget checks,
current-head review and exact-head hosted qualification remain required. Current PR
results belong on the PR; the historical #811 receipt is not overwritten.
No physical Android, TalkBack, creative/editorial acceptance, deployed release or
live provider is claimed. The fix remains draft/unmerged until qualification.

## Human actions and preservation

[HUMAN_TODO.md](../../HUMAN_TODO.md) stays unchanged: q-2 physical Android acceptance;
q-3 name/identity before promotion; q-4 affected-device Quiet Wing checks; q-5 reward
pace and real 3D import; q-6 Curation difficulty/wording; q-7 Wrenmere phone/new-player
acceptance; q-8 phone/difficulty evidence; q-9 Sites retirement conditions. No item is
inferred complete. Existing #579/#807 and other worktrees remain untouched.
