# Repository sweep — 25 September 2026

This is a point-in-time reconciliation of the Alibi checkout, GitHub pull requests, and the
Pulseboard release-contract dependency. Live GitHub status takes precedence after this date.

## Main and release

The 0.11.6 source candidate merged to `main` as `287fc38757d8628bfa8a0b6912adf90aadca0219`
through PR #330. Exact head `3adfde9db7c68c2c78741a1e99c6090ec0f4cc9c` passed [Verify puzzle
cabinet](https://github.com/Chris0Jeky/Alibi/actions/runs/36087890060) and [Verify Android
payload](https://github.com/Chris0Jeky/Alibi/actions/runs/36087890051); independent review found
no confirmed CRITICAL/HIGH issue. The candidate contains six new Picture Logic studies, Lantern
and Tents hint changes, Archive boundary fixes, a Reversi depth correction, and the refreshed
Observatory release check. Its release evidence is in [RELEASE-0.11.6.md](RELEASE-0.11.6.md).

No 0.11.6 tag, deployment, or public GitHub release has been created. The 0.11.5 Cloudflare and
Sites receipts remain the latest deployment evidence. The release branch has been deleted after
merge. Human release gates remain open in `HUMAN_TODO.md` q-1 through q-8, including source
licensing, physical-device and TalkBack acceptance, and human calibration.

## Open Alibi pull requests

- [#329](https://github.com/Chris0Jeky/Alibi/pull/329) remains draft at
  `e0efa245ccdf2aac830f251ba1a893a43ae96ef3`. Its hosted Verify check fails the unchanged
  130,048-byte JavaScript gzip cap: the measured bundle is 130,103 bytes, 55 bytes over. A
  local optimization experiment reached 130,083 bytes but still exceeded the cap, so it was
  reverted and not pushed. The branch and worktree are preserved for a future bounded attempt.
- [#281](https://github.com/Chris0Jeky/Alibi/pull/281) remains draft and behind `main`, awaiting
  maintainer architecture acceptance. No merge or retarget was made.

These are the only open Alibi PRs now: #329 and #281. Closed unmerged work with unique commits
and remote branches is retained rather than deleted.

## Registered worktrees

The Git worktree registry now has 13 entries: the primary checkout, the dirty external #227
review checkout, five asset worktrees, the #329 binary-hints worktree, and the preserved #156,
#163, #166, #167 and #206 check/fix worktrees. The unique asset and review branches remain
available for their separate work. The external temp checkout `alibi-pr227-review` has eight
tracked modifications and three untracked files; it was inspected and left untouched.

After #330 merged, its clean release worktree and local branch were removed with ordinary Git
removal. Before removal it had no tracked or untracked changes; ignored contents were generated
builds, dependencies, and test results, so none needed preservation. The remote release branch was
also absent after merge.

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

The remaining remote refs not merged into `origin/main` were reviewed and retained because their
commits are absent from main. They are `origin/codex/272-evidence-keyboard` (#294 closed),
`origin/codex/272-mark-grid-keys`, `origin/codex/binary-reasoning-hints` (#329 open),
`origin/codex/wrenmere-assets` (#187 closed), `origin/codex/wrenmere-release-receipt` (#189 closed),
`origin/docs/platform-localfirst-scavenge-2026-09-23` (#281 open),
`origin/feat/cap-02-android-build-target-124` (#191 closed),
`origin/fix/cabinet-revision-precision`, `origin/tmp/format-android-124` (#181 closed),
`origin/tmp/format-capture-125`, and `origin/tmp/format-platform-125` (#192 closed). Closed
PR refs and branches without an open PR were kept rather than deleted. No 0.11.6 tag,
deployment, or public GitHub release was created. `HUMAN_TODO.md` q-1 through q-8 remain open,
including source licensing, physical Android/TalkBack acceptance, and human difficulty
calibration.

Pulseboard PR #86 merged as `b01624b`, supplying the Alibi 0.11.6 release contract. Pulseboard
PR #87 then merged as `ad42c96520b79c406c1395908a9dcdb009178c54`; it adds Alibi checkout
auto-discovery with explicit override order, structured JSON sync receipts, and a read-only
scheduled/manual contract watch. The feature branch was deleted after merge. Hosted run
[36090389677](https://github.com/Chris0Jeky/Pulseboard/actions/runs/36090389677) succeeded on
that main commit. The checker also passed locally from the Pulseboard checkout without a path,
resolved the sibling Alibi repository, reported 0.11.6 in sync, and produced no changed files.
Pulseboard `main` is clean at the merge commit. Its open PR #39, unique unmerged branches, tracked
issues, and `HUMAN_TODO.md` q-5 (first-run hook setup and trust) remain separate work.
