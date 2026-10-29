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

## Review hardening after initial hosted qualification

The initial head `57bdec1075f3bd019a008e91bc145b32bb3e1827` completed all 16 PR
workflows successfully, including full verification run `40948013894` and native
run `40948013575`. The PR records the exact logs and source-tree identity. Its full
verification log reports 2,296 Node tests passed with zero skips. This supersedes
the initial hosted-pending state above for that head only; the failed local verify
attempt remains recorded.

Independent static review of the bounded repair reported no blocker and recommended
extra session-boundary tests. Three additional source regressions cover cancelling
then retyping without blur, another edit interrupting a capped name session, and
Undo interrupting it before a later name edit. They verify exact snapshots, the
50-step bound, retained eviction order, Redo and persistence. Expanded local checks
now pass 89 tests with zero failures/skips. Three separate in-memory-source negative
controls remove only the relevant session reset; each new targeted regression then
fails with an assertion and exit 1. The production app and catalogue are unchanged
by this test/documentation follow-up. A new head still requires fresh hosted checks;
the initial head's green workflows are not substituted for them.

## Human actions and preservation

[HUMAN_TODO.md](../../HUMAN_TODO.md) stays unchanged: q-2 physical Android acceptance;
q-3 name/identity before promotion; q-4 affected-device Quiet Wing checks; q-5 reward
pace and real 3D import; q-6 Curation difficulty/wording; q-7 Wrenmere phone/new-player
acceptance; q-8 phone/difficulty evidence; q-9 Sites retirement conditions. No item is
inferred complete. Existing #579/#807 and other worktrees remain untouched.
