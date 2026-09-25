# Repository sweep — 25 September 2026

This is a dated local/remote reconciliation record. Live GitHub state and the current Git
refs take precedence if they change after this checkpoint.

## Main, release and open pull requests

The primary checkout is on `main` at `e557763` after #313 and #316 merged with merge commits.
Its tracked worktree is clean. Source version remains 0.11.5; the release receipt records
0.11.5 deployments, while local tags stop at `v0.11.4`. The 0.11.6 source candidate is on
`codex/release-0.11.6`; it is not merged, tagged or deployed.

| PR | State at this sweep | Disposition |
| --- | --- | --- |
| #313 | Merged as `d82004f` | Exact-head checks passed; small browser-suite waits. |
| #316 | Merged as `e557763` | Refreshed exact-head checks passed; Block browser waits. |
| #318 | Open, one verify check running on `272b1aa9f` | Expedition/Bridges wait fix; its earlier P2 screenshot concern was already dispositioned as a medium test-evidence item. |
| #329 | Draft, verify failed | Binary hint candidate remains above the fixed JavaScript gzip cap; not eligible to merge. |
| #281 | Draft, checks green | Still awaits maintainer architecture acceptance; no code was merged. |

## Branch refs

The initial read-only inventory counted 181 local branches. This sweep removed 93 local
branches whose tips were already ancestors of `origin/main` and which were not checked out.
It also pruned seven stale remote-tracking refs. Four remote branches were removed after
checking that their changes were already reachable or patch-equivalent in main, that no open PR used them,
that none was protected, and that no worktree had the branch checked out:

- `codex/editorial-order`
- `codex/restore-dist-android-ignore`
- `codex/wrenmere-practice`
- `integration/phone-qa-60c3706`

Unique or active remote branches remain preserved. These include the two #272 keyboard branches,
the open #329 and #281 heads, Wrenmere asset and release-receipt work, the CAP02 Android build
work, cabinet revision precision work, and three `tmp/format-*` branches with unique formatting
commits. They are not ancestors or patch-equivalents of current main, so deleting them would
discard work or provenance. Local-only branches with unmerged commits are also preserved.

## Worktrees and unsaved changes

The starting inventory contained 61 registered worktrees. The release candidate added one
more. A read-only scan found 37 clean `.worktrees` candidates whose commits were already in
main and whose ignored files were generated outputs. No worktree was removed. The one plain
`git worktree remove` attempt on `block-review-115` failed with a Windows permission error and
partially removed its administrative metadata; the registration and tracked files were
repaired and verified clean. The remaining OneDrive worktrees were left registered rather than
repeating an operation that had partially failed. Codex-managed worktrees and unique asset
worktrees were also preserved.

Two dirty work areas remain deliberately intact:

- `muse-binary-hints-finalize` has one unsaved `src/insights.js` change. Its eight focused tests
  pass, but the build is 130,117 gzip bytes against the unchanged 130,048-byte cap. The exact
  remote #329 head also fails that gate. No cap was raised and the candidate was not pushed.
- The external `alibi-pr227-review` worktree has 11 tracked edits, three untracked files and
  ignored generated evidence. Its unique `tests/metadata.test.cjs` was copied into the release
  candidate and passes; the other work was left untouched because it is older or already has a
  newer counterpart on main.

The primary `main` checkout remains tracked-clean. `HUMAN_TODO.md` still has q-1 through q-8
open, including source licensing, physical Android/TalkBack acceptance, and human calibration
of the provisional puzzle labels.
