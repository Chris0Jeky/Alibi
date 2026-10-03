# Gameplay result-retention recovery

Refs #418 and #556. This record distinguishes earlier evidence from the refreshed integration head; it does not claim physical-device acceptance.

## Implemented

Completed Tic-Tac-Toe, Lantern Duel and Lantern Gardens runs enter the existing idempotent, 100-record journal before replay, Next garden, or a finished seat/strength replacement. Save protection and strength validation still precede the write. The original level, score, seat and difficulty are retained. Incomplete runs still require confirmation. Replay retains keyboard focus; a new garden focuses its status.

Engine-routing and control-membership deduplication recover payload headroom without changing numerical byte ceilings. No content definition, revision, save schema or database version changes.

## Evidence ledger

| Source | Evidence | Meaning |
| --- | --- | --- |
| `cf77a14d606ed59eeb87073ec983a76255033965` | 71 targeted source tests; eight successful workflows; clean Codex review at 2026-10-03 01:03 UTC | Earlier reviewed branch, before integrating current main |
| Same source | Club result controls, run `37084307319`, artifact `11260316586` | Six actual-origin keyboard/focus/IndexedDB reload scenarios at 320, 390 and 1280 CSS pixels |
| `4cd90da91691977a5f2a8eaa479f232498a3f3b5` | Reconciliation run `37086645220`, artifact `11260956385`, clean `npm run verify` | Integrated main `98be800d0715a25695fe99480bb801fd30397220`; all runtime and test changes are byte-identical to the reviewed gameplay head |

Only additive `docs/STATE.md` conflicts were resolved. Both parent histories and every prior state-note line were retained. The one-shot branch reconciliation file was removed before committing. Its evidence archive contains the exact source SHA, Git tree, full verification log, build manifest and binary patch from the original snapshot. Archive SHA-256: `b59edc415c7382fac2c8cf0c013bc29bb6e55ec5f2f5f87e7af4611b5f86a95e`.

This document is the only addition after that verified integration commit. Refreshed full PR CI, the browser lanes, review and mergeability must be checked on its resulting head. Earlier green checks are not substitutes for those gates.

## Remaining work

Issue #418 retains the Cascade five-button action bar check at 320 by 640 pixels. This PR does not claim to fix that separate layout concern. Physical Android, TalkBack, real text scaling and other device checks remain under `HUMAN_TODO.md`. Browser emulation and source checks do not close those items.
