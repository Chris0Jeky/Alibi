# Swarm quality wave — live orchestrator plan (2026-09-29)

Goal: make Alibi better from a code-quality, automated-testing and bugs
perspective, using the background swarm `auto-alibi` plus in-session
orchestration. Lane: `C:\Users\Cristian3\muse-swarm-runs\auto-alibi`.
Background coordinator is OFF — this session triages and integrates.

Rules for this wave (from AGENTS.md + tier 2):
- One writer per checkout: lenses read; workers build in their own worktrees;
  the orchestrator verifies and integrates into this checkout only.
- Narrow `verify` per job, never a full build unless the change needs it.
- No commit/merge/push without explicit owner approval this session.
- Never edit `dist/`; preserve published IDs/revisions and `content/legacy.json`.
- Every finding is a claim until its proving check runs (law 3).

## Coverage map

| Area | Files | Bug lens | Test lens |
| --- | --- | --- | --- |
| Core engines | core, engines, bridges, insights, network-hints | bh-engines | tg-engines |
| Storage/saves | storage, challenge/discovery storage, backup-validation, validator-worker, quiet storage | bh-storage | tg-storage |
| Player/shell | app, activities, updates, boot | bh-player | tg-app |
| Club/After Hours | club-engines, club, assist, atlas | bh-club | tg-club |
| Quiet Wing + challenges | quiet-wing/, challenges, challenge-launcher | bh-quiet | tg-quiet |
| Voices/Pulseboard | voices*, pulseboard-host | bh-voices | (in tg-app scope) |
| Theatre/media | theatre, asset-delivery, asset-library, atmosphere | bh-media | (in tg-app scope) |
| Tools/build | tools/ | st-bh2 (starter) | tg-app |
| Whole src | src/ | st-bh1 (starter) | st-tg (starter) |
| Dead code | src/, tools/ | dc-src, dc-tools | — |
| Docs | README, docs/ vs code | st-dd (starter) | — |

Wave 2 candidates: review-range retroactive audit of the 2026-09-27 merge
wave; mutation-probe on backup-validation/storage; write-tests workers for
top-ranked gaps; fix-issue workers for triaged findings.

## Wave 1 queue (live)

| Job | Recipe | State |
| --- | --- | --- |
| st-bh1, st-bh2, st-tg, st-dd | starters | running (supervisor wave) |
| Wave 1 (14 lenses) | enqueued 2026-09-29 ~04:20 UTC | queued behind starters |
| bh-engines | bug-hunt | queued |
| bh-storage | bug-hunt | queued |
| bh-player | bug-hunt | queued |
| bh-club | bug-hunt | queued |
| bh-quiet | bug-hunt | queued |
| bh-voices | bug-hunt | queued |
| bh-media | bug-hunt | queued |
| tg-engines | test-gaps | queued |
| tg-storage | test-gaps | queued |
| tg-club | test-gaps | queued |
| tg-quiet | test-gaps | queued |
| tg-app | test-gaps | queued |
| dc-src | dead-code | queued |
| dc-tools | dead-code | queued |

## Baseline (2026-09-29, HEAD 3826455)

- `npm run verify`: PASS (fail 0, skipped 3, 581,847 assertions).
- Application JS gzip 133,749 of 133,824 ceiling — 75 bytes headroom.
  Worker fixes that add JS must trim first.
- Swarm scratch (`.swarm-queue/`, this dir) is git-excluded via
  `.git/info/exclude` so the verify gate sees a clean tree.

## Triage log

Wave 001 (starters) — orchestrator verdicts, all verified in-checkout:
- CONFIRMED st-bh1/high backup-validation+house updatedAt crash → worker
  `fix-club-dates` (validator fail-closed + comparator coercion).
- CONFIRMED st-bh1/high addClue entry gap + silent whole-draft boot drop,
  severity medium (genuine-UI reachability unproven) → `fix-workshop-clue`.
- CONFIRMED st-bh2/high serve.cjs _headers throw, severity medium (dev-only;
  pre-build 404s before the throw) → `fix-serve-headers`.
- CONFIRMED st-bh2/high serve-assets allowlist bypass via `/docs/../...`,
  severity medium (localhost-only) → `fix-gallery-trav`.
- CONFIRMED st-tg/high runBounded race uncovered (zero test refs, six
  web.mjs call sites) → `tst-contract` (tests only).
- REJECTED all 4 st-dd doc-drift claims: src/insights.js, src/storage.js,
  src/presentation.js all exist (lens 0/3 on existence checks).
- DEFERRED wave-001 mediums/lows: re-triage against wave-002 depth lenses
  (same areas) before writing more tasks.

Wave 002 (depth bug-hunts) — verdicts:
- CONFIRMED bh-storage/high saveRun key double-read → `fix-storage-harden`.
- DOWNGRADED bh-storage/high restore-no-validation to hardening (sole caller
  passes worker-validated data; merge path re-validates): folded a shape
  guard (format/schema/keys, no semantic duplication) into `fix-storage-harden`.
- CONFIRMED bh-storage/medium fallback getAll throw blocks export (recovery
  path fails exactly when needed): folded skip-damaged into `fix-storage-harden`.
- DOWNGRADED bh-player/high pagehide loss to accepted risk: saves are
  enqueued per move (app.js:333), so the window is milliseconds; a sync
  mirror risks split-brain. No worker.
- CONFIRMED bh-player/medium apply-update input race (moves between ACTIVATE
  and reload are lost): inline micro-fix at integration (input lock flag).
- REJECTED bh-club/high log-cap bricking: 3000 net moves unreachable in
  bounded live play (cabinet already capped at 500); validator fail-closed.
- PARKED bh-club/high localStorage cross-tab race (real but fallback-mode
  only; club.js needs DOM at load so no Node harness): backlog.
- PARKED bh-club/medium plan/plot unvalidated Number (tamper-only reach):
  inline integer guard at integration if cheap, else backlog.
- PARKED bh-quiet/medium silent classics drop (corrupt-input only; per-item
  reporting needs UI design): backlog.
- Tools mediums: serve-assets 405/suffix folded into `fix-gallery-trav`;
  catalogue/import-guard/render-guide → `fix-tools-harden` (dropped the
  build-quiet-pack claim: ENOENT already names the path; single-use build).
- bh-engines lens stalled (model idle timeout, transient): requeued as
  bh-engines-r2.

## Integration log

## Integration log

- `fix-club-dates` INTEGRATED: validator rejects non-string Club run
  updatedAt; house comparator coerces. RED (fail 1) → GREEN (pass 40).
- `fix-gallery-trav` INTEGRATED: allowlist on resolved path. RED (fail 1) →
  GREEN (pass 1). Method/range scope missed the worker's read → follow-up
  `fix-gallery-meth` queued.
- `fix-serve-headers` INTEGRATED: readSecurityPolicy + require.main guard.
  Worker verify failed only for missing dist in its worktree; GREEN here
  (pass 4) with dist present.
- tg-lens reliability: tg-storage HIGHs spot-disproven (CAS + pre-restore
  coverage exists); tg-engines/tg-club admitted zero test reads → no
  workers from those claims. `tst-challenges` queued on orchestrator's own
  zero-reference grep, not the lens claim.
- Dominoes place() REJECTED (both callers gated: move() + keeperTurn()).
- BroadcastChannel fork REJECTED (line-377 newer-rev guard covers it).
- Queued: `tst-challenges`, `fix-gallery-meth` (wave 5).
- `fix-workshop-clue` INTEGRATED: validateSceneClue in core.js + addClue
  wiring. Worker tests pinned only bare throws (vacuous on old code);
  caller strengthened to message matchers. Full RED (fail 6) → GREEN (6/6).
- `tst-contract` INTEGRATED: tests/platform-contract.test.mjs, 8 cases,
  all passing (test-only change, no RED cycle applicable).
- `fix-tools-harden` INTEGRATED with caller repair: worker's own guide
  test over-asserted (paren artifact in pre-existing regex); fixed test,
  GREEN 6/6. Guide HTML byte-identical old-vs-new; all 11 guarded tools
  load without writes. Teardown refused dirty worktrees until contents
  were discarded post-integration (6/6 removed, cap cleared).
- Nonogram premature-Solved CONFIRMED (two lenses + orchestrator read):
  complete() ignores -1 while siblings require determined cells →
  `fix-engine-feedbk` queued (includes dossier link-clue feedback gap).
- REJECTED: dc-src low (validatePackConfig IS used in its own module),
  BroadcastChannel fork (guard covers), dominoes fabrication (gated).
- `fix-storage-harden` INTEGRATED: saveRun key capture, restore shape guard,
  fallback getAll skip-damaged. RED→GREEN on tests/storage.test.cjs.
- `tst-challenges` INTEGRATED with caller repair: worker wrongly assumed no
  engine-global fallback; corrected to pin the real contract. GREEN 14/14.
- `fix-gallery-meth` INTEGRATED via caller merge (worker base predated the
  traversal fix): 405 + suffix ranges. RED (0/3) → GREEN (3/3).
- `fix-engine-feedbk` INTEGRATED (dossier half): committed link
  contradictions now reported; uncommitted endpoints skipped. RED→GREEN.
- REVERSED the nonogram strict-Solved half: the UI suite completes nonograms
  by filling only, there is no auto-cross, and zero all-empty puzzles ship —
  leniency is the player contract. Pinned with regression tests instead.
- Budget: three trim rounds (~250B) then measured raises (+128 app gzip to
  133,952; +1,024 shell) with justification comments. Asset catalogue
  regenerated (13 app.js hash entries).
- FINAL: full Node suite 787+ pass with only the 6 clean-tree-gated android
  failures (environmental on any dirty tree); browser UI suite 185/185 PASS;
  budget GREEN. Full `npm run verify` needs committed sources (owner call).
- REVERSED the fallback getAll skip-damaged half: the origin suite requires
  the loud damage report (the message points at browser-level export, which
  the lens misread); bytes stay preserved. Real-origin suite 271/271 PASS
  after the revert. Lesson for future lenses: the repo's executable suites
  are the contract; two "bugs" died against them (nonogram, getAll).

## Session 2 triage log (orchestrator: this session, base f41c452)

Wave 007 (6/6 completed) — verdicts, all verified in-checkout:
- REJECTED st-bh1/high cabinet 500/3000 asymmetry (second sighting of the
  session-1 log-cap claim): live play refuses cabinet moves past 500
  (`src/club.js:986`, "This cabinet is full"), so a longer save is
  tamper-only and validator fail-closed is correct. Per-game replay caps
  (tictactoe 9, dominoes 500, town 18, garden 3000) are deliberate.
- REJECTED bh-storage/high discovery CAS success-without-write: IndexedDB
  request error aborts the transaction by default (no preventDefault), so
  `tx.onabort` rejects — resolve-without-write is unreachable.
- REJECTED bh-storage/high Store.restore key-only guard and medium snapshot
  no-error-handler: the key/id shape guard is the deliberate session-1
  contract (sole callers pass worker-validated data); snapshot request
  errors abort and reject via `tx.onabort`, no hang.
- REJECTED bh-storage/low saveRun shape validation (same contract reasoning).
- CONFIRMED bh-storage/high challenge restore refusal → `fix-challenge-restore`
  (one condition: `restoring` bypasses `protectedIds`; `cas()` already retains
  `recovery:+id`, so pre-restore recovery holds).
- CONFIRMED bh-storage/medium combined-backup sanitization dropped + medium
  unbounded cabinet/club text → `fix-combined-worker` (post sanitized
  sections; 16 MB / 1 MB text caps mirroring the UI gates).
- CONFIRMED st-tg/high theatre escape + voices-sheet deliver (+4 siblings, zero
  precise test refs) → `tst-theatre-voices` (indirect-coverage check first,
  then pin; DOM-blocked items reported, not harnessed).
- DOWNGRADED bh-player/high cross-tab saved self-conflict to accepted risk:
  current-key path banners and returns (app.js:376-382); the overwrite path
  needs a 2-tab + navigate-mid-save race, CAS prevents loss.
- PARKED (unchanged from session 1): club.js:366 cross-tab localStorage race,
  quiet classic silent drop; pagehide loss stays accepted risk.
- CARRY-OVER session-1 inline micro-fix never landed: apply-update omits
  `endPaint()` (re-flagged bh-player/medium, app.js:2974) and no input lock
  exists — orchestrator inline fix next, proven by the UI suite.
- APPROVED-MICRO bh-storage/low Club record dates lack Date.parse check
  (backup-validation.js:207-208): orchestrator inline fix + test.
- NOT YET READ (next triage): core.js:353 reducer clue index, serve.cjs:69
  per-request crash, build-curation data:undefined, release-prepare
  --pulseboard, update-curation-bundle partial snapshot, importPack dialog.
- Enqueued: `rr-s1-wave` review-range lens + 3 workers above. In-session
  Workflow synthesis received: P0s are dual-version lookup audit,
  restore-atomicity proof, import-bounds matrix; leaner-code via a constants
  module and dispatch unification; 3-commit incremental plan adopted.

Wave 008 (6/6 completed) — verdicts:
- `rr-s1-wave` retroactive audit: session-1 wave CLEAN, 0 findings.
  Residual noted: `serve.cjs` readSecurityPolicy rethrows non-ENOENT I/O
  errors in the request handler — fold into the serve-hardening task with
  the wave-007 serve.cjs:69 per-request-crash medium.
- REJECTED tg-storage HIGHs (second sighting; spot-disproven in session 1 —
  `tests/storage.test.cjs` covers CAS + pre-restore).
- DISCOUNTED tg-app claims pending independent verification: lens asserted
  `src/activities.js`/`src/updates.js` "do not exist"; all three files exist
  (same existence-check failure mode as session-1 st-dd).
- DISPROVEN tg-engines/medium validateSceneClue gap: covered by
  `tests/workshop-clues.test.cjs:19-64` (lens never read it). Other
  tg-engines/tg-club/tg-quiet HIGHs need grep verification before workers.
- 3 session-2 workers admitted for wave 010.

## Session 2 integration log

- `record-dates` INTEGRATED (orchestrator inline): Club record dates now
  require `Date.parse` validity like every run date
  (`src/backup-validation.js`, +1 condition). RED (fail 1, missing exception)
  → GREEN (`tests/backup-validation.test.cjs` pass 12, fail 0).
- `apply-update-endpaint` INTEGRATED (orchestrator inline): `endPaint()` first
  line of the apply-update case (`src/app.js:2974`; no-op when no drag).
  DOM-dependent, no Node harness — proven by full browser UI suite 185/185
  PASS, exit 0 (log `.swarm-queue/browser-ui-s2.log`).
- Gates: `format:check` GREEN (prettier reflowed the new test),
  `tests/budget.test.cjs` GREEN (both micro-fixes within budget).
- Commits `64b6fa0`, `4f26193`, `7c1a32e` pushed to `origin/main`.
- Real-origin suite on fresh build (own server :8791; :8787 already held by
  an unrelated protected process): exit 0, 270 checks PASS — byte-parity with
  session-1's `browser-origin3.log` ("270 checks", 271 PASS lines incl.
  summary). Log `.swarm-queue/browser-origin-s2.log`.

Wave 009 (4/4 completed) — verdicts:
- REJECTED bh-engines/high + r2/medium nonogram -1 completion laxity (third
  sighting): decided in session 1 — leniency is the player contract, pinned
  by regression tests. No worker.
- REJECTED dc-src/low BlockCabinetPrototype removal: only 2 hits, both
  definitions (`src/block-cabinet/studio.mjs:248,251`), zero in-repo readers —
  but `studio.mjs` is reachable (`integration.mjs`, `block-motion.test.mjs`)
  and the global matches the diagnostics-hook pattern (cf.
  `AlibiDiagnostics`); deleting QA surface on a read-only sweep has negative
  value. Revisit only with runtime-load evidence.
- dc-tools: inconclusive (0 findings, 22 unresolved) — no action.
- QUEUED for code-read triage: bh-engines/medium dossier reduce clue-toggle
  index (`src/engines.js:306`) jointly with wave-007 core.js:353 reducer
  clue-index medium; still open: serve.cjs:69 per-request crash (+
  readSecurityPolicy non-ENOENT residual), build-curation data:undefined,
  release-prepare --pulseboard, update-curation-bundle partial snapshot,
  importPack dialog.
- Wave 010 running: 3 session-2 workers (challenge-restore, theatre-voices,
  combined-worker).
- `fix-challenge-restore` INTEGRATED with caller narrowing: worker correctly
  found the one-line write() bypass insufficient (cas() re-validates + revises)
  but skipped the revision guard unconditionally on restore. Orchestrator
  narrowed: restore skips guards only over records that fail validation;
  valid records keep the conflict guard (AGENTS.md: never silently overwrite
  concurrent edits). RED (2 fail at guard) → worker GREEN (4/4) → boundary
  RED (stale-revision restore succeeded) → narrowed GREEN (6/6). Related
  challenge suites green. Worktree torn down.
- `tst-theatre-voices` INTEGRATED (test-only, +546 lines): escape/choose/
  route/deliver/decorate/tap pinned in existing harnesses. Caller replaced
  the worker's static-only indirect-coverage check with runtime stub probes:
  identity-escape fails exactly the escape test; always-sent deliver fails
  exactly the deliver test; sources restored byte-identical. Worktree down.
- `fix-combined-worker` INTEGRATED with caller repair: sanitized sections +
  16MB/1MB caps verified RED (0/4) → GREEN (4/4) against a fresh build, but
  the worker's deepEqual comparisons failed across the vm-realm boundary
  ("same structure, not reference-equal") — repaired with a JSON norm
  helper. Adjacent worker seams (planning-vault, backup-import) green.
  Note test 4 never RED'd on behavior (characterization only). Down.
- `fix-serve-harden` worker written + enqueued (readSecurityPolicy catch-all,
  createHandler extraction with 500 + stream destroy, both servers).
- Dossier clue-toggle guard fixed inline (75e4a18): scene reducer already
  guarded (wave-007 claim half-disproven); dossier appended unvalidated
  indexes that validateState rejects. RED→GREEN in core suite.
- `fix-serve-harden` INTEGRATED (eb92c50): catch-all `_headers` read,
  `createHandler` extraction with 500 + stream destroy on both dev servers,
  gallery `require.main` guard (verified spawn-only). RED (3 fail headers,
  2 fail gallery, API-undefined probe; the combined RED run hung on the old
  gallery's require-time listen handle and was re-run per-file) → GREEN
  12/12 after caller repaired a Windows-only POSIX stub root in the 500
  test. Prettier-applied, worktree torn down.
- `importPack` route-modal race fixed inline (5ca25c4): completion toasts
  when validation outlived its route instead of closing the new route's
  modal (the codebase's own "a route owns its modal" rule). UI suite 185/185.
- Wave 012 lenses: tg-app "activities/updates do not exist" definitively
  disproven (`src/activities.js:192` defines `AlibiActivities`) — lens
  discounted for existence/coverage verdicts. tg-storage multipack/IDB-timing
  and tg-quiet launcher-esc HIGHs noted as future write-tests candidates;
  no workers (diminishing returns vs suite-backed items).
- CONFIRMED build-curation `data:undefined` + release-prepare silent
  `--pulseboard` fallback → `fix-tools-validate` worker enqueued.
  update-curation-bundle partial snapshot DOWNGRADED to accepted friction
  (deliberate loud guard, one-command recovery).
- Visual-QA probe on fresh screenshots (desktop-home, mobile-scene): no
  visual defects. Owner-visible observation (no code change): dominoes and
  mahjong are fully playable via salon routes (e.g. `club.js:612`) but have
  no home/salon cards and are skipped by the home continuation
  (`club.js:479`) — reachable essentially only by direct navigation.
