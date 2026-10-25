# Issue #445: Chapter I authoring diagnostic

Worktree: `C:/Users/jekyt/Desktop/Printer Config/Others/Git/Alibi/.wt/alibi-445`.
Branch: `sol/alibi-445`. Starting HEAD: `4988d174b69346a6ba59fe7e1368513704d55d2a`.
Implementation is uncommitted as requested; no Git write commands were run. The coordinator
owns commit, independent review, ready PR and subsequent publication gates.

## Changed

`tools/case-chapter-one.cjs` provides a stdout-only, deterministic `chapterOneReceipt()`.
It copies three published records into a diagnostic projection, maps their source/completion
IDs, enforces fixed Chapter I premise sets and compares the existing case validator, authored
object validator and real castle completion chains. It preserves the distinction between
feasible journey and established presence. Known contract mismatches are reported explicitly.

`tests/case-chapter-one.test.cjs` covers valid output, missing premises, duplicates, cycles,
sibling/future citations in claims/hints/worked answers, verdict boundaries, exact source hashes,
source immutability, runtime access alternatives and predicate/source drift refusal.
[Adapter notes and ADR](../cases/CHAPTER-ONE-ADAPTER.md) document the numeric-model/access gap
without adding expressions to the generic schema. No runtime, save, content or build configuration
is changed. #51/#53/#442 retain UX/new-story/production integration respectively.

## Verified

All commands ran in this worktree using Node v24.13.1 (repository requires Node 22+).

- `npm.cmd ci --no-audit --no-fund`: exit 0, 136 packages installed; lockfile unchanged.
- Before implementation, `node --test tests/case-authoring.test.cjs tests/castle.test.mjs tests/castle-objects.test.mjs tests/castle-investigation.test.mjs`: 78 passed, zero failed.
- Red proof: `node --test --test-name-pattern='hidden clock/route premises' tests/case-chapter-one.test.cjs`: 0 passed, 1 failed, `Missing expected exception`. The pre-adapter test used the existing `validateCase` as the control: it accepted the valid fixture and also accepted a journey claim citing only the ticket. After adding the Chapter I premise check the same regression passes. The final test imports the adapter directly, with no fallback.
- `node --test tests/case-chapter-one.test.cjs tests/case-authoring.test.cjs tests/castle.test.mjs tests/castle-objects.test.mjs tests/castle-investigation.test.mjs`: 87 passed, zero failed/skipped, including nine new tests.
- `node_modules/.bin/prettier.cmd --check tools/case-chapter-one.cjs tests/case-chapter-one.test.cjs`: exit 0.
- `git diff --exit-code HEAD -- src/castle docs/castle/CONTINUATION.md tools/case-authoring.cjs`: exit 0, proving canonical sources and the generic validator unchanged. Tests additionally compare source bytes before/after execution and bind exact bytes to SHA-256.
- `git diff --check`: exit 0.

All castle source suites also passed: `$castleSuites = @(Get-ChildItem
tests/castle*.test.cjs,tests/castle*.test.mjs | ForEach-Object { $_.FullName });
node --test tests/case-chapter-one.test.cjs tests/case-authoring.test.cjs @castleSuites`:
147 passed, zero failed/skipped, 126.464 seconds. This includes the existing castle
asset, backup, storage, cache, media, practice, investigation, guidance and evidence suites.

## NOT verified

`npm.cmd run verify` exited 1 at `tools/build-android.cjs:140`: **Android builds require
a clean source tree.** Repository-wide formatting and the complete web build passed first
(web build identity correctly records `sourceDirty: true`). Android payload derivation and the
subsequent full Node suite did not run. This is the existing committed-source identity guard,
triggered by this task's uncommitted new files; it is not a castle or adapter assertion failure.
The guard was not bypassed and build scripts were not changed. After committing, the coordinator
must rerun `npm.cmd run verify` before qualification. Logs remain in ignored `tests/issue-445-*.log`.

No hosted CI, independent review, browser interaction, deployed response, physical phone or
TalkBack result is claimed. There is no player/runtime change to certify here.

## Residual risk

The projection is explicitly non-publishable: paired prose, three-hint ladder, kind/revision
mapping and AND ancestry cannot stand in for the existing runtime semantics. The Chapter I
premise check is fixed and does not prove arbitrary prose entailment. The receipt diagnoses
the checked source bytes, not future story or production integration. No remaining implementation
slice is proposed for #445; clean committed-source verification remains outstanding.

[HUMAN_TODO.md](../../HUMAN_TODO.md) is unchanged. Existing physical/editorial Chapter I
acceptance (q-7) and the other owner gates remain open; this diagnostic does not close them.
Ignored dependencies, web outputs and test logs are disposable; nothing was copied outside
the worktree. Do not remove this worktree until the coordinator has committed and published
its untracked implementation files.
