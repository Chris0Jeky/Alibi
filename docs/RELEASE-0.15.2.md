# 0.15.2: Paintings for your desk and games

## Published: 14 October 2026

This release brings the three optional Desk, Lantern Duel and Pocket Borough
paintings and the navigation/family pictograms from #656 to the existing primary
origin. All painting masters and derivatives remain preserved. Proposed source
vector studies stay outside runtime delivery.

Relative pictogram contours remain separate (#655), and the derivative command
can recreate missing or corrupt outputs from verified masters (#658), refusing
aliased output files. Six advanced Crime Scene variations join the existing
precached deferred file, recovering startup headroom without changing the codec,
byte ceilings, puzzle IDs/revisions or saved definitions. All 510 puzzles remain
available; 424 definitions are initial and 86 are deferred.

The primary [Cloudflare site](https://alibi-after-hours-preview.commit-atlas.workers.dev/)
serves version 0.15.2, build `ae20e9724548`, from clean merged source
`030d5812198507793154568532bc059d5700980f` (PR #659). The public
[v0.15.2 release](https://github.com/Chris0Jeky/Alibi/releases/tag/v0.15.2)
tags that source and supplies the complete portable zip, standalone HTML,
build-info, manifest, checksums and browser/publication evidence. All 16
uploaded attachments match their qualified sizes and GitHub SHA256 digests.

Startup is 203,127 against 205,248 bytes: 2,121 bytes of headroom. The shell is
1,406,272 against 1,412,792.32; deferred content is 11,490 against 12,288.
No ceiling, runtime codec, puzzle identity/revision or database version changed.

## Qualification and actual publication

The reviewed head `ae27963e07b3063cdd65827897eef9ca0158fa76` passed every hosted
control lane and the complete
[acceptance workflow](https://github.com/Chris0Jeky/Alibi/actions/runs/38499472374).
One independent fresh-context Sol review found no HIGH/CRITICAL blocker. The
Vault fixture now compares only deferred Vault entries, preserving all 80
studies; 801 actual-control checks pass at phone and desktop widths.

Serial full Windows verification at source `1c5b4624e7e54026d578ec353139ced0a3bcd574`
passed 1,510 Node tests, zero failures, three intentional filename skips,
581,847 Quiet Wing assertions and 29 contracts. After the test-only Vault fix,
the final and merged sources passed the clean web/Android payload build and
32 focused checks. The merged build passed UI187 and the full 16-scenario
actual-origin suite with 381 checks. All 48 painting hashes and 32 derivatives
reproduce; the missing/corrupt-output regressions fail with the prior script.

Cloudflare dry-run and deployment passed. Actual Worker version
`8ee83c79-94e8-4cd1-aa68-b31fecdd9a0a` serves all 301 public emitted files with
HTTP200 and exact SHA256 matches. Image/manifest MIME types, CSP, nosniff,
referrer/permissions headers and the unknown-path 404 pass. `_headers` is host
configuration, not a public response file.

A disposable primary-origin browser retained a real 0.15.1 Sudoku move while
the release deployed. Actual Check for updates kept the old build active;
another move and Save & update preserved both moves and the complete pinned
definition. Offline reload retained build `ae20e9724548` and the same save.

Hosted durability19, backup/restore32 and offline23 checks pass. The hosted
offline runner adapts only the local-copy feedback-message assertion to the
primary site's Send feedback sheet; no message is submitted. It proves an
uncached network request fails, saved moves persist, and the newly deferred
Scene plus Vault definitions load from the precached chunk. Hosted paintings
pass 24 checks across six fresh-profile scenarios: decoded 320px images,
actual compact controls, 503/cold-offline fallbacks, cached bitmaps offline
and the eight-entry cache cap. Phone/desktop screenshots were inspected.

## Collector and retained evidence

Pulseboard registration [#231](https://github.com/Chris0Jeky/Pulseboard/pull/231)
merged as `6f49ee7a1bba0b86aab341da7b3249085b605a1e`. The SDK remains 3.3.1,
artifact SHA256 `bab031c2059b084df53b593a02147b2acaacfd29b1c3f9543384eae7b6e22f93`.
Its authorized automatic
[deployment](https://github.com/Chris0Jeky/Pulseboard/actions/runs/38498704485)
published Worker `6b3b28f1-2fb0-48da-89a5-e8f20f9a05e4`; actual `/readyz`
returns HTTP200, ready:true, schema5 and Alibi admitted. No migration was
needed and no synthetic player event or feedback was submitted. Unchanged
Windows Bash fixtures could not execute locally; exact-head hosted collector
CI and deployment tests passed.

The complete current origin report is explicitly included in the release;
the generic packager's stale scenario list is tracked in #661. Worker and
release evidence is retained outside disposable worktrees under
`C:/Users/Cristian3/Documents/Codex/2026-10-14/alibi-evidence/artwork-0152`.
The published manifest/checksums identify every portable artifact and report.

The existing primary 0.15.1 Worker
`988c9f8b-5eb1-4325-83e8-4a6f7f2cbc40` is the retained rollback candidate.
No production rollback was executed. The retired Sites origin was not updated.
Physical Android/TalkBack, publisher and other owner conditions remain in
[HUMAN_TODO.md](../HUMAN_TODO.md). Browser evidence does not close those items.
