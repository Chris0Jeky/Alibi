# Live development state

Updated 2026-09-08. Git, CI and review threads take precedence over prose.

## Quiet Wing expansion in progress

The owner has requested an end-to-end enhancement and deployment, beyond the source candidate.
See [QUIET-WING-EXPANSION.md](QUIET-WING-EXPANSION.md) for the full outstanding scope.
First layer: reproducible harbour/river/hillfort/woodland worlds up to 28 × 28 plots, preview before
replacement, castle/village/farm plans, routed roads and bridges, move/copy, area brushes and town
feedback. Existing 14 × 14 saves remain valid without migration. Whole edits undo together.
The next layer imports 24 CC0 models, adds six castle modules and assembles houses from separate
walls, windows, doors and roofs. Locally bundled WebGL adds lighting, cached soft shadows and
bounded water animation, with usable Canvas fallback during graphics-context loss. Source credits
are now versioned across release updates. Local build `5f6c84697208` passes `npm run verify`, ten
city/model tests, 28 actual city controls, 14 GPU lifecycle checks, all 156 Quiet Wing controls and
36 origin/restart/recovery checks. Phone, desktop and fallback screenshots were inspected.
Independent Terra high review found no defects. Physical performance remains unverified; local
headless rendering was slow enough to justify automatic ambient-motion pausing. Companions,
additional games, wider visual refresh and deployment remain active work; no expansion release
or physical test is claimed. The earlier source-candidate evidence below is historical.

Companion slice at build `26a3c7354c8b`: cat, fox and owl use locally bundled animated GLBs;
Nimbus is an original articulated model. All saved identities, nicknames, affection and strolls
use the existing state. Live affection labels now refresh immediately. The view falls back to
the existing illustration on download/WebGL failure or context loss, and disposes on navigation.
Local browser checks cover all four models/actions, reduced motion, hidden-page pause, offline
reload with names retained, route disposal and narrow viewport. All 156 existing Quiet Wing
controls and 36 origin/update/recovery checks pass with these changes. Desktop/phone portraits
were inspected. Independent Terra high review found no confirmed blockers. Optional offline pack
is 1,952,850 bytes; the initial script is 124,033 bytes gzip and core offline pack 1,159,001 bytes.
No external image requests, CSP relaxation or new database identity. Hosted/physical evidence
remains outstanding. Broader games, artwork and release work remain in the expansion plan.

Relaxing-games slice at `d778361bf3c9`: Tideglass has two finite colour-pouring boards with
symbol alternatives and bounded current-board search; Pressed Meadow and Beachcomber have
two illustrated pair boards with persistent reveals. Every new board completes through real
controls, undo/reload work, and all four completion records survive an offline reload. Four
focused reducer tests and `npm run verify` pass. Existing games retain their IDs and records.
New original botanical/coastal motifs are included locally. Phone/desktop captures inspected;
physical interaction and the final hosted release remain separate gates.

Garden slice at `4c2c4aabc558`: six seeds, a species collection, three reusable pressed-flower
slots, title and setting, batch sow/gather and a valid SVG postcard export. Original three growth
durations, planted timestamps and historical keepsake totals stay intact; historic species are
not invented. Node tests cover rollback clocks, bounded growth, one-time harvests, old saves and
arrangement validation. Sixteen actual browser checks cover controls, safe batch operations,
undo, SVG parsing, offline save/reload and narrow layout. Growth time is advanced only through
an explicitly labelled test fixture. `npm run verify` passes. No hosted/physical claim.

## Quiet Wing source candidate

- **0.6.0-lab.1**, build `ba0a721c3f89`, on `codex/quiet-wing`. Seven incremental implementation/test
  commits precede the handoff commit. See [QUIET-WING.md](QUIET-WING.md) for source disposition,
  actual evidence, asset receipts and recovery. No Quiet Wing hosted release is claimed.
- Native `#/quiet/…` activity boundary, Shadow DOM isolation and disposal, root-owned updates,
  optional offline pack, future-save raw recovery and combined backup discovery with staged
  per-section restore. All existing puzzle/Club identities and both hosting configurations remain.
- All 209 delivered input hashes match. Four museum images fetched from official endpoints,
  public-domain flags verified, originals/receipts retained, optimized WebPs decoded and inspected.
  The downloaded Kenney 2.0 pack remains reference; only the supplied verified keeper sprite renders.
- Local checks pass: existing Node gate plus 95,459 parameterized Quiet Wing checks and 20 storage
  checks; 156 real-origin controls; 34 origin/restart/offline/update/recovery checks. Existing browser
  UI/Club/origin/expedition/restart/boot/update and local two-browser rooms all pass. Independent
  Terra high review found no blockers. Hosted CI state belongs to the PR, not a presumed success.
- Remaining gates: [#13](https://github.com/Chris0Jeky/Alibi/issues/13), affected Android freeze [#11](https://github.com/Chris0Jeky/Alibi/issues/11),
  physical TalkBack/gestures/performance, actual hosted preview/update/rollback, OBJ editor import,
  and human curation. [HUMAN_TODO.md](../HUMAN_TODO.md). Do not clear site data to recover.

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
