# Live development state

## Reading this ledger

This is the current continuation index for the 3 October gameplay/content pass.
The entire previous ledger is retained byte-for-byte in the same directory:
[State history through the deferred-loading candidate](STATE-HISTORY-2026-10-03.md).
It contains every earlier release receipt, candidate, unresolved question and
ownership note. Its former pending statements are historical, not assertions
about today's GitHub state. No history or owner decision has been discarded.

The preserved file is 96,939 bytes, SHA-256
`e6f38926f414a1e4a61d0f11af4b62020574ced0f62b3cb599881a6fc12cad94`,
original Git blob `981965061acbb7edbb93c6ff106df1680886dad4`. Keeping it beside
STATE preserves its relative-link base. There were no repository references to
`STATE.md#...` when this index was prepared; external bookmarks to old headings
may need the history link above. Older dated state archives are retained too.

Start with [AGENTS.md](../AGENTS.md), [Project map](PROJECT-MAP.md), the authoritative
[tier settings](../.agent-harness/tier.json) and [HUMAN_TODO.md](../HUMAN_TODO.md).
Recheck live main, open PRs, claims and final-head CI before changing or merging
anything. A source snapshot or an old receipt is not a current ownership claim.

## Source and publication are different

Source merges are not a deployment. This gameplay continuation did not deploy,
change the app version, activate an update, migrate a database or rewrite any
published puzzle. The previous ledger records the separately operated 0.15.1
publication; see [its release receipt](RELEASE-0.15.1.md). That is historical
publication evidence, not a fresh check of what a production origin serves.

Latest main observed for this handoff is
`d9ac0b3b311c314193a12567eaff30635d1c064e`, after #569. Later changes require a
new live check. The 510 trusted official definitions remain distinct from the
34 optional Lattice/Afterlight studies. This pass makes existing accepted
optional content discoverable; it does not claim 34 newly authored levels.

## Merged gameplay work

| PR | Landed source | Delivered and verified boundary |
| --- | --- | --- |
| [#567](https://github.com/Chris0Jeky/Alibi/pull/567) | `4829a9a8f0e3767b5052ab51c694359c9ac40086` | Route-owned loading, bounded ten-second retry and pinned-save resume. All 12 final-head workflows, eight actual-origin scenarios and independent review passed. |
| [#568](https://github.com/Chris0Jeky/Alibi/pull/568) | `236c7ba72d9bd1b84a8f75f8f5ff04692bc2b57d` | Fixed 268-move replay and warm-cache preservation tests. All four final-head workflows and independent re-review passed. This is test coverage, not a higher move cap or phone speed rating. |
| [#569](https://github.com/Chris0Jeky/Alibi/pull/569) | `d9ac0b3b311c314193a12567eaff30635d1c064e` | Source-bound optional catalogue, architecture and plan. All six final-head workflows, 116 source cases and independent review passed. No player installer is introduced by this foundation. |

Earlier source landings #556, #560, #562, #565 and #566 retain their individual
receipts in GitHub and the preserved ledger. Do not reimplement or republish
those branches from an older ZIP. Issues #416, #418 and #563 were closed by their
qualified implementation landings; broader content and device gates stay open.

## Workshop discovery: published implementation, separate acceptance

[PR #570](https://github.com/Chris0Jeky/Alibi/pull/570) contains the static shelf,
styles, measured web/Android delivery, guarded build-only pack-desk composition,
source/output tests and a read-only actual-browser workflow. It targets main
now that #569 has landed. Recorded head:
`241e332a433eff80e49ae9b9e3f8e71f0712f979`.

The shelf offers Lattice's 12 Lanterns and 12 Futoshiki studies and Afterlight's
10 pictures. A player downloads the exact JSON, then uses the unchanged Workshop
file chooser and bounded validator worker. The shelf does not install silently,
claim to know installed state, enlarge the official registry or create another
save owner. The entry is hidden for native/standalone targets pending their own
file/download acceptance. No new dependencies, accounts or services are added.

The first hosted implementation completed all 14 browser checks at 320/1280px,
including exact downloads, real import, duplicate refusal, undo/redo and saved
offline play, plus script-disabled landscape. That evidence belongs to head
e69300c. Subsequent source-only test repairs corrected the shell directory count
and two old optional-byte sum assertions. They did not alter player behavior or
raise limits. The corrected head also passes all 14 checks in run 37149747493, whose exact
source and complete receipt were downloaded and verified. It still requires
final full CI and review; consult the PR before treating the feature as accepted.
This handoff does not turn older or partial results into a current-head pass.

Design and continuation documents:
[Workshop discovery decision](gameplay/WORKSHOP-DISCOVERY.md),
[implementation plan](superpowers/plans/2026-10-03-workshop-discovery.md), and
[verification and recovery ledger](qa/2026-10-03-workshop-discovery.md).
The build-only composition deliberately depends on exact pack-desk boundaries
and text. Unknown upstream copy fails the build instead of silently omitting the
entry. Any future direct source integration should replace, not stack another
hook on top of, that adapter.

## Remaining scope and ownership

- **#433 remains open:** direct in-app installation still needs cancellation,
  interrupted/corrupt delivery, installed/offline status, concurrent-tab and
  revision/update recovery. Static downloads are an intermediate delivery choice.
  Interlock #427 is not advertised while its delivery qualification is blocked.
- **#389 remains open:** #567 covers item 2 loading/retry. Practice completion
  counts (item 1) and the separate complete-content identity work in #459 (item 3)
  are not closed by this pass.
- **#404 remains open:** the 500-move cap is unchanged. A valid at-cap game,
  real-origin reload/undo, memory and constrained/physical-device input latency
  are required before lifting it. See [Block replay proof](gameplay/BLOCK-REPLAY-CACHE.md).

Other research, escape-room, native, visual-art and restore lanes retain their
own ownership and acceptance. This continuation has not promoted escape-room
rehearsals to canonical chapters, resolved held art, or taken over another
writer's branch. Recheck live PR/issue claims rather than assuming a list here is
an authorization to overwrite them. Save-schema questions such as #407 and
fallback concurrency #554 remain outside this delivery change.

## Human and device gates

[HUMAN_TODO.md](../HUMAN_TODO.md) is authoritative. Difficulty follows the owner's
data-first calibration decision, not fabricated solve times or solver effort.
The [phone session](PHONE-SESSION.md) covers affected-device freezes, physical
Android input and file handling, TalkBack, larger text and sustained performance.
Viewport emulation, source tests and Android payload indexing do not close it.

### Block Cabinet phone action hierarchy candidate, 2026-09-17

Its original candidate receipt is preserved in the full history. The boundary is
unchanged: physical Android touch, TalkBack, comfort review and human acceptance stay open.

## Resume checklist

Read #570's latest head, workflows, review threads and browser artifact. Inspect
complete coverage and exact source identity, not a green badge alone. Merge only
a qualifying final head and keep #433/#389/#404 residuals open. Keep this handoff's
PR separate from implementation so documentation review cannot conceal a runtime
change. Amend current status with evidence; do not silently rewrite the preserved
history. All implementation, tests, plans and this handoff are submitted through
repository PRs, not only retained as conversation downloads.
