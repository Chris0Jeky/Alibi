# Timeline Desk levels 13–15

This slice started from `e8a3430663c3d784f761024c7bcc0f44809c4009` on the
`codex/timeline-levels-reasoning-20261111` branch. It appends three revision-1 cases to the optional desk.

| Level | Case | Schedule rule | Clues |
| --- | --- | --- | --- |
| 13 | The stalled lift | Events cannot share an hour | 8 |
| 14 | Fog on the quay | Events may share an hour | 8 |
| 15 | The sealed dispatch | Events cannot share an hour | 7 |

Each case has six events across eight hours. The authoring command emits small constructors for
the repeated clue shapes. These produce the same objects used by the player, solver and saved
definitions. The first twelve decoded definitions match the previous JSON digest
`82ae5ef52ee6cf34784e9ea160afc420479139155c0467e40cfdab4021b45e40`, including IDs, revisions,
event and clue order, solution and story text. The lobby count comes from the level list.

## Verified

From the worktree root, all 45 Timeline tests that use source or disposable build fixtures passed.
They cover regeneration from `node tools/curation/timeline-candidates.mjs`, independent brute-force
uniqueness, the loss of uniqueness when any clue is removed, and hints tested against a poisoned
stored solution. The authoring tool's direct-elimination proxy stalls on each new case.

```powershell
$timelineTests = @(Get-ChildItem tests -Filter 'timeline-*.test.*' |
  Where-Object Name -ne 'timeline-delivery.test.cjs' | ForEach-Object FullName)
node --test @timelineTests
npm.cmd run build:web
node --test tests/budget.test.cjs
$env:PYTHONUTF8 = '1'
py -3.13 tests/browser_timeline_lab.py
```

Web build `f357032c6027` on the edited worktree emitted `timeline-lab.31e1374912a6.js`.
Its filename digest and reported sizes matched the emitted file. The pack remained outside the core
shell and loaded on demand. It measured 47,071 raw bytes and 17,040 gzip bytes, up from 46,090 raw
and 16,373 gzip bytes on the starting head. The 49,152-byte raw ceiling leaves 2,081 bytes on this
branch. All 17 budget checks passed, including startup JavaScript at 135,651 gzip bytes against the
135,680-byte ceiling.

The Chromium journey passed at 390 and 1280 px. It continued from case 12 to case 13, requested a
clue-based hint before solving, completed case 13, and reloaded case 14 offline to place two events
at the same hour. Both solved case 13 screenshots were inspected for layout and text fit.

## Verification still open

The integrated source needs Android artifact accounting and hosted CI. Human difficulty,
physical devices and assistive technology remain untested. Owner actions remain in
[HUMAN_TODO.md](../../HUMAN_TODO.md).
