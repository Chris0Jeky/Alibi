# Interlock delivery and review handoff

Issue #422; prerequisite #425 is landed. This is a local working-tree change, not a release.

## 2026-10-15: owner-authorized deferral and budget headroom

The owner chose both deferral and a reasonable cap increase. The clean local web baseline at
`5966611` measures 205,710 initial gzip bytes (462 over the old cap) and 14,633 deferred gzip
bytes (2,345 over). These replace the older measurements below for this worktree.
Both Interlock packs now use the existing registry-deferred chunk. Expert Families (12) and
Master/Grandmaster (9) also defer: Gardens alone left only 592 bytes under the old startup cap.
There are still 570 puzzles in the same 32-pack order, now 403 initial definitions and 167
deferred definitions across nine packs. All 60 Interlock pack/editorial definitions and the
published 510-puzzle prefix remain unchanged; IDs, revisions, pinned saves and worker collision
checks keep their existing meaning. See [the author declaration rule](DELIVERY.md).

| Budget (bytes; strict `<`) | Old cap | New cap | Measured after deferral | Headroom to new cap | Reason |
| --- | ---: | ---: | ---: | ---: | --- |
| Initial code/content, gzip | 205,248 | 225,280 (220 KiB) | 200,827 | 24,453 | 4,421 below the old cap first; room for the next few content waves |
| Deferred definitions, gzip | 12,288 | 32,768 (32 KiB) | 21,266 | 11,502 | Old cap already failed; accommodates deferral plus roughly two comparable study waves |
| Application JS, gzip | 134,944 | unchanged | 133,780 | 1,164 | Definition deferral adds no application code; no increase needed |
| Code/shell excluding official data | 1,412,792.32 | unchanged | 1,406,586 | 6,206.32 | Existing cap still fits; no increase needed |

The other ceilings are unchanged. The first two are policy headroom, not permission to skip
measurement. These are local build measurements; uncommitted edits correctly report dirty source.
The driver must rerun the clean-source gate after committing. No commit, push, merge or deployment
is performed in this task. Physical Android, TalkBack and calibration remain in `HUMAN_TODO.md`.

Local validation on this uncommitted tree:

- `npm.cmd run build:web`: clean baseline and final emitted web payload built successfully.
- `node --test tests/budget.test.cjs`: 1 passed; the unchanged baseline failed its deferred cap.
- `node --test tests/budget.test.cjs tests/content-budget-accounting.test.cjs tests/validator-worker.test.cjs tests/official-deferred.test.cjs tests/official-content-delivery.test.cjs tests/delivery-build.test.cjs tests/official-data-codec.test.cjs tests/interlock-*.test.cjs`:
  53 passed, zero failed/skipped. This includes emitted receipts, full worker IDs, backup collisions,
  exact definition order, all 60 studies and the unchanged 510-puzzle prefix. Three declaration
  assertions failed before implementation; after implementation the new declaration cases pass.
- `node --test tests/asset-delivery.test.cjs tests/painted-delivery.test.cjs tests/budget.test.cjs`:
  17 passed, zero failed/skipped. A prior overlapping build removed the output before a budget
  assertion read it; the sequential run above passes.
- `python -m unittest discover -s tests -p test_interlock_selection.py -v`: 9 passed.
- With `PORT=18787 node tools/serve.cjs` and `ALIBI_URL=http://127.0.0.1:18787`,
  `python tests/browser_interlock_studies.py`: 720 checks passed, no failures, all 60 puzzles at
  390/1440px (120 puzzle/viewport cases), including mutation, undo/redo, guarded restart, solving,
  IndexedDB completion, reopen and offline reload. Representative phone/desktop screenshots
  inspected. Receipt: ignored `test-results/interlock-study-controls/receipt.json`.
- `npm.cmd --ignore-scripts test`: full Node test script executed, 1,530 passed, 12 failed,
  3 skipped (1,545 total). All failures are Android artifact/clean-source prerequisites: no
  Android artifact can be produced from the deliberately uncommitted tree. This diagnostic run
  skips the pretest; it is not a passing `npm test`. Log: ignored `test-results/interlock-full-unit.log`.
- `node tests/quiet-wing/engines.cjs` and `node tests/quiet-wing/contracts.cjs`: 581,856 and 43
  assertions passed respectively (run separately because the full script stops on Node failures).
- `npm.cmd run format:check` and `git diff --check`: passed. Direct HEAD comparisons also confirm
  the unchanged registry pack order, both Interlock pack/editorial pairs and `content/legacy.json`.
- `npm.cmd test` stops at the dirty-source/missing-Android pretest;
  `npm.cmd run build:android` and `npm.cmd run verify` stop at the Android clean-source guard.
  The guard is preserved. After driver review/commit, run `npm.cmd run verify` on the clean head.

Build/Git commands used a process-local `safe.directory` exception for this worktree under the
sandbox account; no global Git configuration was changed. GitHub PR/issue reads returned HTTP 401,
so the live PR body, issue #422, hosted CI and review threads were not verified. Browser setup
first found port 8787 unavailable and then a Windows Python-server `text/plain` JavaScript MIME
mapping; the repository server on 18787 supplied the passing real-origin run. No gate was relaxed.

## Historical qualification: 2 October 2026

The candidate preserves all original data/editorial JSON bytes and commits on the reviewed
#432 Lattice/persistence base. Local npm installation now succeeds. A confirmed accounting
defect counted 47,931 deferred bytes twice: the producer's `officialContentBytes` already combines
initial, deferred and curation bytes. Six regression cases now enforce that emitted contract.
The worker ID prelude uses a compact string array, mapped back to the same ordered `{id}` records;
three compiled-worker cases retain all 570 IDs and reject old, initial and deferred collisions.
Both deliberate mutants fail; all 15 accounting/worker cases pass. Independent Sol review found
no confirmed blockers in that fix. Source, codec and emitted-content cases give 38 passes;
registry-selection cases give nine passes.

At clean source 3178b35, shell bytes are 1,410,153 and JavaScript is 134,832 gzip bytes, within
their existing ceilings. Initial code/content is 206,217 gzip bytes against a strict 205,248 cap:
969 bytes over. Threshold and dictionary-order probes did not recover the required bytes and
were not adopted. No allowance is added. Further delivery work is tracked under #422; this head
must not merge until its budget and full verification pass. Final-head Android and all 120 real
phone/desktop puzzle cases are not claimed. Historical source evidence below remains scoped
to its original head. Physical Android, TalkBack and human difficulty gates remain open.

## Delivered source

Sixty original selected studies: twelve each of Tents & Trees, Aquariums, Signal Paths, Number
Trails and Tidal Bridges. Gardens has 24; Routes has 36. The catalogue appends them to the
unchanged 510-puzzle prefix, giving 570 puzzles in 32 packs. Archive/Borough and all other
challenge inputs are unchanged. Existing IDs, revisions and save ownership are preserved.

Each board has a distinct title, original reproducible seed, structural distinction, three-step
intended reasoning route, tempting mistake and whole-definition-bound proof. Native and
separately implemented family solvers agree on one semantic answer; immutable reducer replay
completes. D4 transformations, trail reversal and family encoding equivalences are rejected
against prior content and siblings. These are generated candidates with deliberate selection
and assistant-authored editorial review, not a claim of manual human construction or playtesting.

Expert/Master are provisional editorial estimates. There are no invented human solve times,
no-guess guarantees or completed human reviews. Follow `docs/CALIBRATION.md`: player ratings
and measured solve data first; owner playtests flagged boards only. Physical Android/TalkBack
comfort remains distinct from browser geometry and machine difficulty evidence.

## Fresh local evidence

- `node --test tests/interlock-*.test.cjs tests/official-data-codec.test.cjs`: 14 passed, zero failed
  or skipped; 27.22 seconds. The ten collection/authoring tests cover all 60 definitions.
- `python -m unittest discover -s tests -p test_interlock_selection.py -v`: nine passed.
- `git diff --check`: clean.
- Both published data and editorial JSON blobs match the tested local Git object hashes.
- Original source bytes are pinned by the baseline SHA-256 receipt and checked by tests.

Local `npm ci` failed with registry EAI_AGAIN. No local full-build, budget, Android payload or
real-browser pass is claimed. Earlier CI runs exposed formatter errors; the exact formatter
artifact was applied. A concurrent fix on #425 was preserved rather than force-pushed over.

## Historical delivery architecture and reconciliation

Repeated prose is interned only while building static official scripts. Decoding must preserve
exact JSON, object independence, property/array order, validation and retry semantics. In the
original draft, Gardens loaded initially; Routes joined Vault in the one deferred definition chunk:
116 definitions across five packs. No runtime generator, engine rewrite or new dependency.

Both original drafts included the separate release main `7677ced` (0.15.0), preserving its metadata,
Pulseboard version substitution, documentation and measured startup budget. Those drafts added
no allowance and kept `docs/STATE.md` byte-for-byte from that release. The 2026-10-15 section above
supersedes their delivery split, budget decision and state-document policy.

## Required review and CI

The `Interlock study controls` workflow checks out and records the exact PR head. It runs full
`npm run verify`, builds a real browser origin and exercises every registered Interlock puzzle
at 390 and 1440 pixels with DOM controls: mutation, undo, redo, confirmed restart, complete solve,
IndexedDB completion, reopen and offline reload. Artifacts include source SHA, diagnostics,
receipts and screenshots. Its registry selection fails closed on empty/missing/duplicate packs.

Inspect exact-head Actions and representative unsolved/completed screenshots. Repair any
budget, content or interaction regression before merge. The latest PR comments are the
append-only CI status receipt; this source document intentionally does not predict their result.
An older green run, source uniqueness proof or selection test cannot replace final-head controls.

Review #425 first, then retarget/reconcile #427 onto main after the prerequisite is safely
merged. Obtain new checks after any head change. Independent review is still required; only
assistant self-review has been performed. Do not deploy or relabel provisional tiers as calibrated.
