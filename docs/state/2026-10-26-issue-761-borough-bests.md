# Issue #761 follow-up: bounded Pocket Borough personal bests

## Scope and decision

This follow-up stores Pocket Borough personal-best rows separately from the capped 100-entry
journal so later games cannot erase a retained best. The table is optional (`boroughBests`), capped
at the 100 highest-scoring distinct exact labels, and shown as a local save record rather than a
verified leaderboard. A better result replaces the row for its exact label; a worse result cannot
lower it. Equal scores keep the lexicographically earlier raw date, and rows with equal scores are
ordered by exact label. The profile describes the cap and now calls the journal count “town records
in journal.” A retained best also keeps the Town planner stamp visible.

The key is the exact existing Borough record label. No new seed normalization, parsing rule, or
completion counter is introduced. This preserves every field value accepted by the pre-existing
journal validator: labels up to 100 characters (including empty, escaped, mixed-case, or arbitrary
text), any finite score (including negative, fractional, and values above 600), and bounded raw date
strings up to 40 characters. Migration derives rows only from currently retained Borough records;
it does not claim to recover already-pruned history. Existing saves without `boroughBests` remain
valid, and validation still clones unknown top-level fields unchanged.

Three approaches were considered. Expanding the journal cap would retain more records but would
change the existing journal limit and offline storage footprint. An unbounded best table would
preserve every distinct label forever but has no storage bound. The chosen separate table preserves
the requested local bests with a clear 100-row bound; after more than 100 distinct labels, lower
scores can be evicted permanently. Different seeds may not be comparable, so the page makes no
global or cross-seed ranking claim. User-edited/imported values remain local save data and are not
verified game outcomes.

## Changed

- Added `boroughBests` to runtime state, startup migration, completion updates, and both Club restore
  preparation paths. Confirmed restores normalize the table before persistence.
- Added strict optional backup validation: at most 100 rows, exact `{label, score, date}` shape,
  unique exact labels, the existing label/date bounds, and finite scores. Legacy saves without the
  field remain loadable.
- Switched the Pocket Borough profile table to the durable rows and kept Town planner visible when
  only a retained best remains.
- Added Node regressions for improvement/worse-result behavior, journal pruning, old-save migration,
  review/confirmed import and reload, top-100 ordering, label/date/score compatibility, malformed
  field rejection, escaping, and profile/stamp rendering.
- Extended the synthetic real-browser Tic-Tac-Toe fixture to check that its synthetic score-600
  Borough row survives pruning and offline reload. The fixture is synthetic and does not represent
  human play.

## Verified

- Before correcting the implementation, the new compatibility regressions failed on the provisional
  seed-normalizing / score-capped validation path. After correction, all 9 tests in
  `tests/club-borough-bests.test.cjs` pass.
- `node --test tests/club-solved-durable.test.cjs tests/club-render-escaping.test.cjs tests/backup-validation.test.cjs` passes (3 suites).
- `npm run format:check`, Python compilation for `tests/browser_tic_tac_toe.py`, and `git diff
  --check` pass.
- Independent review passed 63 focused tests and a 2,000-event, 173-label full-history oracle.
  It also checked failed migration preservation, stale-revision refusal, PB-only stamp rendering,
  and the previous validator's preservation of this optional field and unrelated future fields.
- Final player-facing copy at `fb7e9f54d8272375e551b806d32e02009a09fefb` passed a clean web build
  (`421924ffdd4e`, `sourceDirty: false`): 135,618 application gzip bytes, 204,647 initial gzip
  bytes and 1,418,911 precache-shell bytes. The final copy trims 23 gzip / 63 shell bytes from
  the provisional implementation. The independent approval covers this copy-only commit too.
- A separate budget-and-evidence commit provides the reviewed +512 application gzip bytes and
  +1,792 shell bytes: strict ceilings are now 135,680 and 1,419,032.32 bytes, respectively.
  These cover the measured 450 / 1,670.68-byte excesses while retaining a small identity/hash
  margin. The 220 KiB initial payload and all content/offline assertions remain unchanged.

## Not verified and residual risk

- The Playwright/browser fixture was syntax-checked but not run in this worktree. Full `npm run
  verify`, browser/IndexedDB offline execution, hosted checks, and CI remain for the integrating
  workflow.
- A persistent table can retain only 100 distinct exact labels. Lower-scoring distinct labels can be
  dropped once more than 100 labels have accumulated; no hidden lifetime counter or unbounded history
  is stored.
- A save editor can change local best rows or scores. The profile deliberately labels them as local
  save records and does not call them verified outcomes.
- `HUMAN_TODO.md` q-2 remains an open physical Android acceptance task, including airplane-mode
  relaunch, backup export, large text, and TalkBack. q-4 also retains physical Quiet Wing checks.
  q-11 describes the one-session grouping and is marked complete; browser emulation does not certify
  the outstanding physical checks.
