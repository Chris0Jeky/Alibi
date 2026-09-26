# Vault authoring integration checkpoint

25 September 2026, PR #350. Four of the five original authoring files are
retained byte-for-byte from reviewed head
`a8280dc506da87a8f04477f4dfe47d61678fbd5d`; `tests/vault-quality.test.cjs`
additionally carries the coordinator's recipe determinism/uniqueness coverage
and the fail-closed aquarium/network profile test. They are integrated onto
main `f1cd4cf2fabc28dae957b802153e51d4f943c556`, which
includes all 48 Night studies, the corrected moon opening, Sun & Moon reasoning,
backup request snapshots and Night registry-derived control selection. Main's
STATE history and every runtime/content file are preserved by using its Git tree
as the integration base. The baseline section of VAULT-EXPANSION.md is historical.

Correction: the first refresh, `02dfc56f`, accidentally reused the earlier
unformatted test blob `b8dda850` rather than a8280dc5's formatted `0576fd92`.
Verify 36168699997 failed its formatting step for tests/vault-quality.test.cjs;
build, Node and browser stages did not run. Authoring 36168699957 passed the
three semantic tests. Restoring the exact formatted blob fixes the provenance
mistake without changing assertions. The prior claim that all five files were
byte-identical at 02dfc56f was incorrect.

Earlier Verify 36141141983 and authoring 36141142119 passed on a8280dc5;
maintenance review 5319964109 found no blocking implementation defect. Those
receipts do not certify the new integration. Require fresh exact-head Verify,
authoring checks and independent review before merge. This checkpoint is not a
fresh local full-build or physical-device result.

The tooling calls the current production binary/Lantern hint procedure when
profiling candidates. Its method label alone does not version that procedure.
#354 must recompute and review stored profiles after integrating #329 or later
hint changes, while preserving every selected puzzle definition. A method stall
is not human difficulty or a no-guess certificate. Its 80-board startup budget
and actual-control matrix remain separate gates. This PR adds no playable board,
save format, runtime generator, budget increase, release or deployment.

Keep #161 and HUMAN_TODO q-8 open for human explanation and difficulty review;
physical Android and TalkBack remain separate. Retarget dependent #354 before
removing this branch after merge.
