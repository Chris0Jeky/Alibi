# Live development state

Updated 2026-09-08. Git, CI and review threads take precedence over prose.

## After Hours candidate

- Source milestone: **0.5.0-preview.1**, 116 preserved puzzles, thirteen original engines,
  four casebooks, three additional games and six Archive rooms. See [AFTER-HOURS-MAP.md](AFTER-HOURS-MAP.md).
- All 74 bundle delivery checksums match. Full source-file disposition is in the linked inventory.
- New: four desk editions, opt-in reversible assistance, game journal, Zen, Canvas harbour,
  separate Club storage with atomic recovery, lazy precached assets and optimized original art.
- Phone incident: owner confirms Android installation and initial play, then repeated freezes
  after The last service and other scenes. Indefinite storage open/transaction waits are fixed;
  exact device cause is unconfirmed. Recovery preserves progress. The physical retest remains open.
- Local verification: full Node gate passes, 182 original UI checks, 106 Club checks, 92 origin
  checks, 247 expedition checks. All 19 scenes survive real-control completion and reload; the
  restart suite also repeats The last service three times, restores Club data with a recovery copy,
  restarts the browser process and reloads offline. Six startup recovery checks verify that app-file refresh preserves IndexedDB, localStorage
  and unrelated caches; 18 two-tab update checks pass. CI re-runs these against the final candidate.
- Optional rooms: 89 serial protocol assertions plus two-browser local Wrangler acceptance,
  including a deliberately lost join response. Source is integrated; hosted service is not enabled.
- Cloudflare: authenticated existing account confirmed; static and room dry-runs pass.
  `wrangler.jsonc` selects a separate `alibi-after-hours-preview`; the original Sites origin remains.
  Publication and exact hosted evidence are recorded in the 0.5.0-preview.1 release receipt.
- Workflow: smaller present-tense commits on `codex/after-hours`, one independent review, green CI
  and merge with preserved history. Owner requested Luna xhigh / Terra high selection for this wave.
- Not verified: physical Android freeze resolution, TalkBack, physical two-device online rooms,
  Android/iOS native stores, human difficulty calibration. [HUMAN_TODO.md](../HUMAN_TODO.md).

## Previous Bellweather expedition

- Source milestone: **0.4.0**, build `75e0b6c45a12`, 116 puzzles, thirteen engines, four casebooks.
- Public repository: https://github.com/Chris0Jeky/Alibi
- Play origin: https://alibi-puzzle-club.jeky-tck.chatgpt.site
- Publication receipt: [0.4.0 release](https://github.com/Chris0Jeky/Alibi/releases/tag/v0.4.0).
  The receipt records the deployed source SHA, hosted acceptance and downloadable artifacts.
  If absent, publication is pending; the earlier 0.3.0 release remains the live receipt.
- New: four original illustrations, richer case files and chapter atmosphere, the six-record
  Bellweather investigation, and eight original Tidal bridges maps with a bounded engine.
- Bridges includes touch/keyboard controls, a miniature lesson, visible-count deductions, explicit
  reveals, save/import/offline integration and an independent brute-force test oracle.
- Save feedback now retains “Saving…” until all queued writes finish.
- All 102 earlier definitions are unchanged as JSON values, with stable IDs and revisions.
- Main requires green `verify` checks and resolved review conversations; force pushes, deletion
  and squash merging are disabled. Authority remains in `.agent-harness/tier.json`.

## Evidence

- `npm run verify`: 1,882 engine/content assertions, 27 storage assertions, 33 worker/build
  assertions, ten independent Bridges tests and seven hint/recovery regressions. All pass.
- Chromium: 182 isolated UI checks across thirteen families and four viewport widths;
  92 real-origin checks; 18 A/B update checks; 247 expedition checks. The expedition suite
  completes all fourteen new puzzles via real controls in a fresh 390px persistent profile.
- Expedition coverage includes double-bridge cycling, keyboard selection, undo/redo, a deliberately
  delayed save, committed-save reload, offline moves, incorrect accusations, lessons,
  six chapter revelations and the ending. Each run gets a fresh evidence folder.
- Independent Luna medium review found no confirmed blockers in the new engine, UI or narrative.
  A focused follow-up approved the pending-save counter. Stale-copy observations were corrected.
- Mobile home, case file and largest bridge chart were visually inspected. Clipped edge islands
  and low-contrast chapter text were corrected and the expedition suite rerun.
- Hosted CI and public-origin results belong in the release receipt. Physical Android,
  iOS, TalkBack and human difficulty calibration remain unverified.

## Follow-up

1. Human-playtest Bellweather and Bridges; see [BELLWEATHER-CURATION.md](BELLWEATHER-CURATION.md).
2. [#1](https://github.com/Chris0Jeky/Alibi/issues/1): curate the earlier Briar House anthology.
3. [#2](https://github.com/Chris0Jeky/Alibi/issues/2): physical Android acceptance before packaging.
4. [#3](https://github.com/Chris0Jeky/Alibi/issues/3): estate registration and legacy contract follow-up.
5. [#5](https://github.com/Chris0Jeky/Alibi/issues/5): older release-report selection/cleanup limits.
6. [#6](https://github.com/Chris0Jeky/Alibi/issues/6): host ignores `_headers` and serves WebP as
   generic binary content. Browsers render the art; configured security/cache headers are not
   enforced by Sites. The provider also injects its own protection code.
7. [#7](https://github.com/Chris0Jeky/Alibi/issues/7): reconsider native artwork encoding dependency.

Start with `AGENTS.md` and [PROJECT-MAP.md](PROJECT-MAP.md). Preserve the play origin and saves.
Prefer bounded Luna work and lower effort for routine checks; the owner asked to reduce costly
subagents. No Astra children.

Owner decisions: [HUMAN_TODO.md](../HUMAN_TODO.md). No browser-publication input is outstanding.

Phone recovery follow-up: [issue #11](https://github.com/Chris0Jeky/Alibi/issues/11).
