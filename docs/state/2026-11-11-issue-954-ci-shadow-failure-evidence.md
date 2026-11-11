# Shadow browser failure evidence for issue #954

The manual browser origin experiment retains a failure artifact for each failed slice and
run attempt. It includes the available event and checkout SHAs, generated command script,
local server logs, build receipts and selected browser diagnostics for 14 days. Redacted setup diagnostics and
browser output remain in the Actions job log. Early runner failures and force cancellations
may leave no artifact. The existing timing summary records the browser exit status.

## Comparison with the cabinet workflow

Both workflows use Ubuntu 24.04, Node 22, Python 3.13, the npm lockfile, pinned Playwright,
the signed Ubuntu sources and the same bounded Playwright Chromium install. The 57 real-origin
browser commands, their environment overrides and both local servers match the cabinet block.

The manual experiment checks out the dispatched commit with a shallow checkout and builds
independently in each slice. It runs the same Android and web build command as the cabinet
and checks the local build identity. The cabinet uses full Git history to classify changes
between the event head and base, runs formatting and the Node suites through `npm run verify`,
and provisions FFmpeg with a cache of APT archives. It also runs the media, curation, browser
and optional room checks outside the 57-command block. Each experiment build receipt covers
its own job's files. Cross-job payload equality remains unverified.

## Evidence

Worktree `alibi-ci-shadow/Alibi`, base `f1329a25f1f677a2d4f87f529a242f1710699865`.

- `node --test tests/ci-shadow/browser-origin.test.cjs tests/browser-wiring.test.cjs`
  passed all six checks. The failure evidence test failed against the original workflow.
- PyYAML parsed the candidate, and Git Bash parsed all nine shell steps. A comparison against
  the baseline preserved the trigger, permissions, matrix, timeouts and existing commands
  other than the source receipt addition. Git Bash stubs passed exact-source, stale-source,
  successful browser, failing browser and optional-log collection controls. The synthetic
  browser failure stopped the next command and returned exit 37.
- Targeted Prettier and `git diff --check` passed.

Hosted upload and download of a failed slice are still unverified. Full builds and browser
suites were outside this local run. The required cabinet workflow was untouched. See
[HUMAN_TODO.md](../../HUMAN_TODO.md) for owner actions.
