# Retained puzzle identity admission — #889 item 1

## Changed

From base `983ec8c35b30926161fb9c319514aae1e7694f5c`, pack admission now checks
retained saved runs as well as installed packs. Different content using a retained
`id@revision` refuses the whole import; an exact reinstall or a new revision is
allowed. The IndexedDB admission transaction includes both `packs` and `runs`,
so a save already queued by another tab is included. Session memory applies the
same check without yielding. Runs are never edited by admission.

No schema, database version or backup behavior changes. The coordinator explicitly
amended the mission scope on 31 October to permit only a measured 384-byte shell
allowance (59,456 to 59,840); every other budget stays unchanged. Other items in
#889 remain open. The managed checkout and its earlier branches are
preserved; its refused archive is not retried.

## Verified

- The new public-admission regression failed before the repair with
  `Missing expected rejection`; all 28 admission tests now pass.
- `node --test --test-concurrency=1 tests/storage-revision.test.cjs
  tests/storage-readonly.test.cjs tests/storage-restore.test.cjs
  tests/workshop-install.test.cjs`: 98 pass, zero failures, 10.223 seconds.
- Prettier, Python AST parsing and `git diff --check` pass.
- One independent read-only Terra review of implementation commit `383b4629`
  found no HIGH/CRITICAL blocker for already-retained saved runs.
- `npm.cmd run build:web` passed on clean head `738fbc8d`. The unchanged budget
  test passed 15 assertions but failed the precache-shell assertion: 1,443,942
  bytes against a ceiling of 1,443,576.32 (365.68 bytes over). The enclosing
  aggregate test also reports failure. Application JavaScript remains 135,594
  gzip bytes, within its unchanged ceiling. That original failed result is retained.

Commands ran from
`C:/Users/jekyt/.codex/worktrees/alibi-ambiguity-comparison/Alibi`.

## NOT verified

This is a source checkpoint, not a qualified merge. The changed real-origin
browser fixture exercises refusal, exact reinstall and a new revision through
actual import controls, but has not yet run on this change. Current-head hosted
CI and final publication remain pending qualification. Bootstrap growth is 418 raw
bytes and 147 gzip bytes. Source-only cursor/getAll and shared-error-handler
alternatives saved only 29/32 raw bytes and were not applied. The explicit 384-byte
allowance covers the previous 365.68-byte excess and leaves 18.32 bytes of headroom
(about 0.0266% ceiling growth). This amendment does not turn the original failure
into a pass; the resulting clean source must be rebuilt and qualified normally.

## Residual risk

The existing equality helper compares JSON serialization. Reordering object
keys can conservatively refuse equivalent content. An unsaved stale tab can
still write an old definition after another tab admits a replacement when no
retained run existed at admission; this is outside this repair's stored-run
scope. Both are non-blocking follow-ups to record on the still-open #889.

[HUMAN_TODO.md](../../HUMAN_TODO.md) retains release/sharing decisions, physical
Android/TalkBack, name/publisher/signing and native-promotion gates. This work
does not deploy or infer any owner acceptance. The earlier Windows EPERM
limitation remains historical; it is not a regression of this change.
