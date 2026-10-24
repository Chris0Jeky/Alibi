# Issue #220: radius token adoption

Date: 2026-10-22. Branch: `design/220-radius-token-adoption`. Starting HEAD:
`faea64e68c4a90a6eb76856b5f362fdac764a323`. The starting worktree was clean.
Scope: eight bundled source stylesheets, the existing radius regression test, and
this handoff. No Git-writing commands, JS, content, saves, engines or type-scale edits.

## Changed

The published scale remains sm 8px, md 12px, lg 16px and pill 999px in
`src/app.css`. The legacy `--radius` now has one definition, aliasing lg;
cabinet.css no longer overrides it. Its only consumer, `.empty`, already resolved
to cabinet's 16px in the bundle. App-only styling moves from 18px to its 16px panel step.

All 16 remaining standalone large radii map to lg (12 declarations) or pill
(4 declarations: chip, Settings toggle, Zen exit and the theatre controls group).
Two small control radii map to sm: the theatre stage action and screening buttons.
The driver's review kept game-board cells (lesson, Lantern Gardens, Tic-Tac-Toe,
Duel, Borough, Mahjong, Block Cabinet, Archive) and the 16px clue checkbox on their
original 1-5px radii: 8px on a 16px checkbox reads as a radio button, and board
cells are local game geometry, not controls on the scale.

The casebook card retains `5px 14px 14px 5px` through local
`--radius-case-file`, with a metaphor comment. The bottom sheet
(`22px 22px 0 0`) and letter (`8px 15px 11px 7px`) keep their shapes and
now have explanatory comments. All six existing board/decorative exceptions remain.

## Source inventory

Comment-stripped border-radius declarations in app/cabinet/expedition/club/
atmosphere/curation/after-hours/theatre.css; these are source uses, not computed styles.

| Category | Before | After |
| --- | ---: | ---: |
| radius-sm | 36 | 38 |
| radius-md | 49 | 49 |
| radius-lg | 12 | 24 |
| radius-pill | 5 | 9 |
| Standalone 18/19/20/22/24/30px | 16 | 0 |
| Standalone 1-6px detail radii | 40 | 38 |
| 50% circles | 35 | 35 |
| Square 0 | 3 | 3 |
| Legacy var(--radius) uses | 1 | 1 |
| Legacy --radius definitions | 2 conflicting | 1 alias to lg |
| Six named 7/9px board/decorative exceptions | 6 | 6 |
| Asymmetric shapes (case-file becomes named token) | 3 | 3 |
| Total border-radius declarations | 206 | 206 |

The 38 retained small details are the nine board cells/checkbox above plus badges, paper/book/image corners, progress or
target marks, illustrative person/board pieces and decorative strokes. They are
listed individually below; no radius-xs, radius-xl or circle token is introduced.

| File | Selector | Retained radius |
| --- | --- | --- |
| app.css | `.badge` | 5px |
| app.css | `.book-number` | 3px |
| app.css | `.book-progress i` | 4px |
| app.css | `.board-scroll` | 4px |
| app.css | `.axis.target.met` | 4px |
| app.css | `.axis.target.over` | 4px |
| app.css | `.tiny-square` | 1px |
| app.css | `.room-label i` | 3px |
| app.css | `.person-token.victim:after` | 5px |
| app.css | `.person-btn .person-token.victim` | 6px |
| app.css | `.draft-clue` | 6px |
| app.css | `.lesson-statement` | 5px |
| app.css | `.lesson-progress i` | 3px |
| cabinet.css | `.book-number` | 3px |
| cabinet.css | `.collection-stamp` | 5px |
| cabinet.css | `.collection-stamp img` | 3px |
| expedition.css | `.chapter-reveal img` | 5px |
| club.css | `.club-letter` | 5px |
| club.css | `.paperclip:after` | 4px |
| club.css | `.desk-note` | 4px |
| club.css | `.domino-chain-piece` | 5px |
| club.css | `.domino-tile-art` | 5px |
| club.css | `.block-cell-mark` | 3px |
| club.css | `.block-piece-art i` | 3px |
| club.css | `.crate-top` | 2px |
| club.css | `.archivist-head:after` | 2px |
| atmosphere.css | `.folio-invitation > img` | 5px |
| theatre.css | `.theatre-stage [data-adaptive-credit], .club-hero [data-adaptive-credit]` | 3px |
| theatre.css | `.theatre-local-credit` | 5px |

## Verified

Working directory: `C:/Users/jekyt/Desktop/Printer Config/Others/Git/Alibi/.wt/radius-220`.
Node v24.13.1 (satisfies Node >=22). Verification is for the uncommitted working tree
on the starting HEAD above.

- Original contract: 4/4 passed.
- Tightened contract against original CSS: exit 1, 1 passed / 4 failed, including
  a real failure identifying app.css's 30px, 20px and 19px declarations.
- Additional button-control expectations before their CSS adjustment: exit 1,
  4 passed / 1 failed (lesson-cell still had 4px).
- Final radius contract: 5/5 passed, exit 0. It rejects standalone 18-30px radii,
  pins migrated controls/pills, requires one lg alias, and retains named geometry.
- `npm.cmd run format:check`: exit 0, all matched files use Prettier style.
- `npm.cmd run build`: exit 0; web build `1c16a3b80be8`, 570 puzzles,
  307 files; sourceDirty is honestly recorded as true. Generated output was produced
  only by the build; dist was not hand-edited.
- `node --test tests/radius-scale.test.cjs`: exit 0, 5 passed, 0 failed,
  0 skipped (final run after all CSS/test changes).
- `npm.cmd test`: exit 1 in pretest; no full Node/Quiet Wing suites ran.
  The existing guard requires committed source and matching web/Android identities.
  It reported dirty working source/web identity, missing dist-android identity and
  missing/mismatched web/Android receipts. Git writes are forbidden for this task;
  no commit, stash, guard bypass or gate-script edit was attempted.
- `PYTHONUTF8=1 py -3 tests/browser_ui.py`: exit 0, 187 browser checks;
  all thirteen games completed through controls, responsive overflow checks at
  360/390/768/1440px, and no uncaught browser exceptions. This is the isolated
  document UI suite, not hosted/offline or physical-device evidence.
- `git diff --check` (with per-command safe.directory): exit 0.
- Impeccable mechanical detector: exit 2, two warnings for existing unchanged
  side-accent borders in cabinet.css and expedition.css. Skip: decorative border
  treatment is outside this radius-only task; neither warned declaration changed.

Git ownership checks needed an ephemeral safe.directory value (command `-c`, or
process-only `GIT_CONFIG_*` for build/pretest subprocesses). No Git configuration
was written. Git also warned that the owner's global ignore file is unreadable;
commands completed and the final tracked/untracked diff remains limited to the
requested eight CSS files, radius test and this new note.

## NOT verified

Phone/desktop visual inspection belongs to the driver. Prioritize the Desk hero,
daily/Zen cards, invitations and listening room; Library filter chips; casebook
cards/story illustrations; Settings toggles and dialogs; clue checkboxes and lesson
cells; all seven affected After Hours game controls; Zen exit; theatre controls,
stage action and film screening cards. Check the docked quick sheet and case-file
shape remain visually intact.

The complete npm test suite remains unverified because of the pretest prerequisite
block above. After the driver commits the reviewed changes, its exact committed
head needs `npm run build:android` and `npm test`.

No hosted deployment, CI, physical-phone/TalkBack acceptance or independent review
is claimed. Separate lazy activity stylesheets outside the eight-file bundle retain
their existing scales.

## Residual risk

Large panels shrink to 16px, the two theatre buttons become slightly rounder, and
long theatre pill controls can become more rounded; visual acceptance remains open.
The 38 retained small details mean this does not claim every radius everywhere
is on the four-token scale or that issue #220 is visually complete.

[HUMAN_TODO.md](../../HUMAN_TODO.md) remains authoritative and unchanged; existing
physical Android/TalkBack, publisher and creative acceptance items remain open.

Intended commit: `style: adopt published radius tokens for panels and controls`.
