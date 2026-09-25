# Repository sweep — 25 September 2026

This is a dated local/remote reconciliation record. Live GitHub state and the current Git
refs take precedence if they change after this checkpoint.

## Main, release and open pull requests

The primary checkout is on `main` at `7ac666b` after #313, #316 and #318 merged with merge
commits. Its tracked worktree is clean. Source version remains 0.11.5; the release receipt
records 0.11.5 deployments, while local tags stop at `v0.11.4`. The 0.11.6 source candidate is
on `codex/release-0.11.6`; it is not merged, tagged or deployed.

| PR | State at this sweep | Disposition |
| --- | --- | --- |
| #313 | Merged as `d82004f` | Exact-head checks passed; small browser-suite waits. |
| #316 | Merged as `e557763` | Refreshed exact-head checks passed; Block browser waits. |
| #318 | Merged as `7ac666b` | Exact head `272b1aa9f` passed full verify run `36075003653`; its P2 screenshot concern was dispositioned as non-blocking test evidence. |
| #329 | Draft, checks running | Exact head `e0efa245ccdf2aac830f251ba1a893a43ae96ef3` is based on current main. Eight focused binary tests, the pinned formatter and 26 browser interactions pass locally; its build is 130,103 bytes against the fixed 130,048-byte cap, still 55 over. Exact-head Actions runs `36080015857`, `36080015860`, `36080015862` and `36080015882` were in progress at this checkpoint. The cap failure keeps the PR draft and blocks merge. |
| #281 | Draft, checks green, behind main | Still awaits maintainer architecture acceptance; no code was merged. |

## Branch refs

The initial read-only inventory counted 181 local branches. This sweep removed 93 local
branches whose tips were already ancestors of `origin/main` and which were not checked out.
After this count, two completed Muse wait worktrees and their already-merged local branches were
removed. The #318 merge also deleted the remote `muse/swarm-block-waits` and
`muse/swarm-expedition-waits` branches; fetching pruned their tracking refs. It also pruned seven
stale remote-tracking refs. Four remote branches were removed after
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

The starting inventory contained 61 registered worktrees. The release candidate added one.
Two completed Muse wait trees (`muse-house-waits-finalize` and `muse-expedition-waits-finalize`)
were verified clean, their heads were ancestors of main, and they were removed with plain
`git worktree remove`; their local branches were then deleted. The ignored files they contained
were generated build/test outputs, also reproducible from the primary checkout.

The later inventory found 36 other clean `.worktrees` whose commits were already in main. Two
plain removal attempts (`block-review-115` and `card-status`) failed with OneDrive permission
errors and partially removed administrative metadata; both worktree registrations and their
single missing `.agent-harness/tier.json` files were reconstructed from verified branch objects,
then checked clean. No more OneDrive removals were attempted. The other clean merged worktrees,
unique worktrees, detached Codex-managed worktrees and asset worktrees remain registered.

One external dirty work area remains deliberately intact:

- `muse-binary-hints-finalize` now checks out `codex/binary-reasoning-hints`; the optimized
  source and updated evidence are committed and pushed to #329 at `e0efa245`. Its eight focused
  tests, formatter and 26 browser interactions pass locally. The fresh build remains 55 bytes
  over the unchanged cap, so the PR stays draft. No cap was raised.
- The external `alibi-pr227-review` worktree has 11 tracked edits, three untracked files and
  ignored generated evidence. Its unique `tests/metadata.test.cjs` was copied into the release
  candidate and passes; the other work was left untouched because it is older or already has a
  newer counterpart on main.

The primary `main` checkout remains tracked-clean. `HUMAN_TODO.md` still has q-1 through q-8
open, including source licensing, physical Android/TalkBack acceptance, and human calibration
of the provisional puzzle labels.
