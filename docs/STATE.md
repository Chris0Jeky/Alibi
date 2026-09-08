# Live development state

Updated 2026-09-08. Git, CI and review threads take precedence over prose.

## Browser release

- Application: **0.3.0**, build `f7d5da27ca94`, 102 puzzles, twelve engines, three illustrated casebooks.
- Public repository: https://github.com/Chris0Jeky/Alibi
- Play origin: https://alibi-puzzle-club.jeky-tck.chatgpt.site
- Publication receipt: [0.3.0 release](https://github.com/Chris0Jeky/Alibi/releases/tag/v0.3.0).
  The receipt records the deployed source SHA, hosted acceptance and downloadable artifacts.
  If that release is absent, publication is still pending; source registration alone proves nothing.
- Editable source is at the root. The original input bundle remains untouched and ignored.
- Implemented: illustrated phone cabinet, clue-based reasoning hints, solved-case records,
  save/draft validation, keyboard fixes and explicit offline release updates.
- Main requires green `verify` checks and resolved review conversations; force pushes, deletion
  and squash merging are disabled. Review/merge authority remains in `.agent-harness/tier.json`.

## Evidence

- Local: 1,741 engine/content + 27 storage + 29 worker/build assertions, plus seven named
  hint/recovery regression tests. All pass.
- Chromium 151.0.7922.34: 169 isolated UI checks, 92 real-origin checks and 18 A/B release-update
  checks. Includes all twelve family completions, four viewport widths, 390px persistent profiles,
  restart/restore, stale-tab protection, malformed-save recovery and offline reload.
- The same three browser suites and Node checks pass hosted Linux CI on the PR #4 runtime change.
- Fresh independent adversarial review of `c18a48d` found no confirmed blockers. Its only
  non-blocking formatting observation was declined; no runtime fix was needed. Later changes to
  this state file record evidence only.
- `npm run bundle` includes only browser reports whose application build matches.
- Manual desktop and phone-width gameplay inspected. Hosting evidence belongs in the release
  receipt. Physical Android, iOS, TalkBack and human difficulty calibration remain unverified.

## Next useful work

1. [#1](https://github.com/Chris0Jeky/Alibi/issues/1): curate and human-playtest the first casebook.
2. [#2](https://github.com/Chris0Jeky/Alibi/issues/2): physical Android acceptance before packaging.
3. [#3](https://github.com/Chris0Jeky/Alibi/issues/3): shared-estate registration and recorded follow-up.

Start from `AGENTS.md` and `docs/PROJECT-MAP.md`. Do not regenerate published catalogue revisions
or expand the backend before a concrete product need. The bundle's old reports are historical;
`docs/RELEASE-CHECKLIST.md` retains the broader acceptance backlog.
Owner decisions: [`HUMAN_TODO.md`](../HUMAN_TODO.md).
