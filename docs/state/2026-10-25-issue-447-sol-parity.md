# Issue #447: story-mode parity harness

## Changed

Implemented on `sol/alibi-447` from source HEAD
`4988d174b69346a6ba59fe7e1368513704d55d2a` in the `alibi-447` worktree. Initial status was clean;
the requested parity report/checklist did not exist. No Git writes, commits, PR or deployment
were performed; the coordinator owns publication.

`tools/case-parity.cjs` validates bounded source bytes and exports a revision/hash/locale-bound
receipt. Mechanical results cover the shared ID/graph/verdict/citation contract and actual
story-on/off projections, hints, source visibility and explicit worked-answer access. Editorial
results export 32 prose pairs and always remain `required` / `not-certified`. Number, negation
and uncertainty mutations intentionally pass mechanical parity while changing evidence meaning.

Authoring and exported preview receipts now identify the actual supported locale, `en`. The
browser suite compares real controls through all three stages, mode changes, drafts, validation,
focus, progress, hints and reveals; it emits separate mechanical and editorial JSON artifacts.
`docs/cases/PARITY-REVIEW.md` supplies the editorial worksheet/checklist. The README specifies
future non-prose equality and explicit whole-case English fallback, without adding locale loading,
a framework or languages.

## Verified

Commands ran from this worktree with Node 24.13.1 and Python 3.14.3.

- Baseline: `node --test tests/case-session.test.cjs tests/case-authoring.test.cjs tests/case-preview.test.cjs`
  passed 77/77 before implementation.
- Fails without fix: `node --test --test-name-pattern="exported preview identifies" tests/case-preview.test.cjs`
  ran against the original authoring/preview implementation: 1 failed, 0 passed,
  `undefined !== 'en'`. After implementation the same test passed in the complete preview suite.
- `node --test tests/case-parity.test.cjs tests/case-session.test.cjs tests/case-authoring.test.cjs`:
  89 passed, 0 failed, 0 skipped.
- `node --test tests/case-*.test.cjs`: 111 passed, 0 failed, 1 skipped (POSIX named-pipe test on
  Windows). This includes all authoring, session, parity, specimen-model and preview tests.
- `py -3 tests/browser_case_workbench.py` with `PYTHONUTF8=1`: passed at 320x740, 1280x900 and
  844x390 in Chromium 151.0.7922.34, offline file transport; 0 external requests and 0 script
  errors in each run. Hostile-text checks also passed. Inspected phone and desktop screenshots.
- `npm.cmd ci --no-audit --no-fund`: succeeded, 136 packages installed; lockfile unchanged.
- `npm.cmd run verify`: formatting passed and web build completed (570 puzzles, 13 types, 5
  casebooks). The command then exited 1 at `tools/build-android.cjs:140`:
  `Android builds require a clean source tree.` It did not reach the Node suite.
- `npm.cmd test`: exited 1 in `pretest`'s clean-source/artifact identity guard; no full suite ran.
- `git diff --check`: passed.

Raw logs and generated screenshots/receipts are in ignored `test-results/issue-447-*.log` and
`test-results/case-workbench/`. The latter includes distinct `mechanical-parity.json`,
`editorial-comparison.json` and `browser.json`. The existing case-workbench workflow uploads
the directory. Build/install outputs remain in normal ignored paths; temporary preview/test
sources were cleaned. These artifacts are reproducible and are not proposed Git content.

## NOT verified

The full verification gate cannot pass on uncommitted source: the Android builder and npm
pretest require a clean committed tree. The user expressly prohibited Git writes; the guards
were not bypassed. After committing this focused change, the coordinator must run
`npm.cmd run verify` on the clean tree, then qualify the PR's CI and independent review.
No physical-phone, human-editorial, translation, production save or hosted acceptance is claimed.

## Residual risk

Mechanical checks cover initial access, prerequisite-complete access and all-complete access,
not every progress subset; browser proof covers the current linear specimen. Prose parity
cannot establish meaning. The 30 identical pairs and two differing intro/ending pairs are
observations, not editorial sign-off. Future translation fallback is a documented acceptance
contract until a reviewed locale specimen exists. Existing #49 voice editing and #56 human
accessibility work remain separate. [HUMAN_TODO.md](../../HUMAN_TODO.md) retains its existing
physical-device/owner actions; this change infers no approval and adds no new owner decision.
