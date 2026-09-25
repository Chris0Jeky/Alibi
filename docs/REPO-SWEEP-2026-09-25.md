# Repository sweep — 25 September 2026

This is a point-in-time reconciliation of the Alibi checkout, GitHub pull requests, and the
Pulseboard release-contract dependency. Live GitHub status takes precedence after this date.

## Main and release

Before the 0.11.6 candidate lands, the primary checkout is clean on `main` at
`7ac666b9dc9cbf73be74c56a95fb14b6ce496a82`, equal to `origin/main`. The source version there
remains 0.11.5. The 0.11.6 branch is `codex/release-0.11.6`; its pushed head is tracked in
PR #330. The candidate contains six new Picture Logic studies, Lantern and Tents hint changes,
Archive boundary fixes, a Reversi depth correction, and the Pulseboard-generated Observatory
release check. Its current release evidence is in [RELEASE-0.11.6.md](RELEASE-0.11.6.md).

## Open Alibi pull requests

- [#330](https://github.com/Chris0Jeky/Alibi/pull/330) is the ready 0.11.6 candidate. Its
  current pushed head is `7125a7582efdfa4b75b671c40d09316922fba2c6`. The refreshed adapter
  registers 0.11.6, checks the `v0.11.6` catalogue tag and adapter hash, and fails closed for
  missing or mismatched registration. A fresh-context review found no confirmed CRITICAL/HIGH
  issue. Exact-head hosted checks are required before merge. The former run on `9ebf813` failed
  because the old adapter rejected 0.11.6 in the real-origin release assertion; that run predates
  this correction.
- [#329](https://github.com/Chris0Jeky/Alibi/pull/329) remains draft at
  `e0efa245ccdf2aac830f251ba1a893a43ae96ef3`. Its hosted Verify check fails the unchanged
  130,048-byte JavaScript gzip cap: the measured bundle is 130,103 bytes, 55 bytes over. A
  local optimization experiment reached 130,083 bytes but still exceeded the cap, so it was
  reverted and not pushed. The branch and worktree are preserved for a future bounded attempt.
- [#281](https://github.com/Chris0Jeky/Alibi/pull/281) remains draft and behind `main`, awaiting
  maintainer architecture acceptance. No merge or retarget was made.

These are the only open Alibi PRs found in the sweep. Closed unmerged work with unique commits
and remote branches is retained rather than deleted.

## Registered worktrees

The Git worktree registry now has 14 entries: the primary checkout, the 0.11.6 release
candidate, the dirty external #227 review checkout, five asset worktrees, the #329 binary-hints
worktree, and the preserved #156, #163, #166, #167 and #206 check/fix worktrees. The unique
asset and review branches remain available for their separate work. The external temp checkout
`alibi-pr227-review` has eight tracked modifications and three untracked files; it was inspected
and left untouched.

Clean worktrees whose commits were already ancestors of `origin/main` were removed where the
ordinary Git operation succeeded. Merged local branch refs were deleted after checking ancestry.
Several ordinary removals returned Windows `Permission denied`. Their worktree registrations are
no longer listed, but these 18 local directories remain untouched and may need a later manual
closeout after the file handles are released:

- `.worktrees/block-review-115`, `.worktrees/card-status`, `.worktrees/docs-current-state`,
  `.worktrees/fallback-inventory`
- `.worktrees/pr152-check`, `.worktrees/pr154-check`, `.worktrees/pr162-check`,
  `.worktrees/pr164-check`, `.worktrees/pr165-check`, `.worktrees/pr168-check`,
  `.worktrees/pr169-check`, `.worktrees/pr170-check`, `.worktrees/pr171-check`
- `.worktrees/pr226-fix`, `.worktrees/pr227-fix`, `.worktrees/summary-keydown`,
  `.worktrees/tic-tac-toe`
- the sibling `Alibi-worktrees/release` directory

Their pre-removal status showed no tracked or untracked changes; ignored contents were generated
builds, dependencies, test results, caches and screenshots. No force removal or manual recursive
delete was used. Nine clean detached Codex worktrees were removed. The sibling 0.11.1 receipt
branch is merged and its local ref was deleted, but its worktree directory also remains after
Windows refused removal. Unmerged remote branches and worktrees remain preserved.

## Remaining gates

The remote refs not merged into `origin/main` were reviewed and retained because their commits
are absent from main. They are `origin/codex/272-evidence-keyboard` (#294 closed),
`origin/codex/272-mark-grid-keys`, `origin/codex/binary-reasoning-hints` (#329 open),
`origin/codex/release-0.11.6` (#330 open), `origin/codex/wrenmere-assets` (#187 closed),
`origin/codex/wrenmere-release-receipt` (#189 closed),
`origin/docs/platform-localfirst-scavenge-2026-09-23` (#281 open),
`origin/feat/cap-02-android-build-target-124` (#191 closed),
`origin/fix/cabinet-revision-precision`, `origin/tmp/format-android-124` (#181 closed),
`origin/tmp/format-capture-125`, and `origin/tmp/format-platform-125` (#192 closed). Closed
PR refs and branches without an open PR were kept rather than deleted. No 0.11.6 tag,
deployment, or public GitHub release was created. `HUMAN_TODO.md` q-1 through q-8 remain open,
including source licensing, physical Android/TalkBack acceptance, and human difficulty
calibration.

Pulseboard PR #86 merged as `b01624b`, supplying the Alibi 0.11.6 release contract. Pulseboard
`main` is clean at that merge commit. Its open PR #39 and its other unique unmerged remote
branches remain separate work and were not changed by this Alibi release sweep.
