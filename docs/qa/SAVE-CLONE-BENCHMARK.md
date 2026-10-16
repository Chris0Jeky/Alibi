# Acknowledged-save allocation (#677)

Measured 2026-10-16 in the `alibi-677` worktree, based on
`77a6188f116ab860e7473cc0196e3e095a0dc07c`, with uncommitted changes.
Node v24.13.1, Windows x64, Intel Core i5-13600K. Tested `src/app.js` SHA-256:
`29cb4b3dd5e22611c383de1e3a3bf0a51fb5a444b4f62ca3b4f66406b8fd3d88`.

## Reproduce

```sh
node --expose-gc tools/bench-save.cjs
```

JSON goes to stdout; progress goes to stderr. The local raw receipt is
`tests/save-bench-results.json` (ignored). Run without concurrent builds/tests.
Each profile/strategy uses a separate process, 50 warmups and 500 saves. The
benchmark extracts the actual `enqueueSave()` and loads the actual `Store`, core,
engines, published definitions and run validator. It uses session-memory storage,
not simulated IndexedDB latency. It yields between timed saves. The fixed clock
and assertions check identical persisted JSON bytes across all strategies, full-row
acknowledgements, and isolation from subsequent player edits. Percentiles use
nearest rank; the median averages the middle two samples.

The **base** is a controlled ablation: remove only the acknowledgement assignment
from the current save path, keeping its validation and two earlier clones. This
matches the save-path allocation before #617 (`0305c2e0^1`), rather than running
an entire older app with unrelated storage differences. **JSON** reproduces #617's
`C.clone(saved)`; **structured** substitutes `structuredClone(saved)`; **serialized**
is the implemented `JSON.stringify(saved)` snapshot. No UI/reducer work, DOM,
disk, IndexedDB serialization, cross-tab scheduling or browser rendering is timed.

## Fixtures and scope

All data is synthetic and checked by `validateRun()`.

| Profile | Loaded saves | Active row | History and notes |
| --- | ---: | ---: | --- |
| Fresh | 1 | 1,168 B | Published 4x4 Sudoku, 10 real pencil edits, empty journal note |
| Heavy | 100 | 166,070 B | Published `curated-sudoku-04` (9x9), dense candidate notes, 100 undo, 1,000-character note on each loaded row |
| Ceiling | 3,000 | 332,769 B | Same dense active puzzle, 100 undo + 100 redo, 5,000-character note; 2,999 dormant fresh-size saves with distinct synthetic puzzle IDs |

The dense Sudoku was the largest supported candidate-note state in the supplied
number-note puzzles; a separate scan including initial states of all families and
fully populated scene candidates also selected it as the largest history-dominated
published row. History snapshots are independent objects produced around real
reducer edits. The validator permits 100 undo plus 100 redo on import; ordinary
new edits in the UI retain 80 undo entries. The ceiling is an import stress case,
not a claim that the UI normally creates that history.

The loaded cohorts contain about 1.17 KB / 16.61 MB / 3.84 MB of JSON, respectively.
The ceiling cohort tests the 3,000-run import limit and the largest active row
together; it is **not** 3,000 maximum-size rows. Neither imported definition size
nor all possible player-created catalogues have a single universal maximum here.
For scale, 3,000 copies of the tested largest row would alone contain about 998 MB
of JSON; that extrapolation was not allocated or measured. This benchmark does
not change history/import limits or evict acknowledged rows.

## Save completion

Times include both earlier clones, the actual Store validation/revision write,
promise queue and acknowledgement. Values are median / p95 milliseconds per save.

| Profile | Base: no ack | #617 JSON clone | structuredClone | Implemented JSON string |
| --- | ---: | ---: | ---: | ---: |
| Fresh | 0.049 / 0.118 | 0.059 / 0.120 | 0.067 / 0.147 | 0.076 / 0.138 |
| Heavy | 4.841 / 7.278 | 5.669 / 8.767 | 6.027 / 8.913 | 4.806 / 6.722 |
| Ceiling | 7.983 / 9.399 | 10.258 / 13.547 | 12.078 / 15.728 | 9.116 / 10.623 |

Tiny fresh saves are near the measurement noise floor. Separate processes and GC
timing can even put a candidate below the base; subtracting those totals is not a
reliable isolated acknowledgement cost. The next table measures that operation
directly on the same saved row, including replacing its map entry.

| Profile | JSON clone median / p95 ms | structuredClone median / p95 ms | JSON string median / p95 ms |
| --- | ---: | ---: | ---: |
| Fresh | 0.009 / 0.017 | 0.014 / 0.026 | 0.007 / 0.009 |
| Heavy | 1.097 / 2.066 | 1.677 / 2.894 | 0.567 / 0.886 |
| Ceiling | 2.250 / 3.507 | 3.320 / 4.183 | 1.213 / 1.694 |

## Heap and long-task proxy

Retained ack heap is the difference after forced GC immediately before/after
populating the ack map for the loaded cohort. Fresh deltas are below 8 KiB of GC
noise (including slightly negative readings), so no exact fresh saving is claimed.
Sampled peak heap is the highest `heapUsed` observed **after** a timed save, not a
guaranteed transient peak. It includes the loaded records and benchmark fixtures.

| Profile | JSON ack retained MiB | Structured ack retained MiB | String ack retained MiB | JSON / string sampled peak MiB |
| --- | ---: | ---: | ---: | ---: |
| Fresh | <0.008 | <0.008 | <0.008 | 10.58 / 10.49 |
| Heavy | 81.400 | 81.957 | 15.858 | 235.31 / 172.26 |
| Ceiling | 14.950 | 19.482 | 3.809 | 111.36 / 116.59 |

No strategy/profile had a save exceeding 50 ms on this host. These are per-save
duration counts, **not browser PerformanceObserver long-task entries**. At 16.67 ms,
the ceiling had 4/500 over-budget saves with JSON clone, 17/500 with structuredClone,
and 0/500 with the string. Heavy structuredClone had 1/500; all other cohorts had
0/500. GC scheduling explains why reduced retained memory need not reduce every
sampled peak.

## Explicit budget and low-end estimate

Assumption: a low-end device takes **6x** this desktop's synchronous CPU time.
Reason: a deliberately stated sensitivity estimate without an attached Android
device. Reversible by substituting a measured device ratio and rerunning the
benchmark. It is not a calibrated hardware or Android prediction.

The acknowledged snapshot's target budget is **10% of a 60 Hz frame**: 1.667 ms
at the estimated device speed, or 0.278 ms desktop p95 under this assumption.
The measured work stays bounded to one full-row serialization per successful save,
and one immutable serialized row per loaded acknowledged key. The following are
the measured envelopes, not hard timing/memory guarantees or a new save refusal.

| Profile | Estimated ack p95, old -> new | Share of 16.67 ms frame, old -> new | Estimated new total save median / p95 |
| --- | ---: | ---: | ---: |
| Fresh | 0.102 -> 0.054 ms | 0.6% -> 0.3% | 0.456 / 0.828 ms |
| Heavy | 12.396 -> 5.316 ms | 74.4% -> 31.9% | 28.836 / 40.332 ms |
| Ceiling | 21.042 -> 10.164 ms | 126.3% -> 61.0% | 54.696 / 63.738 ms |

Heavy and ceiling rows still exceed the 10% target. Their whole save paths may
miss frames under this estimate; this change is not a claim of smooth low-end
play. Keep those fixtures and the target in future save-path comparisons. Physical
Android timing, browser long tasks, IndexedDB commit completion and Android heap
remain unmeasured. Owner acceptance remains in [HUMAN_TODO.md](../../HUMAN_TODO.md).

## Decision and verification

The cost is material. Keep the two ownership clones and replace only the private
acknowledged object tree with its immutable JSON string at load, broadcast and save.
Backup export compares the complete serialized local/persisted row with that string,
which is the same equality representation `C.equal()` already used. No revision-only
shortcut, storage format, CAS rule, backup format or database version changes.
Compared with #617's clone, acknowledgement p95 falls 57% for heavy / 52% for ceiling,
and retained ack heap falls 81% / 75%. structuredClone loses on time and retention.
Reusing mutable session-memory rows would risk corrupting the baseline; no ownership
API change or special persistent-only branch is needed for the string reduction.

Proof in this worktree:

- New byte-equivalence/immutable-ack regression and adapted representation assertions
  failed before the change (11 failures in the 18-test focused run), then passed.
  Tests include escaped/Unicode notes and 0/10/100 undo plus redo entries. Existing
  same-revision restore, failed-CAS and mutation-during-save tests remain green.
- `node --test tests/storage*.test.cjs tests/app-cabinet-export.test.cjs tests/app-broadcast-revision.test.cjs tests/backup-validation.test.cjs tests/completion-hooks.test.cjs`: **102 pass**.
- `npm.cmd run build` and `npm.cmd run format:check`: pass. The web artifact is
  explicitly marked dirty-source. No runtime UI changed.
- `PYTHONUTF8=1 ALIBI_URL=http://127.0.0.1:51767/ py -3 tests/browser_origin.py`:
  **599 checks pass**, real IndexedDB/service workers/disposable Chromium profiles,
  including backup export races at phone and desktop widths. Local server stopped.
- `npm.cmd test`: refused by its clean-source/missing-Android-artifact preflight.
  No commit/stash/reset was used to bypass the requested uncommitted state.
- `npm.cmd run test --ignore-scripts`: **1,599 tests; 1,583 pass, 3 skip, 13 fail**.
  Twelve failures require missing Android artifacts or a clean Android build source.
  One detected the changed app source hash in the asset catalogue; its 13 app-source
  receipts were refreshed, and `node --test tests/asset-catalogue.test.cjs` now passes
  both tests. Other asset receipts are unchanged. The full expensive suite was not
  repeated for that metadata-only correction; the remaining 12 artifact failures
  are unresolved in this intentionally uncommitted worktree.
- The chained Quiet Wing suites were run separately: engines **581,856 assertions**,
  contracts **43 assertions**, both pass.

No commit, push, deployment or physical-device acceptance was performed. This issue
does not address #636's dialog lifetime retention.
