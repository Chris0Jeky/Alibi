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
