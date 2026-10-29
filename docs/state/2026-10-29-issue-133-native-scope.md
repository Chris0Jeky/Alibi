# Issue #133: native CI scope first slice

The existing Android native job remains the stable result and continues to run the full
35-minute-bounded sequence on pushes, manual runs, and every pull request except a verified
handoff-only change. Only regular `docs/state/*.md` files qualify. All runtime, assets,
Android, workflow, tools, dependencies, other docs, mixed, invalid or uncertain changes run
full. The existing timeouts, native assertions, APK audit, emulator and receipts do not change.

A pull request runs the classifier from the base commit, not its proposed head. If that
classifier is absent, fails or does not return the one recognized fast-path value, the
workflow chooses full. The classifier requires complete valid commit identities, matching
clean checkout, a resolvable merge base, a nonempty NUL-delimited no-renames diff and regular
head/base files. A terminal always-running guard requires the classifier tests and decision
and, for full scope, the native completion step. A docs-only success establishes classification
and classifier-test evidence, not an Android build or device acceptance. The first PR adding
this classifier necessarily runs full because its base does not contain the classifier.

Focused temporary-Git and workflow tests exercise the classifier, mixed source changes,
unknown commits/events, symlinks, renames, dirty worktrees, and terminal success/failure
states. The actual workflow wrapper is exercised with a trusted base classifier, missing,
malformed and throwing base classifiers, a mismatched checkout and a diverged fork. The terminal guard test first exposed a masked failed scope result caused by an
AND-list in shell; separate assertions fix it. Full exact-head hosted native/full checks are
still required. This slice does not close #133: its minimum WebView/OS, release-like installed
build, lifecycle, file, recovery and upgrade matrix remain open. Physical Android/TalkBack,
production ownership and release approval remain in HUMAN_TODO.md.
