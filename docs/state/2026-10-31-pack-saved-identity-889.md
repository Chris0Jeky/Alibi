# Retained puzzle identity admission — #889 item 1

## Changed

From base `983ec8c35b30926161fb9c319514aae1e7694f5c`, pack admission now checks
retained saved runs as well as installed packs. Different content using a retained
`id@revision` refuses the whole import; an exact reinstall or a new revision is
allowed. The IndexedDB admission transaction includes both `packs` and `runs`,
so a save already queued by another tab is included. Session memory applies the
same check without yielding. Runs are never edited by admission.

No schema, database version, backup behavior or byte ceiling changes. Other
items in #889 remain open. The managed checkout and its earlier branches are
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

Commands ran from
`C:/Users/jekyt/.codex/worktrees/alibi-ambiguity-comparison/Alibi`.

## NOT verified

This is a source checkpoint, not a qualified merge. The changed real-origin
browser fixture exercises refusal, exact reinstall and a new revision through
actual import controls, but has not yet run on this change. Build/size proof,
current-head hosted CI and publication remain pending a finite resource/API
allocation. Source-only minification measures bootstrap growth of 418 raw bytes
and 147 gzip bytes; the full shell budget must still be checked unchanged.

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
