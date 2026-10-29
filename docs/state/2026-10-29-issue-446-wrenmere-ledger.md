# Wrenmere authoring ledger (#446)

Added a version-1, source-bound author ledger, revision lock, read-only diagnostic,
and negative tests. The ledger indexes the four published Chapter I records and the
supplied proposed Chapter II–V descriptions and author timeline. It preserves source
wording and labels proposed material separately; it introduces no runtime, save or
player database changes. The author-facing usage and limits are in
`docs/castle/WRENMERE-LEDGER.md`.

The diagnostic deliberately reports the missing signed-comparison and independent
sighting roles, plus the remaining proposed-source and provenance questions. It does
not declare authoring or editorial acceptance. The current source has 42 record
entries, nine bounded-or-unknown chronology events and eight conclusions. Its CLI
reports zero structural errors and 23 unresolved questions or proposed-premise items.

The new regression initially failed because the checker did not exist. Eleven tests
now cover the checked-in ledger, alias conflation, missing and wrong-kind comparison
premises, reversed and contradictory intervals, chronology cycles, changed reused
revisions, duplicate revisions, missing references and changed source excerpts.
The entity regression also compares each person's name with the story bible and
each place's exact name and ID with the existing room registry. Two review-driven
regressions reject proposed extra premises on published events and ensure malformed
unresolved premises produce a readable error instead of crashing the report.
Related Chapter I and sharing suites also passed. The initial sandboxed Chapter I
CLI test could not spawn its child; all 22 focused cases passed with the same tests
outside that sandbox; the subsequent source and diagnostic regressions bring the
focused total to 25.
This is authoring-tool evidence, not editorial acceptance.

Final CI on the published head remains to be recorded by the coordinator. Human
editorial, fairness and physical acceptance remain in `HUMAN_TODO.md`, including q-7.
