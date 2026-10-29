# Scene draft ambiguity comparison

Branch `codex/scene-ambiguity-comparison`, based on `a8070f60b6829d159a96ff981c3d25e22275648c`.

## Changed

Scene verification retains up to two valid arrangements from the existing bounded worker.
The editor labels arrangements A and B, marks differing people with double borders, and
describes every person's row, column and room in text. It explicitly says at least two
arrangements fit. No draft clue or stored solution is replaced by an ambiguous result.

Editing clears the comparison; the existing epoch rejects late replies. Malformed, duplicate,
unsatisfiable and budget-exhausted responses cannot verify a draft. Regeneration revokes
previous verification until it succeeds. Add & play and pack export still require uniqueness.
The solver, 250,000-node ceiling, file formats, saves and published content are unchanged.

## Verified

- Synthetic two-solution regression failed with the old generic ambiguity error, then passed
  with the exact two expected arrangements. Unique, contradictory and no-clue drafts,
  budget exhaustion, malformed replies and stale edit/replacement/navigation are covered.
- 42 focused workshop/asset tests pass with one worker after updating both existing worker
  fixture callers and refreshing the source asset catalogue.
- Independent Terra high review found one publication-gating defect on failed regeneration.
  Three assertions reproduced it; the fix passed all focused tests. A fresh narrow Luna review
  found no remaining defect in the fix.
- The first unchanged `npm.cmd run verify` built the web/Android artifacts and passed the
  unchanged byte budgets. It ended red: 2,254 passed, seven failed and 22 skipped (2,283 total).
  Three failures were the fixture/catalogue regressions above, now repaired. Selecting the
  installed Git Bash for child processes resolved three native-runner failures caused by
  WindowsApps resolving `bash` to WSL. The remaining native-scope fixture fails at
  `fs.symlinkSync` with Windows `EPERM`; its test/helper/workflow are unchanged from the base.
  No test, limit, host privilege or gate has been relaxed.

## NOT verified

At this checkpoint the final hosted gate and actual browser journey are pending. The UI suite
now exercises phone/desktop comparison, keyboard focus, readable differences, stale worker
delivery after a clue edit, re-verification, exact export and the existing install/play flow.
Screenshots and semantic receipts must be inspected before merge.

No deployment, public release, real-save migration, physical Android, TalkBack or enjoyment
acceptance is claimed. Storage/offline behavior is unchanged; this is an authoring UI change.

## Residual risk

Two witnesses are examples, not an exhaustive solution list. Host-dependent native test coverage
requires the existing Linux CI. Owner acceptance stays in [HUMAN_TODO.md](../../HUMAN_TODO.md),
especially the outstanding physical Android/TalkBack checks. No new owner decision is needed.
