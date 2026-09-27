# Interlock delivery and review handoff

Issue #422; draft prerequisite #425; draft content and controls #427. This is not a release.

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

## Delivery architecture and live reconciliation

Repeated prose is interned only while building static official scripts. Decoding must preserve
exact JSON, object independence, property/array order, validation and retry semantics. Gardens
loads initially; Routes joins Vault in the existing one precached deferred definition chunk:
116 definitions across five packs. No runtime generator, engine rewrite or new dependency.

Both drafts include the separate release main `7677ced` (0.15.0), preserving its metadata,
Pulseboard version substitution, documentation and measured startup budget. Interlock does not
add any further allowance or alter other delivery budgets. Canonical `docs/STATE.md` is kept
byte-for-byte from that release; this companion records Interlock without overwriting it.

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
