# Issue 389 - deferred Vault follow-ups

2026-10-07, branch codex/backlog-389-20261007, based on f084aa6.

## Changed

Castle practice accepts the registered scalar listing metadata as the identity of a historical firstCompletedAt run while a Vault chunk is pending or failed. Loaded definitions still require the exact saved body; a current completion still requires the normal completion predicate. The build content revision now hashes both initial and deferred definition scripts. IDs, revisions, lazy loading and save format are unchanged.

Item 2 already has a pending route, loading indicator and timeout in current source. The existing deferred-route and deferred-loading regressions pass; no new app.js change was required.

## Verified

Coordinator npm.cmd run build succeeds. Focused Node suite with --test-isolation=none --test-concurrency=1 over castle-practice, content-manifest-revision, official-deferred, deferred-route, deferred-loading and budget passes 30/30, no skips/cancellations (112755ms). Emitted identity matches both payloads. Prettier on all four changed files passes.

Measured JavaScript gzip: 134941 bytes against the unchanged strict 134944-byte limit. Core offline bytes: 1892675. Integration has only three gzip bytes of headroom, so a combined exact-head build must re-prove the existing budget; this slice does not relax it.

## NOT verified

Physical Android/TalkBack and actual browser practice pending/failure rendering are unverified. No deployment, hosted CI or publication. Independent review remains pending. The first process-isolated test run used an incorrect budget filename and stale build; its emitted identity assertion failed. Rebuilding and the scoped no-isolation run above provide the final proof. The initial diagnosis of a hanging process was not sustained: the runner was consuming CPU validating the catalogue.

## Residual risk

Grok 4.7 high reached its 25-turn cap after the useful changes, so the coordinator owns completion. Muse lane creation was refused because current host kraspyon differs from registry owner desktop-ihkoojs; no bypass or Muse job ran. HUMAN_TODO.md remains authoritative and was not edited. Root owns central STATE updates and publication. Existing PR #572 practice interactions require root integration review.

## Final Android identity correction

The first independent Grok review found a HIGH producer/consumer defect: the Android runtime copied the complete web content revision, but its receipt and checker still expected only the startup script hash. A clean baseline build:android passed, while the added regression failed on receipt hash 95d1e511... versus complete revision 7a76937c... (exit 1). An earlier baseline attempt failed the clean-source precondition after a test edit; that attempt is not counted as regression proof.

The receipt now preserves the runtime revision. The checker computes the authoritative shared helper from exactly one startup and one deferred UTF-8 asset. The new regression compares web, Android runtime and receipt revisions, and requires the artifact inspector to accept the result. Other direct assumptions were searched: standalone preview-house hashes the complete catalogue JSON and needs no change.

Coordinator checks on the correction: npm.cmd run build:android exit 0; npm.cmd run check:android exit 0; Android-build, Android-boot-target, platform-identity, content-manifest-revision and budget suites with no isolation and concurrency 1 pass 24/24, zero skips/cancellations (49824ms). Prettier and diff check pass. Measured JavaScript gzip remains 134941 bytes; core offline bytes 1892676. No budget ceilings, save formats, IDs or database versions change.

Second and final independent review: fresh read-only GPT-6.1 Sol medium reviewed only the three-file fix diff, found no CRITICAL/HIGH blockers or additional actionable findings. Its static check confirms unique asset selection, UTF-8 input order, receipt/runtime agreement and the regression. It ran no tests or physical-device checks. The subsequent amendment only adds this evidence; exact-head artifact regeneration/check remains the final local step. HUMAN_TODO.md remains authoritative and unchanged.
