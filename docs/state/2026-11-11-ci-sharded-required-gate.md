# Candidate for the sharded cabinet check

Worktree `alibi-ci-deps-probe/Alibi`, branch `codex/ci-sharded-gate-20261111`, base
`f1329a25f1f677a2d4f87f529a242f1710699865`.

The existing cabinet workflow still reports the required `verify` check under the same
workflow name and triggers. Preparation checks out the event SHA, checks the head and base
against the PR test merge commit, and applies the existing scope classifier. For a
publication-only change, preparation runs the existing document verification and the
required check expects each full job to be skipped.

For full verification, preparation formats and builds once. The cabinet job runs the
existing Node, media, curation, browser and optional room commands while four separately
named jobs run the 57 real-origin commands. The existing manual shadow and the required
shards use the same command list. The cabinet starts its local origin before the expedition
test. Browser and cabinet jobs use the pinned same-run download action with the producer's
artifact ID, verify the archive SHA-256 before extraction, and run the existing build
preflight. The required job needs a successful result and a receipt tied to its run,
checkout and archive digest from each lane.

The 45-minute configured critical path is 10 minutes of preparation, up to 32 for the
parallel jobs and 3 for the verdict. The 480-second dependency phase caps and 20-second
grace remain in place. Queueing, separate Chromium provisioning and artifact transfers
need hosted measurement. Parallel jobs can increase the aggregate runner minutes.
The retained cabinet artifact uses its historical name on attempt 1 and an attempt suffix
on later attempts. Shard evidence has separate names and uses the former report selectors.
Evidence and the internal build archive have 14-day retention. Failed-job reruns depend on
GitHub retaining the earlier successful producer outputs and archive in the same run.
If that archive expires, the build needs a full rerun.

## Local proof

- `node --test tests/ci-required-gate.test.cjs tests/ci-shadow/browser-origin.test.cjs tests/browser-wiring.test.cjs tests/ci-scope.test.cjs`
  passed 33 checks, including missing, failed, cancelled, skipped and mismatched job receipts.
- `node --test tests/ci-setup-phase.test.cjs tests/test-build-preflight.test.cjs` passed nine
  Windows tests with four Linux-only setup tests skipped. The WSL audio and signed-source
  Python suites passed six and four tests respectively.
- PyYAML and Git Bash validated all 51 shell steps, the original workflow configuration,
  36 non-origin commands, the original report selectors and the byte-identical serial
  script. A disposable synthetic build exercised the actual archive packing, hashing,
  extraction and build preflight. Missing artifact ID, wrong digest, stale source and
  existing build output controls all failed.
- Targeted Prettier and `git diff --check` passed.

## Hosted qualification

The candidate still needs full PR and publication-only PR evidence, including branch
protection resolving the existing cabinet check on the PR test merge commit. Exercise a
failed or missing shard receipt, same-run download and a failed-job rerun. Compare the
cold and warm critical paths and aggregate runner minutes with the serial workflow.
Actual GitHub Actions scheduling, artifact and rerun behavior, and the full suites were
outside the local run. [Owner actions](../../HUMAN_TODO.md)

## Startup validation repair

[Run 43078104485](https://github.com/Chris0Jeky/Alibi/actions/runs/43078104485) failed before jobs
started on `04be6a46`. Checksum-verified actionlint 1.7.12 reproduced an invalid
`cancelled()` call in the verdict step's environment. GitHub Actions permits that function
in conditions. The normal verdict now uses an uncancelled step condition, and a separate
step fails the required job on cancellation. The job itself still uses `always()` and
the verdict still rejects missing or cancelled dependencies. The changed workflows pass
actionlint locally. A fresh hosted run must establish scheduling and runtime behavior.
