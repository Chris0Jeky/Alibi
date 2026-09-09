# Live development state

Updated 2026-09-09. Git, CI and review threads take precedence over prose.

## Theatrical edition 0.8.0 live

PR #26 merged as `adb4f5d` after both exact-head CI runs passed. Build `c8ea40a83be7` is live on
the existing Cloudflare primary and Sites fallback. Eight complete local
rooms combine original painted artwork, line emblems, weather, procedural room sound, five
source-verified photographic alternatives and four deliberately played films. The existing
interactive Field notes library remains available through its own optional pack. Delivery uses
nine verified enhancements and eight concurrent-safe cache slots. CSS minification preserves
all existing core/JS/CSS/Wing budgets. No published puzzle definitions or save identities change.

The 88 new theatre checks, 16 delivery checks, 182 puzzle UI checks, 92 real-origin checks,
66 curation checks, 158 Quiet Wing checks, Field notes and After Hours suites pass locally.
All five real photo endpoints returned the pinned WebP bytes through browser CORS checks.
Independent reviews and bounded fixes are recorded on PR #26. Both live origins pass 92 storage/
offline checks and the real 0.7-to-0.8 Save & update test with pinned puzzle state preserved.
All 254 primary public files match exactly; all 250 fallback non-HTML files match exactly, and
its four HTML files preserve the original content plus the host's challenge-script insertion.
The primary passes 88 theatre checks. Five photo providers pass CORS/fingerprint checks from both hosts.
The Sites fallback's missing response headers and generic WebP/Ogg/model MIME types remain #6;
its same-origin enhanced image is correctly rejected when providers are blocked, retaining the painting.
The corresponding primary-mirror theatre test is not claimed to pass on Sites.
Document CSP/referrer policy provides the supported document-level protection.

PR #26 closes #5, #12, #16, #18, #22, #23 and #28; #7 was superseded. Late nonblocking review
follow-up #36 preserves the Wing's separate motion choice when the root setting permits motion.
Root Reduce motion still suppresses animation. This limitation and physical-device acceptance
remain open; see [RELEASE-0.8.0.md](RELEASE-0.8.0.md) for the exact deployment receipts.

See [THEATRICAL-EDITION.md](THEATRICAL-EDITION.md), [ASSET-DELIVERY.md](ASSET-DELIVERY.md) and
[ONLINE-ASSETS.md](ONLINE-ASSETS.md). [HUMAN_TODO.md](../HUMAN_TODO.md) remains open for physical
Android, TalkBack, sensory quality, sustained performance, licensing and player judgement.

All sections below are historical checkpoints. The live release and current limitations are above.

## Adaptive delivery 0.7 source checkpoint (historical; merged in PR #27)

`codex/adaptive-assets` starts from `ae5d127` and implements the policy in
[ASSET-DELIVERY.md](ASSET-DELIVERY.md). Museum interludes retain complete 600px artwork in the
core and progressively decode verified 1600px detail from optional release files. The loader
supports one approved CORS mirror plus the same-origin copy, bounded requests/storage, a separate
image cache and a persistent compact-only preference. No external mirror is configured.
Quiet Wing pack downloads no longer hold the navigation/save-flush operation open.

Local build `ca81380b205a`: core 1,863,504 bytes, initial JavaScript 102,444 bytes gzip,
optional enhancement images 2,331,656 bytes; all existing budgets pass without increases.
Local verification: full format/build/Node gate, 182 puzzle UI checks, 92 real-origin checks,
66 curation checks, 18 two-tab update checks, and 16 new adaptive-delivery browser checks.
Phone-sized and desktop gallery screenshots were visually inspected. Node regressions additionally
cover CDN failure, invalid/oversized/partial responses, hashes, quota denial, timeouts and
nonblocking activity disposal. Evidence is under `tests/delivery-*.log` and `test-results/delivery/`.

The ready [PR #27](https://github.com/Chris0Jeky/Alibi/pull/27) contains two implementation/strategy
commits plus review reconciliation. Independent read-only review found no blockers; its low-risk
cross-tab optional-cache target race is tracked in [#28](https://github.com/Chris0Jeky/Alibi/issues/28).
This is source/local acceptance, not a new production deployment. Hosted CI, actual external-mirror
CORS and physical-device performance remain distinct gates. [HUMAN_TODO.md](../HUMAN_TODO.md),
particularly q-2/q-4, remains open; no subjective owner checks have been closed.

## Historical 0.7 deployment: Cloudflare primary, Sites fallback

Owner decision 2026-09-09: the main play URL is
**https://alibi-after-hours-preview.commit-atlas.workers.dev/**. The original
**https://alibi-puzzle-club.jeky-tck.chatgpt.site/** is the fallback. Preserve both existing origins;
saves are not shared or silently migrated. `wrangler.jsonc` owns primary deployment and
`.openai/hosting.json` owns the fallback. New links and GitHub metadata use Cloudflare.

Curation Cabinet 0.7.0, build `447f3b3b8ddc`, merged as `ad284c7` and deployed to Cloudflare
version `f69a51d1-d410-450f-859e-c9716093f482`. Both final source CI runs passed. Cloudflare passes
92 HTTPS persistence/offline checks, 66 curation checks and emitted-file hash/header verification.
Sites fallback version 5 also deployed successfully. Its actual 0.6.0-to-0.7.0 upgrade preserved
the saved move and pinned puzzle definition, followed by a successful offline reload.
See [RELEASE-0.7.0.md](RELEASE-0.7.0.md) for exact evidence,
limitations and rollback references. [HUMAN_TODO.md](../HUMAN_TODO.md) remains open.

## Curation Cabinet integration evidence

The isolated `codex/curation-cabinet` integrates the final asset commit `3dddb47`, 208 new core
puzzles in thirteen bounded packs, and 59 separately versioned challenges. All 116 published
puzzles and legacy fixtures are unchanged; the official aggregate contains 324 puzzles.
[CURATION.md](CURATION.md) records source identity, budgets and reproduction. Trusted editorial
notes bind by ID/revision; answer notes require completion, and unsolved cards use venue covers.
Four object-level Met Open Access images have recorded hashes, credits and 600px runtime copies.
The unavailable Monet candidate is documented. Difficulty remains provisional; absent times are
not replaced by fabricated estimates. Earlier film footage is explicitly dated to the 116-puzzle edition.

The challenge launcher is in the optional Quiet Wing, with validated fixed starts, replayed logs,
locked givens/prefixes and separate challenge backups. Restore uses the existing timed worker.
Independent review found a future-record overwrite and the fix now refuses writes both after
failed reads and inside the transaction; real IndexedDB tests prove preservation. Core/editorial
review found no blockers. The combined repository check, supplied 324 and 59 checkers, 182 new
mobile controls, 66 curation real-origin checks and every challenge mechanism at phone/desktop
widths pass. Visual inspection also caught missing challenge grid styling; explicit spatial
row/column assertions now cover grid mechanisms and the shipped phone/desktop queen board.
Linux CI exposed narrow navigation min-content overflow; phone rail labels now wrap within their
flex cells. Final-head CI and publication evidence will be recorded in the PR/release receipt.
Release closeout fixes #20 (Duel forcing-opening completion) and #21 (occupied warehouse goals),
adds coordinate/state names to queen and knight controls, retains challenge sessions across
Quiet Wing remounts, and awaits challenge writes before updates. Session/protected challenge
stores refuse updates until exported or resolved. Real-control regressions pass. The release
fixture now locates configuration after other globals, and keeps its disposable Chromium profile
short enough for Windows service-worker storage; all 18 two-release checks pass.
Challenge reads now wait for pending writes before remounting; the immediate-two-write regression
and focused independent review pass. Remaining backup-scope wording and Duel/Borough coordinate
labels are tracked in [#22](https://github.com/Chris0Jeky/Alibi/issues/22).

The remaining bundle inventory has been reconciled: all packs, challenge files, editorial JSON
and 17 venue/icon SVGs match the source; board/solution SVGs and the review studio are reference
material, and the sampler is for human playtesting. No required source payload remains unused.

This candidate does not certify human solve quality or the physical Android incident. Owner
checks remain in [HUMAN_TODO.md](../HUMAN_TODO.md). The original deployment identity is unchanged.

## Local integrated asset experience

`codex/asset-library` builds `a08ee0dba82d`, preserving the 116-puzzle definitions, engine and
save contracts. The produced asset families now have app bindings: Field notes at `#/quiet/folio`
offers 43 modules, three scenes, 32 companion expressions, 24 audio assets and eight film cuts.
Eight existing realm building types now use original library geometry. This pass also produces
four illustrated rooms, six distinct fictional club portraits, and three additional detail models.
The home invitation and Quiet Wing headers use the new imagery; actual companion actions use
the expression artwork while retaining animated 3D. Sounds are deliberate and stop on mute,
backgrounding and disposal. Single-file previews omit unavailable optional media explicitly.

Core offline pack: 1,259,087 bytes (103,722 fewer than the first asset pass); initial JS gzip:
111,373 bytes (15,891 fewer). The automatic optional wing is 2,189,871 bytes. Field notes has a
separate explicit 7,393,439-byte offline copy; films remain streaming-only. Existing budgets pass.
Source masters remain outside the distribution. Catalogue: 104 original designs/compositions,
80 reused designs and 331 derivatives. No push, deployment or new charges in this pass.

Verified: `npm run verify` (52 Node entries plus existing engine/storage contracts), 182 puzzle
controls, 106 Club controls, 156 Quiet Wing controls, 92 real-origin checks, 18 two-release update
checks, 40 Quiet Wing origin checks, 28 realm controls, 14 GPU/lifecycle checks, and 45 integrated
experience checks. Final desktop/phone-sized screenshots were inspected. Independent review's
single-file optional-media finding is fixed and regression-tested; its focused follow-up is clear.
Physical phones/TalkBack, auditory acceptance and external editor interoperability remain open.

See [EXPERIENCE-INTEGRATION.md](EXPERIENCE-INTEGRATION.md), the
[integration ledger](../assets-source/library/integration-ledger.json), and
[HUMAN_TODO.md](../HUMAN_TODO.md). The separate curation task owns `alibi-curation/` and
`.curation-worktrees/`; those inputs are preserved and are not part of this asset pass.

## First asset library pass (historical)

The first asset pass built `fac4d1d1ad6c` from the recorded 0.6.0 baseline. Twelve original
editorial vignette derivatives now illustrate selected puzzle cards; 31 distinct stamp silhouettes
retain the existing six Club and 25 Quiet Wing unlock predicates. Puzzle definitions, IDs, revisions,
engines and saves are unchanged. Zen hides decorative highlights; keyboard focus remains visible.
The reusable production library includes exact category/interface exports and lesson captures,
realm geometry and composed scenes, four layered companion state sets, locally synthesized audio
and authored HyperFrames films. These larger production assets stay outside the game build.

See [ASSET-LIBRARY.md](ASSET-LIBRARY.md), the machine-readable
[production ledger](../assets-source/library/production-ledger.json),
[coverage matrix](../assets-source/library/coverage.json) and
[catalogue](../assets-source/library/catalogue.json). Start `npm run assets:gallery` for the local
inspector on port 8790. All generation used local tools or unchanged existing assets; no new paid
submissions, purchases or credits were used. No push, PR, deployment or public publication is
authorized by this asset session. The hosted release section below describes the earlier release.

The local app passes verification, 182 puzzle UI checks, 106 Club checks, 156 Quiet Wing checks,
92 real-origin persistence/offline checks and 18 update checks. Source-library acceptance includes
actual controls, decoding, hashes, spoiler filtering, simulated mobile/desktop views and all 32
companion state previews. Final production checks and limits are recorded in the ledger.
Core offline pack is 1,362,809 bytes (+33,344); initial JS gzip is 127,264 (+2,126); optional Quiet
Wing is 1,977,995 (+51). Budgets were not changed, and core headroom is only about 340 bytes.
Auditory acceptance, physical phones/TalkBack, sustained device performance and external editor
interoperability remain unverified. [HUMAN_TODO.md](../HUMAN_TODO.md) stays open for those checks
and owner licence/name decisions. This local candidate does not certify the reported phone freeze.

## Hosted release 0.6.0

Build `f7c4ef0b6961` includes the source-integrated Quiet Wing, modular seeded city, animated
companions, four additional relaxing boards, expanded idle garden and three newly curated
museum artworks across Club, collection and conservatory. No published puzzle definitions,
public origins or database identities changed. PR #14 merged 30 incremental commits as `6696546`.
`npm run verify` passes; the visual-refresh suite passes 43 real-image/navigation/viewport checks.
Both final source CI runs passed at `8e76e23` (6m42s and 7m10s), with independent reviews and
the blocking backup-validation and ambiguous-storage-open findings resolved. Sites version 4
deployed successfully on 2026-09-08 at the original public origin. The actual installed-profile
upgrade from live build `134d93f3d854` preserved puzzle and Club town state, then reloaded offline.
See [RELEASE-0.6.0.md](RELEASE-0.6.0.md) for exact source, deployment, evidence and rollback details.
Physical-device gates remain in HUMAN_TODO.md; browser checks cannot certify the reported phone freeze.

Measured sizes: initial JavaScript 125,138 bytes gzip, core offline pack 1,329,465 bytes,
optional wing 1,977,944 bytes. Existing core/initial budgets pass; the optional 2,250 KiB budget
includes the renderer, models, three animated animals and museum assets. No runtime asset CDN.
Three Met originals and their public-domain records are retained under assets-source/atmosphere.
Adobe returned HTTP403, image generation failed connection, and AIC images challenged requests;
verified Met downloads supplied the final art without bypassing those services.

Residual review finding: [#15](https://github.com/Chris0Jeky/Alibi/issues/15), MEDIUM malformed
crop identifiers in hand-edited imports. Ordinary controls/saves do not create them. Physical
Android recovery, assistive technology and editor interoperability remain explicitly open.

Late review: combined backup parsing and all three section validators now run in the existing
25-second worker. Cabinet and Club validation share the same pure functions as normal reads;
the UI does not execute the optional activity merely to stage a backup. The browser regression
exercises successful staging, malformed input and a deliberately stalled worker with no writes.
The original real-origin recovery/update suite remains green. CI exposed an artwork test matching
the departing route's shared selector; destination-document visual checks now pass locally.
Additional MEDIUM preference, standalone-credit, slow-cache exit and unprimed offline combined
export findings are tracked in [#16](https://github.com/Chris0Jeky/Alibi/issues/16), with workarounds.
Ambiguous IndexedDB open failures, including timeouts, now remain protected instead of starting
a competing writable fallback. Only explicitly unavailable or denied IndexedDB can use the
existing fallback. Regression coverage verifies refusal, no fallback creation and exact recovery
of the original committed save after a successful retry.
CI reproduced a deferred garden image that never decoded on one Linux runner while the parallel
run passed. The single garden image now loads eagerly inside the already-lazy activity; its
browser decode assertion has a ten-second deadline and failure diagnostics. No optional activity
code or models are loaded on the cabinet by this change.

## Quiet Wing expansion (historical; superseded by 0.6/0.7 releases)

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

Road polish at `33ef49b1ea88`: shared paving follows neighbouring roads, gates and bridges,
with raised transitions to adjacent higher plots. Cliffs and row boundaries do not connect.
The new geometry regression, full verify, 28 city controls and 14 GPU/fallback checks pass.
Postcard inputs now have the same readable sizing and 44-pixel minimum as other touch controls.

## Quiet Wing source candidate (historical; superseded)

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

## Earlier follow-up inventory (historical; current release status above)

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
