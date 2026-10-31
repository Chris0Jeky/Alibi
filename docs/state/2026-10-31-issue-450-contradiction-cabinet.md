# Issue450: standalone contradiction cabinet

## Changed

Mission43 starts from `993c1fb68a6902485271cb0885b3e136151d05fc` in the preserved
managed checkout on `codex/contradiction-cabinet-450`. The original fictional
[lantern reports](../../prototypes/contradiction-cabinet/README.md) provide two
independent tasks: a globally smallest inconsistent group, then an admissible
counterexample under fixed premises. Either smallest triple is accepted; selecting
all five is refused. The second task cannot discard premises through the first
task's checkboxes. No-world premises produce no counterexample.

Native checkboxes and table selectors retain focus. Story-off preserves every
rule and current edit. Hints and worked explanations use separate controls.
Rehearsal is memory-only; Restart and reload clear it. No app registration,
startup payload, published content, storage, schema, backup or dependency changes.

## Verified at the source checkpoint

- `node --test tests/contradiction-cabinet.test.mjs`: seven passing tests,
  zero failures/skips. The independent oracle covers eight Boolean worlds and
  all 32 report subsets with separate arithmetic truth conditions.
- The first implementation accepted any contradiction. The select-all regression
  failed while both successful triples passed; the corrected implementation
  requires global minimum cardinality. The unequal-size regression separately
  rejects an inclusion-minimal triple when a conflicting pair exists.
- Consistent, empty and no-world cases, all eight counterexample proposals,
  incomplete/invalid selections, story/hint preservation and reset are covered.
- Focused Prettier, Python AST syntax and `git diff --check` pass.
- The design detector's font/paper warnings are declined: they describe the
  inherited interval-desk visual system required by this mission, not defects.

The dedicated workflow checks the exact PR head. Its browser fixture specifies
actual 320/390/1440 journeys in both story modes, including select-all refusal,
both successful triples, fixed-premise preservation, rejected/accepted worlds,
native keyboard/focus, separated hints/reveal, no external requests and reload.
Successful receipts bind copied source, SHA-256, PNG and ARIA. Interactions are
tested offline after load; reload uses the local HTTP fixture because this
standalone experiment has no service worker.

At this checkpoint the actual hosted browser/full gates and independent reviews
are pending, not claimed as passing. The PR and external coordinator receipt carry
their final source identities, raw logs, artifact manifests and merge disposition.
No local full/browser duplicate or heavy/GPU allocation is held.

## NOT verified

No real player explanation, subjective understanding, physical-device/screen-reader
acceptance or production promotion. Formal enumeration does not prove that the prose
is fair; independent content review and real player explanations remain distinct.
No general language truth engine or lie detector is implied. #450 stays open for
the human experiment and a separate promotion decision.

## Residual risk and ownership

The model deliberately limits the world to three binary lantern states and the
same bell, with no uncertain clocks. Findings apply only to those explicit rules.
The [human experiment and stop rule](../../prototypes/contradiction-cabinet/README.md)
require explanations before reveal; selecting all reports must never earn success.

The managed checkout's archive refusal and prior branches/proofs are preserved.
Foreign #899/#900 and the primary's scratch file are untouched. Existing release,
sharing, consenting-author, native/device and publisher/signing boundaries in
[HUMAN_TODO.md](../../HUMAN_TODO.md) remain open. Historical Windows EPERM evidence
is not a regression of this experiment.
