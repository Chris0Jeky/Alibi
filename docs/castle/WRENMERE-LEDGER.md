# Wrenmere source and chronology ledger

The [ledger](wrenmere-ledger.json) is an authoring index of the supplied Wrenmere
continuation and the four current Chapter I evidence records. It is not a player
notebook, source of unlocks, a new save format, or editorial approval. It contains
spoilers. Chapter I remains governed by the existing Castle engine and its published
content; Chapters II–V and their evidence descriptions are proposals.

Run `node tools/wrenmere-ledger.cjs` from the repository root. The diagnostic lists
structural errors and named unresolved premises, then exits nonzero only on structural
errors. A zero exit means the index was checked, **not** that the case is publishable.
The present report flags the missing signed comparison for the unsigned margin and
the missing independent sighting needed to claim Mara travelled the service route.
The proposed signed inventory and garden recollection remain visible as draft source
descriptions; they are not presented as independent published proof. The garden
recollection's author, date and provenance still require editorial decisions.

Each record binds an `id@revision` to a verbatim excerpt and repository source path,
with separate `published` or `proposed` status, related person/place IDs, and explicit
uncertainty. Entry revisions are **ledger revisions**; Chapter I does not have
individual published record revisions. The corrected ticket is a derived fact and
its calibration premise is linked separately; a feasible route is not a witnessed
journey. Each entity names its source and exact source wording; names in the entity
table are editorial indexing labels, not automatic
proof that two mentions identify the same person or place. Add an alias only with
source evidence; collisions are rejected rather than silently merged.

Events use minutes after midnight for bounds on the explicitly labelled same
`flood-night` period. A null bound means unknown; it is never filled in by the
checker. The proposed 21:24 crossing is kept unbounded because the source says
approximately, not a supported exact minute. Proposed timeline lines are planning
constraints from the story bible, not separately authored witness records. Year and
ordering must not be used to imply an unrecorded calendar date. Events in different
periods are not compared by time of day.

The checker catches reversed intervals, impossible same-period strict ordering,
ordering cycles, missing records and entity references, duplicate `id@revision`
pairs, alias collisions, changed source excerpts, and changes to a locked record
without a new revision. Conclusion roles have explicitly listed record kinds, so
relabeling an unsigned note as a signed comparison is rejected. These are structural
checks: role assignments, provenance, independence, factual entailment and whether
the cited evidence truly supports the conclusion still require human judgment.

The [revision lock](wrenmere-ledger-lock.json) pins each ledger entry's exact
JSON representation. Keep earlier entries and their source wording available when
adding a new revision, update references deliberately, and review the new lock entry
alongside the changed source. Changing the lock together with a reused revision can
defeat the check; code review and editorial review remain essential. Preserve the
published/proposed distinction and don't turn a story-bible outline into evidence.

The named human editorial and fairness gate remains open in `HUMAN_TODO.md` (including
q-7). No automated diagnostic establishes a fair case, a complete chronology,
historical truth, a person's motive, or a counterfactual rescue.
