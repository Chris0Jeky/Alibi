# Curation Cabinet 0.7.0

Published to the Cloudflare primary on 2026-09-09:
**https://alibi-after-hours-preview.commit-atlas.workers.dev/**.
The existing **https://alibi-puzzle-club.jeky-tck.chatgpt.site/** remains the fallback.
The owner selected these roles explicitly; neither origin was renamed or redirected.

## Changed

- 208 new core puzzles in thirteen bounded official packs: 324 total, preserving the original
  116 definitions and legacy fixtures. Global IDs are checked without raising user-import limits.
- 59 separate challenges with fixed starts, deterministic replays, guarded givens/prefixes,
  compatible saves and atomic pre-restore recovery. Session retention, update flush and queued
  reads preserve progress across navigation. Duel objectives and occupied-goal display are fixed.
- Trusted editorial/artwork registries, pure network hints, corrected copy, provisional difficulty
  and honest unknown timings. Four Met Open Access images carry actual hashes and credits.
- Final asset library through `3dddb47`: illustrated rooms, portraits, models, companions,
  deliberate audio and optional films. Earlier film footage is explicitly dated.
- All delivered payloads are accounted for. Board/answer SVGs and the review studio remain
  reference assets; the unavailable Monet candidate has no fabricated download or placeholder.

## Verified

Source merge: `ad284c74e80b8504d5831f4c277db93b3540857d` ([PR #19](https://github.com/Chris0Jeky/Alibi/pull/19)).
Version `0.7.0`, build `447f3b3b8ddc`, 246 emitted files. Final source checks:
[branch CI](https://github.com/Chris0Jeky/Alibi/actions/runs/34338833283) and
[PR CI](https://github.com/Chris0Jeky/Alibi/actions/runs/34338837940), both successful.
Independent broad reviews and focused save-fix reviews found no remaining blocking defects.

Full repository gate, independent 324-puzzle uniqueness/native replay, all 59 challenge replays,
original/new family controls at phone/desktop widths, real controls for challenges and media,
92 persistence/offline checks, 18 two-release update checks, Quiet Wing recovery, and local
two-browser rooms pass. Final screens were inspected. These are browser tests, not physical phones.

Cloudflare Worker version: `f69a51d1-d410-450f-859e-c9716093f482`. Its HTTPS origin passes 92
persistence/offline checks and 66 curation checks. The actual scripts/styles, manifest and worker
match local SHA-256 values; hosted challenge controls also pass at phone/desktop widths. Scripts/styles
are served with CSP. CLI HTTP requests were refused by provider protection;
the successful file verification used ordinary Chromium navigation and same-origin fetches.

Initial code plus official content: 138,766 bytes gzip. Core offline files: 1,858,361 bytes.
Optional wing: 2,279,683 bytes; explicit Field notes offline media: 7,393,439 bytes.
Films remain on demand. No online room service, account or remote player-data store is enabled.

## NOT verified

No physical Android/TalkBack pass, affected-phone freeze resolution, human puzzle calibration,
auditory acceptance, sustained performance or external editor interoperability is claimed.

## Residual risk and recovery

[HUMAN_TODO.md](../HUMAN_TODO.md) retains all human gates. Challenge backup-scope wording and
Duel/Borough coordinate labels remain in [#22](https://github.com/Chris0Jeky/Alibi/issues/22);
explicit-unavailability and abandoned-open handling remain in [#23](https://github.com/Chris0Jeky/Alibi/issues/23).
Earlier tracked issues remain separate from this delivery. No source reuse licence was granted.

Each origin has separate browser data. Before moving, export cabinet, Club and Quiet Wing sections,
plus each challenge to retain, then import at the destination. Keep the source backups and old
installation until verified. Do not clear site data to fix a freeze. A file rollback does not
reverse IndexedDB or immediately replace an installed service worker.

## Fallback receipt

Sites version 5, `appgprj_6a9f4fc7b5cc8191be66defcdccd366b~appgver_86a240970c0881918d2149cfb2dcc148`,
deployed successfully as `appgdep_6aa13d7fe6f0819188d9c7efa8186f04` from the same source/build.
The source gateway rejected the large history upload; serial fast-forward uploads of existing
commits completed successfully before version saving. No intermediate source state was deployed.
The saved archive hash is `c51f979e92ded8f502525b77b6deffff0d52f7c7f75569dca0f72c92200a6ad5`.

The actual installed-profile upgrade from live 0.6.0 (`f7c4ef0b6961`) preserved a real puzzle
move and its pinned definition before/after Save & update, then reloaded offline with that run
intact. It used a disposable short-path Chromium profile, never the user's browser profile.
All 92 fallback HTTPS persistence/offline checks also pass.
Sites retains its previously documented provider header/MIME limitations; Cloudflare is primary.

Cloudflare prior version `fc8d2d00-7552-4aeb-b507-66bc1e84fcaf` and Sites version 4 remain rollback
references; rollback was not executed. The versioned bundle and release evidence are retained in
`alibi-curation/` on the coordinator machine. Git source and this receipt are available to future
agents and sessions through the repository.
