# Qwen draft-PR worker report

Started 2026-09-21 (Europe/London). Scope: the eight drafter PRs #230, #229,
#228, #227, #226, #207, #204 and #183, plus support PR #231. Qwen was the
primary bounded review/fix worker; the coordinator owned GitHub mutations,
stack integration and proving checks.

## Method

- Model: `qwen3.8-27b-gsq-rco@iq3_xxs`, via `local-llm-ops`.
- Read-only `review-range` reviews and isolated `refactor-slice`/`fix-issue`
  workers; every accepted patch was inspected and re-proven locally.
- Qwen never pushed, merged, or made a release decision.

## Current scorecard

| PR | Current head | Local proof | Hosted boundary |
|---|---|---|---|
| [#204](https://github.com/Chris0Jeky/Alibi/pull/204) | `242a252` | Android build; focused Node 20/20; browser 68 + Block Motion 79/79 | All hosted checks green; post-fix independent review still required |
| [#207](https://github.com/Chris0Jeky/Alibi/pull/207) | `9526e84` | Android build; Castle Node 30/30; browser 4/4 | All hosted checks green; post-fix independent review still required |
| [#226](https://github.com/Chris0Jeky/Alibi/pull/226) | `4d53c4b` | Crime Scene contract 4/4; state/handoff evidence added | Hosted pending 1; threads resolved |
| [#229](https://github.com/Chris0Jeky/Alibi/pull/229) | `73fcd3d` | Full local suite 359/361; new actual-control workflow 28/28 | Hosted pending 1; threads resolved |
| [#183](https://github.com/Chris0Jeky/Alibi/pull/183) | `101fd79` | Build; Observatory focused 11/11; browser 15/15; full local 356/358 | Draft; hosted green; owner’s Pulseboard `puzzle.failed` gate remains |
| [#227](https://github.com/Chris0Jeky/Alibi/pull/227) | `0fbb3c4` | Mobile QA 7/7 | Hosted green; no current Codex review decision |
| [#228](https://github.com/Chris0Jeky/Alibi/pull/228) | `c3e6a51` | Mobile QA 9/9 | Hosted green; no current-head review decision |
| [#230](https://github.com/Chris0Jeky/Alibi/pull/230) | `86f6cdf` | Android build; metadata 2/2; formatting | Hosted green; no current Codex review decision |
| [#231](https://github.com/Chris0Jeky/Alibi/pull/231) | `584cc69` | Formatting + Android build; restores `dist-android/` ignore | Hosted green; support only |

No PR is claimed merged. Green checks are not being conflated with the
post-fix review gate, exact-head aging, or human acceptance.

## Qwen work and measured effectiveness

- Eight first-pass reviews took 326.5 seconds. They were fast and useful for
  file mapping, but accepted zero blockers: Qwen missed later actionable Codex
  findings on #204, #207 (2), #183 (2), #226 (3) and #229 (2).
- Twenty worker attempts were measured: 10 accepted commits and 10 no-op or
  invalid-proof attempts. Successful later slices included #204 host
  reattachment (`242a252`), #183 drag/consent/lock and asset-receipt repairs
  (`101fd79`), #207 hotspot-label repair (`2ff2d20`), and #229 phone control
  scrolling (`49ef9ee`).
- Qwen performed best on explicit mechanical edits with a narrow proof. It
  struggled with judgment-heavy diagnosis and large metadata until the exact
  replacement was embedded in the task; coordinator review caught those
  failures. It is not a substitute for independent review, hosted CI, or
  physical accessibility/playtesting.

## Residuals

`HUMAN_TODO.md` remains authoritative for physical Android touch, TalkBack,
comfort, performance and subjective difficulty. #183 remains parked in draft
until the external Pulseboard collector registers and deploys `puzzle.failed`.
The repo has no declared delegation policy (`source: null`); Qwen ran under the
wrapper hard defaults. Local full-suite exceptions are Windows-only missing
`ffprobe` and symlink privilege `EPERM`; hosted Linux failures observed during
the run were fixed or requalified. Clean disposable worktrees were removed;
the failed support attempt with a tracked `.gitignore` edit was preserved under
`.qwen-checks/.local-llm-wt/20260921-165453-4f8ea9`; one empty unregistered
`pr-207` directory remains because Windows held a deletion handle.
